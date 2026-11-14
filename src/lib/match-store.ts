/** Loading single matches (database first, then OpenDota) and background sync of a player's matches. Server only. */

import { after } from "next/server";
import { getMatch, getStoredInfo, saveMatch, type StoredMatch } from "@/lib/match-db";
import { pickMatchesToSync } from "@/lib/match-rows";
import { fetchJson } from "@/lib/opendota";
import type { RawFullMatch } from "@/types/opendota-match";

export { getMatch, saveMatch, type StoredMatch };

/** A stored unparsed copy is reused this long, so "Analyse with OpenDota" -> "Check again" shows results soon. */
const UNPARSED_FRESH_MS = 2 * 60_000;
const SYNC_LIMIT = 5;
const SYNC_GAP_MS = 1000;

/** Runs work after the response is sent (Next's after()); scripts pass their own. */
export type Schedule = (task: () => Promise<void>) => void;
const afterResponse: Schedule = (task) => after(task);

async function getMatchSafely(matchId: number): Promise<StoredMatch | null> {
  try {
    return await getMatch(matchId);
  } catch {
    return null; // Database down or slow: behave as "not stored".
  }
}

/**
 * The one read path for a single match: the stored copy when parsed (or unparsed and very recent),
 * otherwise OpenDota. Saving the fetched match is scheduled, never awaited, so a slow database
 * cannot hold up the page. Falls back to an older stored copy when OpenDota fails.
 */
export async function loadMatch(matchId: number, schedule: Schedule = afterResponse): Promise<RawFullMatch | null> {
  const stored = await getMatchSafely(matchId);
  if (stored && (stored.parsed || Date.now() - stored.fetchedAt.getTime() < UNPARSED_FRESH_MS)) return stored.data;

  try {
    const raw = await fetchJson<RawFullMatch>(`/matches/${matchId}`);
    schedule(() => saveMatch(raw).catch(() => undefined));
    return raw;
  } catch {
    return stored?.data ?? null;
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Match ids being synced right now (Stats and History can both start a sync on the same visit). */
const inFlight = new Set<number>();

/** Saves up to 5 missing or stale matches, one OpenDota request per `gapMs`. Never throws. */
export async function syncRecentMatches(recentMatchIds: number[], gapMs = SYNC_GAP_MS): Promise<void> {
  // Claim ids before the first await, so an overlapping sync cannot pick the same matches.
  const claimed = recentMatchIds.filter((matchId) => !inFlight.has(matchId));
  for (const matchId of claimed) inFlight.add(matchId);
  try {
    const toSync = pickMatchesToSync(claimed, await getStoredInfo(claimed), new Date(), SYNC_LIMIT);
    for (const [index, matchId] of toSync.entries()) {
      if (index > 0) await pause(gapMs);
      try {
        await saveMatch(await fetchJson<RawFullMatch>(`/matches/${matchId}`));
      } catch {
        // OpenDota or the database failed for this match: retried on a later visit.
      }
    }
  } catch {
    // Database unavailable: skip syncing this time.
  } finally {
    for (const matchId of claimed) inFlight.delete(matchId);
  }
}
