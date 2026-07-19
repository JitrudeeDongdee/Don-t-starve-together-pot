import { useState } from 'react';
import Icon from './Icon';

interface Props {
  size?: number;
  /** Hide the wordmark and show the pot alone (tight layouts). */
  markOnly?: boolean;
}

/**
 * Site logo — the in-game Crock Pot.
 * Per spec.md every image needs a placeholder, so a failed load falls back to
 * the drawn pot icon rather than a broken-image box.
 */
export default function Logo({ size = 34, markOnly = false }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="logo" style={{ ['--logo-size' as string]: `${size}px` }}>
      <span className="logo-mark" aria-hidden="true">
        {failed ? (
          <Icon name="pot" size={Math.round(size * 0.66)} />
        ) : (
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            width={size}
            height={size}
            onError={() => setFailed(true)}
          />
        )}
      </span>
      {!markOnly && <span className="logo-word">Crock Pot</span>}
    </span>
  );
}
