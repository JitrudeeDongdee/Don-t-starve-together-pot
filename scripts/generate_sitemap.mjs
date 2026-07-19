// Regenerates public/sitemap.xml from src/routes.ts.
//   node scripts/generate_sitemap.mjs
//
// The route list is the single source of truth — hand-editing the sitemap is how
// it silently ends up listing URLs the app doesn't serve (or missing new ones).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ROUTES, canonicalFor } from '../src/routes.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const urls = ROUTES.map(
  (route) => `  <url>
    <loc>${canonicalFor(route.path)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`,
).join('\n');

writeFileSync(
  join(ROOT, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
);

console.log(`sitemap: ${ROUTES.length} url(s)`);
for (const route of ROUTES) console.log(`  ${canonicalFor(route.path)}`);
