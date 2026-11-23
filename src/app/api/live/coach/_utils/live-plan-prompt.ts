/** The live coach's item plan: the prompt (4 core items with one job each, then 2 optional late-game picks, all from what OpenDota says this hero buys) and parsing the reply. Pure. */

import { laneLines, type LaneInfo } from "./live-lane";
import { myAbilityLines, teamLines } from "./live-coach-prompt";
import type { AdviceFacts, Position } from "@/types/draft";
import type { LiveSnapshot } from "@/types/live";
import { CORE_ITEMS, LATE_ITEMS } from "./plan-slots";

/** An item this hero's players buy, from OpenDota's item popularity. */
export interface PlanCandidate {
  key: string;
  name: string;
  /** Times bought in OpenDota's sample; null when OpenDota had nothing for this hero (every item is a candidate). */
  bought: number | null;
  /** The part of the game it is bought in most. */
  phase: "early" | "mid" | "late" | null;
  /** Keys of other candidates built from this one (Yasha: ["manta"]). */
  partOf: string[];
}

const PHASE_WORDS = { early: "early game, before 10 min", mid: "mid game, 10-25 min", late: "late game, after 25 min" };

const CORE_SLOTS = [
  "1. A farming item, or an item that raises their kill potential, whichever suits this hero and lane.",
  "2. An item that helps them kill and gank.",
  "3. Black King Bar, or another item that keeps them alive in fights and still helps them fight.",
];

const LATE_SLOT = [
  "5-6. Two optional late-game items (after about 25 minutes), for the situation the game may turn into:",
  "items that counter these enemy heroes and what they usually build (Monkey King Bar against evasion, Nullifier against Ghost Scepter, Eul's or Glimmer Cape, Silver Edge against strong passives),",
  "or items for when their team is ahead (end the game) or behind (survive, defend high ground). Late-game candidates fit here.",
].join(" ");

/** One job per slot, by position: cores (1-3) farm, kill, survive, then the team; supports protect or set up kills. */
function slotLines(position: Position | null): string[] {
  const support = "Build 4 support items in buy order: defensive items that save allies and keep the team alive, or offensive items that help the team catch and kill. Mix them to fit the enemies. No farming items.";
  const fourth = (pos: Position | null) =>
    pos === 3 ? "4. A team item, or an item that makes them even harder to kill." : "4. A team item, or an item that adds more damage.";
  const core = ["Build 4 items in this order, one job each:", ...CORE_SLOTS, fourth(position)];
  if (position === 4 || position === 5) return [support, LATE_SLOT];
  if (position !== null) return [...core, LATE_SLOT];
  return ["Their position is unknown. If this hero is usually a core:", ...core.slice(1), "If it is usually a support:", support, LATE_SLOT];
}

function candidateLine({ key, name, bought, phase, partOf }: PlanCandidate, nameOf: (key: string) => string): string {
  const notes = [
    ...(bought !== null && phase !== null ? [`bought ${bought.toLocaleString("en-US")} times, mostly ${PHASE_WORDS[phase]}`] : []),
    ...(partOf.length > 0 ? [`builds into ${partOf.map(nameOf).join(", ")}`] : []),
  ];
  return `- ${key}: ${name}${notes.length > 0 ? ` (${notes.join("; ")})` : ""}`;
}

interface PlanInput {
  snapshot: LiveSnapshot;
  heroName: string;
  facts: AdviceFacts | null;
  candidates: PlanCandidate[];
  lane: LaneInfo | null;
  reference: string[];
  myAbilities: string[];
}

export function buildItemPlanPrompt({ snapshot, heroName, facts, candidates, lane, reference, myAbilities }: PlanInput): string {
  const position = facts?.position ?? lane?.position ?? null;
  const nameOf = (key: string) => candidates.find((candidate) => candidate.key === key)?.name ?? key;
  return [
    `You are an expert Dota 2 coach. The player's match just started; they play ${heroName}.`,
    `Choose their next ${CORE_ITEMS} core items, then ${LATE_ITEMS} optional late-game items, from the candidates below.`,
    "",
    `Items they own now: ${snapshot.owned.join(", ") || "none"}.`,
    ...myAbilityLines(heroName, myAbilities),
    ...(facts ? ["", ...teamLines(facts)] : []),
    ...(lane ? ["", ...laneLines(lane, heroName, snapshot.clockSeconds)] : []),
    ...(reference.length > 0 ? ["", ...reference] : []),
    "",
    ...slotLines(position),
    "",
    `Candidates: what ${heroName} players really buy, according to OpenDota, most bought first; the last ones are late-game items (key: name):`,
    ...candidates.map((candidate) => candidateLine(candidate, nameOf)),
    "",
    `Pick only candidates, and prefer the ones bought most. Never add an item only because it is strong on other heroes: an item bought rarely on ${heroName} needs a clear reason in this game. Boots are not part of the plan. Never pick an item together with a bigger item it builds into (Yasha with Manta Style): pick the bigger one. Never pick two items that do the same job (Manta Style and Sange and Yasha both grow from Yasha: choose one).`,
    `Answer with one JSON object of candidate keys: ${CORE_ITEMS} core items in buy order and ${LATE_ITEMS} late-game items, e.g. {"core":["maelstrom","sange_and_yasha","black_king_bar","assault"],"late":["monkey_king_bar","satanic"]}.`,
  ].join("\n");
}

/** Candidates named in a JSON list, once each, in order. */
function pickedFrom(list: unknown, candidates: PlanCandidate[]): PlanCandidate[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list)].flatMap((key) => candidates.find((candidate) => candidate.key === key) ?? []);
}

/** Drops an item that a bigger item in the same group is built from (Yasha next to Manta Style is already inside it). */
function withoutParts(picked: PlanCandidate[]): PlanCandidate[] {
  return picked.filter((candidate) => !candidate.partOf.some((bigger) => picked.some((other) => other.key === bigger)));
}

/** The plan in one {"core":[...],"late":[...]} object: core first, then late items not already in the core. */
function planFrom(object: string, candidates: PlanCandidate[]): string[] {
  try {
    const parsed: unknown = JSON.parse(object);
    if (typeof parsed !== "object" || parsed === null) return [];
    const { core, late } = parsed as { core?: unknown; late?: unknown };
    const coreKeys = withoutParts(pickedFrom(core, candidates)).map((candidate) => candidate.key).slice(0, CORE_ITEMS);
    const lateKeys = withoutParts(pickedFrom(late, candidates)).map((candidate) => candidate.key).filter((key) => !coreKeys.includes(key));
    return [...coreKeys, ...lateKeys].slice(0, CORE_ITEMS + LATE_ITEMS);
  } catch {
    return [];
  }
}

/**
 * The plan from the reply's last object with known item keys: core items, then late-game items (see splitPlan).
 * The model sometimes answers, then "Wait, let me correct the key" and answers again; the last answer counts.
 */
export function parseItemPlan(text: string, candidates: PlanCandidate[]): string[] {
  const objects = text.match(/\{[^{}]*\}/g) ?? [];
  for (const object of objects.reverse()) {
    const keys = planFrom(object, candidates);
    if (keys.length > 0) return keys;
  }
  return [];
}
