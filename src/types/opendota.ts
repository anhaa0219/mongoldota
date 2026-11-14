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

export type RecordLabel = "Most kills" | "Most deaths" | "Most assists" | "Most hero damage";

export interface PlayerSummary {
  /** winRate is 0-100, unrounded. */
  mostPlayed: { hero: HeroInfo; matches: number; winRate: number };
  wins: number;
  losses: number;
  /** Most recent first. */
  last10: ("W" | "L")[];
  /** In RecordLabel order. */
  records: { label: RecordLabel; value: number; hero: HeroInfo }[];
  /** Unrounded. */
  averages: { kills: number; deaths: number; assists: number; gpm: number; xpm: number; lastHits: number };
  /** share is 0-100 (rounded) of parsed matches. Null when no match is parsed. */
  mainLane: { lane: LaneRole; share: number } | null;
}
