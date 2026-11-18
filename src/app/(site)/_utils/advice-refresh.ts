/** When stored AI advice is fresh, and how a countdown to the next refresh reads. Pure. */

import type { Words } from "@/lib/i18n/words";

export const ADVICE_TTL_MS = 12 * 60 * 60 * 1000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function isFresh(createdAt: number, now: number): boolean {
  return now - createdAt < ADVICE_TTL_MS;
}

type AdviceWords = Words["shell"]["advice"];

/** "9h 58m", "42m", or "under a minute" (in the visitor's language). */
function formatWait(ms: number, words: AdviceWords): string {
  if (ms < MINUTE) return words.underAMinute;
  const hours = Math.floor(ms / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  return hours > 0 ? words.hoursMinutes(hours, minutes) : words.minutes(minutes);
}

/** "Updated 2h 3m ago · new advice in 9h 57m" (or "on the next visit" once due). */
export function refreshLabel(createdAt: number, now: number, words: AdviceWords): string {
  const age = Math.max(0, now - createdAt);
  const remaining = createdAt + ADVICE_TTL_MS - now;
  const updated = age < MINUTE ? words.updatedJustNow : words.updatedAgo(formatWait(age, words));
  return `${updated} · ${remaining > 0 ? words.newIn(formatWait(remaining, words)) : words.newNextVisit}`;
}
