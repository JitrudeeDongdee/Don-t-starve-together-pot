// Rolls a fresh, valid ingredient combo for a dish at runtime.
//
// A blind random search would be hopeless for the rare dishes: shroomcake has
// exactly ONE valid combo in the ~1.09M space. But rarity and constraint are
// the same thing here — the rarest dishes are the ones whose `test` names its
// ingredients outright. So we seed from the recipe's own rules first and only
// randomise what is genuinely free, which makes the rare dishes the EASY case
// and leaves loose tag-based dishes to plain sampling, where hits are common.
//
// Every candidate is still confirmed through the real engine before it is
// returned — the rules only steer the guess, they never certify it.

import type { IngredientDB, Recipe } from "./types";
import {
  extractVisualRules,
  normalizeNameKey,
  type RuleChip,
} from "../components/recipe-detail/ruleParser.ts";

export const POT_SLOTS = 4;

interface CandidateSource {
  getCandidates(cooker: string, names: string[]): Recipe[];
}

export interface RollOptions {
  cooker?: string;
  /** How many seeded guesses to try before giving up. */
  attempts?: number;
  /** Injectable for deterministic tests. */
  rand?: () => number;
  /** Combos to avoid returning again (same 4 items, any order). */
  exclude?: string[][];
}

export const comboKey = (combo: string[]) => [...combo].sort().join("|");

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)];
}

/**
 * Ingredients the engine can actually be handed, one per base item, so a combo
 * that works with Berries is not also offered as Roasted Berries.
 */
function basePool(db: IngredientDB): string[] {
  const reps = new Map<string, string>();
  for (const name of Object.keys(db.ingredients)) {
    const base = normalizeNameKey(name);
    if (!reps.has(base)) reps.set(base, db.ingredients[base] ? base : name);
  }
  return [...reps.values()].sort();
}

/** Rule chips carry normalised names; map them back to a real prefab. */
function resolvePrefab(key: string, pool: string[], db: IngredientDB): string | null {
  if (db.ingredients[key]) return key;
  return pool.find((p) => normalizeNameKey(p) === key) ?? null;
}

const chipCount = (chip: RuleChip) =>
  Math.max(1, Math.ceil(chip.min ?? 1) + (chip.minExclusive ? 1 : 0));

export function rollCookExample(
  recipe: Recipe,
  engine: CandidateSource,
  db: IngredientDB,
  opts: RollOptions = {},
): string[] | null {
  const { cooker = "cookpot", attempts = 400, rand = Math.random, exclude = [] } = opts;
  const rules = extractVisualRules(recipe.test);
  const pool = basePool(db);
  const skip = new Set(exclude.map(comboKey));

  // items the rule forbids outright, plus anything carrying a forbidden tag
  const bannedNames = new Set<string>();
  for (const chip of rules.forbidden) {
    if (chip.type === "name") {
      const prefab = resolvePrefab(chip.key, pool, db);
      if (prefab) bannedNames.add(prefab);
    } else {
      for (const name of pool) {
        if ((db.ingredients[name]?.tags[chip.key] ?? 0) > 0) bannedNames.add(name);
      }
    }
  }
  const allowed = pool.filter((n) => !bannedNames.has(n));
  if (allowed.length === 0) return null;

  // Tag quotas the rule demands, e.g. "frozen >= 2". Filling blind almost never
  // satisfies these — Bunny Stew needs 2 units of frozen AND under 1 of meat, so
  // the free slots are chosen to pay down whichever quota is furthest from met.
  const tagQuotas = rules.required
    .filter((c) => c.type === "tag" && c.min !== undefined)
    .map((c) => ({ tag: c.key, need: (c.min as number) + (c.minExclusive ? 0.5 : 0) }));
  const tagCaps = new Map<string, number>();
  for (const chip of rules.required) {
    if (chip.type === "tag" && chip.max !== undefined) tagCaps.set(chip.key, chip.max);
  }
  const tagValue = (name: string, tag: string) => db.ingredients[name]?.tags[tag] ?? 0;
  const carriersOf = new Map<string, string[]>();
  for (const { tag } of tagQuotas) {
    carriersOf.set(tag, allowed.filter((n) => tagValue(n, tag) > 0));
  }
  /** Would adding `name` blow a cap the rule sets? Bias only — the engine decides. */
  const keepsCaps = (name: string, sums: Record<string, number>) => {
    for (const [tag, max] of tagCaps) {
      if ((sums[tag] ?? 0) + tagValue(name, tag) > max) return false;
    }
    return true;
  };

  const requiredNames = rules.required.filter((c) => c.type === "name");

  for (let attempt = 0; attempt < attempts; attempt++) {
    const combo: string[] = [];

    // 1. every name the rule demands, at the quantity it demands
    for (const chip of requiredNames) {
      const prefab = resolvePrefab(chip.key, pool, db);
      if (!prefab) return null; // rule names something we have no data for
      for (let i = 0; i < chipCount(chip) && combo.length < POT_SLOTS; i++) {
        combo.push(prefab);
      }
    }

    // 2. one pick from each either/or group
    for (const group of rules.oneOf) {
      if (combo.length >= POT_SLOTS) break;
      const options = group
        .filter((c) => c.type === "name")
        .map((c) => resolvePrefab(c.key, pool, db))
        .filter((p): p is string => Boolean(p));
      if (options.length > 0) combo.push(pick(options, rand));
    }

    if (combo.length > POT_SLOTS) continue;

    // 3. fill what is left, paying down the largest outstanding tag quota first
    const sums: Record<string, number> = {};
    for (const name of combo) {
      for (const [tag, value] of Object.entries(db.ingredients[name]?.tags ?? {})) {
        sums[tag] = (sums[tag] ?? 0) + value;
      }
    }

    while (combo.length < POT_SLOTS) {
      const slotsLeft = POT_SLOTS - combo.length;
      const neediest = tagQuotas
        .map((q) => ({ ...q, gap: q.need - (sums[q.tag] ?? 0) }))
        .filter((q) => q.gap > 0 && (carriersOf.get(q.tag)?.length ?? 0) > 0)
        .sort((a, b) => b.gap / slotsLeft - a.gap / slotsLeft)[0];

      const from = neediest ? (carriersOf.get(neediest.tag) as string[]) : allowed;
      const legal = from.filter((n) => keepsCaps(n, sums));
      const chosen = pick(legal.length > 0 ? legal : from, rand);

      combo.push(chosen);
      for (const [tag, value] of Object.entries(db.ingredients[chosen]?.tags ?? {})) {
        sums[tag] = (sums[tag] ?? 0) + value;
      }
    }

    const key = comboKey(combo);
    if (skip.has(key)) continue;
    if (engine.getCandidates(cooker, combo).some((r) => r.name === recipe.name)) {
      return combo;
    }
  }

  return null;
}

/** Roll several distinct combos; returns fewer than `count` if the space is small. */
export function rollCookExamples(
  recipe: Recipe,
  engine: CandidateSource,
  db: IngredientDB,
  count: number,
  opts: RollOptions = {},
): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < count; i++) {
    const combo = rollCookExample(recipe, engine, db, {
      ...opts,
      exclude: [...(opts.exclude ?? []), ...out],
    });
    if (!combo) break;
    out.push(combo);
  }
  return out;
}
