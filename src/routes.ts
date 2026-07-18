// Single source of truth for routes and their SEO metadata.
// scripts/generate_sitemap.mjs reads this too, so sitemap.xml can never drift
// out of sync with the routes the app actually serves.

export const SITE_ORIGIN = 'https://jitrudeedongdee.github.io';
export const BASE_PATH = '/Don-t-starve-together-pot/';

export interface RouteMeta {
  /** Path relative to the router basename, e.g. "/" or "/recipes". */
  path: string;
  title: string;
  description: string;
  /** Visible page heading. */
  heading: string;
  headingTh: string;
}

export const ROUTES: RouteMeta[] = [
  {
    path: '/',
    title: "DST Cook Pot Simulator | Don't Starve Together Crock Pot Recipes",
    description:
      "Test Don't Starve Together crock pot combinations: drop in four ingredients and see which dish you get, with exact health, hunger and sanity values from the game files.",
    heading: "Don't Starve Together Crock Pot Simulator",
    headingTh: 'เครื่องจำลองหม้อปรุงอาหาร Don’t Starve Together',
  },
  {
    path: '/recipes',
    title: "All Crock Pot Recipes | Don't Starve Together Cookbook",
    description:
      "Every Don't Starve Together crock pot dish with its ingredients, requirements and stats — health, hunger, sanity, spoilage and cooking time, straight from the game scripts.",
    heading: "All Don't Starve Together Crock Pot Recipes",
    headingTh: 'สูตรอาหารหม้อปรุง Don’t Starve Together ทั้งหมด',
  },
];

export const canonicalFor = (path: string) =>
  `${SITE_ORIGIN}${BASE_PATH}${path.replace(/^\//, '')}`;
