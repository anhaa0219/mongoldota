/**
 * Live Coach database access: coach tips and the locked draft per player (server only).
 * Every function does nothing without a database, and database errors read as "nothing stored".
 */

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { liveTips, lockedDrafts } from "@/db/schema";
import { isLiveEventKind } from "@/lib/live-rows";
import type { LiveTip, LockedDraft } from "@/types/live";

export async function saveLockedDraft(clerkUserId: string, draft: LockedDraft): Promise<void> {
  if (!db) return;
  const values = { clerkUserId, draft, updatedAt: new Date() };
  try {
    await db.insert(lockedDrafts).values(values).onConflictDoUpdate({ target: lockedDrafts.clerkUserId, set: values });
  } catch {
    // Not saved: the Draft page sends it again on the next change.
  }
}

/** The latest locked draft and when it was locked (milliseconds since epoch); see freshDraft for whether it still applies. */
export async function getLockedDraft(clerkUserId: string): Promise<{ draft: LockedDraft; updatedAt: number } | null> {
  if (!db) return null;
  try {
    const [row] = await db
      .select({ draft: lockedDrafts.draft, updatedAt: lockedDrafts.updatedAt })
      .from(lockedDrafts)
      .where(eq(lockedDrafts.clerkUserId, clerkUserId))
      .limit(1);
    return row ? { draft: row.draft, updatedAt: row.updatedAt.getTime() } : null;
  } catch {
    return null;
  }
}

type TipRow = typeof liveTips.$inferSelect;

function toTip(row: TipRow): LiveTip | null {
  if (!isLiveEventKind(row.kind)) return null;
  return {
    id: row.id,
    matchId: row.matchId,
    clockSeconds: row.clockSeconds,
    kind: row.kind,
    text: row.text,
    plan: row.plan ?? null,
    createdAt: row.createdAt.getTime(),
  };
}

export async function addTip(clerkUserId: string, tip: Omit<LiveTip, "id" | "createdAt">): Promise<LiveTip | null> {
  if (!db) return null;
  try {
    const [row] = await db
      .insert(liveTips)
      .values({ clerkUserId, ...tip })
      .returning();
    return row ? toTip(row) : null;
  } catch {
    return null;
  }
}

/** This match's tips, newest first. */
export async function getTips(clerkUserId: string, matchId: string, limit = 30): Promise<LiveTip[]> {
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(liveTips)
      .where(and(eq(liveTips.clerkUserId, clerkUserId), eq(liveTips.matchId, matchId)))
      .orderBy(desc(liveTips.createdAt))
      .limit(limit);
    return rows.flatMap((row) => toTip(row) ?? []);
  } catch {
    return [];
  }
}

/** This match's newest item plan tip (plans are kept apart so they never drop out of the recent-tips list). */
export async function getPlanTip(clerkUserId: string, matchId: string): Promise<LiveTip | null> {
  if (!db) return null;
  try {
    const [row] = await db
      .select()
      .from(liveTips)
      .where(and(eq(liveTips.clerkUserId, clerkUserId), eq(liveTips.matchId, matchId), isNotNull(liveTips.plan)))
      .orderBy(desc(liveTips.createdAt))
      .limit(1);
    return row ? toTip(row) : null;
  } catch {
    return null;
  }
}
