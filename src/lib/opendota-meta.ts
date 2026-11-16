/** Trending Heroes data: every hero's picks and wins per medal bracket, pro stats and weekly trend (OpenDota /heroStats). */

import { getJson } from "@/lib/opendota";
import type { HeroMeta, MetaBracket, PickWin } from "@/types/meta";

const SIX_HOURS = 6 * 3600;
const HERO_PREFIX = "npc_dota_hero_";
const TIERS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

type TierCounts = Partial<Record<`${number}_pick` | `${number}_win`, number>>;

interface RawHeroStat extends TierCounts {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  roles?: string[];
  pub_pick: number;
  pub_win: number;
  pub_pick_trend?: number[];
  pub_win_trend?: number[];
  pro_pick?: number;
  pro_win?: number;
  pro_ban?: number;
}

/** Same request (and cache entry) as the other /heroStats readers. Empty when OpenDota is unavailable. */
export async function getHeroMeta(): Promise<HeroMeta[]> {
  const heroes = (await getJson<RawHeroStat[]>("/heroStats", SIX_HOURS)) ?? [];
  return heroes
    .map((hero) => {
      const tiers = Object.fromEntries(
        TIERS.map((tier): [MetaBracket, PickWin] => [tier, { picks: hero[`${tier}_pick`] ?? 0, wins: hero[`${tier}_win`] ?? 0 }]),
      );
      return {
        id: hero.id,
        name: hero.localized_name,
        slug: hero.name.replace(HERO_PREFIX, ""),
        roles: hero.roles ?? [],
        attribute: hero.primary_attr,
        brackets: {
          all: { picks: hero.pub_pick, wins: hero.pub_win },
          pro: { picks: hero.pro_pick ?? 0, wins: hero.pro_win ?? 0 },
          ...tiers,
        } as Record<MetaBracket, PickWin>,
        proBans: hero.pro_ban ?? 0,
        // The last entry is today, still filling up.
        pickTrend: (hero.pub_pick_trend ?? []).slice(0, -1),
        winTrend: (hero.pub_win_trend ?? []).slice(0, -1),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
