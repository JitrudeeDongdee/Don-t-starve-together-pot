import { useMemo, useState } from 'react';
import { ingredientNames } from '../data';
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  FILTER_CATEGORIES,
  displayName,
  filterBucket,
  type Category,
} from '../format';
import { useFavorites } from '../favorites';
import { useLocale } from '../i18n';
import FavButton from './FavButton';
import Icon from './Icon';
import ItemIcon from './ItemIcon';
import SearchBox from './SearchBox';

interface Props {
  potFull: boolean;
  onAdd: (prefab: string) => void;
}

export default function IngredientPicker({ potFull, onAdd }: Props) {
  const { locale, t } = useLocale();
  const { isFav, count } = useFavorites();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all' | 'fav'>('all');
  // phone only: the chip row costs three lines, so it hides behind this toggle
  const [filterOpen, setFilterOpen] = useState(false);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ingredientNames.filter((n) => {
      if (cat === 'fav') {
        if (!isFav('ingredient', n)) return false;
      } else if (cat !== 'all' && filterBucket(n) !== cat) return false;
      if (!query) return true;
      return n.includes(query) || displayName(n, locale).toLowerCase().includes(query);
    });
  }, [q, cat, locale, isFav]);

  return (
    <div className="panel">
      <div className="picker-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder={t.searchIngredient} />
        <button
          className={`filter-toggle filter-toggle-cat${cat !== 'all' ? ' filtered' : ''}`}
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          aria-controls="cat-filter"
          title={t.category}
          aria-label={t.category}
        >
          <Icon name="filter" size={20} />
        </button>
      </div>
      <div id="cat-filter" className={`cat-filter${filterOpen ? ' open' : ''}`}>
        <button
          className={`cat-chip${cat === 'all' ? ' active' : ''}`}
          onClick={() => setCat('all')}
        >
          {t.all}
        </button>
        <button
          className={`cat-chip cat-chip-fav${cat === 'fav' ? ' active' : ''}`}
          onClick={() => setCat('fav')}
        >
          <Icon name="star" size={13} filled={cat === 'fav'} />
          {t.favoritesOnly} ({count('ingredient')})
        </button>
        {FILTER_CATEGORIES.map((c) => (
          <button
            key={c}
            className={`cat-chip${cat === c ? ' active' : ''}`}
            style={{ borderColor: CATEGORY_COLOR[c] }}
            onClick={() => setCat(c)}
          >
            {CATEGORY_LABEL[locale][c]}
          </button>
        ))}
      </div>
      {cat === 'fav' && list.length === 0 && <p className="empty-note">{t.noFavorites}</p>}
      <div className="grid">
        {list.map((n) => (
          <div className="tile-wrap" key={n}>
            <button
              className="tile"
              disabled={potFull}
              title={`${displayName(n, locale)} — ${CATEGORY_LABEL[locale][filterBucket(n)]}`}
              onClick={() => onAdd(n)}
            >
              <ItemIcon prefab={n} size={44} fallback="name" variant="bare" />
            </button>
            <FavButton kind="ingredient" id={n} size={14} className="fav-on-tile" />
          </div>
        ))}
      </div>
    </div>
  );
}
