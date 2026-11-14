/** Shapes of OpenDota data, raw (from the API) and mapped (used by the app). */

/** 1 safe lane, 2 mid, 3 off lane, 4 jungle. */
export type LaneRole = 1 | 2 | 3 | 4;

export interface HeroInfo {
  id: number;
  name: string;
  /** Empty when the hero is unknown (e.g. released after the last /heroStats fetch). */
  slug: string;
}

export interface ItemInfo {
  id: number;
  key: string;
  name: string;
  image: string;
  cost: number;
}

/** One row of /players/{id}/matches with project= fields. */
export interface RawMatch {
  match_id: number;
  player_slot: number;
  radiant_win: boolean;
  duration: number;
  lobby_type: number;
  start_time: number;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min?: number | null;
  xp_per_min?: number | null;
  last_hits?: number | null;
  hero_damage?: number | null;
  lane_role?: number | null;
  version?: number | null;
  item_0?: number | null;
  item_1?: number | null;
  item_2?: number | null;
  item_3?: number | null;
  item_4?: number | null;
  item_5?: number | null;
}

export interface MatchSummary {
  id: number;
  heroId: number;
  won: boolean;
  /** Played on Radiant (player_slot < 128). */
  radiant: boolean;
  ranked: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gpm: number;
  xpm: number;
  lastHits: number;
  heroDamage: number;
  /** Always 6 item ids; 0 is an empty slot. */
  items: number[];
  /** Null when the match is unparsed or the lane is unknown. */
  laneRole: LaneRole | null;
  parsed: boolean;
  durationSeconds: number;
  /** Milliseconds since epoch. */
  playedAt: number;
}

/** Games played and win rate (0-100, unrounded). */
export interface WinRecord {
  matches: number;
  winRate: number;
}

export type RecordLabel = "Most kills" | "Most deaths" | "Most assists" | "Most hero damage";

export interface PlayerSummary {
  /** winRate is 0-100, unrounded. */
  mostPlayed: { hero: HeroInfo; matches: number; winRate: number };
  wins: number;
  losses: number;
  /** Most recent first. */
  last10: ("W" | "L")[];
  /** In RecordLabel order. */
  records: { label: RecordLabel; value: number; hero: HeroInfo; matchId: number }[];
  /** Unrounded. */
  averages: { kills: number; deaths: number; assists: number; gpm: number; xpm: number; lastHits: number };
  /** share is 0-100 (rounded) of parsed matches. Null when no match is parsed. */
  mainLane: { lane: LaneRole; share: number } | null;
  /** Up to 5, same order as mostPlayed (which is topHeroes[0]). */
  topHeroes: ({ hero: HeroInfo } & WinRecord)[];
  /** Lanes with at least one parsed match, in lane order. */
  lanes: ({ lane: LaneRole } & WinRecord)[];
  sides: { radiant: WinRecord | null; dire: WinRecord | null };
  streaks: { current: { result: "W" | "L"; length: number }; longestWin: number };
  queues: { ranked: WinRecord | null; unranked: WinRecord | null };
  averageDurationSeconds: number;
}

/** One row of /players/{id}/totals. n = matches that have this field. */
export interface RawTotal {
  field: string;
  n: number;
  sum: number;
}

export interface PlaystyleStat {
  label: string;
  /** Per match, unrounded. */
  average: number;
  matches: number;
}

// ---------- One match (/matches/{id}) ----------

export interface RawLogEntry {
  time: number;
  key: string;
}

export interface RawDetailPlayer {
  /** Missing (not only null) for anonymous players in some responses. */
  account_id?: number | null;
  player_slot: number;
  hero_id: number;
  kills: number;
  assists: number;
  last_hits?: number | null;
  denies?: number | null;
  gold_per_min?: number | null;
  xp_per_min?: number | null;
  net_worth?: number | null;
  level?: number | null;
  hero_damage?: number | null;
  tower_damage?: number | null;
  hero_healing?: number | null;
  item_neutral?: number | null;
  aghanims_scepter?: number | null;
  aghanims_shard?: number | null;
  /** pct is 0-1: share of players on this hero this player beat. */
  benchmarks?: { gold_per_min?: { pct: number }; xp_per_min?: { pct: number } } | null;
  gold_t?: number[] | null;
  purchase_log?: RawLogEntry[] | null;
  kills_log?: RawLogEntry[] | null;
  obs_placed?: number | null;
  sen_placed?: number | null;
}

export interface RawMatchDetail {
  /** OpenDota omits this field (not null) for unparsed matches. */
  version?: number | null;
  radiant_score: number;
  dire_score: number;
  players: RawDetailPlayer[];
}

export interface ItemTiming {
  key: string;
  name: string;
  image: string;
  seconds: number;
  isBkb: boolean;
}

export interface ItemIndex {
  byId: Map<number, ItemInfo>;
  byKey: Map<string, ItemInfo>;
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
