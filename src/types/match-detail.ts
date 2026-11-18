/** The linked player's slice of one match, as the History page's detail panel shows it. */

import type { ItemInfo } from "@/types/opendota";

export interface ItemTiming {
  key: string;
  name: string;
  image: string;
  seconds: number;
  isBkb: boolean;
}

/** What every match has, parsed or not. */
export interface MatchBasics {
  /** 0-100, null when the team has no kills. */
  killParticipation: number | null;
  netWorth: number;
  level: number;
  lastHits: number;
  denies: number;
  gpm: number;
  xpm: number;
  /** 0-100: share of players on this hero beaten. Null when OpenDota has no benchmark. */
  gpmPercentile: number | null;
  xpmPercentile: number | null;
  heroDamage: number;
  towerDamage: number;
  healing: number;
  neutralItem: ItemInfo | null;
  scepter: boolean;
  shard: boolean;
}

export type MatchDetail =
  | { parsed: false; basics: MatchBasics }
  | {
      parsed: true;
      basics: MatchBasics;
      /** Cumulative gold earned per minute (OpenDota gold_t), not net worth. */
      goldEarned: number[];
      itemTimings: ItemTiming[];
      observers: number;
      sentries: number;
      /** Null when the hero is unknown, so deaths cannot be matched. */
      deathMinutes: number[] | null;
    };
