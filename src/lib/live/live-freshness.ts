/** Is Dota connected right now, and is the locked draft recent enough to be this game's draft? Pure. */

import type { LockedDraft } from "@/types/live";

/** Dota's heartbeat is 30 s and the server refreshes the row at least every 20 s, so 75 s without data means it stopped. */
export const CONNECTED_WITHIN_MS = 75_000;
/** A draft locked longer ago than this belongs to an earlier session, not the game being played. */
export const DRAFT_MAX_AGE_MS = 2 * 3_600_000;

/**
 * `resetFrom`: the `updatedAt` seen when the player downloaded a new setup file (which disables the old one).
 * Until data newer than that arrives, the new file isn't proven to work.
 */
export function isDotaConnected({ updatedAt, nowMs, resetFrom }: { updatedAt: number | null; nowMs: number; resetFrom?: number | null }): boolean {
  if (updatedAt === null || nowMs - updatedAt >= CONNECTED_WITHIN_MS) return false;
  return resetFrom === undefined || updatedAt !== resetFrom;
}

export function freshDraft(locked: { draft: LockedDraft; updatedAt: number } | null, nowMs: number): LockedDraft | null {
  if (!locked || nowMs - locked.updatedAt > DRAFT_MAX_AGE_MS) return null;
  return locked.draft;
}
