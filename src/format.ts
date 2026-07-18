// Display helpers: item names (from wiki names.json), icons, categories,
// humanized recipe conditions (TH/EN), perish time.

import { db } from './data';
import namesJson from './data/names.json';
import iconsJson from './data/icons.json';
import type { Locale } from './i18n';

const NAMES = namesJson as Record<string, string>;
const ICONS = iconsJson as Record<string, string>;

const baseOf = (prefab: string) => prefab.replace(/_(cooked|dried)$/, '');

/** English display name (wiki style); falls back to base name + variant suffix. */
export function displayName(prefab: string, locale: Locale = 'th'): string {
  if (NAMES[prefab]) return NAMES[prefab];
  const base = baseOf(prefab);
  if (NAMES[base]) {
    if (prefab.endsWith('_cooked')) return `${NAMES[base]} ${locale === 'th' ? '(สุก)' : '(Cooked)'}`;
    if (prefab.endsWith('_dried')) return `${NAMES[base]} ${locale === 'th' ? '(แห้ง)' : '(Dried)'}`;
    return NAMES[base];
  }
  // last resort: prettify the prefab id
  return prefab
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Icon path (served from /icons/...) or null if we have no art. */
export function iconOf(prefab: string): string | null {
  return ICONS[prefab] ?? ICONS[baseOf(prefab)] ?? null;
}

/** Dominant food category of an ingredient, for grouping/coloring. */
export type Category =
  | 'meat' | 'fish' | 'veggie' | 'fruit' | 'egg' | 'sweetener'
  | 'dairy' | 'fat' | 'monster' | 'inedible' | 'magic' | 'other';

const CATEGORY_ORDER: Category[] = [
  'monster', 'meat', 'fish', 'egg', 'dairy', 'fat', 'sweetener', 'fruit', 'veggie', 'magic', 'inedible',
];

export function categoryOf(prefab: string): Category {
  const tags = db.ingredients[prefab]?.tags ?? {};
  for (const c of CATEGORY_ORDER) {
    if (tags[c] && tags[c] > 0) return c;
  }
  return 'other';
}

export const CATEGORY_COLOR: Record<Category, string> = {
  meat: '#a6432e',
  monster: '#6b2d6b',
  fish: '#2f6f8f',
  veggie: '#4f7a34',
  fruit: '#9c4a86',
  egg: '#c79a3a',
  sweetener: '#c8862f',
  dairy: '#b9a982',
  fat: '#8f7a4a',
  magic: '#3b5ba5',
  inedible: '#5a5148',
  other: '#6b5d4d',
};

export const CATEGORY_LABEL: Record<Locale, Record<Category, string>> = {
  th: {
    meat: 'เนื้อ', monster: 'มอนสเตอร์', fish: 'ปลา', veggie: 'ผัก', fruit: 'ผลไม้',
    egg: 'ไข่', sweetener: 'ความหวาน', dairy: 'นม', fat: 'ไขมัน', magic: 'เวทมนตร์',
    inedible: 'กินไม่ได้', other: 'อื่นๆ',
  },
  en: {
    meat: 'Meat', monster: 'Monster', fish: 'Fish', veggie: 'Veggie', fruit: 'Fruit',
    egg: 'Egg', sweetener: 'Sweet', dairy: 'Dairy', fat: 'Fat', magic: 'Magic',
    inedible: 'Inedible', other: 'Other',
  },
};

/** Filter groups shown in the picker (user-facing categories). */
export const FILTER_CATEGORIES: Category[] = [
  'meat', 'fish', 'veggie', 'fruit', 'egg', 'sweetener', 'dairy', 'monster', 'other',
];

/** Map full category to a picker filter bucket (fat/magic/inedible -> other). */
export function filterBucket(prefab: string): Category {
  const c = categoryOf(prefab);
  return FILTER_CATEGORIES.includes(c) ? c : 'other';
}

/** Short tag labels for the in-pot totals badges. */
export const TAG_SHORT: Record<Locale, Record<string, string>> = {
  th: {
    meat: 'เนื้อ', fish: 'ปลา', veggie: 'ผัก', fruit: 'ผลไม้', egg: 'ไข่',
    sweetener: 'หวาน', dairy: 'นม', fat: 'ไขมัน', monster: 'มอนสเตอร์',
    inedible: 'กินไม่ได้', magic: 'เวทมนตร์', frozen: 'เย็น', decoration: 'ประดับ',
    seed: 'เมล็ด', precook: 'สุก', dried: 'แห้ง',
  },
  en: {
    meat: 'Meat', fish: 'Fish', veggie: 'Veggie', fruit: 'Fruit', egg: 'Egg',
    sweetener: 'Sweet', dairy: 'Dairy', fat: 'Fat', monster: 'Monster',
    inedible: 'Inedible', magic: 'Magic', frozen: 'Frozen', decoration: 'Decor',
    seed: 'Seed', precook: 'Cooked', dried: 'Dried',
  },
};

/** Color accent for a tag badge (falls back to line color). */
export const TAG_COLOR: Record<string, string> = {
  meat: '#a6432e', fish: '#2f6f8f', veggie: '#4f7a34', fruit: '#9c4a86',
  egg: '#c79a3a', sweetener: '#c8862f', dairy: '#b9a982', fat: '#8f7a4a',
  monster: '#6b2d6b', inedible: '#5a5148', magic: '#3b5ba5', frozen: '#4a8ba5',
};

const TAG_LABEL: Record<Locale, Record<string, string>> = {
  th: {
    meat: 'เนื้อ (meat)', fish: 'ปลา (fish)', veggie: 'ผัก (veggie)', fruit: 'ผลไม้ (fruit)',
    egg: 'ไข่ (egg)', sweetener: 'ความหวาน (sweetener)', dairy: 'นม (dairy)', fat: 'ไขมัน (fat)',
    monster: 'มอนสเตอร์ (monster)', inedible: 'กินไม่ได้ (inedible)', magic: 'เวทมนตร์ (magic)',
    frozen: 'ของแช่แข็ง (frozen)', decoration: 'ของประดับ (decoration)', seed: 'เมล็ด (seed)',
    precook: 'วัตถุดิบสุก', dried: 'วัตถุดิบตากแห้ง',
  },
  en: {
    meat: 'meat', fish: 'fish', veggie: 'veggie', fruit: 'fruit', egg: 'egg',
    sweetener: 'sweetener', dairy: 'dairy', fat: 'fat', monster: 'monster',
    inedible: 'inedible', magic: 'magic', frozen: 'frozen', decoration: 'decoration',
    seed: 'seed', precook: 'cooked ingredient', dried: 'dried ingredient',
  },
};

const PHRASES: Record<Locale, { must: string; mustNot: string; total: string; oneOf: string; exact: (n: string) => string; any: string }> = {
  th: {
    must: 'ต้องมี', mustNot: 'ห้ามมี', total: 'ค่ารวม', oneOf: 'อย่างใดอย่างหนึ่ง: ',
    exact: (n) => `ให้ได้พอดี ${n} ชิ้น`, any: 'เข้าได้กับทุกวัตถุดิบ (สูตรสำรอง)',
  },
  en: {
    must: 'Must contain', mustNot: 'Must NOT contain', total: 'total', oneOf: 'One of: ',
    exact: (n) => `exactly ${n} of`, any: 'Matches anything (fallback dish)',
  },
};

function humanizeAtom(atom: string, locale: Locale): string | null {
  const T = TAG_LABEL[locale];
  const P = PHRASES[locale];
  let a = atom.trim().replace(/^\(+|\)+$/g, '').trim();
  if (!a || a === 'true') return null;

  let neg = false;
  if (a.startsWith('!')) {
    neg = true;
    a = a.slice(1).trim().replace(/^\(+|\)+$/g, '').trim();
  }

  let m = a.match(/^names\.(\w+)/);
  if (m && !/[<>=]/.test(a)) return `${neg ? P.mustNot : P.must} ${displayName(m[1], locale)}`;

  m = a.match(/^tags\.(\w+)\s*(>=|<=|>|<|===)\s*([\d.]+)/);
  if (m) {
    const op = { '>=': '≥', '<=': '≤', '>': '>', '<': '<', '===': '=' }[m[2]];
    return locale === 'th'
      ? `ค่า ${T[m[1]] ?? m[1]} รวม ${op} ${m[3]}`
      : `${T[m[1]] ?? m[1]} ${P.total} ${op} ${m[3]}`;
  }

  m = a.match(/^tags\.(\w+)$/);
  if (m) return `${neg ? P.mustNot : P.must} ${T[m[1]] ?? m[1]}`;

  m = a.match(/===\s*([\d.]+)/);
  if (m && a.includes('names.')) {
    const names = [...a.matchAll(/names\.(\w+)/g)].map((x) => displayName(x[1], locale));
    return `${[...new Set(names)].join('/')} ${P.exact(m[1])}`;
  }

  return atom.trim();
}

/** Humanize a recipe test expression into a list of readable conditions. */
export function humanizeTest(expr: string, locale: Locale): string[] {
  const P = PHRASES[locale];
  if (expr.trim() === 'true') return [P.any];
  const parts = splitTopLevel(expr, '&&');
  const out: string[] = [];
  for (const p of parts) {
    const ors = splitTopLevel(p, '||');
    if (ors.length > 1) {
      const items = ors.map((o) => humanizeAtom(o, locale)).filter(Boolean) as string[];
      if (items.length) out.push(P.oneOf + items.join(' / '));
    } else {
      const h = humanizeAtom(p, locale);
      if (h) out.push(h);
    }
  }
  return out.length ? out : [expr];
}

function splitTopLevel(expr: string, op: '&&' | '||'): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && expr.slice(i, i + 2) === op) {
      parts.push(cur);
      cur = '';
      i++;
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

const DAY_SECONDS = 480;
export function perishDays(perishtime: number | null, t: { neverSpoils: string; days: string }): string {
  if (perishtime == null) return t.neverSpoils;
  const d = perishtime / DAY_SECONDS;
  return `~${d.toFixed(Number.isInteger(d) ? 0 : 1)} ${t.days}`;
}
