/** Small display formatters. Pure. */

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

/** "just now", "5 min ago", "2 h ago", "3 d ago", "2 mo ago"; "" when the time is unknown. */
export function timeAgo(playedAt: number, now: number): string {
  if (!Number.isFinite(playedAt)) return "";
  const elapsed = now - playedAt;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < MONTH) return `${Math.floor(elapsed / DAY)} d ago`;
  return `${Math.floor(elapsed / MONTH)} mo ago`;
}
