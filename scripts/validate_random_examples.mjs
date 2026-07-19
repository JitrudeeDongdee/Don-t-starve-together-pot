// Measures the runtime roller in src/engine/randomExample.ts.
//   node scripts/validate_random_examples.mjs
//
// Two things must hold before the UI can rely on it:
//   1. every combo it returns really cooks into its dish (correctness)
//   2. it finds one for every dish, reliably (coverage)
// A roller that quietly fails on the rare dishes would look fine on Meatballs
// and leave Shroom Cake with an empty panel, so coverage is reported per dish.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../src/engine/cooking.ts';
import { rollCookExamples, comboKey } from '../src/engine/randomExample.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(ROOT, 'src/data/ingredients.json'), 'utf8'));
const recipes = JSON.parse(readFileSync(join(ROOT, 'src/data/recipes.json'), 'utf8'));
const engine = createEngine(db, recipes);

const ROUNDS = 20;       // independent re-rolls per dish, as if the user kept tapping
const WANT = 3;          // combos shown per roll

// deterministic PRNG so a failure is reproducible instead of "it happened once"
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrong = [];
const shortfall = [];
let totalCombos = 0;
let emptyRolls = 0;

for (const recipe of recipes) {
  for (let round = 0; round < ROUNDS; round++) {
    const rand = mulberry32(round * 7919 + recipe.name.length * 104729 + round);
    const combos = rollCookExamples(recipe, engine, db, WANT, { rand });

    if (combos.length === 0) {
      emptyRolls++;
      shortfall.push(`${recipe.name}: round ${round} returned NOTHING`);
      continue;
    }
    if (combos.length < WANT) {
      shortfall.push(`${recipe.name}: round ${round} returned ${combos.length}/${WANT}`);
    }

    const seen = new Set();
    for (const combo of combos) {
      totalCombos++;
      if (combo.length !== 4) {
        wrong.push(`${recipe.name}: ${combo.length} slots — ${combo.join(', ')}`);
        continue;
      }
      for (const item of combo) {
        if (!db.ingredients[item]) {
          wrong.push(`${recipe.name}: unknown ingredient "${item}"`);
        }
      }
      // the whole point: it must actually cook into this dish
      const winners = engine.getCandidates('cookpot', combo).map((r) => r.name);
      if (!winners.includes(recipe.name)) {
        wrong.push(`${recipe.name}: ${combo.join(', ')} cooks into [${winners.join(', ')}]`);
      }
      const key = comboKey(combo);
      if (seen.has(key)) {
        wrong.push(`${recipe.name}: duplicate combo in one roll — ${combo.join(', ')}`);
      }
      seen.add(key);
    }
  }
}

console.log(`rolled ${totalCombos} combos across ${recipes.length} dishes x ${ROUNDS} rounds`);

if (wrong.length) {
  console.error(`\nINVALID (${wrong.length}):`);
  for (const line of wrong.slice(0, 30)) console.error(`  ${line}`);
}

if (shortfall.length) {
  const dishes = [...new Set(shortfall.map((s) => s.split(':')[0]))];
  console.warn(`\nfewer than ${WANT} combos on ${dishes.length} dish(es), ${shortfall.length} round(s):`);
  for (const line of shortfall.slice(0, 20)) console.warn(`  ${line}`);
}

if (wrong.length || emptyRolls) {
  console.error(`\nFAIL — ${wrong.length} invalid, ${emptyRolls} empty roll(s)`);
  process.exit(1);
}
console.log(`\nOK — every combo valid, every dish produced at least one on all ${ROUNDS} rounds`);
