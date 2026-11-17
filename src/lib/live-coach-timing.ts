/**
 * When the live coach speaks. Moments are gathered into a group until nothing new has happened for 6 s
 * (20 s at most), so a whole fight becomes one tip. A group with a big moment is sent once the last tip
 * is 25 s old; any other group waits for 90 s. After 240 quiet game-seconds the coach looks ahead.
 * Pure; the page steps it every second.
 */

import { closeGroup, isBigKind } from "@/lib/live-moments";
import type { LiveEvent, LiveEventKind, Moment } from "@/types/live";

export const QUIET_MS = 6_000;
export const MAX_GROUP_MS = 20_000;
export const BIG_GAP_MS = 25_000;
export const MIN_GAP_MS = 90_000;
export const LOOKAHEAD_GAME_SECONDS = 240;
export const ASK_GAP_MS = 15_000;
/**
 * The server's claim on an automatic tip is this much more lenient than the browser's gap. The browser sends a
 * waiting tip on the first tick the gap has passed, but the server measures from when it claimed the previous
 * tip, a little later; without this a tip sent exactly on the gap is refused and lost.
 */
export const SLOT_TOLERANCE_MS = 3_000;

export interface CoachClock {
  /** Moments of the group that is still open. */
  pending: Moment[];
  /** Wall time (ms) the open group's first moment arrived. */
  pendingSince: number | null;
  /** Wall time (ms) the open group's latest moment arrived. */
  lastMomentAt: number | null;
  /** Events of closed groups, waiting for the gap since the last tip. */
  held: LiveEvent[];
  /** Wall time (ms) of the last tip. */
  lastTipAt: number | null;
  /** Game clock (s) of the last tip, or of the first update seen: the look-ahead baseline. */
  lastTipClock: number | null;
}

export const IDLE_CLOCK: CoachClock = { pending: [], pendingSince: null, lastMomentAt: null, held: [], lastTipAt: null, lastTipClock: null };

/** Records that the coach spoke now (also used for Ask coach answers). */
export function markSpoke(state: CoachClock, nowMs: number, clockSeconds: number): CoachClock {
  return { ...state, lastTipAt: nowMs, lastTipClock: clockSeconds };
}

/** Adds the new moments to the open group and, when the group is over, moves its events to `held`. */
function gather(state: CoachClock, nowMs: number, moments: Moment[]): CoachClock {
  const pending = [...state.pending, ...moments];
  const pendingSince = state.pendingSince ?? (moments.length > 0 ? nowMs : null);
  const lastMomentAt = moments.length > 0 ? nowMs : state.lastMomentAt;
  if (pending.length === 0 || pendingSince === null || lastMomentAt === null) return state;

  const isOver = nowMs - lastMomentAt >= QUIET_MS || nowMs - pendingSince >= MAX_GROUP_MS;
  if (!isOver) return { ...state, pending, pendingSince, lastMomentAt };
  return { ...state, pending: [], pendingSince: null, lastMomentAt: null, held: [...state.held, ...closeGroup(pending)] };
}

export function stepCoach(
  state: CoachClock,
  { nowMs, clockSeconds, moments }: { nowMs: number; clockSeconds: number; moments: Moment[] },
): { state: CoachClock; fire: LiveEvent[] | null } {
  const lastTipClock = state.lastTipClock ?? clockSeconds;
  const next: CoachClock = { ...gather(state, nowMs, moments), lastTipClock };
  const sinceTip = state.lastTipAt === null ? Number.POSITIVE_INFINITY : nowMs - state.lastTipAt;
  // Firing counts as speaking straight away, so nothing fires again while the tip is being written.
  const spoke: CoachClock = { ...markSpoke(next, nowMs, clockSeconds), held: [] };

  if (next.held.length > 0) {
    const gap = next.held.some((event) => isBigKind(event.kind)) ? BIG_GAP_MS : MIN_GAP_MS;
    return sinceTip >= gap ? { state: spoke, fire: next.held } : { state: next, fire: null };
  }
  if (next.pending.length === 0 && sinceTip >= MIN_GAP_MS && clockSeconds - lastTipClock >= LOOKAHEAD_GAME_SECONDS) {
    return { state: spoke, fire: [{ kind: "lookahead", detail: "" }] };
  }
  return { state: next, fire: null };
}

export const PLAN_RETRY_MS = 60_000;

/**
 * The server-side slot a coach request must claim (per player and match), and the cutoff it must be older than:
 * tips share one slot (90 s apart, 25 s when the request has a big moment, both less SLOT_TOLERANCE_MS;
 * Ask coach 15 s), the item plan has its own (one attempt per minute).
 */
export function coachSlot(kinds: LiveEventKind[], matchId: string, nowMs: number): { slot: string; cutoff: Date } {
  if (kinds.includes("plan")) return { slot: `plan:${matchId}`, cutoff: new Date(nowMs - PLAN_RETRY_MS) };
  if (kinds.includes("asked")) return { slot: `tip:${matchId}`, cutoff: new Date(nowMs - ASK_GAP_MS) };
  const gap = (kinds.some(isBigKind) ? BIG_GAP_MS : MIN_GAP_MS) - SLOT_TOLERANCE_MS;
  return { slot: `tip:${matchId}`, cutoff: new Date(nowMs - gap) };
}
