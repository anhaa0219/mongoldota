/** Small display formatters. Pure. */

import type { Words } from "@/lib/i18n/words";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;

/** 2464 -> "41:04"; negative (bought before the horn) -> "-1:17". */
export function formatDuration(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  const total = Math.abs(seconds);
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${sign}${minutes}:${rest}`;
}

/** "just now", "5 min ago", "2 h ago", "3 d ago", "2 mo ago" in the visitor's language; "" when the time is unknown. */
export function timeAgo(playedAt: number, now: number, ago: Words["common"]["ago"]): string {
  if (!Number.isFinite(playedAt)) return "";
  const elapsed = now - playedAt;
  if (elapsed < MINUTE) return ago.justNow;
  if (elapsed < HOUR) return ago.minutes(Math.floor(elapsed / MINUTE));
  if (elapsed < DAY) return ago.hours(Math.floor(elapsed / HOUR));
  if (elapsed < MONTH) return ago.days(Math.floor(elapsed / DAY));
  return ago.months(Math.floor(elapsed / MONTH));
}
