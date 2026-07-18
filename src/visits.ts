// Cumulative visit counter.
//
// The site is static (GitHub Pages), so there is no backend to keep a tally and
// GA4 cannot be read from the browser — it only accepts writes. We use Abacus,
// a free no-signup counter API, and keep a snapshot of the value in the repo so
// the number survives the service going away.
//
// Counts every page open (not unique browsers), by request.

import snapshot from './data/visits_snapshot.json';

const NAMESPACE = 'dst-cookpot-jitrudeedongdee';
const KEY = 'visits';
const API = 'https://abacus.jasoncameron.dev';

export interface VisitCount {
  value: number;
  /** 'live' = counted just now; 'snapshot' = service unreachable, showing the last saved value. */
  source: 'live' | 'snapshot';
  /** ISO date of the snapshot, when falling back. */
  snapshotAt?: string;
}

const SNAPSHOT: { value: number; fetchedAt: string } = snapshot;

let pending: Promise<VisitCount> | null = null;

/**
 * Increment and read the counter. Cached per page load so React strict-mode
 * double-mounts (and the contact modal opening twice) don't inflate the count.
 */
export function recordVisit(): Promise<VisitCount> {
  if (pending) return pending;

  pending = fetch(`${API}/hit/${NAMESPACE}/${KEY}`)
    .then((res) => {
      if (!res.ok) throw new Error(`abacus ${res.status}`);
      return res.json() as Promise<{ value: number }>;
    })
    .then(({ value }) => ({ value, source: 'live' as const }))
    .catch(() => ({
      value: SNAPSHOT.value,
      source: 'snapshot' as const,
      snapshotAt: SNAPSHOT.fetchedAt,
    }));

  return pending;
}
