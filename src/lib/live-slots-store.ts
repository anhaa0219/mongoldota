/** Live Coach: atomic "who may ask the AI now" slots per player (server only). */

import { lt } from "drizzle-orm";
import { db } from "@/db";
import { liveCoachSlots } from "@/db/schema";

/**
 * Claims `slot` for this player unless it was claimed after `cutoff`. One SQL statement, so when two tabs
 * or devices ask at the same moment exactly one of them gets `true`. Without a database there is nothing
 * to share between tabs, so the claim always succeeds; a database error refuses it.
 */
export async function reserveSlot(clerkUserId: string, slot: string, cutoff: Date): Promise<boolean> {
  if (!db) return true;
  const reservedAt = new Date();
  try {
    const rows = await db
      .insert(liveCoachSlots)
      .values({ clerkUserId, slot, reservedAt })
      .onConflictDoUpdate({ target: [liveCoachSlots.clerkUserId, liveCoachSlots.slot], set: { reservedAt }, setWhere: lt(liveCoachSlots.reservedAt, cutoff) })
      .returning({ slot: liveCoachSlots.slot });
    return rows.length > 0;
  } catch {
    return false;
  }
}
