import type { Recipe } from '../engine/types';
import { displayName, humanizeTest, perishDays } from '../format';
import { useLocale, type Strings } from '../i18n';
import ItemIcon from './ItemIcon';
import StatMeters from './StatMeters';

const FOODTYPE_LABEL: Record<string, { th: string; en: string }> = {
  MEAT: { th: 'เนื้อ', en: 'Meat' },
  VEGGIE: { th: 'ผัก', en: 'Veggie' },
  GENERIC: { th: 'ทั่วไป', en: 'Generic' },
  GOODIES: { th: 'ของหวาน', en: 'Goodies' },
  ELEMENTAL: { th: 'ธาตุ', en: 'Elemental' },
  ROUGHAGE: { th: 'หยาบ', en: 'Roughage' },
  RAW: { th: 'ดิบ', en: 'Raw' },
};

/** Qualitative labels like the in-game cookbook (Spoils: Slowly / Cooking Time: Long). */
function spoilLabel(perishtime: number | null, t: Strings): string {
  if (perishtime == null) return t.neverSpoils;
  if (perishtime >= 7200) return t.spoilSlow;
  if (perishtime >= 4800) return t.spoilAvg;
  return t.spoilFast;
}
function cookLabel(cooktime: number | null, t: Strings): string {
  if (cooktime == null) return '—';
  if (cooktime >= 2) return t.timeLong;
  if (cooktime >= 1) return t.timeMed;
  return t.timeShort;
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
function sideEffect(temperature: number | null, t: Strings): string {
  if (temperature == null || temperature === 0) return t.none;
  return temperature < 0 ? t.coolsBody : t.warmsBody;
}

export default function RecipeDetail({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { locale, t } = useLocale();
  const s = recipe.stats;
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

        <div className="two-col">
          <div>
            <Divider label={t.type} />
            <div className="col-val">{recipe.foodtype ? FOODTYPE_LABEL[recipe.foodtype]?.[locale] ?? recipe.foodtype : '—'}</div>
          </div>
          <div>
            <Divider label={t.spoils} />
            <div className="col-val">
              {spoilLabel(s.perishtime, t)}
              {s.perishtime != null && (
                <span className="col-sub"> ({perishDays(s.perishtime, t)})</span>
              )}
            </div>
          </div>
        </div>

        <Divider label={t.cookingTime} />
        <div className="col-val">
          {cookLabel(s.cooktime, t)} <span className="col-sub">({s.cooktime}s)</span>
        </div>

        <Divider label={t.howTo} />
        {recipe.card_def && (
          <div className="howto">
            {recipe.card_def.map(([name, count], i) => (
              <span key={i} className="card-ing" title={displayName(name, locale)}>
                <ItemIcon prefab={name} size={28} fallback="name" /> ×{count}
              </span>
            ))}
          </div>
        )}
        <ul className="cond">
          {humanizeTest(recipe.test, locale).map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>
    </div>
  );
}
