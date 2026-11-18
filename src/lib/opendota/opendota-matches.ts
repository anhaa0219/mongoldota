/** A player's recent matches (OpenDota) and single-match details (database first, see match-store). */

import { toMatchDetail } from "@/lib/matches/match-detail";
import { loadMatch } from "@/lib/matches/match-store";
import { getJson, postOpenDota } from "@/lib/opendota/opendota";
import { getHeroIndex, getItemIndex } from "@/lib/opendota/opendota-heroes";
import { toMatchSummary } from "@/lib/player/player-summary";
import { toPlaystyle } from "@/lib/player/playstyle";
import type { MatchDetail } from "@/types/match-detail";
import type { MatchSummary, PlaystyleStat, RawMatch, RawTotal } from "@/types/opendota";

const FIVE_MINUTES = 300;

const MATCH_FIELDS = [
  "hero_id", "kills", "deaths", "assists", "gold_per_min", "xp_per_min", "last_hits", "hero_damage",
  "item_0", "item_1", "item_2", "item_3", "item_4", "item_5", "lane_role", "version",
  // With project= OpenDota drops start_time from its defaults; History's "3 d ago" needs it.
  "start_time",
];

/** Last 100 matches, newest first. Null when OpenDota failed; [] when the player has no public matches. */
export async function getRecentMatches(accountId: string): Promise<MatchSummary[] | null> {
  const project = MATCH_FIELDS.map((field) => `project=${field}`).join("&");
  const rows = await getJson<RawMatch[]>(`/players/${accountId}/matches?limit=100&${project}`, FIVE_MINUTES);
  return rows ? rows.map(toMatchSummary) : null;
}

export type MatchDetailResult = { kind: "ok"; detail: MatchDetail } | { kind: "not-in-match" } | { kind: "error" };

/** The linked player's slice of one match (History detail panel). */
export async function getMatchDetail(matchId: number, accountId: string): Promise<MatchDetailResult> {
  const [raw, items, heroes] = await Promise.all([loadMatch(matchId), getItemIndex(), getHeroIndex()]);
  // Without the indexes the slice would silently lose items and deaths.
  if (!raw || items.byKey.size === 0 || heroes.size === 0) return { kind: "error" };

  const detail = toMatchDetail(raw, Number(accountId), items, heroes);
  return detail ? { kind: "ok", detail } : { kind: "not-in-match" };
}

/** Playstyle averages over the last 100 matches. Null when OpenDota failed. */
export async function getPlaystyle(accountId: string): Promise<PlaystyleStat[] | null> {
  const totals = await getJson<RawTotal[]>(`/players/${accountId}/totals?limit=100`, FIVE_MINUTES);
  return totals ? toPlaystyle(totals) : null;
}

/** Asks OpenDota to analyse a match's replay; the result appears a few minutes later. */
export function requestParse(matchId: number): Promise<boolean> {
  return postOpenDota(`/request/${matchId}`);
}
