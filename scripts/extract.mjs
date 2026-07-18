// Build-time extractor: parse DST game scripts (scripts/lua/*.lua) into
// self-contained JSON the web app consumes. Deterministic, no game runtime.
//
//   node scripts/extract.mjs
//
// Outputs: src/data/ingredients.json, src/data/recipes.json
// Scope v1: base Crock Pot recipes (preparedfoods.lua + preparednonfoods.lua).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TUNING } from './tuning.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LUA = join(ROOT, 'scripts', 'lua');
const OUT = join(ROOT, 'src', 'data');
const read = (f) => readFileSync(join(LUA, f), 'utf8');

// ---------------------------------------------------------------------------
// 1. Ingredients (from cooking.lua AddIngredientValues)
// ---------------------------------------------------------------------------
function parseIngredients() {
  // strip Lua line comments so commented-out calls (e.g. `-- AddIngredientValues({"seeds"}...)`)
  // are not parsed as real ingredients.
  const src = read('cooking.lua')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');

  // resolve `local NAME = {"a", "b", ...}` list variables
  const lists = {};
  for (const m of src.matchAll(/^local (\w+) = \{("[^}]*")\}/gm)) {
    lists[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  }

  const parseNames = (arg) => {
    arg = arg.trim();
    if (arg.startsWith('{')) return [...arg.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    if (lists[arg]) return lists[arg];
    return null; // unresolved (e.g. dynamic ocean-fish loop) -> skip
  };
  const parseTags = (body) => {
    const tags = {};
    for (const m of body.matchAll(/(\w+)\s*=\s*(-?[\d.]+)/g)) tags[m[1]] = Number(m[2]);
    return tags;
  };

  const ingredients = {};
  const add = (name, tags, extra = {}) => {
    ingredients[name] = { tags: { ...tags, ...extra } };
  };

  // AddIngredientValues(names, {tags}, cancook?, candry?)
  // arg1 is either a brace list `{"a", "b"}` (may contain commas) or a bareword var.
  const re = /AddIngredientValues\(\s*(\{[^}]*\}|\w+)\s*,\s*\{([^}]*)\}\s*(?:,\s*(true|false|nil))?\s*(?:,\s*(true|false|nil))?\s*\)/g;
  let skipped = 0;
  for (const m of src.matchAll(re)) {
    const names = parseNames(m[1]);
    if (!names) {
      skipped++;
      continue;
    }
    const tags = parseTags(m[2]);
    const cancook = m[3] === 'true';
    const candry = m[4] === 'true';
    for (const name of names) {
      add(name, tags);
      if (cancook) add(`${name}_cooked`, tags, { precook: 1 });
      if (candry) add(`${name}_dried`, tags, { dried: 1 });
    }
  }

  // naming-convention aliases (cooking.lua ~168): alias -> real prefab
  const aliases = {
    cookedsmallmeat: 'smallmeat_cooked',
    cookedmonstermeat: 'monstermeat_cooked',
    cookedmeat: 'meat_cooked',
  };

  return { ingredients, aliases, skippedIngredientCalls: skipped };
}

// ---------------------------------------------------------------------------
// 2. Recipes (from preparedfoods.lua + preparednonfoods.lua)
// ---------------------------------------------------------------------------

// Convert a Lua boolean test expression body into a JS expression string.
function luaTestToJs(body) {
  // strip Lua line comments (`-- ...`) per line, then collapse to one line
  let s = body
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join(' ')
    .trim();
  s = s.replace(/~=/g, '!==');
  s = s.replace(/(?<![<>=~!])==(?!=)/g, '===');
  s = s.replace(/\bnot\b/g, '!');
  s = s.replace(/\band\b/g, '&&');
  s = s.replace(/\bor\b/g, '||');
  s = s.replace(/\bnil\b/g, 'undefined');
  return s.replace(/\s+/g, ' ').trim();
}

// Evaluate a stat value expression like `TUNING.CALORIES_SMALL*5`, `-TUNING.HEALING_SMALL`, `0`.
function evalStat(expr) {
  if (expr == null) return null;
  const e = expr.trim();
  if (e === 'nil' || e === '') return null;
  const js = e.replace(/TUNING\.(\w+)/g, (_, k) => {
    if (!(k in TUNING)) throw new Error(`Unknown TUNING.${k}`);
    return String(TUNING[k]);
  });
  if (!/^[-+*/()\d.\s]+$/.test(js)) throw new Error(`Unsafe stat expr: ${expr} -> ${js}`);
  // eslint-disable-next-line no-new-func
  return Function(`return (${js});`)();
}

function fieldRaw(block, name) {
  // capture value up to end-of-line (fields are one-liners), then strip
  // Lua inline comments and trailing commas.
  const m = block.match(new RegExp(`\\b${name}\\s*=\\s*([^\\n]+)`, 'm'));
  if (!m) return null;
  let v = m[1].replace(/--.*$/, '').trim(); // drop `-- comment`
  v = v.replace(/,\s*$/, '').trim(); // drop trailing comma
  return v === '' ? null : v;
}

function parseCardDef(block) {
  // card_def is a single line; grab its remainder and pull every {"name", n} pair.
  const m = block.match(/card_def\s*=\s*\{\s*ingredients\s*=\s*\{([^\n]*)/);
  if (!m) return null;
  const pairs = [];
  for (const p of m[1].matchAll(/\{\s*"([^"]+)"\s*,\s*(\d+)\s*\}/g)) {
    pairs.push([p[1], Number(p[2])]);
  }
  return pairs.length ? pairs : null;
}

// Extract balanced `{...}` starting at index `open` (which must point at `{`).
function matchBraces(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error(`Unbalanced braces from index ${open}`);
}

function parseRecipes(file, cookers) {
  const src = read(file);
  const recipes = [];

  // Isolate the outer table (`local foods = {...}` / `local items = {...}`),
  // then walk its DIRECT children only — avoids matching the container itself
  // or nested sub-tables (card_def, floater) as recipes.
  const outer = src.match(/local (?:foods|items) =\s*\n\{/);
  if (!outer) throw new Error(`No outer food table in ${file}`);
  const content = matchBraces(src, outer.index + outer[0].lastIndexOf('{'));

  let i = 0;
  while (i < content.length) {
    const m = content.slice(i).match(/^\s*(\w+)\s*=\s*\{/);
    if (!m) {
      i++;
      continue;
    }
    const name = m[1];
    const braceIdx = i + m[0].length - 1;
    const block = matchBraces(content, braceIdx);
    i = braceIdx + block.length + 2; // advance past this child's closing brace

    const testM = block.match(/test = function\(cooker, names, tags\)\s*return ([\s\S]*?)\s*end/);
    if (!testM) continue; // not a recipe block

    const foodtypeM = block.match(/foodtype = FOODTYPE\.(\w+)/);
    recipes.push({
      name,
      cookers,
      priority: Number(fieldRaw(block, 'priority') ?? 0),
      weight: Number(fieldRaw(block, 'weight') ?? 1),
      foodtype: foodtypeM ? foodtypeM[1] : null,
      stats: {
        health: evalStat(fieldRaw(block, 'health')),
        hunger: evalStat(fieldRaw(block, 'hunger')),
        sanity: evalStat(fieldRaw(block, 'sanity')),
        perishtime: evalStat(fieldRaw(block, 'perishtime')),
        cooktime: evalStat(fieldRaw(block, 'cooktime')),
        temperature: evalStat(fieldRaw(block, 'temperature')),
        temperatureduration: evalStat(fieldRaw(block, 'temperatureduration')),
      },
      test: luaTestToJs(testM[1]),
      card_def: parseCardDef(block),
    });
  }
  return recipes;
}

// ---------------------------------------------------------------------------
// 3. Build
// ---------------------------------------------------------------------------
const BASE_COOKERS = ['cookpot', 'portablecookpot', 'archive_cookpot'];

const { ingredients, aliases, skippedIngredientCalls } = parseIngredients();
const recipes = [
  ...parseRecipes('preparedfoods.lua', BASE_COOKERS),
  ...parseRecipes('preparednonfoods.lua', BASE_COOKERS),
];

writeFileSync(join(OUT, 'ingredients.json'), JSON.stringify({ aliases, ingredients }, null, 2));
writeFileSync(join(OUT, 'recipes.json'), JSON.stringify(recipes, null, 2));

console.log(`ingredients: ${Object.keys(ingredients).length} (skipped ${skippedIngredientCalls} dynamic calls)`);
console.log(`recipes:     ${recipes.length}`);
console.log('sample recipe:', JSON.stringify(recipes.find((r) => r.name === 'butterflymuffin'), null, 2));
