/** OpenDota API (no key needed). Every function returns null/[] instead of throwing. */

import { cacheLife } from "next/cache";

const API = "https://api.opendota.com/api";
const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";
const MEDALS = ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];
const RANKED_LOBBY = 7;

/**
 * Cached with Cache Components ('use cache'); fetch's `next.revalidate` does nothing in this app.
 * Throws on failure so a failed request is not stored in the cache as an empty result.
 */
async function cachedJson<T>(path: string, cacheSeconds: number): Promise<T> {
  "use cache";
  cacheLife({ revalidate: cacheSeconds });
  const response = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`OpenDota ${response.status}`);
  return (await response.json()) as T;
}

async function getJson<T>(path: string, cacheSeconds: number): Promise<T | null> {
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

// ---------- History ----------

interface RawMatch {
  match_id: number;
  player_slot: number;
  radiant_win: boolean;
  hero_id: number;
  start_time: number;
  duration: number;
  kills: number;
  deaths: number;
  assists: number;
  lobby_type: number;
}

export interface MatchSummary {
  id: number;
  heroId: number;
  won: boolean;
  ranked: boolean;
  kills: number;
  deaths: number;
  assists: number;
  durationMinutes: number;
  /** Milliseconds since epoch. */
  playedAt: number;
}

/** Empty when the player has "Expose Public Match Data" turned off in Dota. */
export async function getRecentMatches(accountId: string, limit = 100): Promise<MatchSummary[]> {
  const matches = await getJson<RawMatch[]>(`/players/${accountId}/matches?limit=${limit}`, 300);
  if (!matches) return [];

  return matches.map((match) => ({
    id: match.match_id,
    heroId: match.hero_id,
    won: (match.player_slot < 128) === match.radiant_win, // slots 0-127 are Radiant
    ranked: match.lobby_type === RANKED_LOBBY,
    kills: match.kills,
    deaths: match.deaths,
    assists: match.assists,
    durationMinutes: Math.round(match.duration / 60),
    playedAt: match.start_time * 1000,
  }));
}

// ---------- Trending Heroes ----------

type BracketCounts = Partial<Record<`${number}_pick` | `${number}_win`, number>>;

interface RawHeroStat extends BracketCounts {
  id: number;
  localized_name: string;
  img: string;
  pub_pick: number;
  pub_win: number;
  pub_pick_trend: number[];
}

export interface HeroTrend {
  id: number;
  name: string;
  image: string;
  /** All brackets, or only the medal bracket passed in. */
  picks: number;
  winRate: number;
  /** % change in daily picks across the week. */
  pickChange: number;
}

/** OpenDota leaves some brackets empty (Immortal is always 0), so fall back to all brackets. */
function bracketCounts(hero: RawHeroStat, medalTier?: number) {
  const allBrackets = { picks: hero.pub_pick, wins: hero.pub_win };
  if (!medalTier) return allBrackets;

  const picks = hero[`${medalTier}_pick`] ?? 0;
  if (picks === 0) return allBrackets;
  return { picks, wins: hero[`${medalTier}_win`] ?? 0 };
}

/** Pass medalTier (1-8) to get winrates for that medal bracket only. */
export async function getTrendingHeroes(medalTier?: number): Promise<HeroTrend[]> {
  const heroes = await getJson<RawHeroStat[]>("/heroStats", 6 * 3600);
  if (!heroes) return [];

  return heroes
    .map((hero) => {
      const { picks, wins } = bracketCounts(hero, medalTier);
      const fullDays = hero.pub_pick_trend.slice(0, -1); // last entry is today, still filling up
      const first = fullDays[0] ?? 0;
      const last = fullDays.at(-1) ?? 0;
      return {
        id: hero.id,
        name: hero.localized_name,
        image: `${STEAM_CDN}${hero.img}`,
        picks,
        winRate: picks ? (wins / picks) * 100 : 0,
        pickChange: first ? ((last - first) / first) * 100 : 0,
      };
    })
    .sort((a, b) => b.pickChange - a.pickChange);
}

/** hero id -> hero name, for the History list. Shares the cached /heroStats call. */
export async function getHeroNames(): Promise<Map<number, string>> {
  const heroes = await getTrendingHeroes();
  return new Map(heroes.map((hero) => [hero.id, hero.name]));
}
