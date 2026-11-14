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

/** Per-minute curves. Keyed by player slot. */
export interface MatchSeries {
  radiantGoldAdv: number[];
  radiantXpAdv: number[];
  netWorth: Record<number, number[]>;
  lastHits: Record<number, number[]>;
  xp: Record<number, number[]>;
}

export type MatchEventKind = "kill" | "death" | "item" | "roshan" | "aegis" | "tower" | "teamfight";

export interface MatchEvent {
  /** Seconds; may be negative (before the horn). */
  time: number;
  kind: MatchEventKind;
  slot: number | null;
  team: Team | null;
  label: string;
  image: string | null;
}

/** A position on the 0-100 minimap square; y grows downward (SVG). */
export interface MapPoint {
  x: number;
  y: number;
}

export interface WardMark extends MapPoint {
  /** Stable across renders: owner slot, kind, placement time. */
  id: string;
  kind: "observer" | "sentry";
  team: Team;
  placedAt: number;
  /** Null when the match has no record of it being removed (alive until the end). */
  removedAt: number | null;
}

/** Where a hero died during a teamfight; `team` is the dead hero's team. */
export interface DeathMark extends MapPoint {
  time: number;
  team: Team;
}

/** Approximate tower position (OpenDota does not provide building coordinates). */
export interface TowerMark extends MapPoint {
  key: string;
  team: Team;
  destroyedAt: number | null;
}

export interface HeatCell extends MapPoint {
  /** 0-1, relative to the player's busiest cell. */
  weight: number;
}

export interface MatchMap {
  wards: WardMark[];
  deaths: DeathMark[];
  towers: TowerMark[];
  /** Keyed by player slot: where they stood during the laning stage. */
  laneHeat: Record<number, HeatCell[]>;
}

export interface MatchCombat {
  /** attacker slot -> enemy slot -> hero damage. */
  damage: Record<number, Record<number, number>>;
  teamfights: { start: number; end: number; deaths: number; radiantGoldSwing: number }[];
}

export interface MatchLog {
  chat: { time: number; slot: number | null; text: string }[];
  /** slot -> purchases by item key (details in `items`, sent once). */
  purchases: Record<number, { time: number; key: string }[]>;
  /** Every purchased item, by key. */
  items: Record<string, ItemInfo>;
}

export interface MatchView {
  matchId: number;
  parsed: boolean;
  header: {
    radiantWin: boolean;
    radiantScore: number;
    direScore: number;
    durationSeconds: number;
    /** Milliseconds since epoch. */
    startTime: number;
    ranked: boolean;
  };
  /** Radiant first, each team by slot. */
  players: ScoreboardPlayer[];
  defaultFollowedSlot: number;
  /** slot -> lane opponent's slot. */
  laneOpponent: Record<number, number | null>;
  series: MatchSeries | null;
  events: MatchEvent[];
  map: MatchMap | null;
  combat: MatchCombat | null;
  log: MatchLog | null;
}
