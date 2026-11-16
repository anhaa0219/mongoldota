/** Trending Heroes page: per-rank hero statistics from OpenDota /heroStats. */

/** "all" public matches, a medal tier "1".."8" (Herald..Immortal), or "pro" matches. */
export type MetaBracket = "all" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "pro";

export interface PickWin {
  picks: number;
  wins: number;
}

export interface HeroMeta {
  id: number;
  name: string;
  slug: string;
  roles: string[];
  /** "str" | "agi" | "int" | "all" */
  attribute: string;
  brackets: Record<MetaBracket, PickWin>;
  proBans: number;
  /** Daily public picks and wins for the last week, oldest first, today's unfinished day removed. */
  pickTrend: number[];
  winTrend: number[];
}

/** One table row; rates are 0-100. */
export interface MetaRow {
  heroId: number;
  matches: number;
  winRate: number;
  lossRate: number;
  /** Share of matches in this bracket that had the hero. */
  pickRate: number;
  /** Pro only: share of pro matches where the hero was banned. */
  banRate: number | null;
  /** % change in daily picks over the week (all brackets). */
  pickChange: number;
  /** Win-rate change in points over the week (all brackets). */
  winChange: number;
}
