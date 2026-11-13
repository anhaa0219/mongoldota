import { createHmac, timingSafeEqual } from "node:crypto";

const STEAM_OPENID = "https://steamcommunity.com/openid/login";
const OPENID_NS = "http://specs.openid.net/auth/2.0";
const CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
/** Difference between a 64-bit Steam ID and the 32-bit Dota account ID. */
const STEAM_ID_OFFSET = BigInt("76561197960265728");

export const SESSION_COOKIE = "steam_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return "dev-only-insecure-secret";
}

/** Public base URL of the site. Set SITE_URL in production if behind a proxy. */
export function siteOrigin(requestOrigin: string) {
  return process.env.SITE_URL?.replace(/\/$/, "") ?? requestOrigin;
}

export function callbackUrl(origin: string) {
  return `${origin}/api/auth/steam/callback`;
}

/** URL of Steam's "Sign in through Steam" page. */
export function steamLoginUrl(origin: string) {
  const params = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl(origin),
    "openid.realm": origin,
    "openid.identity": `${OPENID_NS}/identifier_select`,
    "openid.claimed_id": `${OPENID_NS}/identifier_select`,
  });
  return `${STEAM_OPENID}?${params}`;
}

/**
 * Confirms the login response really came from Steam (OpenID check_authentication)
 * and returns the 64-bit Steam ID, or null if anything does not match.
 */
export async function verifySteamLogin(query: URLSearchParams, origin: string) {
  if (query.get("openid.mode") !== "id_res") return null;
  if (query.get("openid.op_endpoint") !== STEAM_OPENID) return null;
  if (!query.get("openid.return_to")?.startsWith(callbackUrl(origin))) return null;

  const match = CLAIMED_ID.exec(query.get("openid.claimed_id") ?? "");
  if (!match) return null;

  const body = new URLSearchParams();
  for (const [key, value] of query) if (key.startsWith("openid.")) body.set(key, value);
  body.set("openid.mode", "check_authentication");

  try {
    const response = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const text = await response.text();
    return /is_valid\s*:\s*true/.test(text) ? match[1] : null;
  } catch {
    // Steam unreachable or timed out: treat as a failed login.
    return null;
  }
}

function sign(steamId: string) {
  return createHmac("sha256", secret()).update(steamId).digest("base64url");
}

export function createSession(steamId: string) {
  return `${steamId}.${sign(steamId)}`;
}

/** Returns the Steam ID from a session cookie, or null if missing or tampered with. */
export function readSession(value: string | undefined) {
  if (!value) return null;
  const [steamId, signature] = value.split(".");
  if (!steamId || !signature || !/^\d{17}$/.test(steamId)) return null;
  const expected = Buffer.from(sign(steamId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? steamId : null;
}

export function dotaAccountId(steamId: string) {
  return (BigInt(steamId) - STEAM_ID_OFFSET).toString();
}

export interface SteamProfile {
  steamId: string;
  accountId: string;
  name: string;
  avatar: string | null;
  profileUrl: string;
}

/** Player name and avatar from OpenDota (no API key needed). */
export async function getSteamProfile(steamId: string): Promise<SteamProfile> {
  const accountId = dotaAccountId(steamId);
  const fallback: SteamProfile = {
    steamId,
    accountId,
    name: `Player ${accountId}`,
    avatar: null,
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
  };
  try {
    const response = await fetch(`https://api.opendota.com/api/players/${accountId}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return fallback;
    const data = (await response.json()) as { profile?: { personaname?: string; avatarmedium?: string; profileurl?: string } };
    return {
      ...fallback,
      name: data.profile?.personaname || fallback.name,
      avatar: data.profile?.avatarmedium || null,
      profileUrl: data.profile?.profileurl || fallback.profileUrl,
    };
  } catch {
    return fallback;
  }
}
