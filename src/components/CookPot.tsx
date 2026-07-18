import { recipeByName } from '../data';
import type { CookChance, Recipe } from '../engine/types';
import { displayName } from '../format';
import { useLocale } from '../i18n';
import ItemIcon from './ItemIcon';
import StatMeters from './StatMeters';

export interface Suggestion {
  exact?: CookChance[];
  reach?: Recipe[];
}

interface Props {
  slots: (string | null)[];
  suggestion: Suggestion | null;
  onRemove: (i: number) => void;
  onSelectRecipe: (name: string) => void;
}

function MiniStats({ name }: { name: string }) {
  const r = recipeByName.get(name);
  if (!r) return null;
  return <StatMeters stats={r.stats} size="sm" />;
}

export default function CookPot({ slots, suggestion, onRemove, onSelectRecipe }: Props) {
  const { locale, t } = useLocale();

  return (
    <div className="panel pot-wrap">
      <div className="pot">
        {slots.map((s, i) => (
          <div
            key={i}
            className={`slot${s ? ' filled' : ''}`}
            title={s ? `${displayName(s, locale)} — ${t.removeHint}` : `${t.emptySlot} ${i + 1}`}
            onClick={() => s && onRemove(i)}
          >
            {s ? <ItemIcon prefab={s} size={54} fallback="name" /> : '+'}
          </div>
        ))}
      </div>

      {suggestion && (
        <div className="suggest">
          <div className="suggest-list">
            {suggestion.exact?.map((c) => (
              <button key={c.name} className="suggest-item" onClick={() => onSelectRecipe(c.name)}>
                <span className="suggest-name">
                  <ItemIcon prefab={c.name} size={28} />
                  {displayName(c.name, locale)}
                </span>
                <MiniStats name={c.name} />
                <span className="pct">{(c.chance * 100).toFixed(0)}%</span>
              </button>
            ))}
            {suggestion.reach?.map((r) => (
              <button key={r.name} className="suggest-item" onClick={() => onSelectRecipe(r.name)}>
                <span className="suggest-name">
                  <ItemIcon prefab={r.name} size={28} />
                  {displayName(r.name, locale)}
                </span>
                <MiniStats name={r.name} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
