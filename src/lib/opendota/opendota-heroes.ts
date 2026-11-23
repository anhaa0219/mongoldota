/** Hero and item data from OpenDota: draft heroes, hero index, item index. */

import { getJson } from "@/lib/opendota/opendota";
import type { DraftHero } from "@/types/draft";
import type { HeroInfo, ItemIndex } from "@/types/opendota";

const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";
const HERO_PREFIX = "npc_dota_hero_";
const SIX_HOURS = 6 * 3600;
const ONE_DAY = 86400;

interface RawHeroStat {
  id: number;
  /** e.g. "npc_dota_hero_antimage" */
  name: string;
  localized_name: string;
  pub_pick: number;
  pub_win: number;
  roles?: string[];
}

function getHeroStats() {
  return getJson<RawHeroStat[]>("/heroStats", SIX_HOURS);
}

/** Draft page heroes, alphabetical, with overall public win rate and roles. Empty when OpenDota is unavailable. */
export async function getDraftHeroes(): Promise<DraftHero[]> {
  const heroes = (await getHeroStats()) ?? [];
  return heroes
    .map((hero) => ({
      id: hero.id,
      name: hero.localized_name,
      slug: hero.name.replace(HERO_PREFIX, ""),
      winRate: hero.pub_pick ? (hero.pub_win / hero.pub_pick) * 100 : 50,
      roles: hero.roles ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
  /** The parts it is built from; null for shop items without a recipe (Ogre Axe, Blink Dagger). */
  components?: string[] | null;
}

/** Items by id (final inventory) and by key (purchase log). Empty when OpenDota is unavailable. */
export async function getItemIndex(): Promise<ItemIndex> {
  const raw = (await getJson<Record<string, RawItem>>("/constants/items", ONE_DAY)) ?? {};
  const items = Object.entries(raw).map(([key, item]) => ({
    id: item.id,
    key,
    name: item.dname ?? key,
    image: `${STEAM_CDN}${item.img.split("?")[0]}`,
    cost: item.cost ?? 0,
    parts: item.components ?? [],
  }));
  return {
    byId: new Map(items.map((item) => [item.id, item])),
    byKey: new Map(items.map((item) => [item.key, item])),
  };
}
