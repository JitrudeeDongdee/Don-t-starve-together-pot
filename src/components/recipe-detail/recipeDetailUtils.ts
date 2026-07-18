import { db, engine, ingredientNames } from "../../data";
import type { Recipe } from "../../engine/types";
import { TAG_SHORT } from "../../format";
import type { Locale } from "../../i18n";

const NON_FOOD_TAGS = new Set(["precook", "dried", "decoration", "seed"]);

export interface RuleChip {
  type: "name" | "tag";
  key: string;
}

const normalizeNameKey = (name: string) => name.replace(/_(cooked|dried)$/, "");

export function sideEffect(
  temperature: number | null,
  t: { none: string; coolsBody: string; warmsBody: string },
): string {
  if (temperature == null || temperature === 0) return t.none;
  return temperature < 0 ? t.coolsBody : t.warmsBody;
}

function splitTopLevel(expr: string, op: "&&" | "||"): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && expr.slice(i, i + 2) === op) {
      parts.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function stripOuterParens(s: string): string {
  let out = s.trim();
  while (out.startsWith("(") && out.endsWith(")")) {
    const inner = out.slice(1, -1);
    if (inner.split("(").length !== inner.split(")").length) break;
    out = inner.trim();
  }
  return out;
}

function parseAtom(
  atom: string,
): { chip: RuleChip; forbidden: boolean } | null {
  let a = stripOuterParens(atom);
  let forbidden = false;

  if (a.startsWith("!")) {
    forbidden = true;
    a = stripOuterParens(a.slice(1));
  }

  const nameWithCount = a.match(/^names\.(\w+)\s*(>=|<=|>|<|===)\s*([\d.]+)$/);
  if (nameWithCount) return { chip: { type: "name", key: nameWithCount[1] }, forbidden };

  const groupedNames = [...a.matchAll(/names\.(\w+)/g)].map((match) => match[1]);
  if (groupedNames.length > 0 && /(>=|<=|>|<|===)/.test(a)) {
    const normalized = [...new Set(groupedNames.map(normalizeNameKey))];
    return { chip: { type: "name", key: normalized[0] ?? groupedNames[0] }, forbidden };
  }

  const nameOnly = a.match(/^names\.(\w+)$/);
  if (nameOnly) return { chip: { type: "name", key: nameOnly[1] }, forbidden };

  const tagWithCount = a.match(/^tags\.(\w+)\s*(>=|<=|>|<|===)\s*([\d.]+)$/);
  if (tagWithCount) {
    const [, key, op, rawValue] = tagWithCount;
    const value = Number(rawValue);
    return {
      chip: { type: "tag", key },
      forbidden: forbidden || ((op === "<=" || op === "<" || op === "===") && value <= 0),
    };
  }

  const tagOnly = a.match(/^tags\.(\w+)$/);
  if (tagOnly) return { chip: { type: "tag", key: tagOnly[1] }, forbidden };

  return null;
}

function uniqChips(items: RuleChip[]): RuleChip[] {
  const seen = new Set<string>();
  const out: RuleChip[] = [];
  for (const it of items) {
    const key = `${it.type}:${it.key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export function extractVisualRules(test: string): {
  required: RuleChip[];
  forbidden: RuleChip[];
  oneOf: RuleChip[][];
} {
  if (test.trim() === "true") return { required: [], forbidden: [], oneOf: [] };

  const required: RuleChip[] = [];
  const forbidden: RuleChip[] = [];
  const oneOf: RuleChip[][] = [];

  for (const andPart of splitTopLevel(test, "&&")) {
    const orParts = splitTopLevel(andPart, "||");
    if (orParts.length > 1) {
      const group = orParts
        .map((p) => parseAtom(p))
        .filter((x): x is { chip: RuleChip; forbidden: boolean } => Boolean(x))
        .filter((x) => !x.forbidden)
        .map((x) => x.chip);
      if (group.length > 1) {
        oneOf.push(uniqChips(group));
        continue;
      }
    }

    const parsed = parseAtom(andPart);
    if (!parsed) continue;
    if (parsed.forbidden) forbidden.push(parsed.chip);
    else required.push(parsed.chip);
  }

  return {
    required: uniqChips(required),
    forbidden: uniqChips(forbidden),
    oneOf,
  };
}

function fmtAmount(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");
}

export function howToSummary(recipe: Recipe, locale: Locale): string[] {
  if (!recipe.card_def) return [];
  const expanded = recipe.card_def.flatMap(([name, count]) =>
    Array.from({ length: count }, () => name),
  );
  const { tags } = engine.getIngredientData(expanded);
  return Object.entries(tags)
    .filter(([tag, value]) => value > 0 && !NON_FOOD_TAGS.has(tag))
    .sort((a, b) => b[1] - a[1])
    .map(([tag, value]) => `${TAG_SHORT[locale][tag] ?? tag} ${fmtAmount(value)}`);
}

function expandCardDef(recipe: Recipe): string[] {
  if (!recipe.card_def) return [];
  return recipe.card_def
    .flatMap(([name, count]) => Array.from({ length: count }, () => name))
    .slice(0, 4);
}

function positiveTags(prefab: string): string[] {
  const tags = db.ingredients[prefab]?.tags ?? {};
  return Object.entries(tags)
    .filter(([tag, value]) => value > 0 && !NON_FOOD_TAGS.has(tag))
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

export function comboKey(combo: string[]): string {
  return [...combo].sort().join("|");
}

function sameRecipe(recipe: Recipe, combo: string[]): boolean {
  const cooker = recipe.cookers.includes("cookpot") ? "cookpot" : recipe.cookers[0];
  return engine
    .getCandidates(cooker, combo)
    .some((candidate) => candidate.name === recipe.name);
}

function replacementPool(prefab: string): string[] {
  const tags = positiveTags(prefab);
  if (tags.length === 0) return [];
  return ingredientNames
    .filter(
      (name) =>
        name !== prefab && positiveTags(name).some((tag) => tags.includes(tag)),
    )
    .slice(0, 12);
}

export function cookExamples(recipe: Recipe): string[][] {
  const base = expandCardDef(recipe);
  if (base.length === 0) return [];

  const examples: string[][] = [base];
  const seen = new Set<string>([comboKey(base)]);

  const addExample = (combo: string[]) => {
    if (combo.length !== 4) return false;
    const key = comboKey(combo);
    if (seen.has(key) || !sameRecipe(recipe, combo)) return false;
    seen.add(key);
    examples.push(combo);
    return examples.length >= 6;
  };

  const replacementPools = base.map((name) => replacementPool(name));

  for (let i = 0; i < base.length; i++) {
    for (const replacement of replacementPools[i]) {
      const combo = [...base];
      combo[i] = replacement;
      if (addExample(combo)) return examples;
    }
  }

  for (let i = 0; i < base.length; i++) {
    for (let j = i + 1; j < base.length; j++) {
      for (const replacementA of replacementPools[i].slice(0, 6)) {
        for (const replacementB of replacementPools[j].slice(0, 6)) {
          const combo = [...base];
          combo[i] = replacementA;
          combo[j] = replacementB;
          if (addExample(combo)) return examples;
        }
      }
    }
  }

  return examples;
}
