import { useMemo, useState } from 'react';
import { recipes } from '../data';
import { displayName } from '../format';
import { useLocale } from '../i18n';
import ItemIcon from './ItemIcon';
import SearchBox from './SearchBox';
import StatMeters from './StatMeters';

export default function RecipeBrowser({ onSelect }: { onSelect: (name: string) => void }) {
  const { locale, t } = useLocale();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return recipes
      .filter((r) => !query || r.name.includes(query) || displayName(r.name, locale).toLowerCase().includes(query))
      .sort((a, b) => displayName(a.name, locale).localeCompare(displayName(b.name, locale)));
  }, [q, locale]);

  return (
    <div className="panel">
      <h2>📖 {t.allRecipes} ({list.length})</h2>
      <SearchBox value={q} onChange={setQ} placeholder={t.searchRecipe} />
      <div className="recipe-browser-list">
        {list.map((r) => (
          <button key={r.name} className="recipe-row" onClick={() => onSelect(r.name)}>
            <span className="suggest-name">
              <ItemIcon prefab={r.name} size={32} />
              {displayName(r.name, locale)}
            </span>
            <StatMeters stats={r.stats} size="sm" />
          </button>
        ))}
      </div>
    </div>
  );
}
