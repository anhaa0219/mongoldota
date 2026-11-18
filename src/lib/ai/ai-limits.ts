/** AI limits per player: the numbers, whether a call is allowed, and the sentence shown at a limit. Pure. */

import type { Words } from "@/lib/i18n/words";
import { AI_CALL_KINDS, type AiCallKind, type AiLimit, type AiUsage } from "@/types/ai";

// The owner's numbers: change them here.
export const DAILY_LIMIT = 250;
export const LIVE_TIPS_PER_MATCH = 40;
export const LIVE_PLANS_PER_MATCH = 4;
export const DRAFT_ADVICE_PER_DAY = 20;
export const DRAFT_SCREENSHOTS_PER_DAY = 30;
/** "Today" is the last 24 hours, so there is no midnight cliff. */
export const WINDOW_MS = 24 * 3_600_000;

export interface UsageFacts {
  /** This player's calls in the last 24 hours (milliseconds since epoch), any order. */
  dayCalls: { kind: AiCallKind; at: number }[];
  /** This player's calls of each live kind in the current match (0 outside a match). */
  matchTips: number;
  matchPlans: number;
}

export function isAiCallKind(kind: string): kind is AiCallKind {
  return (AI_CALL_KINDS as readonly string[]).includes(kind);
}

/** A rolling 24-hour limit; it frees up when the call that must drop out (oldest first, index count - max) turns 24 hours old. */
function rollingLimit(reason: AiLimit["reason"], times: number[], max: number): AiLimit | null {
  if (times.length < max) return null;
  const oldestFirst = [...times].sort((a, b) => a - b);
  return { reason, max, freesAt: oldestFirst[times.length - max] + WINDOW_MS };
}

/** Null when the call is allowed; otherwise the limit it would break (per match first, then per kind, then the daily total). */
export function checkAllowance(kind: AiCallKind, facts: UsageFacts): AiLimit | null {
  if (kind === "live-tip" && facts.matchTips >= LIVE_TIPS_PER_MATCH) return { reason: "match-tips", max: LIVE_TIPS_PER_MATCH, freesAt: null };
  if (kind === "live-plan" && facts.matchPlans >= LIVE_PLANS_PER_MATCH) return { reason: "match-plans", max: LIVE_PLANS_PER_MATCH, freesAt: null };

  const timesOf = (wanted: AiCallKind) => facts.dayCalls.filter((call) => call.kind === wanted).map((call) => call.at);
  const perKind =
    kind === "draft-advice"
      ? rollingLimit("draft-advice", timesOf("draft-advice"), DRAFT_ADVICE_PER_DAY)
      : kind === "draft-screenshot"
        ? rollingLimit("draft-screenshot", timesOf("draft-screenshot"), DRAFT_SCREENSHOTS_PER_DAY)
        : null;
  return perKind ?? rollingLimit("daily", facts.dayCalls.map((call) => call.at), DAILY_LIMIT);
}

export function toUsage(facts: UsageFacts, inMatch: boolean): AiUsage {
  return { today: facts.dayCalls.length, dailyLimit: DAILY_LIMIT, match: inMatch ? facts.matchTips : null, matchLimit: LIVE_TIPS_PER_MATCH };
}

/** The calm sentence shown at a limit. `formatTime` runs in the browser, so the time is the viewer's own. */
export function limitMessage(limit: AiLimit, formatTime: (ms: number) => string, words: Words["ai"]): string {
  const freesUp = limit.freesAt === null ? "" : words.freesUp(formatTime(limit.freesAt));
  switch (limit.reason) {
    case "match-tips":
      return words.matchTips(limit.max);
    case "match-plans":
      return words.matchPlans(limit.max);
    case "draft-advice":
      return `${words.draftAdvice(limit.max)}${freesUp}`;
    case "draft-screenshot":
      return `${words.screenshots(limit.max)}${freesUp}`;
    case "daily":
      return `${words.daily(limit.max)}${freesUp}`;
  }
}

/** "21:40" in the viewer's own time zone. Call it in the browser only. */
export function localTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** "AI today 37 / 250 · this match 12 / 40" (the match part only during a match). */
export function usageLine(usage: AiUsage, words: Words["ai"]): string {
  return `${words.usage(usage.today, usage.dailyLimit)}${usage.match === null ? "" : words.usageMatch(usage.match, usage.matchLimit)}`;
}
