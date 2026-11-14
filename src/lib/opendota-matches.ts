/** A player's recent matches and single-match details from OpenDota. */

import { cacheLife } from "next/cache";
import { toMatchDetail } from "@/lib/match-detail";
import { fetchJson, getJson } from "@/lib/opendota";
import { getHeroIndex, getItemIndex } from "@/lib/opendota-heroes";
import { toMatchSummary } from "@/lib/player-summary";
import type { MatchDetail, MatchSummary, RawMatch, RawMatchDetail } from "@/types/opendota";

const FIVE_MINUTES = 300;
const ONE_HOUR = 3600;
const ONE_WEEK = 7 * 24 * 3600;

const MATCH_FIELDS = [
  "hero_id", "kills", "deaths", "assists", "gold_per_min", "xp_per_min", "last_hits", "hero_damage",
  "item_0", "item_1", "item_2", "item_3", "item_4", "item_5", "lane_role", "version",
];

/** Last 100 matches, newest first. Null when OpenDota failed; [] when the player has no public matches. */
export async function getRecentMatches(accountId: string): Promise<MatchSummary[] | null> {
  const project = MATCH_FIELDS.map((field) => `project=${field}`).join("&");
  const rows = await getJson<RawMatch[]>(`/players/${accountId}/matches?limit=100&${project}`, FIVE_MINUTES);
  return rows ? rows.map(toMatchSummary) : null;
}

export type MatchDetailResult = { kind: "ok"; detail: MatchDetail } | { kind: "not-in-match" } | { kind: "error" };

/**
 * Caches only the player's trimmed slice, never the large raw match.
 * Finished, parsed matches never change (1 week); unparsed ones may be parsed soon (1 hour).
 */
async function cachedMatchDetail(matchId: number, accountId: string): Promise<MatchDetail | null> {
  "use cache";
  const raw = await fetchJson<RawMatchDetail>(`/matches/${matchId}`);
  const [items, heroes] = await Promise.all([getItemIndex(), getHeroIndex()]);
  // Without the indexes the slice would silently lose items and deaths: fail so nothing is cached.
  if (items.byKey.size === 0 || heroes.size === 0) throw new Error("OpenDota hero/item data unavailable");

  const detail = toMatchDetail(raw, Number(accountId), items.byKey, heroes);
  cacheLife({ revalidate: detail?.parsed ? ONE_WEEK : ONE_HOUR });
  return detail;
}

export async function getMatchDetail(matchId: number, accountId: string): Promise<MatchDetailResult> {
  try {
    const detail = await cachedMatchDetail(matchId, accountId);
    return detail ? { kind: "ok", detail } : { kind: "not-in-match" };
  } catch {
    return { kind: "error" };
  }
}
