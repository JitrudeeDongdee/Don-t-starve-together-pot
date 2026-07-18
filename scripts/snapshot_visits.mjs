// Saves the current visit total into the repo as a fallback.
//   node scripts/snapshot_visits.mjs   ->  src/data/visits_snapshot.json
//
// Abacus is a free community service with no SLA. If it ever disappears the app
// falls back to this snapshot, so the number shown never resets to zero — and we
// keep a value to seed a replacement counter with. Re-run it now and then (or
// from CI) to keep the fallback fresh.
//
// Uses /get, which READS without incrementing, so taking a snapshot never
// inflates the count.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/visits_snapshot.json');

const NAMESPACE = 'dst-cookpot-jitrudeedongdee';
const KEY = 'visits';
const API = 'https://abacus.jasoncameron.dev';

const res = await fetch(`${API}/get/${NAMESPACE}/${KEY}`);
if (!res.ok) {
  // 404 just means nobody has visited yet — keep whatever we already have.
  console.error(`abacus returned ${res.status}; leaving the existing snapshot untouched`);
  process.exit(res.status === 404 ? 0 : 1);
}

const { value } = await res.json();
if (typeof value !== 'number' || !Number.isFinite(value)) {
  console.error(`unexpected payload from abacus: ${JSON.stringify(value)}`);
  process.exit(1);
}

let previous = 0;
try {
  previous = JSON.parse(readFileSync(OUT, 'utf8')).value ?? 0;
} catch {
  // no snapshot yet
}

// The tally only ever grows; a smaller number means the counter was reset or
// replaced, and overwriting would silently lose history.
if (value < previous) {
  console.error(`refusing to overwrite: remote ${value} is lower than saved ${previous}`);
  process.exit(1);
}

writeFileSync(
  OUT,
  `${JSON.stringify({ value, fetchedAt: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
);
console.log(`visits snapshot: ${previous} -> ${value}`);
