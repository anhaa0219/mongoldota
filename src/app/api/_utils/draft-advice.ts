/** Turns OpenDota data into compact facts, the coach prompt, and parses the coach's reply. Pure. */

import { z } from "zod";
import { languageLines } from "@/lib/ai/answer-language";
import type { Language } from "@/lib/i18n/language";
import type { AdviceFacts, AdviceItem, Position, TimedWinRate } from "@/types/draft";

export const ADVICE_COUNT = 12;
const MAX_ADVICE = 15;

export const POSITION_NAMES: Record<Position, string> = {
  1: "Position 1 (safe lane carry)",
  2: "Position 2 (mid)",
  3: "Position 3 (off lane)",
  4: "Position 4 (soft support)",
  5: "Position 5 (hard support)",
};

/** Most bought first; item ids the item list does not know are skipped. */
export function topItems(counts: Record<string, number> | undefined, nameOf: (itemId: number) => string | undefined, limit: number): string[] {
  return Object.entries(counts ?? {})
    .sort(([, a], [, b]) => b - a)
    .flatMap(([itemId]) => nameOf(Number(itemId)) ?? [])
    .slice(0, limit);
}

/** Buckets with enough games, in time order. Accepts OpenDota's string counts. */
export function timedWinRates(rows: { seconds: number; games: string | number; wins: string | number }[], minGames: number): TimedWinRate[] {
  return rows
    .map((row) => ({ seconds: row.seconds, games: Number(row.games), wins: Number(row.wins) }))
    .filter((row) => row.games >= minGames)
    .sort((a, b) => a.seconds - b.seconds)
    .map((row) => ({ minute: Math.round(row.seconds / 60), winRate: (row.wins / row.games) * 100, games: row.games }));
}

const pct = (value: number) => `${Math.round(value)}%`;
const curve = (rates: TimedWinRate[], label: string) =>
  rates.length === 0 ? "no data" : rates.map((rate) => `${label} ${rate.minute} min: ${pct(rate.winRate)} (${rate.games} games)`).join("; ");

function abilityLines(facts: AdviceFacts, team: "yours" | "enemy") {
  return facts.abilities.filter((entry) => entry.team === team).map(({ hero, list }) => `- ${hero}: ${list.join(" | ") || "unknown"}`);
}

function laneLine({ myHero, position, lane }: AdviceFacts) {
  const team = [`${myHero.name} (pos ${position})`, ...lane.partners].join(" + ");
  if (lane.opponents.length === 0) return `${team} vs unknown heroes.`;
  const opponents = lane.opponents.map((enemy) => {
    const record = enemy.myWinRate === null ? "" : `, ${myHero.name} wins ${pct(enemy.myWinRate)} vs them in ${enemy.games} games`;
    return `${enemy.name} (pos ${enemy.position}${record})`;
  });
  return `${team} vs ${opponents.join(" + ")}.`;
}

export function buildAdvicePrompt(facts: AdviceFacts, language: Language): string {
  const { myHero, enemies, allies, items, personal } = facts;
  const enemyLines = enemies.map((enemy) => {
    const record = enemy.myWinRate === null ? "no matchup data" : `${myHero.name} wins ${pct(enemy.myWinRate)} vs them (${enemy.games} games)`;
    return `- pos ${enemy.position} ${enemy.name} [${enemy.roles.join(", ")}]: ${record}`;
  });
  return [
    `You are an expert Dota 2 coach. The player has just locked the draft and plays ${myHero.name} as ${POSITION_NAMES[facts.position]}.`,
    `Give exactly ${ADVICE_COUNT} short, specific pieces of advice that help them win THIS game against THESE heroes.`,
    "Cover: the laning stage against the exact lane opponents under LANE (farm, trade or harass, and what to avoid), starting items vs those lane opponents,",
    "core items and BKB timing (or why not BKB), the power-spike timing to fight or push, the biggest enemy threats and how to play around them, teamfight positioning, and when to start farming the jungle.",
    "LANE is fixed by the draft: never name any other enemy as a lane opponent. Other enemies only matter after laning or when they rotate.",
    "Use the numbers below where they help, and never invent other statistics. Name real Dota 2 items only.",
    "Mention only abilities listed under ABILITIES, only for the hero and team they belong to, and only with the effects their descriptions give. Never call an ally's ability an enemy threat.",
    "",
    "FACTS (OpenDota public matches):",
    `LANE: ${laneLine(facts)}`,
    `Player hero: ${myHero.name} [${myHero.roles.join(", ")}], overall win rate ${pct(myHero.winRate)}.`,
    personal ? `The player's own record on ${myHero.name}: ${pct(personal.winRate)} over ${personal.games} games.` : "The player has no recent games on this hero.",
    `Allies: ${allies.map((ally) => `pos ${ally.position} ${ally.name} [${ally.roles.join(", ")}]`).join("; ") || "unknown"}.`,
    "Enemies:",
    ...enemyLines,
    `Most bought starting items: ${items.start.join(", ") || "no data"}.`,
    `Early items: ${items.early.join(", ") || "no data"}. Mid game: ${items.mid.join(", ") || "no data"}. Late: ${items.late.join(", ") || "no data"}.`,
    `Win rate by when Black King Bar was finished: ${curve(facts.bkb, "by")}.`,
    `Win rate by game length: ${curve(facts.durations, "at")}.`,
    "",
    `ABILITIES — YOUR TEAM (${myHero.name} and allies, never an enemy threat):`,
    ...abilityLines(facts, "yours"),
    "ABILITIES — ENEMY TEAM:",
    ...abilityLines(facts, "enemy"),
    "",
    ...languageLines(language),
    'Answer with JSON only: {"advice": [{"category": "Laning|Items|Timing|Enemies|Teamfight|Map", "title": "max 8 words", "detail": "1-2 sentences"}]}',
  ].join("\n");
}

const adviceSchema = z.object({
  advice: z
    .array(z.object({ category: z.string().max(40), title: z.string().min(1).max(120), detail: z.string().min(1).max(600) }))
    .min(1),
});

/** The model may wrap its JSON in prose or a code fence: take the outermost {...}. Null when unusable. */
export function parseAdvice(text: string): AdviceItem[] | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = adviceSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data.advice.slice(0, MAX_ADVICE) : null;
  } catch {
    return null;
  }
}
