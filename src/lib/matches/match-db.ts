/** Database access for full matches (Supabase via Drizzle). Server only; every function is a no-op without a database. */

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matches, playerMatches } from "@/db/schema";
import { toMatchRows, type StoredMatchInfo } from "@/lib/matches/match-rows";
import type { RawFullMatch } from "@/types/opendota-match";

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

/** What the sync needs to decide which of these matches to (re)fetch. */
export async function getStoredInfo(matchIds: number[]): Promise<StoredMatchInfo[]> {
  if (!db || matchIds.length === 0) return [];
  return db
    .select({ matchId: matches.matchId, parsed: matches.parsed, fetchedAt: matches.fetchedAt, startTime: matches.startTime })
    .from(matches)
    .where(inArray(matches.matchId, matchIds));
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
