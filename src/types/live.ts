/** Live Coach shapes: the player's own game from Dota's Game State Integration, coach events and tips. */

import type { PlacedHero } from "@/types/draft";
import type { Side } from "@/types/game";

/** The app's trimmed view of one GSI update (only the player's own game). */
export interface LiveSnapshot {
  matchId: string;
  /** map.clock_time: negative before the horn. */
  clockSeconds: number;
  heroId: number;
  /** "viper" (npc_dota_hero_ prefix removed). */
  heroKey: string;
  level: number;
  alive: boolean;
  respawnSeconds: number;
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  denies: number;
  gold: number;
  gpm: number;
  xpm: number;
  /** slot0..slot5 item keys without "item_"; null is an empty slot. Always 6 entries. */
  inventory: (string | null)[];
  /** Every item key in slot0..slot8, stash0..stash5 and neutral0. */
  owned: string[];
}

export type LiveEventKind = "death" | "kill" | "gold" | "item" | "lookahead" | "asked" | "plan";

export const LIVE_EVENT_KINDS: readonly LiveEventKind[] = ["death", "kill", "gold", "item", "lookahead", "asked", "plan"];

/** detail: an item key ("item", "gold"), the number of kills ("kill"), otherwise "". */
export interface LiveEvent {
  kind: LiveEventKind;
  detail: string;
}

export interface LiveTip {
  id: number;
  matchId: string;
  clockSeconds: number;
  kind: LiveEventKind;
  text: string;
  /** Item keys in buy order, only on "plan" tips. */
  plan: string[] | null;
  /** Milliseconds since epoch. */
  createdAt: number;
}

/** The latest locked draft, saved from the Draft page. */
export interface LockedDraft {
  side: Side;
  myHeroId: number;
  allies: PlacedHero[];
  enemies: PlacedHero[];
}

export interface LiveFeed {
  /** Null while Dota is connected but the player is not in a match (menu, spectating). */
  snapshot: LiveSnapshot | null;
  /** Milliseconds since epoch of the last update from Dota; null when Dota never connected. */
  updatedAt: number | null;
}
