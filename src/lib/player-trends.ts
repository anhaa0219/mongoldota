/** Recent form: the last 20 matches against the ones before them. Pure. */

import type { FormTrend, FormWindow } from "@/types/coach";
import type { MatchSummary } from "@/types/opendota";

export const RECENT_MATCHES = 20;
/** Both stretches need at least this many matches for the comparison to mean anything. */
const MIN_WINDOW = 10;

function windowOf(matches: MatchSummary[]): FormWindow {
  const sum = (pick: (match: MatchSummary) => number) => matches.reduce((total, match) => total + pick(match), 0);
  const deaths = sum((match) => match.deaths);
  return {
    matches: matches.length,
    winRate: (matches.filter((match) => match.won).length / matches.length) * 100,
    kda: (sum((match) => match.kills) + sum((match) => match.assists)) / Math.max(1, deaths),
    deaths: deaths / matches.length,
    gpm: sum((match) => match.gpm) / matches.length,
  };
}

/** Matches must be newest first. Null when there are not enough matches on either side. */
export function formTrend(matches: MatchSummary[]): FormTrend | null {
  const recent = matches.slice(0, RECENT_MATCHES);
  const earlier = matches.slice(RECENT_MATCHES);
  if (recent.length < MIN_WINDOW || earlier.length < MIN_WINDOW) return null;
  return { recent: windowOf(recent), earlier: windowOf(earlier) };
}
