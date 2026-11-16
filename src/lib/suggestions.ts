/** Picks the Stats page suggestions from benchmarks, recent form, lanes and heroes. Pure. */

import type { BenchmarkMetric, FormTrend, HeroComparisonRow, Suggestion } from "@/types/coach";
import type { LaneRole, PlayerSummary } from "@/types/opendota";

export const MAX_SUGGESTIONS = 5;
/** Below this "better than %" a metric is a weakness; at or above STRENGTH it is a strength. */
const WEAK = 40;
const STRENGTH = 65;
/** Win-rate gap (percentage points) worth pointing out. */
const WIN_RATE_GAP = 10;
/** A lane or hero needs this many games before its win rate is trusted. */
const MIN_GAMES = 5;

const laneNames: Record<LaneRole, string> = { 1: "safe lane", 2: "mid lane", 3: "off lane", 4: "jungle" };

const ADVICE: Record<BenchmarkMetric, { title: string; advice: string }> = {
  gold_per_min: { title: "Raise your farm", advice: "Farm between fights, and clear nearby camps whenever your lane is pushed." },
  xp_per_min: { title: "Gain levels faster", advice: "Spend less time dead or walking, and stay near waves and fights to soak XP." },
  last_hits_per_min: { title: "Hit more creeps", advice: "Practise last hits in a demo lobby for 10 minutes before you queue." },
  hero_damage_per_min: { title: "Do more damage in fights", advice: "Join fights earlier and spend your spells on heroes, not creeps." },
  kills_per_min: { title: "Look for more kills", advice: "When your lane is pushed, rotate to a nearby lane and follow up on your team's stuns." },
  deaths_per_min: { title: "Die less", advice: "Carry a TP, check the minimap every few seconds, and don't farm unwarded lanes alone." },
};

type Scored = Suggestion & { score: number };

const round = (value: number) => (value >= 100 ? Math.round(value).toLocaleString("en-US") : value.toFixed(1));
const percent = (value: number) => `${Math.round(value)}%`;

function benchmarkSuggestions(heroName: string, comparison: HeroComparisonRow[]): Scored[] {
  const weak = comparison
    .filter((row) => row.betterThan < WEAK)
    .sort((a, b) => a.betterThan - b.betterThan)
    .slice(0, 2)
    .map((row): Scored => {
      const { title, advice } = ADVICE[row.metric];
      const where = `${row.label}: ${round(row.yours)} on ${heroName} (typical ${round(row.median)})`;
      const rank = row.metric === "deaths_per_min" ? `more than ${percent(100 - row.betterThan)}` : `better than only ${percent(row.betterThan)}`;
      return { id: `weak-${row.metric}`, tone: "fix", title, detail: `${where}, ${rank} of ${heroName} players. ${advice}`, score: 100 - row.betterThan };
    });

  const best = comparison.reduce<HeroComparisonRow | null>((top, row) => (!top || row.betterThan > top.betterThan ? row : top), null);
  if (!best || best.betterThan < STRENGTH) return weak;
  const strength: Scored = {
    id: `strong-${best.metric}`,
    tone: "strength",
    title: `${best.label} is your strength`,
    detail: `${round(best.yours)} on ${heroName}, better than ${percent(best.betterThan)} of ${heroName} players. Play to it: pick fights and items that use it.`,
    score: 30,
  };
  return [...weak, strength];
}

function formSuggestions(form: FormTrend | null): Scored[] {
  if (!form) return [];
  const { recent, earlier } = form;
  const change = recent.winRate - earlier.winRate;
  const versus = `${percent(recent.winRate)} win rate in your last ${recent.matches} games vs ${percent(earlier.winRate)} before`;
  const found: Scored[] = [];

  if (change <= -WIN_RATE_GAP) {
    found.push({ id: "form-down", tone: "fix", title: "Recent slump", detail: `${versus}. Take a break after two losses in a row, and replay one loss to find the fight that decided it.`, score: 60 + Math.abs(change) });
  } else if (change >= WIN_RATE_GAP) {
    found.push({ id: "form-up", tone: "strength", title: "You're on the rise", detail: `${versus}. Keep the same heroes and lanes while it works.`, score: 25 });
  }
  if (recent.deaths - earlier.deaths >= 1) {
    found.push({ id: "form-deaths", tone: "fix", title: "Dying more lately", detail: `${recent.deaths.toFixed(1)} deaths a game in your last ${recent.matches} vs ${earlier.deaths.toFixed(1)} before. Play the first 10 minutes safer.`, score: 55 });
  }
  return found;
}

function laneSuggestion(summary: PlayerSummary): Scored[] {
  const main = summary.mainLane && summary.lanes.find((entry) => entry.lane === summary.mainLane?.lane);
  const best = summary.lanes.filter((entry) => entry.matches >= MIN_GAMES).sort((a, b) => b.winRate - a.winRate)[0];
  if (!main || !best || best.lane === main.lane || best.winRate - main.winRate < WIN_RATE_GAP) return [];
  return [{
    id: "lane",
    tone: "tip",
    title: `Try ${laneNames[best.lane]} more`,
    detail: `You win ${percent(best.winRate)} in the ${laneNames[best.lane]} (${best.matches} games) but ${percent(main.winRate)} in the ${laneNames[main.lane]}, where you play most.`,
    score: 45 + (best.winRate - main.winRate) / 2,
  }];
}

function heroSuggestion(summary: PlayerSummary): Scored[] {
  const { mostPlayed } = summary;
  const best = summary.topHeroes.filter((entry) => entry.matches >= MIN_GAMES).sort((a, b) => b.winRate - a.winRate)[0];
  if (!best || best.hero.id === mostPlayed.hero.id || best.winRate - mostPlayed.winRate < WIN_RATE_GAP) return [];
  return [{
    id: "hero",
    tone: "tip",
    title: `${best.hero.name} works for you`,
    detail: `${percent(best.winRate)} win rate over ${best.matches} games on ${best.hero.name} vs ${percent(mostPlayed.winRate)} on ${mostPlayed.hero.name}. Pick it more in ranked.`,
    score: 40 + (best.winRate - mostPlayed.winRate) / 2,
  }];
}

/** Most important first, at most MAX_SUGGESTIONS. Never empty. */
export function buildSuggestions(input: { heroName: string; comparison: HeroComparisonRow[]; form: FormTrend | null; summary: PlayerSummary }): Suggestion[] {
  const all = [
    ...benchmarkSuggestions(input.heroName, input.comparison),
    ...formSuggestions(input.form),
    ...laneSuggestion(input.summary),
    ...heroSuggestion(input.summary),
  ];
  if (all.length === 0) {
    return [{ id: "steady", tone: "strength", title: "Nothing stands out", detail: `Your numbers are close to typical ${input.heroName} players. Keep playing and check back after more games.` }];
  }
  return all
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS)
    .map((suggestion) => ({ id: suggestion.id, tone: suggestion.tone, title: suggestion.title, detail: suggestion.detail }));
}
