/** The live coach's tip prompt from real numbers only, and parsing the reply (the item plan is in live-plan-prompt). Pure. */

import { POSITION_NAMES } from "@/app/api/_utils/draft-advice";
import { eventLine, gameLine, type ItemName } from "./live-coach-lines";
import { laneLines, type LaneInfo } from "./live-lane";
import { splitPlan } from "./plan-slots";
import { languageLines } from "@/lib/ai/answer-language";
import type { Language } from "@/lib/i18n/language";
import type { AdviceFacts } from "@/types/draft";
import type { LiveEvent, LiveSnapshot } from "@/types/live";

const MAX_TIP_LENGTH = 300;

const pct = (value: number) => `${Math.round(value)}%`;

export function teamLines(facts: AdviceFacts): string[] {
  const enemies = facts.enemies.map((enemy) => {
    const record = enemy.myWinRate === null ? "" : `, ${facts.myHero.name} wins ${pct(enemy.myWinRate)} vs them`;
    return `${enemy.name} (pos ${enemy.position}${record})`;
  });
  const bkb = facts.bkb.map((rate) => `${rate.minute} min: ${pct(rate.winRate)}`).join("; ");
  const enemyAbilities = facts.abilities.filter((entry) => entry.team === "enemy").map(({ hero, list }) => `- ${hero}: ${list.join(" | ")}`);
  return [
    `They play ${POSITION_NAMES[facts.position]}. Allies: ${facts.allies.map((ally) => `${ally.name} (pos ${ally.position})`).join(", ") || "unknown"}.`,
    `Enemies: ${enemies.join(", ") || "unknown"}.`,
    bkb ? `Win rate by Black King Bar timing: ${bkb}.` : "",
    "Enemy abilities:",
    ...enemyAbilities,
  ].filter(Boolean);
}

interface TipInput {
  /** The language the tip is written in. */
  language: Language;
  snapshot: LiveSnapshot;
  heroName: string;
  events: LiveEvent[];
  facts: AdviceFacts | null;
  itemName: ItemName;
  plan: string[] | null;
  recentTips: string[];
  /** The player's lane; null when there is neither a usable draft nor a picked position. */
  lane: LaneInfo | null;
  /** REFERENCE block from the knowledge base (see lib/rag/knowledge-search); empty when nothing was found. */
  reference: string[];
  /** Memories of the player's own earlier matches (see lib/rag/match-memory); empty when none. */
  pastGames: string[];
  /** The player's own hero's abilities ("Shockwave: ..."); empty when OpenDota is unavailable. */
  myAbilities: string[];
}

/** The player's own abilities, so the model never guesses what their hero can do. */
export function myAbilityLines(heroName: string, myAbilities: string[]): string[] {
  if (myAbilities.length === 0) return [];
  return [
    "",
    `${heroName}'s abilities (name only these; never invent an ability, its range or what it does):`,
    ...myAbilities.map((ability) => `- ${ability}`),
  ];
}

/** The plan for a tip: the core in buy order, then the late-game options to choose by how the game goes. */
function planLine(plan: string[], itemName: ItemName): string {
  const { core, late } = splitPlan(plan);
  const options = late.length > 0 ? ` Optional late-game items, to pick by the situation (winning, losing, what the enemies build): ${late.map(itemName).join(", ")}.` : "";
  return `Their core item plan: ${core.map(itemName).join(" → ")}.${options}`;
}

function pastGameLines(pastGames: string[]): string[] {
  if (pastGames.length === 0) return [];
  return ["", "PAST GAMES OF THIS PLAYER (patterns from earlier matches, not facts about this one):", ...pastGames.map((game) => `- ${game}`)];
}

export function buildLiveTipPrompt({ snapshot, heroName, events, facts, itemName, plan, recentTips, lane, language, reference, pastGames, myAbilities }: TipInput): string {
  return [
    "You are an expert Dota 2 coach talking to a player DURING their match.",
    "Give ONE short, specific tip (at most 2 sentences) for what just happened. Use only the numbers below; never invent statistics.",
    "If they just got a kill, are on a kill streak, or their team won a teamfight, start with a few words of praise, then give the next move.",
    "",
    gameLine(snapshot, heroName, itemName),
    ...myAbilityLines(heroName, myAbilities),
    ...(facts ? ["", ...teamLines(facts)] : []),
    ...(lane ? ["", ...laneLines(lane, heroName, snapshot.clockSeconds)] : []),
    ...(plan ? [planLine(plan, itemName)] : []),
    ...(reference.length > 0 ? ["", ...reference] : []),
    ...pastGameLines(pastGames),
    "",
    "What just happened:",
    ...events.map((event) => eventLine(event, itemName, snapshot.team, lane?.lane ?? null)),
    ...(recentTips.length > 0 ? ["", "Do not repeat these recent tips:", ...recentTips.map((tip) => `- ${tip}`)] : []),
    "",
    ...languageLines(language),
    "Answer with the tip only: no heading, no list.",
  ].join("\n");
}

/** The first paragraph, without markdown or the model's thinking; null when nothing usable is left. */
export function parseLiveTip(text: string): string | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/[*_`#>]/g, "");
  const paragraph = cleaned
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .find((part) => part.length > 0);
  if (!paragraph) return null;
  if (paragraph.length <= MAX_TIP_LENGTH) return paragraph;
  return `${paragraph.slice(0, MAX_TIP_LENGTH - 1).replace(/\s\S*$/, "")}…`;
}
