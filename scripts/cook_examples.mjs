// Precomputes a few guaranteed-working ingredient combos per recipe.
//   node scripts/cook_examples.mjs   ->  src/data/cook_examples.json
//
// Why build-time: an exhaustive sweep is ~1.09M combos (~18s). Rare dishes make
// a runtime search pathological — shroomcake has exactly ONE valid combo in the
// whole space, so a browser-side search would scan nearly everything to find it.
//
// Raw/cooked collapse: we enumerate over ONE representative per base item, so a
// combo that works with both Berries and Roasted Berries is listed once. This is
// safe because no recipe requires a cooked/dried form without also accepting the
// raw one (asserted below).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../src/engine/cooking.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES_PER_RECIPE = 3;
const COOKER = 'cookpot';

const db = JSON.parse(readFileSync(join(ROOT, 'src/data/ingredients.json'), 'utf8'));
const recipes = JSON.parse(readFileSync(join(ROOT, 'src/data/recipes.json'), 'utf8'));
const engine = createEngine(db, recipes);

const baseOf = (n) => n.replace(/_(cooked|dried)$/, '');

// --- guard: collapsing raw/cooked must not hide a recipe that needs a cooked form
const cookedOnly = recipes.filter((r) => {
  const named = [...r.test.matchAll(/names\.(\w+)/g)].map((m) => m[1]);
  return named.length > 0 && named.every((n) => /_(cooked|dried)$/.test(n));
});
if (cookedOnly.length) {
  throw new Error(
    `these recipes require a cooked/dried form only, so base-representative ` +
      `enumeration would miss them: ${cookedOnly.map((r) => r.name).join(', ')}`,
  );
}

// one representative per base item, preferring the base prefab itself
const reps = new Map();
for (const name of Object.keys(db.ingredients)) {
  const base = baseOf(name);
  if (!reps.has(base) || name === base) {
    reps.set(base, db.ingredients[base] ? base : name);
  }
}
const pool = [...reps.values()].sort();

/**
 * Pick examples a player would plausibly cook, not just any valid combo.
 *
 * Ingredients are weighted by how often the GAME itself uses them on its recipe
 * cards (card_def) — that set is exactly the basic, easy-to-get stuff: Honey,
 * Twigs, Berries, Potato, Meat, Morsel, Carrot... Scoring by it keeps examples
 * recognisable. Without this you get technically-valid nonsense like
 * "4x Barnacles" or "Birchnut + Nightberry + Asparagus + ..." for Meatballs.
 */
const cardWeight = new Map();
for (const r of recipes) {
  for (const [name, count] of r.card_def ?? []) {
    const key = baseOf(name);
    cardWeight.set(key, (cardWeight.get(key) ?? 0) + count);
  }
}

const distinctCount = (combo) => new Set(combo).size;
const comboKey = (combo) => [...combo].sort().join('|');
// sum over all 4 slots (not distinct) so repeating a basic staple scores well
const score = (combo) =>
  combo.reduce((sum, name) => sum + (cardWeight.get(baseOf(name)) ?? 0), 0);

const N = pool.length;
const started = Date.now();
const KEEP = 24;
const best = new Map(recipes.map((r) => [r.name, []]));
let scanned = 0;

for (let a = 0; a < N; a++)
  for (let b = a; b < N; b++)
    for (let c = b; c < N; c++)
      for (let d = c; d < N; d++) {
        scanned++;
        const combo = [pool[a], pool[b], pool[c], pool[d]];
        const winners = engine.getCandidates(COOKER, combo);
        if (winners.length === 0) continue;
        const s = score(combo);
        for (const r of winners) {
          const list = best.get(r.name);
          if (list.length < KEEP) {
            list.push({ combo, s });
            continue;
          }
          let worst = 0;
          for (let i = 1; i < list.length; i++) if (list[i].s < list[worst].s) worst = i;
          if (s > list[worst].s) list[worst] = { combo, s };
        }
      }

/** Greedily take examples that differ from each other in at least 2 slots. */
function pickVaried(candidates, limit) {
  const sorted = candidates
    .slice()
    .sort(
      (x, y) =>
        y.s - x.s ||
        distinctCount(x.combo) - distinctCount(y.combo) ||
        comboKey(x.combo).localeCompare(comboKey(y.combo)),
    );
  const out = [];
  for (const cand of sorted) {
    const tooSimilar = out.some((chosen) => {
      const a = [...cand.combo].sort();
      const b = [...chosen].sort();
      let same = 0;
      for (let i = 0; i < 4; i++) if (a[i] === b[i]) same++;
      return same >= 3;
    });
    if (!tooSimilar) out.push(cand.combo);
    if (out.length >= limit) break;
  }
  // if variety filtering starved us, top up with the best remaining
  for (const cand of sorted) {
    if (out.length >= limit) break;
    if (!out.some((c) => comboKey(c) === comboKey(cand.combo))) out.push(cand.combo);
  }
  return out;
}

// canonical card_def combo (when the game ships one) goes first
const out = {};
for (const r of recipes) {
  const picked = pickVaried(best.get(r.name), EXAMPLES_PER_RECIPE);
  if (r.card_def) {
    const card = r.card_def.flatMap(([name, count]) =>
      Array.from({ length: count }, () => name),
    );
    if (card.length === 4) {
      const cardKey = card.map(baseOf).sort().join('|');
      const rest = picked.filter((c) => c.map(baseOf).sort().join('|') !== cardKey);
      out[r.name] = [card, ...rest].slice(0, EXAMPLES_PER_RECIPE);
      continue;
    }
  }
  out[r.name] = picked;
}

writeFileSync(join(ROOT, 'src/data/cook_examples.json'), JSON.stringify(out, null, 2));

const missing = Object.entries(out).filter(([, v]) => v.length === 0);
console.log(
  `scanned ${scanned.toLocaleString()} combos in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
console.log(`recipes with examples: ${recipes.length - missing.length}/${recipes.length}`);
if (missing.length) console.log(`NO EXAMPLE: ${missing.map(([k]) => k).join(', ')}`);
