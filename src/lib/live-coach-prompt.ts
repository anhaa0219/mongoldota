/** Prompts for the live coach (one short tip, or an item plan) from real numbers only, and parsing the replies. Pure. */

import { POSITION_NAMES } from "@/lib/draft-advice";
import { formatDuration } from "@/lib/format";
import { buildingLabel, describeBuildings, parseBuildingKey, teamName } from "@/lib/gsi-buildings";
import type { AdviceFacts } from "@/types/draft";
import type { Side } from "@/types/game";
import type { LiveEvent, LiveSnapshot } from "@/types/live";

const MAX_TIP_LENGTH = 300;
const MAX_PLAN_ITEMS = 6;

type ItemName = (key: string) => string;

const pct = (value: number) => `${Math.round(value)}%`;

function gameLine(snapshot: LiveSnapshot, heroName: string, itemName: ItemName): string {
  const items = snapshot.inventory.flatMap((key) => (key ? itemName(key) : [])).join(", ") || "none";
  return [
    `Game time ${formatDuration(snapshot.clockSeconds)}. The player is ${heroName}, level ${snapshot.level}${snapshot.alive ? "" : `, dead (respawn in ${snapshot.respawnSeconds}s)`}.`,
    `K ${snapshot.kills} / D ${snapshot.deaths} / A ${snapshot.assists}. Last hits ${snapshot.lastHits}. Gold ${snapshot.gold}, GPM ${snapshot.gpm}, XPM ${snapshot.xpm}.`,
    `Items: ${items}.`,
    ...describeBuildings(snapshot),
  ].join("\n");
}

function buildingLine(detail: string, playerTeam: Side | null): string {
  const building = parseBuildingKey(detail);
  if (!building) return "- A building just fell.";
  return `- ${teamName(building.team, playerTeam)} just lost the ${buildingLabel(building)}.`;
}

function eventLine(event: LiveEvent, itemName: ItemName, playerTeam: Side | null): string {
  switch (event.kind) {
    case "death":
      return "- They just died.";
    case "kill":
      return `- They just got ${event.detail} kill${event.detail === "1" ? "" : "s"}.`;
    case "building":
      return buildingLine(event.detail, playerTeam);
    case "item":
      return `- They just bought ${itemName(event.detail)}.`;
    case "gold":
      return `- They now have enough gold for ${itemName(event.detail)}.`;
    case "lookahead":
      return "- Quiet moment: tell them what to expect and prepare for in the next 3-5 minutes.";
    case "asked":
      return "- They asked for advice right now.";
    case "plan":
      return "- The match just started.";
  }
}

function teamLines(facts: AdviceFacts): string[] {
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
  snapshot: LiveSnapshot;
  heroName: string;
  events: LiveEvent[];
  facts: AdviceFacts | null;
  itemName: ItemName;
  plan: string[] | null;
  recentTips: string[];
}

export function buildLiveTipPrompt({ snapshot, heroName, events, facts, itemName, plan, recentTips }: TipInput): string {
  return [
    "You are an expert Dota 2 coach talking to a player DURING their match.",
    "Give ONE short, specific tip (at most 2 sentences) for what just happened. Use only the numbers below; never invent statistics.",
    "",
    gameLine(snapshot, heroName, itemName),
    ...(facts ? ["", ...teamLines(facts)] : []),
    plan ? `Their item plan: ${plan.map(itemName).join(" → ")}.` : "",
    "",
    "What just happened:",
    ...events.map((event) => eventLine(event, itemName, snapshot.team)),
    ...(recentTips.length > 0 ? ["", "Do not repeat these recent tips:", ...recentTips.map((tip) => `- ${tip}`)] : []),
    "",
    "Answer with the tip only: no heading, no list.",
  ].join("\n");
}

interface PlanInput {
  snapshot: LiveSnapshot;
  heroName: string;
  facts: AdviceFacts | null;
  candidates: { key: string; name: string }[];
}

export function buildItemPlanPrompt({ snapshot, heroName, facts, candidates }: PlanInput): string {
  return [
    `You are an expert Dota 2 coach. The player's match just started; they play ${heroName}.`,
    `Choose the 4-${MAX_PLAN_ITEMS} core items they should build next, in buy order, from the candidates below.`,
    "",
    `Items they own now: ${snapshot.owned.join(", ") || "none"}.`,
    ...(facts ? teamLines(facts) : []),
    "",
    "Candidates (key: name):",
    ...candidates.map(({ key, name }) => `- ${key}: ${name}`),
    "",
    'Answer with a JSON array of candidate keys only, e.g. ["power_treads","dragon_lance"].',
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

/** Known item keys from the outermost [...] of the reply, once each, in order. */
export function parseItemPlan(text: string, known: Set<string>): string[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    const keys = parsed.filter((key): key is string => typeof key === "string" && known.has(key));
    return [...new Set(keys)].slice(0, MAX_PLAN_ITEMS);
  } catch {
    return [];
  }
}
