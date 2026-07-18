import type { RecipeStats } from '../engine/types';

// Central status-meter display used everywhere (recipe detail, suggestion list,
// recipe browser). Uses the real in-game HUD meter art from public/icons.
const METER_IMG = {
  health: 'icons/health_meter.png',
  hunger: 'icons/hunger_meter.png',
  sanity: 'icons/sanity_meter.png',
} as const;

type Kind = keyof typeof METER_IMG;
const ORDER: Kind[] = ['health', 'hunger', 'sanity'];

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const base = (p: string) => `${import.meta.env.BASE_URL}${p}`;

interface Props {
  stats: Pick<RecipeStats, 'health' | 'hunger' | 'sanity'>;
  /** 'lg' = big badges with value plaque (recipe detail); 'sm' = compact inline (lists). */
  size?: 'lg' | 'sm';
}

export default function StatMeters({ stats, size = 'sm' }: Props) {
  const items = ORDER.map((k) => [k, stats[k]] as const);

  if (size === 'lg') {
    return (
      <div className="stat-meters lg">
        {items.map(([kind, value]) =>
          value == null ? null : (
            <div className="meter-badge" key={kind}>
              <img className="meter-img" src={base(METER_IMG[kind])} alt={kind} width={64} height={64} />
              <div className={`meter-val${value < 0 ? ' neg' : ''}`}>{fmt(value)}</div>
            </div>
          ),
        )}
      </div>
    );
  }

  return (
    <span className="stat-meters sm">
      {items.map(([kind, value]) =>
        value == null ? null : (
          <span className="meter-mini" key={kind}>
            <img src={base(METER_IMG[kind])} alt={kind} width={20} height={20} />
            <b className={value < 0 ? 'neg' : undefined}>{value > 0 ? '+' : ''}{fmt(value)}</b>
          </span>
        ),
      )}
    </span>
  );
}
