/** Which Steam account a Clerk account is linked to: the saved row, or a one-time move of the old browser cookie. Pure. */

import type { StoredLink } from "@/lib/steam/steam-link-store";

/**
 * - Saved row: that link (a cookie from another account on this browser never overrides it).
 * - No row but a valid old cookie: that link, to be saved (`migrate`).
 * - Database unavailable: the cookie, so an outage never unlinks anyone.
 */
export function resolveSteamLink(stored: StoredLink, cookieSteamId: string | null): { steamId: string | null; migrate: boolean } {
  if (!stored.ok) return { steamId: cookieSteamId, migrate: false };
  if (stored.steamId) return { steamId: stored.steamId, migrate: false };
  return { steamId: cookieSteamId, migrate: cookieSteamId !== null };
}
