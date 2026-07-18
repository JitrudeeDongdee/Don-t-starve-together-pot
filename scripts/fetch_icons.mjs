// Resolve + download item/dish icons from dontstarve.wiki.gg via MediaWiki API.
//   node scripts/fetch_icons.mjs
//
// - Validates every name in scripts/names.mjs against the wiki (File:<Name>.png)
// - Downloads each found icon once to public/icons/<slug>.png
// - Writes src/data/names.json  (prefab -> display name)
//   and    src/data/icons.json  (prefab -> icon path under /icons/)
// - Reports every miss loudly; misses fall back to letter-chips in the UI.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { INGREDIENT_NAMES, RECIPE_NAMES } from './names.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICON_DIR = join(ROOT, 'public', 'icons');
mkdirSync(ICON_DIR, { recursive: true });

const API = 'https://dontstarve.wiki.gg/api.php';
const UA = 'DSTCookpotSimulator/0.1 (personal non-profit fan project)';

const ALL_NAMES = { ...INGREDIENT_NAMES, ...RECIPE_NAMES };

// In-game HUD status meters (used for the stat badges UI, not item icons).
const UI_NAMES = {
  ui_health: 'Health Meter',
  ui_hunger: 'Hunger Meter',
  ui_sanity: 'Sanity Meter',
};
Object.assign(ALL_NAMES, UI_NAMES);

// unique file titles (many prefabs share one icon, e.g. egg / bird_egg)
const titleFor = (name) => `File:${name}.png`;
const uniqueNames = [...new Set(Object.values(ALL_NAMES))];

const slug = (name) =>
  name
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // é -> e
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
  return res.json();
}

// 1. resolve URLs in batches of 50
const nameToUrl = new Map();
for (let i = 0; i < uniqueNames.length; i += 50) {
  const batch = uniqueNames.slice(i, i + 50);
  const data = await api({
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'url',
    titles: batch.map(titleFor).join('|'),
  });
  // API normalizes titles (e.g. underscores) — map back via `normalized`
  const denorm = new Map();
  for (const n of data.query.normalized ?? []) denorm.set(n.to, n.from);
  for (const page of Object.values(data.query.pages)) {
    const apiTitle = page.title;
    const origTitle = denorm.get(apiTitle) ?? apiTitle;
    const name = origTitle.replace(/^File:/, '').replace(/\.png$/, '');
    if (page.imageinfo?.[0]?.url) nameToUrl.set(name, page.imageinfo[0].url);
  }
  process.stdout.write(`resolved ${Math.min(i + 50, uniqueNames.length)}/${uniqueNames.length}\r`);
}
console.log();

const missing = uniqueNames.filter((n) => !nameToUrl.has(n));

// 2. download each found icon once (skip if already present)
let downloaded = 0;
let cached = 0;
for (const [name, url] of nameToUrl) {
  const file = join(ICON_DIR, `${slug(name)}.png`);
  if (existsSync(file)) { cached++; continue; }
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.log(`DOWNLOAD FAIL ${name}: ${res.status}`); continue; }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  downloaded++;
  await new Promise((r) => setTimeout(r, 120)); // be polite
}

// 3. manifests
const names = {};
const icons = {};
for (const [prefab, name] of Object.entries(ALL_NAMES)) {
  names[prefab] = name;
  if (nameToUrl.has(name)) icons[prefab] = `icons/${slug(name)}.png`;
}
writeFileSync(join(ROOT, 'src/data/names.json'), JSON.stringify(names, null, 2));
writeFileSync(join(ROOT, 'src/data/icons.json'), JSON.stringify(icons, null, 2));

// 4. coverage report vs actual game data
const db = JSON.parse(readFileSync(join(ROOT, 'src/data/ingredients.json'), 'utf8'));
const recipes = JSON.parse(readFileSync(join(ROOT, 'src/data/recipes.json'), 'utf8'));
const baseOf = (p) => p.replace(/_(cooked|dried)$/, '');
const unnamedIng = Object.keys(db.ingredients).filter((p) => !names[p] && !names[baseOf(p)]);
const unnamedRec = recipes.filter((r) => !names[r.name]).map((r) => r.name);

console.log(`icons: ${downloaded} downloaded, ${cached} cached, ${nameToUrl.size}/${uniqueNames.length} names resolved`);
if (missing.length) console.log(`\nWIKI MISS (${missing.length}):\n  - ` + missing.join('\n  - '));
if (unnamedIng.length) console.log(`\nINGREDIENTS WITHOUT NAME (${unnamedIng.length}): ${unnamedIng.join(', ')}`);
if (unnamedRec.length) console.log(`\nRECIPES WITHOUT NAME (${unnamedRec.length}): ${unnamedRec.join(', ')}`);
