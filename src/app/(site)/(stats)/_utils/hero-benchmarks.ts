/** Compares a player's matches on one hero with OpenDota's benchmarks for that hero. Pure. */

import type { BenchmarkMetric, BenchmarkPoint, HeroBenchmarks, HeroComparisonRow } from "./coach-types";
import type { MatchSummary } from "@/types/opendota";

/** Fewer games than this on the hero says too little to compare. */
export const MIN_HERO_MATCHES = 3;

interface MetricSpec {
  metric: BenchmarkMetric;
  label: string;
  /** Per-match value, already per minute where the metric is. */
  pick: (match: MatchSummary, minutes: number) => number;
  /** Display multiplier (kills per minute reads better per 10 minutes). */
  scale: number;
  lowerIsBetter?: boolean;
}

const METRICS: MetricSpec[] = [
  { metric: "gold_per_min", label: "GPM", pick: (match) => match.gpm, scale: 1 },
  { metric: "xp_per_min", label: "XPM", pick: (match) => match.xpm, scale: 1 },
  { metric: "last_hits_per_min", label: "Last hits / min", pick: (match, minutes) => match.lastHits / minutes, scale: 1 },
  { metric: "hero_damage_per_min", label: "Hero damage / min", pick: (match, minutes) => match.heroDamage / minutes, scale: 1 },
  { metric: "kills_per_min", label: "Kills / 10 min", pick: (match, minutes) => match.kills / minutes, scale: 10 },
  { metric: "deaths_per_min", label: "Deaths / 10 min", pick: (match, minutes) => match.deaths / minutes, scale: 10, lowerIsBetter: true },
];

/** 0-100 position of `value` on the curve, interpolated between points and clamped to its ends. */
export function percentileOf(value: number, points: BenchmarkPoint[]): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (value <= first.value) return first.percentile * 100;
  if (value >= last.value) return last.percentile * 100;

  const upperIndex = points.findIndex((point) => point.value >= value);
  const lower = points[upperIndex - 1];
  const upper = points[upperIndex];
  const span = upper.value - lower.value;
  const fraction = span === 0 ? 0 : (value - lower.value) / span;
  return (lower.percentile + fraction * (upper.percentile - lower.percentile)) * 100;
}

/** OpenDota's median, or the closest point to it. */
function medianOf(points: BenchmarkPoint[]): number {
  return points.reduce((best, point) => (Math.abs(point.percentile - 0.5) < Math.abs(best.percentile - 0.5) ? point : best)).value;
}

/** One row per metric OpenDota has data for. Empty when there are too few matches on the hero. */
export function compareToHero(heroMatches: MatchSummary[], benchmarks: HeroBenchmarks): HeroComparisonRow[] {
  const timed = heroMatches.filter((match) => match.durationSeconds > 0);
  if (timed.length < MIN_HERO_MATCHES) return [];

  return METRICS.flatMap(({ metric, label, pick, scale, lowerIsBetter }) => {
    const points = benchmarks[metric];
    if (!points || points.length === 0) return [];

    const average = timed.reduce((sum, match) => sum + pick(match, match.durationSeconds / 60), 0) / timed.length;
    const position = percentileOf(average, points);
    return [{ metric, label, yours: average * scale, median: medianOf(points) * scale, betterThan: lowerIsBetter ? 100 - position : position }];
  });
}
