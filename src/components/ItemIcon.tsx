import { useState } from 'react';
import { displayName, iconOf } from '../format';

interface Props {
  prefab: string;
  size?: number;
  /** What to show when there is no art: 'placeholder' = "?" box, 'name' = the item name. */
  fallback?: 'placeholder' | 'name';
}

/**
 * Game-art icon for an item/dish.
 * Falls back (per `fallback`) when there is no art in the manifest OR when the
 * image file fails to load at runtime (404, network error).
 */
export default function ItemIcon({ prefab, size = 36, fallback = 'placeholder' }: Props) {
  const src = iconOf(prefab);
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}${src}`}
        alt={displayName(prefab)}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ imageRendering: 'auto', objectFit: 'contain' }}
      />
    );
  }

  if (fallback === 'name') {
    return (
      <span className="icon-name" style={{ width: size, height: size }} title={displayName(prefab)}>
        {displayName(prefab)}
      </span>
    );
  }

  return (
    <span
      className="icon-ph"
      role="img"
      aria-label={displayName(prefab)}
      title={displayName(prefab)}
      style={{ width: size, height: size, fontSize: size * 0.52 }}
    >
      ?
    </span>
  );
}
