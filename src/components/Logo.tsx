import { useEffect, useState } from 'react';
import Icon, { type IconName } from './Icon';

export type LogoVariant = 'cook' | 'farming';

// Each section brands itself, so the header always says which one you are in.
const LOGOS: Record<LogoVariant, { file: string; word: string; fallback: IconName }> = {
  cook: { file: 'logo.png', word: 'Crock Pot', fallback: 'pot' },
  farming: { file: 'logo-farming.png', word: 'Farming', fallback: 'sprout' },
};

interface Props {
  size?: number;
  /** Hide the wordmark and show the mark alone (tight layouts). */
  markOnly?: boolean;
  variant?: LogoVariant;
}

/**
 * Site logo — in-game art for the current section.
 * Per spec.md every image needs a placeholder, so a failed load falls back to
 * the drawn icon rather than a broken-image box.
 */
export default function Logo({ size = 34, markOnly = false, variant = 'cook' }: Props) {
  const [failed, setFailed] = useState(false);
  const logo = LOGOS[variant];

  // Without this, one section failing to load would leave the next one showing
  // the fallback too, since `failed` would still be true.
  useEffect(() => setFailed(false), [variant]);

  return (
    <span className="logo" style={{ ['--logo-size' as string]: `${size}px` }}>
      <span className="logo-mark" aria-hidden="true">
        {failed ? (
          <Icon name={logo.fallback} size={Math.round(size * 0.66)} />
        ) : (
          <img
            src={`${import.meta.env.BASE_URL}${logo.file}`}
            alt=""
            width={size}
            height={size}
            onError={() => setFailed(true)}
          />
        )}
      </span>
      {!markOnly && <span className="logo-word">{logo.word}</span>}
    </span>
  );
}
