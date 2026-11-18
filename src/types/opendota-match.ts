/** A full OpenDota /matches/{id} response (only the fields the app reads are typed; the rest is kept as-is). */

export interface RawLogEntry {
  time: number;
  key: string;
}

/** One player of a /matches/{id} response: the fields every match has, parsed or not, plus the History panel's logs. */
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

export interface RawPositionLog {
  time: number;
  x: number;
  y: number;
  ehandle?: number | null;
}

/** x -> y -> count, in OpenDota map cells (about 64-192). */
export type RawCellCounts = Record<string, Record<string, number>>;

export interface RawObjective {
  time: number;
  type: string;
  key?: string | null;
  /** 2 Radiant, 3 Dire. */
  team?: number | null;
}

export interface RawTeamfight {
  start: number;
  end: number;
  deaths: number;
  /** Same order as the match's players. */
  players: { deaths_pos?: RawCellCounts | null; gold_delta?: number | null }[];
}

export interface RawChat {
  time: number;
  type: string;
  key: string;
  player_slot?: number | null;
}

export interface RawFullPlayer extends RawDetailPlayer {
  deaths?: number | null;
  personaname?: string | null;
  lane_role?: number | null;
  position_est?: number | null;
  networth_t?: number[] | null;
  lh_t?: number[] | null;
  dn_t?: number[] | null;
  xp_t?: number[] | null;
  deaths_log?: RawLogEntry[] | null;
  obs_log?: RawPositionLog[] | null;
  sen_log?: RawPositionLog[] | null;
  obs_left_log?: RawPositionLog[] | null;
  sen_left_log?: RawPositionLog[] | null;
  lane_pos?: RawCellCounts | null;
  /** ability ("null" = attacks) -> target hero key -> damage. */
  damage_targets?: Record<string, Record<string, number>> | null;
  item_0?: number | null;
  item_1?: number | null;
  item_2?: number | null;
  item_3?: number | null;
  item_4?: number | null;
  item_5?: number | null;
}

export interface RawFullMatch extends RawMatchDetail {
  match_id: number;
  start_time: number;
  duration: number;
  radiant_win: boolean;
  lobby_type?: number | null;
  radiant_gold_adv?: number[] | null;
  radiant_xp_adv?: number[] | null;
  objectives?: RawObjective[] | null;
  teamfights?: RawTeamfight[] | null;
  chat?: RawChat[] | null;
  players: RawFullPlayer[];
}
