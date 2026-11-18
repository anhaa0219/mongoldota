/** Picks the Stats page suggestions from benchmarks, recent form, lanes and heroes, in the visitor's language. Pure. */

import type { Words } from "@/lib/i18n/words";
import type { FormTrend, HeroComparisonRow, Suggestion } from "./coach-types";
import type { LaneRole, PlayerSummary } from "@/types/opendota";

export const MAX_SUGGESTIONS = 5;
/** Below this "better than %" a metric is a weakness; at or above STRENGTH it is a strength. */
const WEAK = 40;
const STRENGTH = 65;
/** Win-rate gap (percentage points) worth pointing out. */
const WIN_RATE_GAP = 10;
/** A lane or hero needs this many games before its win rate is trusted. */
const MIN_GAMES = 5;

/** Dota terms: the same in every language. */
const laneNames: Record<LaneRole, string> = { 1: "safe lane", 2: "mid lane", 3: "off lane", 4: "jungle" };

type Scored = Suggestion & { score: number };

const round = (value: number) => (value >= 100 ? Math.round(value).toLocaleString("en-US") : value.toFixed(1));
const percent = (value: number) => `${Math.round(value)}%`;

function benchmarkSuggestions(heroName: string, comparison: HeroComparisonRow[], words: Words): Scored[] {
  const say = words.suggest;
  const label = (row: HeroComparisonRow) => words.stats.metrics[row.metric];
  const weak = comparison
    .filter((row) => row.betterThan < WEAK)
    .sort((a, b) => a.betterThan - b.betterThan)
    .slice(0, 2)
    .map((row): Scored => {
      const { title, advice } = say.advice[row.metric];
      const rank = row.metric === "deaths_per_min" ? say.moreThan(percent(100 - row.betterThan)) : say.betterThanOnly(percent(row.betterThan));
      const detail = say.weakDetail(label(row), round(row.yours), heroName, round(row.median), rank, advice);
      return { id: `weak-${row.metric}`, tone: "fix", title, detail, score: 100 - row.betterThan };
    });

  const best = comparison.reduce<HeroComparisonRow | null>((top, row) => (!top || row.betterThan > top.betterThan ? row : top), null);
  if (!best || best.betterThan < STRENGTH) return weak;
  const strength: Scored = {
    id: `strong-${best.metric}`,
    tone: "strength",
    title: say.strengthTitle(label(best)),
    detail: say.strengthDetail(round(best.yours), heroName, percent(best.betterThan)),
    score: 30,
  };
  return [...weak, strength];
}

function formSuggestions(form: FormTrend | null, say: Words["suggest"]): Scored[] {
  if (!form) return [];
  const { recent, earlier } = form;
  const change = recent.winRate - earlier.winRate;
  const versus = say.versus(percent(recent.winRate), recent.matches, percent(earlier.winRate));
  const found: Scored[] = [];

  if (change <= -WIN_RATE_GAP) {
    found.push({ id: "form-down", tone: "fix", title: say.slumpTitle, detail: say.slumpDetail(versus), score: 60 + Math.abs(change) });
  } else if (change >= WIN_RATE_GAP) {
    found.push({ id: "form-up", tone: "strength", title: say.riseTitle, detail: say.riseDetail(versus), score: 25 });
  }
  if (recent.deaths - earlier.deaths >= 1) {
    found.push({ id: "form-deaths", tone: "fix", title: say.dyingTitle, detail: say.dyingDetail(recent.deaths.toFixed(1), recent.matches, earlier.deaths.toFixed(1)), score: 55 });
  }
  return found;
}

function laneSuggestion(summary: PlayerSummary, say: Words["suggest"]): Scored[] {
  const main = summary.mainLane && summary.lanes.find((entry) => entry.lane === summary.mainLane?.lane);
  const best = summary.lanes.filter((entry) => entry.matches >= MIN_GAMES).sort((a, b) => b.winRate - a.winRate)[0];
  if (!main || !best || best.lane === main.lane || best.winRate - main.winRate < WIN_RATE_GAP) return [];
  return [{
    id: "lane",
    tone: "tip",
    title: say.laneTitle(laneNames[best.lane]),
    detail: say.laneDetail(percent(best.winRate), laneNames[best.lane], best.matches, percent(main.winRate), laneNames[main.lane]),
    score: 45 + (best.winRate - main.winRate) / 2,
  }];
}

function heroSuggestion(summary: PlayerSummary, say: Words["suggest"]): Scored[] {
  const { mostPlayed } = summary;
  const best = summary.topHeroes.filter((entry) => entry.matches >= MIN_GAMES).sort((a, b) => b.winRate - a.winRate)[0];
  if (!best || best.hero.id === mostPlayed.hero.id || best.winRate - mostPlayed.winRate < WIN_RATE_GAP) return [];
  return [{
    id: "hero",
    tone: "tip",
    title: say.heroTitle(best.hero.name),
    detail: say.heroDetail(percent(best.winRate), best.matches, best.hero.name, percent(mostPlayed.winRate), mostPlayed.hero.name),
    score: 40 + (best.winRate - mostPlayed.winRate) / 2,
  }];
}

/** Most important first, at most MAX_SUGGESTIONS. Never empty. */
export function buildSuggestions(input: { heroName: string; comparison: HeroComparisonRow[]; form: FormTrend | null; summary: PlayerSummary }, words: Words): Suggestion[] {
  const all = [
    ...benchmarkSuggestions(input.heroName, input.comparison, words),
    ...formSuggestions(input.form, words.suggest),
    ...laneSuggestion(input.summary, words.suggest),
    ...heroSuggestion(input.summary, words.suggest),
  ];
  if (all.length === 0) {
    return [{ id: "steady", tone: "strength", title: words.suggest.steadyTitle, detail: words.suggest.steadyDetail(input.heroName) }];
  }
  return all
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS)
    .map((suggestion) => ({ id: suggestion.id, tone: suggestion.tone, title: suggestion.title, detail: suggestion.detail }));
}
