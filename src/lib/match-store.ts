/** Full matches in Supabase: read, save, load-or-fetch, and background sync. Server only. */

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matches, playerMatches } from "@/db/schema";
import { pickMatchesToSync, toMatchRows } from "@/lib/match-rows";
import { fetchJson } from "@/lib/opendota";
import type { RawFullMatch } from "@/types/opendota-match";

/** A stored unparsed copy is reused this long, so "Analyse with OpenDota" -> "Check again" shows results soon. */
const UNPARSED_FRESH_MS = 2 * 60_000;
const SYNC_LIMIT = 5;
const SYNC_GAP_MS = 1000;

export interface StoredMatch {
  data: RawFullMatch;
  parsed: boolean;
  fetchedAt: Date;
}

export async function getMatch(matchId: number): Promise<StoredMatch | null> {
  if (!db) return null;
  const [row] = await db
    .select({ data: matches.data, parsed: matches.parsed, fetchedAt: matches.fetchedAt })
    .from(matches)
    .where(eq(matches.matchId, matchId))
    .limit(1);
  return row ?? null;
}

/** Upserts the match and replaces its player rows, in one transaction. */
export async function saveMatch(raw: RawFullMatch): Promise<void> {
  if (!db) return;
  const { match, players } = toMatchRows(raw);
  const fetchedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(matches)
      .values({ ...match, fetchedAt })
      .onConflictDoUpdate({
        target: matches.matchId,
        set: { parsed: match.parsed, startTime: match.startTime, durationS: match.durationS, radiantWin: match.radiantWin, data: match.data, fetchedAt },
      });
    await tx.delete(playerMatches).where(eq(playerMatches.matchId, match.matchId));
    if (players.length > 0) await tx.insert(playerMatches).values(players);
  });
}

async function getMatchSafely(matchId: number): Promise<StoredMatch | null> {
  try {
    return await getMatch(matchId);
  } catch {
    return null; // Database down: behave as "not stored".
  }
}

/**
 * The one read path for a single match: the stored copy when parsed (or unparsed and very recent),
 * otherwise OpenDota (saved on the way). Falls back to an older stored copy when OpenDota fails.
 */
export async function loadMatch(matchId: number): Promise<RawFullMatch | null> {
  const stored = await getMatchSafely(matchId);
  if (stored && (stored.parsed || Date.now() - stored.fetchedAt.getTime() < UNPARSED_FRESH_MS)) return stored.data;

  try {
    const raw = await fetchJson<RawFullMatch>(`/matches/${matchId}`);
    await saveMatch(raw).catch(() => undefined);
    return raw;
  } catch {
    return stored?.data ?? null;
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Saves up to 5 missing or stale matches, one OpenDota request per second. Never throws. */
export async function syncRecentMatches(recentMatchIds: number[]): Promise<void> {
  if (!db || recentMatchIds.length === 0) return;
  try {
    const stored = await db
      .select({ matchId: matches.matchId, parsed: matches.parsed, fetchedAt: matches.fetchedAt })
      .from(matches)
      .where(inArray(matches.matchId, recentMatchIds));
    const toSync = pickMatchesToSync(recentMatchIds, stored, new Date(), SYNC_LIMIT);
    for (const [index, matchId] of toSync.entries()) {
      if (index > 0) await pause(SYNC_GAP_MS);
      try {
        await saveMatch(await fetchJson<RawFullMatch>(`/matches/${matchId}`));
      } catch {
        // OpenDota or the database failed for this match: retried on the next visit.
      }
    }
  } catch {
    // Database unavailable: skip syncing this time.
  }
}
