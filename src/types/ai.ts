/** AI cost control: the kinds of AI call, a reached limit, and a player's usage. */

export type AiCallKind = "live-tip" | "live-plan" | "draft-advice" | "draft-screenshot" | "stats-coach" | "hero-picks";

export const AI_CALL_KINDS: readonly AiCallKind[] = ["live-tip", "live-plan", "draft-advice", "draft-screenshot", "stats-coach", "hero-picks"];

export interface AiLimit {
  reason: "daily" | "draft-advice" | "draft-screenshot" | "match-tips" | "match-plans";
  /** The limit that was reached (e.g. 250). */
  max: number;
  /** Milliseconds since epoch when a call is allowed again; null for per-match limits (a new match frees them). */
  freesAt: number | null;
}

export interface AiUsage {
  /** Calls in the last 24 hours, every kind. */
  today: number;
  dailyLimit: number;
  /** Live tips in the current match; null outside a match. */
  match: number | null;
  matchLimit: number;
}
