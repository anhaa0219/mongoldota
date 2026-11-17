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
  /** player.team_name; null when Dota does not say. */
  team: Side | null;
  /** Standing buildings of the teams in `buildingTeams` (as a player Dota usually reports only your own team). */
  buildings: LiveBuilding[];
  /** Teams Dota reported buildings for: a building of these teams missing from `buildings` has fallen. */
  buildingTeams: Side[];
  // The fields below are missing when Dota does not send them, and in every snapshot stored before they were added.
  /** player.kill_streak: hero kills without dying. */
  killStreak?: number;
  /** hero.buyback_cost in gold. */
  buybackCost?: number;
  /** hero.buyback_cooldown: seconds until buyback can be used again; 0 when ready. */
  buybackCooldown?: number;
  /** Hero kills scored by each team (map.radiant_score, map.dire_score). */
  score?: { radiant: number; dire: number };
}

export type BuildingKind = "tower" | "melee" | "ranged" | "ancient";
export type BuildingLane = "top" | "mid" | "bot" | "base";

export interface LiveBuilding {
  team: Side;
  kind: BuildingKind;
  /** "base" for the Ancient. */
  lane: BuildingLane;
  /** Towers 1-4; 0 for barracks and the Ancient. */
  tier: number;
  /** 1-100, rounded up so a scratched building never reads 0. */
  healthPct: number;
}

export type LiveEventKind = "death" | "kill" | "gold" | "item" | "building" | "lookahead" | "asked" | "plan";

export const LIVE_EVENT_KINDS: readonly LiveEventKind[] = ["death", "kill", "gold", "item", "building", "lookahead", "asked", "plan"];

/** detail: an item key ("item", "gold"), the number of kills ("kill"), a building key ("building"), otherwise "". */
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
