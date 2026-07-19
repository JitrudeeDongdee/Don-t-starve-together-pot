// Writes a static HTML file per route into dist/, so crawlers that never run JS
// still get that route's real title / description / canonical / OG tags.
//   node scripts/prerender.mjs      (runs after `vite build`)
//
// This is meta-only prerendering: the body is still the CSR root div. It fixes
// the part crawlers and link unfurlers read without executing JS. Rendering the
// actual page content would need SSR, which is a separate decision.
//
// Route list comes from src/routes.ts, same as the sitemap — hand-editing the
// built HTML is how per-route tags silently drift from the routes we serve.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ROUTES, canonicalFor, BASE_PATH, SITE_ORIGIN } from '../src/routes.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const template = readFileSync(join(DIST, 'index.html'), 'utf8');

/** Escape for use inside a double-quoted HTML attribute. */
const attr = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Replace the content/href of a tag matched by `pattern`.
 * Throws rather than silently no-op'ing — a missed tag means the built page
 * keeps the home page's metadata, which is the exact bug this script prevents.
 */
function replaceTag(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(
      `prerender: no ${label} tag found in dist/index.html — ` +
        'index.html changed shape, update scripts/prerender.mjs',
    );
  }
  return html.replace(pattern, replacement);
}

function pageFor(route) {
  const canonical = canonicalFor(route.path);
  let html = template;

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${attr(route.title)}</title>`, 'title');

  const metas = [
    [/(<meta\s+name="description"\s+content=")[\s\S]*?(")/, route.description, 'description'],
    [/(<meta\s+property="og:title"\s+content=")[\s\S]*?(")/, route.title, 'og:title'],
    [/(<meta\s+property="og:description"\s+content=")[\s\S]*?(")/, route.description, 'og:description'],
    [/(<meta\s+property="og:url"\s+content=")[\s\S]*?(")/, canonical, 'og:url'],
    [/(<meta\s+name="twitter:title"\s+content=")[\s\S]*?(")/, route.title, 'twitter:title'],
    [/(<meta\s+name="twitter:description"\s+content=")[\s\S]*?(")/, route.description, 'twitter:description'],
    [/(<link\s+rel="canonical"\s+href=")[\s\S]*?(")/, canonical, 'canonical'],
  ];

  for (const [pattern, value, label] of metas) {
    html = replaceTag(html, pattern, `$1${attr(value)}$2`, label);
  }

  // Stub pages stay out of the index — same rule the sitemap follows.
  if (route.indexable === false) {
    html = replaceTag(
      html,
      /(<meta\s+name="robots"\s+content=")[\s\S]*?(")/,
      '$1noindex,follow$2',
      'robots',
    );
  }

  return html;
}

// "/" is dist/index.html itself; "/recipes" becomes dist/recipes/index.html so
// GitHub Pages serves it at /recipes without the 404.html bounce.
for (const route of ROUTES) {
  const html = pageFor(route);
  const slug = route.path.replace(/^\//, '');
  const outDir = slug ? join(DIST, slug) : DIST;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  console.log(`prerender: ${slug || 'index'}/index.html — ${route.title}`);
}

console.log(`prerender: ${ROUTES.length} page(s) at ${SITE_ORIGIN}${BASE_PATH}`);
