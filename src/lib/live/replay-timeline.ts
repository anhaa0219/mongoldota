/** A finished match read at one game second: per-minute values, deaths, streaks, the Aegis, buildings and team scores. Pure. */

import { parseBuildings } from "@/lib/live/gsi-buildings";
import type { Side } from "@/types/game";
import type { LiveBuilding } from "@/types/live";
import type { ReplayMatch, ReplayPlayer } from "@/types/live-replay";
import type { RawLogEntry } from "@/types/opendota-match";

/** Total XP needed for each level; index 0 is level 1. */
const LEVEL_XP = [
  0, 240, 640, 1160, 1760, 2440, 3200, 4000, 4900, 5900, 7000, 8200, 9500, 10900, 12400, 14000, 15700, 17500, 19400, 21400, 23600,
  26000, 28600, 31400, 34400, 37600, 41000, 44600, 48400, 52400,
];
const AEGIS_SECONDS = 300;
const LANES = ["top", "mid", "bot"];
/** Player slots below this are Radiant. */
const DIRE_SLOTS_FROM = 128;

export const sideOfSlot = (slot: number): Side => (slot < DIRE_SLOTS_FROM ? "radiant" : "dire");

/** A per-minute series (gold_t, xp_t, …) at `second`, straight between the minutes. */
export function valueAt(series: number[] | null | undefined, times: number[] | null | undefined, second: number): number {
  if (!series || series.length === 0) return 0;
  const at = (index: number) => times?.[index] ?? index * 60;
  const after = series.findIndex((_, index) => at(index) > second);
  if (after === -1) return series[series.length - 1];
  if (after === 0) return series[0];
  const share = (second - at(after - 1)) / (at(after) - at(after - 1));
  return series[after - 1] + (series[after] - series[after - 1]) * share;
}

export const countUntil = (log: RawLogEntry[] | null | undefined, second: number) => (log ?? []).filter((entry) => entry.time <= second).length;

export function levelFor(xp: number): number {
  return LEVEL_XP.filter((needed) => xp >= needed).length;
}

/** Dead from the death until `time_dead` seconds later. */
export function lifeAt(player: ReplayPlayer, second: number): { alive: boolean; respawnSeconds: number } {
  const death = (player.deaths_log ?? []).find((entry) => entry.time <= second && second < entry.time + (entry.time_dead ?? 0));
  return death ? { alive: false, respawnSeconds: Math.ceil(death.time + (death.time_dead ?? 0) - second) } : { alive: true, respawnSeconds: 0 };
}

/** Hero kills since the last death. */
export function streakAt(player: ReplayPlayer, second: number): number {
  const deaths = (player.deaths_log ?? []).filter((entry) => entry.time <= second);
  const lastDeath = deaths.length > 0 ? deaths[deaths.length - 1].time : -Infinity;
  return (player.kills_log ?? []).filter((entry) => entry.time > lastDeath && entry.time <= second).length;
}

/** The player holds the Aegis from the pickup until it expires or they die. */
export function hasAegisAt(match: ReplayMatch, player: ReplayPlayer, second: number): boolean {
  return (match.objectives ?? []).some((objective) => {
    if (objective.type !== "CHAT_MESSAGE_AEGIS" || objective.player_slot !== player.player_slot || objective.time > second) return false;
    const diedSince = (player.deaths_log ?? []).some((entry) => entry.time > objective.time && entry.time <= second);
    return !diedSince && second < objective.time + AEGIS_SECONDS;
  });
}

/** GSI names of the buildings a team starts with (tier 4 towers left out, as the live parser does). */
function startingNames(prefix: "good" | "bad"): string[] {
  const towers = LANES.flatMap((lane) => [1, 2, 3].map((tier) => `dota_${prefix}guys_tower${tier}_${lane}`));
  const barracks = LANES.flatMap((lane) => [`${prefix}_rax_melee_${lane}`, `${prefix}_rax_range_${lane}`]);
  return [...towers, ...barracks, `dota_${prefix}guys_fort`];
}

/** OpenDota "npc_dota_badguys_melee_rax_mid" to GSI "bad_rax_melee_mid"; towers and Ancients only lose "npc_". */
function gsiName(key: string): string {
  const name = key.replace(/^npc_/, "");
  const barracks = /^dota_(good|bad)guys_(melee|range)_rax_(top|mid|bot)$/.exec(name);
  return barracks ? `${barracks[1]}_rax_${barracks[2]}_${barracks[3]}` : name;
}

/** Both teams' standing buildings at `second` (no health in the match data, so all read 100%). */
export function buildingsAt(match: ReplayMatch, second: number): { buildings: LiveBuilding[]; teams: Side[] } {
  const fallen = new Set(
    (match.objectives ?? []).filter((objective) => objective.type === "building_kill" && objective.time <= second && objective.key).map((objective) => gsiName(objective.key ?? "")),
  );
  const standing = (prefix: "good" | "bad") =>
    Object.fromEntries(startingNames(prefix).filter((name) => !fallen.has(name)).map((name) => [name, { health: 1, max_health: 1 }]));
  return parseBuildings({ radiant: standing("good"), dire: standing("bad") });
}

/** Hero kills each team scored up to `second`. */
export function scoreAt(match: ReplayMatch, second: number): { radiant: number; dire: number } {
  const score = { radiant: 0, dire: 0 };
  for (const player of match.players) score[sideOfSlot(player.player_slot)] += countUntil(player.kills_log, second);
  return score;
}
