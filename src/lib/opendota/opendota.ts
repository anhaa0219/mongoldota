/** OpenDota API (no key needed). Every function returns null/[] instead of throwing. */

import { cacheLife } from "next/cache";

const API = "https://api.opendota.com/api";
const MEDALS = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];

/** Uncached GET. Throws when OpenDota is down, slow (8 s) or answers with an error. */
export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`OpenDota ${response.status}`);
  return (await response.json()) as T;
}

/** Uncached POST (e.g. asking OpenDota to parse a match). False when OpenDota refused, failed or timed out. */
export async function postOpenDota(path: string): Promise<boolean> {
  try {
    const response = await fetch(`${API}${path}`, { method: "POST", signal: AbortSignal.timeout(8_000) });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Cached with Cache Components ('use cache'); fetch's `next.revalidate` does nothing in this app.
 * Throws on failure so a failed request is not stored in the cache as an empty result.
 */
async function cachedJson<T>(path: string, cacheSeconds: number): Promise<T> {
  "use cache";
  cacheLife({ revalidate: cacheSeconds });
  return fetchJson<T>(path);
}

export async function getJson<T>(path: string, cacheSeconds: number): Promise<T | null> {
  try {
    return await cachedJson<T>(path, cacheSeconds);
  } catch {
    // OpenDota down, slow, or rate limited: callers show an empty state.
    return null;
  }
}

// ---------- Medal + MMR ----------

export interface PlayerRank {
  medal: string;
  /** 1 (Herald) to 8 (Immortal). Used to pick hero winrates for the player's bracket. */
  medalTier: number;
  stars: number;
  leaderboardRank: number | null;
  /** OpenDota's estimate, not Valve's exact MMR. */
  estimatedMmr: number | null;
}

interface RawPlayer {
  profile?: { personaname?: string; avatarmedium?: string; profileurl?: string };
  rank_tier: number | null;
  leaderboard_rank: number | null;
  computed_mmr: number | null;
}

export interface OpenDotaPlayer {
  name: string | null;
  avatar: string | null;
  profileUrl: string | null;
  /** Null when the player is not calibrated or the profile is private. */
  rank: PlayerRank | null;
}

function toRank(player: RawPlayer): PlayerRank | null {
  if (!player.rank_tier) return null;

  const medalTier = Math.floor(player.rank_tier / 10);
  return {
    medal: MEDALS[medalTier - 1] ?? "Unknown",
    medalTier,
    stars: player.rank_tier % 10,
    leaderboardRank: player.leaderboard_rank,
    estimatedMmr: player.computed_mmr ? Math.round(player.computed_mmr) : null,
  };
}

/** Profile + rank from one cached request, shared by the Steam pill and the medal pill. */
export async function getOpenDotaPlayer(accountId: string): Promise<OpenDotaPlayer | null> {
  const player = await getJson<RawPlayer>(`/players/${accountId}`, 3600);
  if (!player) return null;

  return {
    name: player.profile?.personaname || null,
    avatar: player.profile?.avatarmedium || null,
    profileUrl: player.profile?.profileurl || null,
    rank: toRank(player),
  };
}

export async function getPlayerRank(accountId: string): Promise<PlayerRank | null> {
  return (await getOpenDotaPlayer(accountId))?.rank ?? null;
}
