/** Dota GSI "buildings": towers, barracks and Ancients per team, which ones fell, and how to describe them. Pure. */

import { z } from "zod";
import type { Side } from "@/types/game";
import type { BuildingKind, BuildingLane, LiveBuilding, LiveSnapshot } from "@/types/live";

const TOWER = /^dota_(goodguys|badguys)_tower([1-4])_(top|mid|bot)$/;
const BARRACKS = /^(good|bad)_rax_(melee|range)_(top|mid|bot)$/;
const ANCIENT = /^dota_(goodguys|badguys)_fort$/;

const SIDES: readonly Side[] = ["radiant", "dire"];
const KINDS: readonly BuildingKind[] = ["tower", "melee", "ranged", "ancient"];
const LANES: readonly BuildingLane[] = ["top", "mid", "bot", "base"];
const LANE_KINDS: readonly BuildingLane[] = ["top", "mid", "bot"];

/** Every team starts with these; tier 4 towers and the Ancient are left out because their names are less certain. */
const STARTING: readonly Omit<LiveBuilding, "team" | "healthPct">[] = LANE_KINDS.flatMap((lane) => [
  ...[1, 2, 3].map((tier) => ({ kind: "tower" as const, lane, tier })),
  { kind: "melee" as const, lane, tier: 0 },
  { kind: "ranged" as const, lane, tier: 0 },
]);

const teamSchema = z.record(z.string(), z.unknown());
const healthSchema = z.object({ health: z.number(), max_health: z.number().positive() });

const isOneOf = <T extends string>(list: readonly T[], value: string): value is T => (list as readonly string[]).includes(value);
const sideOf = (prefix: string): Side => (prefix.startsWith("good") ? "radiant" : "dire");

function identify(name: string): Omit<LiveBuilding, "healthPct"> | null {
  const tower = TOWER.exec(name);
  if (tower && isOneOf(LANES, tower[3])) return { team: sideOf(tower[1]), kind: "tower", lane: tower[3], tier: Number(tower[2]) };
  const barracks = BARRACKS.exec(name);
  if (barracks && isOneOf(LANES, barracks[3])) {
    return { team: sideOf(barracks[1]), kind: barracks[2] === "melee" ? "melee" : "ranged", lane: barracks[3], tier: 0 };
  }
  const ancient = ANCIENT.exec(name);
  return ancient ? { team: sideOf(ancient[1]), kind: "ancient", lane: "base", tier: 0 } : null;
}

/** GSI `buildings` ({ radiant: { dota_goodguys_tower1_top: { health, max_health } } }) to standing buildings. */
export function parseBuildings(raw: Record<string, unknown> | undefined): { buildings: LiveBuilding[]; teams: Side[] } {
  const reported = SIDES.flatMap((side) => {
    const parsed = teamSchema.safeParse(raw?.[side]);
    return parsed.success ? [{ side, entries: Object.entries(parsed.data) }] : [];
  });
  const teams = reported.map(({ side }) => side);
  const buildings = reported.flatMap(({ side, entries }) =>
    entries.flatMap(([name, value]) => {
      const building = identify(name);
      const health = healthSchema.safeParse(value);
      if (!building || building.team !== side || !health.success || health.data.health <= 0) return [];
      return [{ ...building, healthPct: Math.min(100, Math.ceil((health.data.health / health.data.max_health) * 100)) }];
    }),
  );
  return { buildings, teams };
}

/** "radiant:tower:top:1": the building's identity, used as the coach event detail. */
export function buildingKey({ team, kind, lane, tier }: Omit<LiveBuilding, "healthPct">): string {
  return `${team}:${kind}:${lane}:${tier}`;
}

/** The building a key names, or null for anything else (the key comes from the browser). */
export function parseBuildingKey(key: string): Omit<LiveBuilding, "healthPct"> | null {
  const [team, kind, lane, tierText] = key.split(":");
  const tier = Number(tierText);
  if (!team || !kind || !lane || !isOneOf(SIDES, team) || !isOneOf(KINDS, kind) || !isOneOf(LANES, lane)) return null;
  if (!Number.isInteger(tier) || tier < 0 || tier > 4) return null;
  return { team, kind, lane, tier };
}

/** "top T1 tower", "mid melee barracks", "Ancient". */
export function buildingLabel({ kind, lane, tier }: Omit<LiveBuilding, "team" | "healthPct">): string {
  if (kind === "ancient") return "Ancient";
  if (kind === "tower") return `${lane} T${tier} tower`;
  return `${lane} ${kind} barracks`;
}

/** Keys of buildings standing in `prev` and gone in `next`, for teams reported in both. */
export function fallenBuildings(prev: LiveSnapshot, next: LiveSnapshot): string[] {
  const standing = new Set(next.buildings.map(buildingKey));
  return prev.buildings
    .filter((building) => prev.buildingTeams.includes(building.team) && next.buildingTeams.includes(building.team))
    .map(buildingKey)
    .filter((key) => !standing.has(key));
}

/** "Their team (Radiant)" or "The enemy (Dire)"; just the side when the player's team is unknown. */
export function teamName(team: Side, playerTeam: Side | null): string {
  const side = team === "radiant" ? "Radiant" : "Dire";
  if (!playerTeam) return side;
  return team === playerTeam ? `Their team (${side})` : `The enemy (${side})`;
}

/** One prompt line per reported team: lost lane buildings and damaged standing ones, with health. */
export function describeBuildings(snapshot: LiveSnapshot): string[] {
  return snapshot.buildingTeams.map((team) => {
    const standing = snapshot.buildings.filter((building) => building.team === team);
    const standingKeys = new Set(standing.map(buildingKey));
    const lost = STARTING.filter((building) => !standingKeys.has(buildingKey({ ...building, team }))).map(buildingLabel);
    const damaged = standing.filter((building) => building.healthPct < 100).map((building) => `${buildingLabel(building)} ${building.healthPct}%`);
    const parts = [`lost: ${lost.join(", ") || "none"}`, damaged.length > 0 ? `damaged: ${damaged.join(", ")}` : "every standing building at full health"];
    return `${teamName(team, snapshot.team)} buildings, ${parts.join("; ")}.`;
  });
}
