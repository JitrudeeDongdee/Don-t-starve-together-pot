import { useFavorites, type FavKind } from '../favorites';
import { useLocale } from '../i18n';
import Icon from './Icon';

interface Props {
  kind: FavKind;
  id: string;
  size?: number;
  className?: string;
}

/**
 * Star toggle. Always rendered as a sibling of the row/tile button rather than
 * inside it — a button nested in a button is invalid HTML and the inner click
 * would fire the outer action too.
 */
export default function FavButton({ kind, id, size = 18, className }: Props) {
  const { isFav, toggle } = useFavorites();
  const { t } = useLocale();
  const on = isFav(kind, id);
  const label = on ? t.unfavorite : t.favorite;

  return (
    <button
      type="button"
      className={`fav-btn${on ? ' on' : ''}${className ? ` ${className}` : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        toggle(kind, id);
      }}
      title={label}
      aria-label={label}
      aria-pressed={on}
    >
      <Icon name="star" size={size} filled={on} />
    </button>
  );
}
