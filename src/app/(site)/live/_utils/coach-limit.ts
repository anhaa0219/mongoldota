/** Whether a reached AI limit still stops the Live Coach. Pure. */

import type { AiLimit } from "@/types/ai";

/** A limit the coach route answered with, and the match it was reached in. */
export interface HeldLimit {
  limit: AiLimit;
  matchId: string;
}

/** A per-match limit holds for that match only; a daily limit holds until it frees up. */
export function isHeld(held: HeldLimit | null, matchId: string | null, nowMs: number): boolean {
  if (!held) return false;
  if (held.limit.freesAt === null) return held.matchId === matchId;
  return nowMs < held.limit.freesAt;
}
