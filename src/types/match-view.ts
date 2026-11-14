/** The match page's view model: plain, serializable data built on the server from the raw match. */

import type { HeroInfo, ItemInfo, LaneRole } from "@/types/opendota";

export type Team = "radiant" | "dire";

export interface ScoreboardPlayer {
  slot: number;
  accountId: number | null;
  isLinked: boolean;
  team: Team;
  name: string;
  hero: HeroInfo;
  lane: LaneRole | null;
  /** OpenDota's estimated position 1-5. */
  position: number | null;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  gpm: number;
  xpm: number;
  lastHits: number;
  denies: number;
  level: number;
  heroDamage: number;
  towerDamage: number;
  healing: number;
  /** Always 6; null is an empty slot. */
  items: (ItemInfo | null)[];
  neutral: ItemInfo | null;
  scepter: boolean;
  shard: boolean;
}
