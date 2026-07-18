import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TUNING } from './tuning.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ING_PATH = join(ROOT, 'src', 'data', 'ingredients.json');
const OUT_PATH = join(ROOT, 'src', 'data', 'ingredient_stats.json');
const CACHE_DIR = join(ROOT, 'scripts', 'lua', 'prefabs');

const RAW_BASE = 'https://raw.githubusercontent.com/taichunmin/dont-starve-together-game-scripts/master/scripts/prefabs';

mkdirSync(CACHE_DIR, { recursive: true });

const ingredients = JSON.parse(readFileSync(ING_PATH, 'utf8')).ingredients;

const baseOf = (name) => name.replace(/_(cooked|dried)$/, '');

const cleanExpr = (expr) =>
  expr
    .replace(/--.*$/, '')
    .replace(/,\s*$/, '')
    .trim();

function evalStat(expr) {
  if (!expr) return null;
  const e = cleanExpr(expr);
  if (!e || e === 'nil') return null;
  let unknown = false;
  const js = e.replace(/TUNING\.(\w+)/g, (_, k) => {
    if (!(k in TUNING)) {
      unknown = true;
      return '0';
    }
    return String(TUNING[k]);
  });
  if (unknown) return null;
  if (!/^[-+*/().,\d\s]+$/.test(js)) return null;
  // eslint-disable-next-line no-new-func
  const v = Function(`return (${js});`)();
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function parseFnBlocks(src) {
  const blocks = new Map();
  const re = /local function\s+([A-Za-z_]\w*)\s*\(/g;
  const matches = [...src.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1];
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : src.length;
    blocks.set(name, src.slice(start, end));
  }
  return blocks;
}

function parsePrefabMap(src) {
  const out = new Map();
  for (const m of src.matchAll(/Prefab\("([^"]+)"\s*,\s*([A-Za-z_]\w*)/g)) out.set(m[1], m[2]);
  return out;
}

function parseStatsFromBlock(block) {
  const healthA = block.match(/inst\.components\.edible\.healthvalue\s*=\s*([^\n]+)/);
  const hungerA = block.match(/inst\.components\.edible\.hungervalue\s*=\s*([^\n]+)/);
  const sanityA = block.match(/inst\.components\.edible\.sanityvalue\s*=\s*([^\n]+)/);

  const healthB = block.match(/inst\.components\.edible:SetHealthValue\(([^)]+)\)/);
  const hungerB = block.match(/inst\.components\.edible:SetHungerValue\(([^)]+)\)/);
  const sanityB = block.match(/inst\.components\.edible:SetSanityValue\(([^)]+)\)/);

  const health = evalStat(healthA?.[1] ?? healthB?.[1] ?? '');
  const hunger = evalStat(hungerA?.[1] ?? hungerB?.[1] ?? '');
  const sanity = evalStat(sanityA?.[1] ?? sanityB?.[1] ?? '');

  if (health == null && hunger == null && sanity == null) return null;
  return { health, hunger, sanity };
}

async function loadPrefabLua(baseName) {
  const localPath = join(CACHE_DIR, `${baseName}.lua`);
  if (existsSync(localPath)) return readFileSync(localPath, 'utf8');

  const res = await fetch(`${RAW_BASE}/${baseName}.lua`);
  if (!res.ok) return null;
  const text = await res.text();
  writeFileSync(localPath, text);
  return text;
}

const wanted = Object.keys(ingredients);
const uniqueBases = [...new Set(wanted.map(baseOf))];
const perPrefab = {};

for (const b of uniqueBases) {
  const lua = await loadPrefabLua(b);
  if (!lua) continue;
  const fns = parseFnBlocks(lua);
  const prefabToFn = parsePrefabMap(lua);
  for (const [prefab, fnName] of prefabToFn.entries()) {
    const block = fns.get(fnName);
    if (!block) continue;
    const stats = parseStatsFromBlock(block);
    if (stats) perPrefab[prefab] = stats;
  }
}

const result = {};
let covered = 0;
for (const name of wanted) {
  const base = baseOf(name);
  const stats = perPrefab[name] ?? perPrefab[base] ?? null;
  result[name] = stats;
  if (stats) covered++;
}

writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
console.log(`ingredient stats: ${covered}/${wanted.length} covered`);
