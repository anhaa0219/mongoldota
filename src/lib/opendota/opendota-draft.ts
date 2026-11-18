/** OpenDota data for the Draft page: hero matchups and the player's own record per hero. */

import { cacheLife } from "next/cache";
import { fetchJson, getJson } from "@/lib/opendota/opendota";
import type { Matchup, PersonalRecord } from "@/types/draft";

const ONE_DAY = 86400;
const ONE_HOUR = 3600;

interface RawMatchup {
  hero_id: number;
  games_played: number;
  wins: number;
}

interface RawPlayerHero {
  hero_id: number;
  games: number;
  win: number;
}

/** How `heroId` did against every other hero. Null when OpenDota is unavailable. */
export async function getHeroMatchups(heroId: number): Promise<Matchup[] | null> {
  const rows = await getJson<RawMatchup[]>(`/heroes/${heroId}/matchups`, ONE_DAY);
  return rows ? rows.map((row) => ({ heroId: row.hero_id, games: row.games_played, wins: row.wins })) : null;
}

/** The player's games and win rate per hero over the last year (heroes never played are left out). */
export async function getPersonalRecords(accountId: string): Promise<Record<number, PersonalRecord>> {
  const rows = (await getJson<RawPlayerHero[]>(`/players/${accountId}/heroes?date=365`, ONE_HOUR)) ?? [];
  return Object.fromEntries(
    rows.filter((row) => row.games > 0).map((row) => [row.hero_id, { games: row.games, winRate: (row.win / row.games) * 100 }]),
  );
}

/** Item ids (as strings) -> purchase count, per game stage. */
export interface ItemPopularity {
  start_game_items?: Record<string, number>;
  early_game_items?: Record<string, number>;
  mid_game_items?: Record<string, number>;
  late_game_items?: Record<string, number>;
}

/** time = seconds bucket the item was finished in; OpenDota sends games/wins as strings. */
export interface RawItemTiming {
  time: number;
  games: string | number;
  wins: string | number;
}

export interface RawDuration {
  duration_bin: number;
  games_played: number;
  wins: number;
}

export function getItemPopularity(heroId: number) {
  return getJson<ItemPopularity>(`/heroes/${heroId}/itemPopularity`, ONE_DAY);
}

export function getItemTimings(heroId: number, itemKey: string) {
  return getJson<RawItemTiming[]>(`/scenarios/itemTimings?hero_id=${heroId}&item=${itemKey}`, ONE_DAY);
}

export function getHeroDurations(heroId: number) {
  return getJson<RawDuration[]>(`/heroes/${heroId}/durations`, ONE_DAY);
}

interface RawAbility {
  dname?: string;
  desc?: string;
  behavior?: string | string[];
}

/** Ability names with a short description, per hero slug (e.g. "nevermore"). */
export type AbilityIndex = Record<string, string[]>;

const MAX_DESC = 170;

function shortDescription(desc: string) {
  const flat = desc.replace(/\s+/g, " ").trim();
  return flat.length <= MAX_DESC ? flat : `${flat.slice(0, MAX_DESC).replace(/\s\S*$/, "")}…`;
}

/** Both constants files are large (1.4 MB), so only the trimmed index is cached. */
async function abilityIndex(): Promise<AbilityIndex> {
  "use cache";
  cacheLife({ revalidate: ONE_DAY });
  const [heroAbilities, abilities] = await Promise.all([
    fetchJson<Record<string, { abilities: string[] }>>("/constants/hero_abilities"),
    fetchJson<Record<string, RawAbility>>("/constants/abilities"),
  ]);
  return Object.fromEntries(
    Object.entries(heroAbilities).map(([heroKey, { abilities: keys }]) => [
      heroKey.replace("npc_dota_hero_", ""),
      keys.flatMap((key) => {
        const ability = abilities[key];
        const hidden = [ability?.behavior].flat().includes("Hidden");
        if (!ability?.dname || hidden || key.startsWith("generic")) return [];
        return [ability.desc ? `${ability.dname}: ${shortDescription(ability.desc)}` : ability.dname];
      }),
    ]),
  );
}

/** Null when OpenDota is unavailable. */
export async function getAbilityIndex(): Promise<AbilityIndex | null> {
  try {
    return await abilityIndex();
  } catch {
    return null;
  }
}
