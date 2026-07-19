import { useMemo, useState } from 'react';
import { recipes } from '../data';
import { useFavorites } from '../favorites';
import { displayName } from '../format';
import { useLocale } from '../i18n';
import FavButton from './FavButton';
import Icon from './Icon';
import ItemIcon from './ItemIcon';
import SearchBox from './SearchBox';
import StatMeters from './StatMeters';

interface Props {
  onSelect: (name: string) => void;
  showBorder?: boolean;
}

export default function RecipeBrowser({ onSelect, showBorder = true }: Props) {
  const { locale, t } = useLocale();
  const { isFav, count } = useFavorites();
  const [q, setQ] = useState('');
  const [favOnly, setFavOnly] = useState(false);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return recipes
      .filter((r) => !favOnly || isFav('recipe', r.name))
      .filter((r) => !query || r.name.includes(query) || displayName(r.name, locale).toLowerCase().includes(query))
      .sort((a, b) => {
        // starred dishes float to the top, alphabetical within each group
        const fa = isFav('recipe', a.name);
        const fb = isFav('recipe', b.name);
        if (fa !== fb) return fa ? -1 : 1;
        return displayName(a.name, locale).localeCompare(displayName(b.name, locale));
      });
  }, [q, locale, favOnly, isFav]);

  return (
    <div className={`panel recipe-browser-panel${showBorder ? '' : ' panel-borderless'}`}>
      {/* <h2><Icon name="book" size={18} /> {t.allRecipes} ({list.length})</h2> */}
      <div className="picker-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder={t.searchRecipe} />
        <button
          className={`filter-toggle${favOnly ? ' filtered' : ''}`}
          onClick={() => setFavOnly((v) => !v)}
          aria-pressed={favOnly}
          title={`${t.favoritesOnly} (${count('recipe')})`}
          aria-label={`${t.favoritesOnly} (${count('recipe')})`}
        >
          <Icon name="star" size={20} filled={favOnly} />
        </button>
      </div>
      {favOnly && list.length === 0 && <p className="empty-note">{t.noFavorites}</p>}
      <div className="recipe-browser-list">
        {list.map((r) => (
          <div className="recipe-row-wrap" key={r.name}>
            <FavButton kind="recipe" id={r.name} size={22} />
            <button className="recipe-row" onClick={() => onSelect(r.name)}>
              <span className="suggest-name">
                <ItemIcon prefab={r.name} size={32} variant="bare" />
                {displayName(r.name, locale)}
              </span>
              <StatMeters stats={r.stats} size="sm" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
