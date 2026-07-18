// Verifies src/data/cook_examples.json: every listed combo must really cook
// into its dish, and no combo may use an ingredient that doesn't exist.
//   node scripts/validate_examples.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../src/engine/cooking.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(ROOT, 'src/data/ingredients.json'), 'utf8'));
const recipes = JSON.parse(readFileSync(join(ROOT, 'src/data/recipes.json'), 'utf8'));
const examples = JSON.parse(readFileSync(join(ROOT, 'src/data/cook_examples.json'), 'utf8'));
const engine = createEngine(db, recipes);

const baseOf = (n) => n.replace(/_(cooked|dried)$/, '');
const failures = [];
let comboCount = 0;

for (const recipe of recipes) {
  const combos = examples[recipe.name] ?? [];
  if (combos.length === 0) {
    failures.push(`${recipe.name}: no examples`);
    continue;
  }

  const seen = new Set();
  for (const combo of combos) {
    comboCount++;
    if (combo.length !== 4) {
      failures.push(`${recipe.name}: combo has ${combo.length} ingredients: ${combo.join(', ')}`);
      continue;
    }
    const unknown = combo.filter((c) => !engine.isCookingIngredient(c));
    if (unknown.length) {
      failures.push(`${recipe.name}: unknown ingredient(s) ${[...new Set(unknown)].join(', ')}`);
      continue;
    }
    // must actually win
    const winners = engine.getCandidates('cookpot', combo).map((r) => r.name);
    if (!winners.includes(recipe.name)) {
      failures.push(`${recipe.name}: [${combo.join(', ')}] cooks to [${winners.join(', ')}]`);
    }
    // raw/cooked duplicates must have been collapsed
    const key = combo.map(baseOf).sort().join('|');
    if (seen.has(key)) {
      failures.push(`${recipe.name}: duplicate combo (raw/cooked variant of another): ${combo.join(', ')}`);
    }
    seen.add(key);
  }
}

console.log(`checked ${comboCount} combos across ${recipes.length} recipes`);
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.log('  - ' + f);
} else {
  console.log('every example cooks into its dish, no phantom ingredients, no raw/cooked dupes ✓');
}
process.exit(failures.length ? 1 : 0);
