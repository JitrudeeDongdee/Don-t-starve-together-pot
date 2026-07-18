import { engine, ingredientStats, recipeByName } from '../data';
import type { CookChance, Recipe } from '../engine/types';
import { displayName, TAG_COLOR, TAG_SHORT } from '../format';
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

export interface Suggestion {
  exact?: CookChance[];
  reach?: Recipe[];
}

interface Props {
  slots: (string | null)[];
  suggestion: Suggestion | null;
  onRemove: (i: number) => void;
  onSelectRecipe: (name: string) => void;
  showBorder?: boolean;
}

function MiniStats({ name }: { name: string }) {
  const r = recipeByName.get(name);
  if (!r) return null;
  return <StatMeters stats={r.stats} size="sm" />;
}

function IngredientStats({ name }: { name: string }) {
  const stats = ingredientStats[name];
  if (!stats) return <span className="pot-summary-val">—</span>;
  return <StatMeters stats={stats} size="sm" />;
}

export default function CookPot({
  slots,
  suggestion,
  onRemove,
  onSelectRecipe,
  showBorder = true,
}: Props) {
  const { locale, t } = useLocale();
  const filled = slots.filter((s): s is string => Boolean(s));
  const potData = filled.length > 0 ? engine.getIngredientData(filled) : null;
  const nameEntries = potData ? Object.entries(potData.names).sort((a, b) => b[1] - a[1]) : [];
  const tagEntries = potData
    ? Object.entries(potData.tags)
      .filter(([tag, value]) => value > 0 && tag !== 'precook')
      .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className={`panel pot-wrap${showBorder ? '' : ' panel-no-border'}`}>
      <div className="pot">
        {slots.map((s, i) => (
          <div
            key={i}
            className={`slot${s ? ' filled' : ''}`}
            title={s ? `${displayName(s, locale)} — ${t.removeHint}` : `${t.emptySlot} ${i + 1}`}
            onClick={() => s && onRemove(i)}
          >
            {s ? <ItemIcon variant='bare'  prefab={s} size={54} fallback="name" /> : '+'}
          </div>
        ))}
      </div>

      {suggestion && (
        <div className="suggest">
          <div className="suggest-list">
            {suggestion.exact?.map((c) => (
              <button key={c.name} className="suggest-item" onClick={() => onSelectRecipe(c.name)}>
                <span className="suggest-name">
                  <ItemIcon variant='bare' prefab={c.name} size={28} />
                  {displayName(c.name, locale)}
                </span>
                <MiniStats name={c.name} />
                <span className="pct">{(c.chance * 100).toFixed(0)}%</span>
              </button>
            ))}
            {suggestion.reach?.map((r) => (
              <button key={r.name} className="suggest-item" onClick={() => onSelectRecipe(r.name)}>
                <span className="suggest-name">
                  <ItemIcon variant='bare' prefab={r.name} size={28} />
                  {displayName(r.name, locale)}
                </span>
                <MiniStats name={r.name} />
              </button>
            ))}

            {potData && (
              <>
                <div className="suggest-group-title">{t.ingredientsInPot}</div>
                {nameEntries.map(([name, count]) => (
                  <div key={`pot-ing-${name}`} className="suggest-item suggest-static-item">
                    <span className="suggest-name">
                      <ItemIcon prefab={name} size={24} fallback="name" variant="bare" />
                      {displayName(name, locale)}
                      {count > 1 && <b className="pot-ing-count">×{count}</b>}
                    </span>
                    <span className="pot-ing-stats">
                      <IngredientStats name={name} />
                    </span>
                  </div>
                ))}

                <div className="suggest-group-title">{t.statusMaster}</div>
                {tagEntries.map(([tag, value]) => (
                  <div
                    key={`pot-tag-${tag}`}
                    className="suggest-item suggest-static-item"
                    style={{ borderColor: TAG_COLOR[tag] ?? 'var(--line)' }}
                  >
                    <span className="suggest-name">
                      <ItemIcon prefab={TAG_ICON_PREFAB[tag] ?? tag} size={24} fallback="name" variant="bare" />
                      {TAG_SHORT[locale][tag] ?? tag}
                    </span>
                    <span className="pct pot-summary-val">
                      {Number.isInteger(value) ? value : value.toFixed(1)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
