/**
 * Match memory database access (server only): the write-once guard for each finished match.
 * Every function does nothing without a database, and database errors read as "not claimed".
 */

import { and, eq } from "drizzle-orm";
import { db, withQueryTimeout } from "@/db";
import { matchMemories } from "@/db/schema";

/** True only for the first caller per player and match: Dota sends post-game every second. */
export async function claimMatchMemory(clerkUserId: string, matchId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const rows = await withQueryTimeout(db.insert(matchMemories).values({ clerkUserId, matchId }).onConflictDoNothing().returning({ matchId: matchMemories.matchId }));
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Gives the claim back when the memory could not be saved, so the next post-game update tries again. */
export async function releaseMatchMemory(clerkUserId: string, matchId: string): Promise<void> {
  if (!db) return;
  try {
    await withQueryTimeout(db.delete(matchMemories).where(and(eq(matchMemories.clerkUserId, clerkUserId), eq(matchMemories.matchId, matchId))));
  } catch {
    // Not released: this match stays without a memory.
  }
}
