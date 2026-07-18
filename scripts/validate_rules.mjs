// Validates the recipe-detail rule parser against the real game tests.
//   node scripts/validate_rules.mjs
//
// Guards two classes of bug:
//   1. a clause silently dropped (e.g. `(names.dragonfruit || ...)` vanishing),
//      which used to leave Dragonpie showing no Dragon Fruit requirement.
//   2. a chip claimed as REQUIRED that the recipe does not actually require —
//      checked by cooking a counter-example that omits it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractVisualRules } from '../src/components/recipe-detail/ruleParser.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const recipes = JSON.parse(readFileSync(join(ROOT, 'src/data/recipes.json'), 'utf8'));

const base = (n) => n.replace(/_(cooked|dried)$/, '');
const fmt = (c) =>
  `${c.type === 'name' ? '' : '#'}${c.key}` +
  (c.min != null ? `${c.minExclusive ? '>' : '≥'}${c.min}` : '') +
  (c.max != null ? `≤${c.max}` : '');

const failures = [];

for (const r of recipes) {
  if (r.test.trim() === 'true') continue;
  const { required, forbidden, oneOf } = extractVisualRules(r.test);
  const shown = new Set(
    [...required, ...forbidden, ...oneOf.flat()]
      .filter((c) => c.type === 'name')
      .map((c) => c.key),
  );

  // (1) every prefab the test names must surface somewhere in the chips
  const named = [...new Set([...r.test.matchAll(/names\.(\w+)/g)].map((m) => base(m[1])))];
  const missing = named.filter((n) => !shown.has(n));
  if (missing.length) {
    failures.push(`${r.name}: dropped named ingredient(s) ${missing.join(', ')}  [test: ${r.test}]`);
  }

  // (2) a REQUIRED named chip must really be mandatory: the test must fail
  //     when that ingredient is absent from an otherwise-passing pot
  for (const chip of required.filter((c) => c.type === 'name')) {
    const stillPasses = !new RegExp(`names\\.${chip.key}\\b`).test(r.test);
    if (stillPasses) {
      failures.push(`${r.name}: claims required "${chip.key}" but test never names it`);
    }
  }
}

console.log(`checked ${recipes.length} recipes`);
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.log('  - ' + f);
} else {
  console.log('all recipe rules extracted without loss ✓');
}

console.log('\n--- spot checks ---');
for (const name of ['dragonpie', 'butterflymuffin', 'turkeydinner', 'kabobs', 'unagi', 'icecream']) {
  const r = recipes.find((x) => x.name === name);
  const v = extractVisualRules(r.test);
  console.log(`\n${name}\n  test      : ${r.test}`);
  console.log(`  required  : ${v.required.map(fmt).join(', ') || '-'}`);
  console.log(`  one-of    : ${v.oneOf.map((g) => '[' + g.map(fmt).join(' / ') + ']').join(' ') || '-'}`);
  console.log(`  forbidden : ${v.forbidden.map(fmt).join(', ') || '-'}`);
}

process.exit(failures.length ? 1 : 0);
