/** Shapes for the Stats page coach column: hero benchmarks, recent form and suggestions. */

/** OpenDota /benchmarks metrics the coach compares. */
export type BenchmarkMetric =
  | "gold_per_min"
  | "xp_per_min"
  | "last_hits_per_min"
  | "hero_damage_per_min"
  | "kills_per_min"
  | "deaths_per_min";

/** percentile is 0-1 (OpenDota's scale); value is what a player at that percentile reached. */
export interface BenchmarkPoint {
  percentile: number;
  value: number;
}

/** /benchmarks?hero_id= result: points per metric, lowest percentile first. */
export type HeroBenchmarks = Partial<Record<string, BenchmarkPoint[]>>;

/** The player's average on one metric next to everyone else on the same hero. */
export interface HeroComparisonRow {
  metric: BenchmarkMetric;
  label: string;
  /** Already scaled for display (e.g. kills per 10 min). */
  yours: number;
  median: number;
  /** 0-100: share of players on this hero the player does better than (for deaths: dies less than). */
  betterThan: number;
}

/** Averages over one stretch of matches. */
export interface FormWindow {
  matches: number;
  /** 0-100, unrounded. */
  winRate: number;
  kda: number;
  deaths: number;
  gpm: number;
}

/** Last 20 matches against the ones before them. */
export interface FormTrend {
  recent: FormWindow;
  earlier: FormWindow;
}

/** fix = something to work on, strength = keep doing it, tip = a choice that may win more. */
export type SuggestionTone = "fix" | "strength" | "tip";

/** Plain data, so a language model can reword it later without changing how suggestions are picked. */
export interface Suggestion {
  id: string;
  tone: SuggestionTone;
  title: string;
  detail: string;
}
