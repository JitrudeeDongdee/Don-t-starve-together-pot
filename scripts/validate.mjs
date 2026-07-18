// Cross-validation of the extracted data + engine, runnable with plain node:
//   node scripts/validate.mjs
//
// Strategy: every recipe ships a `card_def` = a guaranteed-making example combo.
// Feed that combo into the engine and assert the recipe is in the winning
// (highest-priority) candidate set. This exercises ingredient tags, the Lua->JS
// test port, and the priority matching all at once.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../src/engine/cooking.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(ROOT, 'src/data/ingredients.json'), 'utf8'));
const recipes = JSON.parse(readFileSync(join(ROOT, 'src/data/recipes.json'), 'utf8'));
const engine = createEngine(db, recipes);

const COOKER = 'cookpot';
let pass = 0;
const failures = [];
const skipped = [];

for (const r of recipes) {
  if (!r.card_def) {
    skipped.push(`${r.name} (no card_def)`);
    continue;
  }
  // expand [name,count][] into a flat prefab list
  const slots = [];
  for (const [name, count] of r.card_def) for (let i = 0; i < count; i++) slots.push(name);

  const badSlots = slots.filter((s) => !engine.isCookingIngredient(s));
  const total = slots.length;
  const candidates = engine.getCandidates(COOKER, slots);
  const names = candidates.map((c) => c.name);

  if (badSlots.length) {
    failures.push(`${r.name}: unknown ingredient(s) ${[...new Set(badSlots)].join(', ')}`);
  } else if (total !== 4) {
    failures.push(`${r.name}: card_def totals ${total} ingredients (expected 4)`);
  } else if (!names.includes(r.name)) {
    const top = candidates[0];
    failures.push(
      `${r.name}: card_def cooks to [${names.join(', ')}] instead ` +
        `(winner priority ${top ? top.priority : 'n/a'}, ${r.name} priority ${r.priority})`,
    );
  } else {
    pass++;
  }
}

// --- known-good spot checks (facts independent of card_def) ---
const spot = [];
const check = (label, cond) => spot.push({ label, ok: cond });
const cand = (...s) => engine.getCandidates(COOKER, s).map((r) => r.name);
check('4x ice -> wetgoop only', cand('ice', 'ice', 'ice', 'ice').join() === 'wetgoop');
check('meatballs: 1 meat + 3 ice (meat, no inedible)', cand('meat', 'ice', 'ice', 'ice').includes('meatballs'));
check('bonestew: 4 meat (meat>=3)', cand('meat', 'meat', 'meat', 'meat').includes('bonestew'));
check('monsterlasagna: 4 monstermeat', cand('monstermeat', 'monstermeat', 'monstermeat', 'monstermeat').includes('monsterlasagna'));
check('meatballs excluded when inedible present (1 meat + 3 twigs)', !cand('meat', 'twigs', 'twigs', 'twigs').includes('meatballs'));

console.log('=== card_def round-trip ===');
console.log(`pass: ${pass}/${recipes.length - skipped.length}   skipped(no card_def): ${skipped.length}`);
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.log('  - ' + f);
}
console.log('\n=== spot checks ===');
for (const s of spot) console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.label}`);

const spotFail = spot.filter((s) => !s.ok).length;
console.log(`\nskipped: ${skipped.join(', ')}`);
process.exit(failures.length + spotFail > 0 ? 1 : 0);
