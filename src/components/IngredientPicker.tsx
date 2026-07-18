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
import { useLocale } from '../i18n';
import ItemIcon from './ItemIcon';
import SearchBox from './SearchBox';

interface Props {
  potFull: boolean;
  onAdd: (prefab: string) => void;
}

export default function IngredientPicker({ potFull, onAdd }: Props) {
  const { locale, t } = useLocale();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ingredientNames.filter((n) => {
      if (cat !== 'all' && filterBucket(n) !== cat) return false;
      if (!query) return true;
      return n.includes(query) || displayName(n, locale).toLowerCase().includes(query);
    });
  }, [q, cat, locale]);

  return (
    <div className="panel">
      <SearchBox value={q} onChange={setQ} placeholder={t.searchIngredient} />
      <div className="cat-filter">
        <button
          className={`cat-chip${cat === 'all' ? ' active' : ''}`}
          onClick={() => setCat('all')}
        >
          {t.all}
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
      <div className="grid">
        {list.map((n) => (
          <button
            key={n}
            className="tile"
            disabled={potFull}
            title={`${displayName(n, locale)} — ${CATEGORY_LABEL[locale][filterBucket(n)]}`}
            onClick={() => onAdd(n)}
          >
            <ItemIcon prefab={n} size={44} fallback="name" variant="bare" />
          </button>
        ))}
      </div>
    </div>
  );
}
