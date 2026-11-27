/** The extra parts of a parsed OpenDota /matches/{id} response that a Live Coach replay (demo) reads. */

import type { RawFullMatch, RawFullPlayer, RawLogEntry, RawObjective } from "@/types/opendota-match";

export interface ReplayDeath extends RawLogEntry {
  /** Seconds the hero stayed dead. */
  time_dead?: number | null;
  /** Unreliable gold lost on this death. */
  gold_lost?: number | null;
}

export interface ReplayPlayer extends RawFullPlayer {
  /** Game seconds of each entry in gold_t, xp_t, lh_t, dn_t and networth_t (0, 60, 120, …). */
  times?: number[] | null;
  deaths_log?: ReplayDeath[] | null;
  assists_log?: RawLogEntry[] | null;
  buyback_log?: RawLogEntry[] | null;
  neutral_item_history?: { time: number; item_neutral: string }[] | null;
  /** Unspent gold when the match ended. */
  gold?: number | null;
}

export interface ReplayObjective extends RawObjective {
  /** Who took it (the Aegis pickup names the player). */
  player_slot?: number | null;
}

export interface ReplayMatch extends RawFullMatch {
  players: ReplayPlayer[];
  objectives?: ReplayObjective[] | null;
}

/** OpenDota /constants/items, only what the replay reads. */
export type RawItemConstants = Record<string, { cost?: number | null; components?: string[] | null; qual?: string | null }>;
