/** Supabase Realtime rows (snake_case columns, ISO times) to Live Coach shapes. Pure. */

import { LIVE_EVENT_KINDS, type LiveEventKind, type LiveFeed, type LiveSnapshot, type LiveTip } from "@/types/live";

export function isLiveEventKind(kind: string): kind is LiveEventKind {
  return (LIVE_EVENT_KINDS as readonly string[]).includes(kind);
}

export interface LiveStateRow {
  snapshot: LiveSnapshot | null;
  updated_at: string;
}

export interface LiveTipRow {
  id: number;
  match_id: string;
  clock_seconds: number;
  kind: string;
  text: string;
  plan: string[] | null;
  created_at: string;
}

export function rowToFeed(row: LiveStateRow): LiveFeed {
  return { snapshot: row.snapshot, updatedAt: Date.parse(row.updated_at) };
}

/** Null for a kind this version of the app does not know. */
export function rowToTip(row: LiveTipRow): LiveTip | null {
  if (!isLiveEventKind(row.kind)) return null;
  return {
    id: row.id,
    matchId: row.match_id,
    clockSeconds: row.clock_seconds,
    kind: row.kind,
    text: row.text,
    plan: row.plan,
    createdAt: Date.parse(row.created_at),
  };
}

/** What the Live Coach page holds: the live game, this match's tips (newest first) and the current item plan. */
export interface LiveFeedState {
  feed: LiveFeed;
  tips: LiveTip[];
  /** Kept apart from `tips` so a long game's tip list never pushes the plan out; tied to its match. */
  plan: { matchId: string; items: string[] } | null;
}

/** Adds a tip once (by id); a plan tip also becomes the current plan. */
export function applyTip(state: LiveFeedState, tip: LiveTip): LiveFeedState {
  if (state.tips.some((known) => known.id === tip.id)) return state;
  return { ...state, tips: [tip, ...state.tips], plan: tip.plan ? { matchId: tip.matchId, items: tip.plan } : state.plan };
}
