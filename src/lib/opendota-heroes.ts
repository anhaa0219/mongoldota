/** Hero and item data from OpenDota: trending heroes, hero index, item index. */

import { getJson } from "@/lib/opendota";
import type { HeroInfo, ItemInfo } from "@/types/opendota";

const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";
const HERO_PREFIX = "npc_dota_hero_";
const SIX_HOURS = 6 * 3600;
const ONE_DAY = 86400;

type BracketCounts = Partial<Record<`${number}_pick` | `${number}_win`, number>>;

interface RawHeroStat extends BracketCounts {
  id: number;
  /** e.g. "npc_dota_hero_antimage" */
  name: string;
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

function getHeroStats() {
  return getJson<RawHeroStat[]>("/heroStats", SIX_HOURS);
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
  const heroes = await getHeroStats();
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

/** hero id -> name + slug. Empty when OpenDota is unavailable. */
export async function getHeroIndex(): Promise<Map<number, HeroInfo>> {
  const heroes = (await getHeroStats()) ?? [];
  return new Map(
    heroes.map((hero) => [hero.id, { id: hero.id, name: hero.localized_name, slug: hero.name.replace(HERO_PREFIX, "") }]),
  );
}

interface RawItem {
  id: number;
  dname?: string;
  img: string;
  cost: number | null;
}

/** Items by id (final inventory) and by key (purchase log). Empty when OpenDota is unavailable. */
export async function getItemIndex(): Promise<{ byId: Map<number, ItemInfo>; byKey: Map<string, ItemInfo> }> {
  const raw = (await getJson<Record<string, RawItem>>("/constants/items", ONE_DAY)) ?? {};
  const items = Object.entries(raw).map(([key, item]) => ({
    id: item.id,
    key,
    name: item.dname ?? key,
    image: `${STEAM_CDN}${item.img.split("?")[0]}`,
    cost: item.cost ?? 0,
  }));
  return {
    byId: new Map(items.map((item) => [item.id, item])),
    byKey: new Map(items.map((item) => [item.key, item])),
  };
}
