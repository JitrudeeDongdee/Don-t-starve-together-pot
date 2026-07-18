import { engine } from '../data';
import type { Recipe } from '../engine/types';
import { displayName, TAG_SHORT } from '../format';
import { useLocale } from '../i18n';
import ItemIcon from './ItemIcon';
import StatMeters from './StatMeters';

const TAG_ICON_PREFAB: Record<string, string> = {
  meat: 'meat',
  fish: 'fish',
  veggie: 'carrot',
  fruit: 'berries',
  egg: 'egg',
  sweetener: 'honey',
  dairy: 'butter',
  fat: 'butter',
  monster: 'monstermeat',
  inedible: 'twigs',
  magic: 'nightmarefuel',
  frozen: 'ice',
};

interface RuleChip {
  type: 'name' | 'tag';
  key: string;
  min?: number;
}

/** Section header with ruled lines on both sides, cookbook style. */
function Divider({ label }: { label: string }) {
  return (
    <div className="divider">
      <span>{label}</span>
    </div>
  );
}

/** Side effect derived from food temperature (like the in-game cookbook). */
function sideEffect(
  temperature: number | null,
  t: { none: string; coolsBody: string; warmsBody: string },
): string {
  if (temperature == null || temperature === 0) return t.none;
  return temperature < 0 ? t.coolsBody : t.warmsBody;
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

function stripOuterParens(s: string): string {
  let out = s.trim();
  while (out.startsWith('(') && out.endsWith(')')) {
    const inner = out.slice(1, -1);
    if (inner.split('(').length !== inner.split(')').length) break;
    out = inner.trim();
  }
  return out;
}

function parseAtom(atom: string): { chip: RuleChip; forbidden: boolean } | null {
  let a = stripOuterParens(atom);
  let forbidden = false;

  if (a.startsWith('!')) {
    forbidden = true;
    a = stripOuterParens(a.slice(1));
  }

  const nameOnly = a.match(/^names\.(\w+)$/);
  if (nameOnly) return { chip: { type: 'name', key: nameOnly[1] }, forbidden };

  const tagMin = a.match(/^tags\.(\w+)\s*>=\s*([\d.]+)$/);
  if (tagMin) return { chip: { type: 'tag', key: tagMin[1], min: Number(tagMin[2]) }, forbidden };

  const tagOnly = a.match(/^tags\.(\w+)$/);
  if (tagOnly) return { chip: { type: 'tag', key: tagOnly[1] }, forbidden };

  const tagNo = a.match(/^tags\.(\w+)\s*<=\s*0(?:\.0+)?$/);
  if (tagNo) return { chip: { type: 'tag', key: tagNo[1] }, forbidden: true };

  return null;
}

function uniqChips(items: RuleChip[]): RuleChip[] {
  const seen = new Set<string>();
  const out: RuleChip[] = [];
  for (const it of items) {
    const key = `${it.type}:${it.key}:${it.min ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function extractVisualRules(test: string): { required: RuleChip[]; forbidden: RuleChip[]; oneOf: RuleChip[][] } {
  if (test.trim() === 'true') return { required: [], forbidden: [], oneOf: [] };

  const required: RuleChip[] = [];
  const forbidden: RuleChip[] = [];
  const oneOf: RuleChip[][] = [];

  for (const andPart of splitTopLevel(test, '&&')) {
    const orParts = splitTopLevel(andPart, '||');
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

  return { required: uniqChips(required), forbidden: uniqChips(forbidden), oneOf };
}

function fmtAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function howToSummary(recipe: Recipe, locale: 'th' | 'en'): string[] {
  if (!recipe.card_def) return [];
  const expanded = recipe.card_def.flatMap(([name, count]) => Array.from({ length: count }, () => name));
  const { tags } = engine.getIngredientData(expanded);
  return Object.entries(tags)
    .filter(([tag, value]) => value > 0 && !['precook', 'dried', 'decoration', 'seed'].includes(tag))
    .sort((a, b) => b[1] - a[1])
    .map(([tag, value]) => `${TAG_SHORT[locale][tag] ?? tag} ${fmtAmount(value)}`);
}

function expandCardDef(recipe: Recipe): string[] {
  if (!recipe.card_def) return [];
  return recipe.card_def.flatMap(([name, count]) => Array.from({ length: count }, () => name)).slice(0, 4);
}

function RuleCard({ chip, forbidden }: { chip: RuleChip; forbidden?: boolean }) {
  const { locale, t } = useLocale();
  const prefab = chip.type === 'name' ? chip.key : TAG_ICON_PREFAB[chip.key] ?? chip.key;
  const isIngredient = chip.type === 'name';
  const title = chip.type === 'name'
    ? displayName(chip.key, locale)
    : `${TAG_SHORT[locale][chip.key] ?? chip.key}${chip.min != null ? ` (${t.tagTotalAtLeast(chip.min)})` : ''}`;

  return (
    <div className={`rule-chip${forbidden ? ' forbidden' : ''}${isIngredient ? ' icon-only' : ''}`} title={title}>
      <span className="rule-icon-wrap">
        <ItemIcon prefab={prefab} size={44} fallback="name" variant="square" />
      </span>
      {!isIngredient && (
        <span className="rule-text">
          {`${TAG_SHORT[locale][chip.key] ?? chip.key}${chip.min != null ? ` • ${t.tagTotalAtLeast(chip.min)}` : ''}`}
        </span>
      )}
    </div>
  );
}

export default function RecipeDetail({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { locale, t } = useLocale();
  const s = recipe.stats;
  const rules = extractVisualRules(recipe.test);
  const hasAnyRule = rules.required.length > 0 || rules.forbidden.length > 0 || rules.oneOf.length > 0;
  const summary = howToSummary(recipe, locale);
  const cookExample = expandCardDef(recipe);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h2 className="dish-title">{displayName(recipe.name, locale)}</h2>
        <div className="flourish"><span>❧</span></div>

        <div className="dish-header">
          <div className="dish-frame">
            <ItemIcon prefab={recipe.name} size={72} />
          </div>
          <StatMeters stats={s} size="lg" />
        </div>

        <Divider label={t.sideEffects} />
        <div className="col-val">{sideEffect(s.temperature, t)}</div>

        <Divider label={t.howTo} />
        {summary.length > 0 && <div className="howto-summary">{summary.join(', ')}</div>}
        {recipe.card_def && (
          <div className="howto recipe-visual-required">
            {recipe.card_def.map(([name, count], i) => (
              <span key={i} className="card-ing" title={displayName(name, locale)}>
                <ItemIcon prefab={name} size={54} fallback="name" variant="square" />
                <span className="card-ing-count">×{count}</span>
              </span>
            ))}
          </div>
        )}

        {cookExample.length > 0 && (
          <>
            <Divider label={t.cookExample} />
            <div className="cook-example">
              <div className="cook-example-slots">
                {cookExample.map((name, i) => (
                  <span key={`${name}-${i}`} className="cook-example-slot" title={displayName(name, locale)}>
                    <ItemIcon prefab={name} size={48} fallback="name" variant="square" />
                  </span>
                ))}
              </div>
              <div className="cook-example-arrow" aria-hidden="true">→</div>
              <div className="cook-example-result" title={displayName(recipe.name, locale)}>
                <ItemIcon prefab={recipe.name} size={58} fallback="name" variant="square" />
                <span className="cook-example-name">{displayName(recipe.name, locale)}</span>
              </div>
            </div>
          </>
        )}

        {rules.required.length > 0 && (
          <>
            <Divider label={t.requiredIngredients} />
            <div className="rule-list">
              {rules.required.map((r, i) => <RuleCard key={`req-${r.type}-${r.key}-${i}`} chip={r} />)}
            </div>
          </>
        )}

        {rules.oneOf.length > 0 && (
          <>
            <div className="rule-title">🔀 {t.oneOfIngredients}</div>
            <div className="rule-groups">
              {rules.oneOf.map((group, i) => (
                <div className="rule-list rule-group" key={`oneof-${i}`}>
                  {group.map((r, j) => <RuleCard key={`oneof-${i}-${r.type}-${r.key}-${j}`} chip={r} />)}
                </div>
              ))}
            </div>
          </>
        )}

        {rules.forbidden.length > 0 && (
          <>
            <Divider label={t.forbiddenIngredients} />
            <div className="rule-list">
              {rules.forbidden.map((r, i) => <RuleCard key={`ban-${r.type}-${r.key}-${i}`} chip={r} forbidden />)}
            </div>
          </>
        )}

        {!hasAnyRule && <div className="col-val">{t.noSpecificRule}</div>}
      </div>
    </div>
  );
}
