/** What the live coach remembers between snapshots, and when to ask for (or redo) the item plan. Pure. */

import { IDLE_CLOCK, type CoachClock } from "@/lib/live-coach-timing";
import { countItems, detectEvents, raiseSeen } from "@/lib/live-events";
import type { LiveSnapshot, Moment } from "@/types/live";

/** Off-plan items cheaper than this are usually components of planned items, so they don't change the plan. */
export const REPLAN_MIN_COST = 2000;

export interface CoachMemory {
  previous: LiveSnapshot | null;
  /** The most of each item had at once this match. */
  seen: Map<string, number>;
  /** Moments waiting for the timing rules. */
  queued: Moment[];
  clock: CoachClock;
}

export const EMPTY_MEMORY: CoachMemory = { previous: null, seen: new Map(), queued: [], clock: IDLE_CLOCK };

/** A new match (or the first snapshot after opening the page) starts clean: nothing queued, no events for what is already owned. */
export function absorbSnapshot(memory: CoachMemory, snapshot: LiveSnapshot, plan: string[] | null, costs: Map<string, number>): CoachMemory {
  if (memory.previous?.matchId !== snapshot.matchId) {
    return { previous: snapshot, seen: countItems(snapshot.owned), queued: [], clock: IDLE_CLOCK };
  }
  const events = detectEvents(memory.previous, snapshot, plan, costs, memory.seen);
  return { ...memory, previous: snapshot, seen: raiseSeen(memory.seen, snapshot.owned), queued: [...memory.queued, ...events] };
}

/** True when the player bought an expensive item the plan doesn't have. */
export function needsReplan(events: Moment[], plan: string[] | null, costs: Map<string, number>): boolean {
  if (!plan) return false;
  return events.some((event) => event.kind === "item" && !plan.includes(event.detail) && (costs.get(event.detail) ?? 0) >= REPLAN_MIN_COST);
}

/** Ask once per match; after a failed or skipped attempt, again once `retryAt` has passed. */
export function shouldAskPlan({ hasPlan, matchId, askedFor, retryAt, nowMs }: { hasPlan: boolean; matchId: string; askedFor: string | null; retryAt: number; nowMs: number }): boolean {
  if (hasPlan) return false;
  return askedFor !== matchId || nowMs >= retryAt;
}
