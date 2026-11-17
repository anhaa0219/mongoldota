/**
 * When the live coach speaks: events within 10 s become one tip, automatic tips are at least 90 s apart,
 * and after 240 quiet game-seconds the coach looks ahead. Pure; the page steps it every second.
 */

import type { LiveEvent, LiveEventKind } from "@/types/live";

export const MERGE_WINDOW_MS = 10_000;
export const MIN_GAP_MS = 90_000;
export const LOOKAHEAD_GAME_SECONDS = 240;
export const ASK_GAP_MS = 15_000;

export interface CoachClock {
  /** Events waiting to be sent as one tip. */
  pending: LiveEvent[];
  /** Wall time (ms) the first pending event arrived. */
  pendingSince: number | null;
  /** Wall time (ms) of the last tip. */
  lastTipAt: number | null;
  /** Game clock (s) of the last tip, or of the first update seen: the look-ahead baseline. */
  lastTipClock: number | null;
}

export const IDLE_CLOCK: CoachClock = { pending: [], pendingSince: null, lastTipAt: null, lastTipClock: null };

/** Records that the coach spoke now (also used for Ask coach answers). */
export function markSpoke(state: CoachClock, nowMs: number, clockSeconds: number): CoachClock {
  return { ...state, lastTipAt: nowMs, lastTipClock: clockSeconds };
}

export function stepCoach(
  state: CoachClock,
  { nowMs, clockSeconds, events }: { nowMs: number; clockSeconds: number; events: LiveEvent[] },
): { state: CoachClock; fire: LiveEvent[] | null } {
  const pending = [...state.pending, ...events];
  const pendingSince = state.pendingSince ?? (events.length > 0 ? nowMs : null);
  const lastTipClock = state.lastTipClock ?? clockSeconds;
  const next: CoachClock = { ...state, pending, pendingSince, lastTipClock };
  const gapPassed = state.lastTipAt === null || nowMs - state.lastTipAt >= MIN_GAP_MS;

  // Firing counts as speaking straight away, so nothing fires again while the tip is being written.
  const spoke = { ...markSpoke(next, nowMs, clockSeconds), pending: [], pendingSince: null };

  if (pending.length > 0) {
    const merged = pendingSince !== null && nowMs - pendingSince >= MERGE_WINDOW_MS;
    return merged && gapPassed ? { state: spoke, fire: pending } : { state: next, fire: null };
  }
  if (gapPassed && clockSeconds - lastTipClock >= LOOKAHEAD_GAME_SECONDS) {
    return { state: spoke, fire: [{ kind: "lookahead", detail: "" }] };
  }
  return { state: next, fire: null };
}

export const PLAN_RETRY_MS = 60_000;

/**
 * The server-side slot a coach request must claim (per player and match), and the cutoff it must be older than:
 * tips share one slot (90 s apart, Ask coach 15 s), the item plan has its own (one attempt per minute).
 */
export function coachSlot(kinds: LiveEventKind[], matchId: string, nowMs: number): { slot: string; cutoff: Date } {
  if (kinds.includes("plan")) return { slot: `plan:${matchId}`, cutoff: new Date(nowMs - PLAN_RETRY_MS) };
  const gap = kinds.includes("asked") ? ASK_GAP_MS : MIN_GAP_MS;
  return { slot: `tip:${matchId}`, cutoff: new Date(nowMs - gap) };
}
