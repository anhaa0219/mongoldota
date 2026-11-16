/** Test data shared by the coach tests (benchmarks, trends, suggestions). */

import type { BenchmarkPoint } from "@/types/coach";
import type { MatchSummary } from "@/types/opendota";

let nextId = 1;

/** A 40-minute win on hero 1 with round numbers. */
export function coachMatch(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: nextId++, heroId: 1, won: true, radiant: true, ranked: true,
    kills: 4, deaths: 4, assists: 8, gpm: 500, xpm: 600, lastHits: 200, heroDamage: 24000,
    items: [0, 0, 0, 0, 0, 0], laneRole: null, parsed: false, durationSeconds: 2400, playedAt: 0,
    ...overrides,
  };
}

/** Straight line from `low` at the 10th percentile to `high` at the 90th. */
export function curve(low: number, high: number): BenchmarkPoint[] {
  return [0.1, 0.5, 0.9].map((percentile) => ({ percentile, value: low + ((percentile - 0.1) / 0.8) * (high - low) }));
}
