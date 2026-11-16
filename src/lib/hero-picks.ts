/** "AI picks for you": a scored shortlist from the player's rank and record, the prompt, and parsing the reply. Pure. */

import { z } from "zod";
import { bracketLabel, bracketRows, hasSample } from "@/lib/hero-meta";
import type { PersonalRecord } from "@/types/draft";
import type { HeroMeta, MetaBracket } from "@/types/meta";
import type { LaneRole } from "@/types/opendota";

export const PICK_COUNT = 5;
const SHORTLIST_SIZE = 15;
/** Heroes OpenDota's roles say suit each lane the player plays most. */
const LANE_ROLES: Record<LaneRole, string[]> = { 1: ["Carry"], 2: ["Nuker", "Carry", "Escape"], 3: ["Durable", "Initiator"], 4: ["Carry"] };

export interface PickCandidate {
  heroId: number;
  name: string;
  slug: string;
  roles: string[];
  /** Win rate (0-100) in the player's bracket. */
  bracketWinRate: number;
  personal: PersonalRecord | null;
  fitsLane: boolean;
  score: number;
}

/** A pick as shown on the page: the hero's numbers and the reason. */
export interface PickCard {
  candidate: PickCandidate;
  reason: string;
}

const candidateSchema = z.object({
  heroId: z.number(),
  name: z.string(),
  slug: z.string(),
  roles: z.array(z.string()),
  bracketWinRate: z.number(),
  personal: z.object({ games: z.number(), winRate: z.number() }).nullable(),
  fitsLane: z.boolean(),
  score: z.number(),
});

/** Stored AI picks, checked when read back from the database. `bracket` is the rank they were chosen for. */
export const storedPicksSchema = z.object({
  bracket: z.string(),
  cards: z.array(z.object({ candidate: candidateSchema, reason: z.string() })).min(1),
});

export interface HeroPick {
  heroId: number;
  reason: string;
}

interface ShortlistInput {
  heroes: HeroMeta[];
  bracket: MetaBracket;
  personal: Record<number, PersonalRecord>;
  mainLane: LaneRole | null;
}

/** Meta strength in the player's rank, plus comfort and success on the hero, plus lane fit. Best first. */
export function shortlist({ heroes, bracket, personal, mainLane }: ShortlistInput): PickCandidate[] {
  const rows = new Map(bracketRows(heroes, bracket).map((row) => [row.heroId, row]));
  return heroes
    .flatMap((hero) => {
      const row = rows.get(hero.id);
      if (!row || !hasSample(row, bracket)) return [];
      const record = personal[hero.id] ?? null;
      const played = record && record.games >= 3 ? record : null;
      const fitsLane = mainLane !== null && LANE_ROLES[mainLane].some((role) => hero.roles.includes(role));
      const comfort = played ? (Math.min(played.games, 30) / 30) * 4 + ((played.winRate - 50) * Math.min(played.games, 20)) / 20 / 3 : 0;
      const score = row.winRate - 50 + comfort + (fitsLane ? 1.5 : 0);
      return [{ heroId: hero.id, name: hero.name, slug: hero.slug, roles: hero.roles, bracketWinRate: row.winRate, personal: played, fitsLane, score }];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, SHORTLIST_SIZE);
}

const pct = (value: number) => `${Math.round(value)}%`;

/** A plain reason from the numbers, used when the AI is unavailable. */
export function fallbackReason(candidate: PickCandidate, bracket: MetaBracket): string {
  const parts = [`${pct(candidate.bracketWinRate)} win rate in ${bracketLabel(bracket)}`];
  if (candidate.personal) parts.push(`you win ${pct(candidate.personal.winRate)} over ${candidate.personal.games} games`);
  if (candidate.fitsLane) parts.push("fits the lane you play most");
  return `${parts.join("; ")}.`;
}

export function buildHeroPicksPrompt(candidates: PickCandidate[], bracket: MetaBracket, mainLane: LaneRole | null): string {
  const laneNames: Record<LaneRole, string> = { 1: "safe lane", 2: "mid lane", 3: "off lane", 4: "jungle" };
  return [
    `You are a Dota 2 coach. Pick the ${PICK_COUNT} best heroes for this player to play in ranked right now, at ${bracketLabel(bracket)} rank.`,
    `Choose ONLY from CANDIDATES, using the exact names. Balance: strong in their rank now, heroes they already win with, and their usual lane${mainLane ? ` (${laneNames[mainLane]})` : ""}.`,
    "For each pick give one or two sentences that cite the numbers and say why it suits this player and how to approach games with it (lane, tempo, role).",
    "Never invent statistics. Do not name any abilities, talents or items: you are not given their details.",
    "",
    "CANDIDATES:",
    ...candidates.map((candidate) => {
      const record = candidate.personal ? `player ${pct(candidate.personal.winRate)} over ${candidate.personal.games} games` : "player has not played it recently";
      return `- ${candidate.name} [${candidate.roles.join(", ")}]: ${pct(candidate.bracketWinRate)} win rate in ${bracketLabel(bracket)}; ${record}${candidate.fitsLane ? "; fits their main lane" : ""}`;
    }),
    "",
    'Answer with JSON only: {"picks": [{"hero": "exact name", "reason": "1-2 sentences"}]}',
  ].join("\n");
}

const replySchema = z.object({ picks: z.array(z.object({ hero: z.string(), reason: z.string().min(1).max(500) })).min(1) });

/** Picks whose names are on the shortlist (case-insensitive), no repeats, at most PICK_COUNT. Null when unusable. */
export function parseHeroPicks(text: string, candidates: PickCandidate[]): HeroPick[] | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = replySchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    if (!parsed.success) return null;
    const byName = new Map(candidates.map((candidate) => [candidate.name.toLowerCase(), candidate.heroId]));
    const seen = new Set<number>();
    const picks = parsed.data.picks.flatMap(({ hero, reason }) => {
      const heroId = byName.get(hero.trim().toLowerCase());
      if (heroId === undefined || seen.has(heroId)) return [];
      seen.add(heroId);
      return [{ heroId, reason }];
    });
    return picks.length > 0 ? picks.slice(0, PICK_COUNT) : null;
  } catch {
    return null;
  }
}
