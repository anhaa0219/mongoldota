/** Prompt for the Stats page AI coach, built only from the player's real numbers, and parsing of its reply. Pure. */

import { z } from "zod";
import { languageLines } from "@/lib/ai/answer-language";
import type { Language } from "@/lib/i18n/language";
import type { FormTrend, HeroComparisonRow, Suggestion } from "./coach-types";
import type { LaneRole, PlayerSummary, PlaystyleStat, WinRecord } from "@/types/opendota";

export const AI_SUGGESTION_COUNT = 10;
const MAX_SUGGESTIONS = 12;
const laneNames: Record<LaneRole, string> = { 1: "safe lane", 2: "mid lane", 3: "off lane", 4: "jungle" };

export interface StatsCoachInput {
  summary: PlayerSummary;
  comparison: HeroComparisonRow[];
  form: FormTrend | null;
  playstyle: PlaystyleStat[];
  /** The most played hero's real abilities ("Name: short description"). */
  abilities: string[];
  /** What the fixed rules already found, so the coach builds on it. */
  ruleSuggestions: Suggestion[];
}

const pct = (value: number) => `${Math.round(value)}%`;
const num = (value: number) => (value >= 100 ? Math.round(value).toLocaleString("en-US") : value.toFixed(1));
const record = (label: string, entry: WinRecord | null) => (entry ? `${label} ${pct(entry.winRate)} (${entry.matches} games)` : null);

function factLines({ summary, comparison, form, playstyle }: StatsCoachInput): string[] {
  const { mostPlayed, averages: avg, lanes, sides, queues, streaks, topHeroes } = summary;
  const hero = mostPlayed.hero.name;
  return [
    `Last ${summary.wins + summary.losses} matches: ${summary.wins} wins, ${summary.losses} losses. Current streak ${streaks.current.result}${streaks.current.length}.`,
    `Most played hero: ${hero}, ${mostPlayed.matches} games, ${pct(mostPlayed.winRate)} win rate.`,
    `Averages per match: ${num(avg.kills)}/${num(avg.deaths)}/${num(avg.assists)} K/D/A, KDA ${num(avg.kda)}, GPM ${num(avg.gpm)}, XPM ${num(avg.xpm)}, last hits ${num(avg.lastHits)}, hero damage ${num(avg.heroDamage)}. Average game ${Math.round(summary.averageDurationSeconds / 60)} min.`,
    comparison.length
      ? `On ${hero} vs other ${hero} players: ${comparison.map((row) => `${row.label} ${num(row.yours)} (typical ${num(row.median)}, better than ${pct(row.betterThan)})`).join("; ")}.`
      : `No benchmark comparison for ${hero}.`,
    form
      ? `Last ${form.recent.matches} games vs the ${form.earlier.matches} before: win rate ${pct(form.recent.winRate)} vs ${pct(form.earlier.winRate)}, KDA ${num(form.recent.kda)} vs ${num(form.earlier.kda)}, deaths ${num(form.recent.deaths)} vs ${num(form.earlier.deaths)}, GPM ${num(form.recent.gpm)} vs ${num(form.earlier.gpm)}.`
      : "Not enough matches for a recent-form comparison.",
    `Lanes (analysed games): ${lanes.map((lane) => `${laneNames[lane.lane]} ${pct(lane.winRate)} (${lane.matches})`).join(", ") || "no lane data"}.`,
    [record("Radiant", sides.radiant), record("Dire", sides.dire), record("Ranked", queues.ranked), record("Unranked", queues.unranked)].filter(Boolean).join(", ") + ".",
    `Top heroes: ${topHeroes.map((entry) => `${entry.hero.name} ${pct(entry.winRate)} (${entry.matches})`).join(", ")}.`,
    playstyle.length ? `Playstyle per match: ${playstyle.map((stat) => `${stat.label} ${num(stat.average)}`).join(", ")}.` : "No playstyle totals.",
  ];
}

export function buildStatsCoachPrompt(input: StatsCoachInput, language: Language): string {
  const hero = input.summary.mostPlayed.hero.name;
  return [
    "You are an expert Dota 2 coach reviewing a player's last 100 public matches.",
    `Give exactly ${AI_SUGGESTION_COUNT} specific, actionable suggestions that will raise their win rate. Lead with the biggest problems.`,
    "Each suggestion must point to a number from the facts below and say exactly what to do differently in their next games (habits, item choices, lane choices, hero pool, farming, deaths, vision, fighting).",
    "Include at least 2 strengths to keep. Never invent statistics. Mention abilities only from the list given, only for that hero.",
    "",
    "FACTS:",
    ...factLines(input),
    `${hero} abilities: ${input.abilities.join(" | ") || "unknown"}.`,
    `Already detected: ${input.ruleSuggestions.map((suggestion) => suggestion.title).join("; ") || "nothing"}.`,
    "",
    ...languageLines(language),
    'Answer with JSON only: {"suggestions": [{"tone": "fix|strength|tip", "title": "max 8 words", "detail": "1-2 sentences"}]}',
    "tone: fix = a weakness to work on, strength = keep doing it, tip = a choice that may win more.",
  ].join("\n");
}

const suggestionFields = { tone: z.enum(["fix", "strength", "tip"]), title: z.string().min(1).max(120), detail: z.string().min(1).max(600) };
const replySchema = z.object({ suggestions: z.array(z.object(suggestionFields)).min(1) });

/** Stored AI suggestions (with their ids), checked when read back from the database. */
export const storedSuggestionsSchema = z.array(z.object({ id: z.string(), ...suggestionFields })).min(1);

/** The model may wrap its JSON in prose or a code fence: take the outermost {...}. Null when unusable. */
export function parseCoachSuggestions(text: string): Suggestion[] | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = replySchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    if (!parsed.success) return null;
    return parsed.data.suggestions.slice(0, MAX_SUGGESTIONS).map((suggestion, index) => ({ id: `ai-${index}`, ...suggestion }));
  } catch {
    return null;
  }
}
