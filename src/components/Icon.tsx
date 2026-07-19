// Inline SVG icon set. Emoji are banned in the UI (see spec.md "Design rules"):
// they render differently per OS/font, can't inherit the parchment palette, and
// several of ours had no Thai-font coverage. These draw with `currentColor`, so
// they take the colour of whatever they sit in.

export type IconName =
  | 'pot'
  | 'sprout'
  | 'book'
  | 'globe'
  | 'mail'
  | 'close'
  | 'menu'
  | 'filter'
  | 'star'
  | 'shuffle'
  | 'flourish'
  | 'arrow-left';

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  /** Fill the shape with currentColor — for on/off icons like the star. */
  filled?: boolean;
}

const PATHS: Record<IconName, JSX.Element> = {
  // crock pot on its stand — the site's own subject
  pot: (
    <>
      <path d="M4 9h16" />
      <path d="M5.5 9v4a6.5 6.5 0 0 0 13 0V9" />
      <path d="M9 9V7.5A3 3 0 0 1 15 7.5V9" />
      <path d="M7 19l-2 2M17 19l2 2" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13C12 9 9 7 5 7c0 4 3 6 7 6z" />
      <path d="M12 13c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5z" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v16H5.5A1.5 1.5 0 0 0 4 20.5z" />
      <path d="M4 17.5A1.5 1.5 0 0 1 5.5 16H19" />
      <path d="M8 7.5h7M8 10.5h5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  star: (
    <>
      <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z" />
    </>
  ),
  // three lines with sliders — still reads as "the burger", but says "filter"
  filter: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4" />
      <path d="M18 3l3 4-3 4M18 13l3 4-3 4" />
    </>
  ),
  // decorative divider (replaces the old fleuron glyph)
  flourish: (
    <>
      <path d="M2 12h6" />
      <path d="M22 12h-6" />
      <path d="M12 8c2.2 0 3.5 1.2 3.5 2.6S14 13 12 13s-3.5-1-3.5-2.4S9.8 8 12 8z" />
      <path d="M12 13v3" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
};

export default function Icon({ name, size = 20, className, filled = false }: Props) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
