/** Draft board shapes: 5 hero slots per team, filled by clicking or from a screenshot. */

import type { AiLimit } from "@/types/ai";
import type { Side } from "@/types/game";

/** Hero id per slot, left to right; null = empty. Always 5 per team. */
export type DraftSlots = Record<Side, (number | null)[]>;

export interface SlotRef {
  side: Side;
  index: number;
}

/** What /api/draft/recognize answers. */
export type RecognizeResponse = { draft: DraftSlots; found: number } | { error: string } | { limit: AiLimit };

/** A hero on the Draft page: overall public win rate (0-100) and OpenDota roles ("Carry", "Support"...). */
export interface DraftHero {
  id: number;
  name: string;
  slug: string;
  winRate: number;
  roles: string[];
}

/** One row of /heroes/{id}/matchups: how the hero whose list this is did against `heroId`. */
export interface Matchup {
  heroId: number;
  games: number;
  wins: number;
}

/** The player's own games on a hero (last year). winRate is 0-100. */
export interface PersonalRecord {
  games: number;
  winRate: number;
}

/** How much better than expected a hero does against one enemy, in percentage points. */
export interface CounterEntry {
  enemyId: number;
  advantage: number;
  games: number;
}

export interface CounterSuggestion {
  heroId: number;
  /** Sum of the advantages against every enemy, in percentage points. */
  score: number;
  perEnemy: CounterEntry[];
}

/** 1 safe lane carry, 2 mid, 3 off lane, 4 soft support, 5 hard support. */
export type Position = 1 | 2 | 3 | 4 | 5;

/** Win rate (0-100) at one point in time: the minute an item was finished, or a game length. */
export interface TimedWinRate {
  minute: number;
  winRate: number;
  games: number;
}

export interface LineupHero {
  name: string;
  roles: string[];
  position: Position;
}

/** A hero and the position the player gave it on the lock screen. */
export interface PlacedHero {
  heroId: number;
  position: Position;
}

/** Everything the advice is grounded in; all numbers come from OpenDota, never from the model. */
export interface AdviceFacts {
  myHero: { name: string; roles: string[]; winRate: number };
  position: Position;
  allies: LineupHero[];
  enemies: (LineupHero & { myWinRate: number | null; games: number })[];
  /** Worked out from positions: pos 1/5 face the enemy 3/4, pos 3/4 face 1/5, mid faces mid. */
  lane: { partners: string[]; opponents: { name: string; position: Position; myWinRate: number | null; games: number }[] };
  items: { start: string[]; early: string[]; mid: string[]; late: string[] };
  bkb: TimedWinRate[];
  durations: TimedWinRate[];
  personal: PersonalRecord | null;
  /** Real ability names and short descriptions per hero in the draft, so the coach cannot mix them up. */
  abilities: { hero: string; team: "yours" | "enemy"; list: string[] }[];
}

export interface AdviceItem {
  category: string;
  title: string;
  detail: string;
}

export type AdviceResponse = { advice: AdviceItem[] } | { error: string } | { limit: AiLimit };
