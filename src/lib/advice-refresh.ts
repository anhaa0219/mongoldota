/** When stored AI advice is fresh, and how a countdown to the next refresh reads. Pure. */

export const ADVICE_TTL_MS = 12 * 60 * 60 * 1000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function isFresh(createdAt: number, now: number): boolean {
  return now - createdAt < ADVICE_TTL_MS;
}

/** "9h 58m", "42m", or "under a minute". */
export function formatDuration(ms: number): string {
  if (ms < MINUTE) return "under a minute";
  const hours = Math.floor(ms / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** "Updated 2h 3m ago · new advice in 9h 57m" (or "on the next visit" once due). */
export function refreshLabel(createdAt: number, now: number): string {
  const age = Math.max(0, now - createdAt);
  const remaining = createdAt + ADVICE_TTL_MS - now;
  const updated = age < MINUTE ? "Updated just now" : `Updated ${formatDuration(age)} ago`;
  return `${updated} · ${remaining > 0 ? `new advice in ${formatDuration(remaining)}` : "new advice on the next visit"}`;
}
