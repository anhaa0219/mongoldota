/** Minimap layers: wards over time, teamfight deaths, towers, laning heatmap. Pure. */

import { isParsed } from "@/lib/match-rows";
import type { RawCellCounts, RawFullMatch, RawFullPlayer, RawPositionLog } from "@/types/opendota-match";
import type { DeathMark, HeatCell, MapPoint, MatchMap, ScoreboardPlayer, Team, TowerMark, WardMark } from "@/types/match-view";

const CELL_MIN = 64;
const CELL_SPAN = 128;

/**
 * Approximate tower cells (OpenDota has no building coordinates). Radiant = goodguys (bottom-left),
 * Dire = badguys (top-right). Each team has two tier-4 towers sharing one building key.
 */
export const TOWER_CELLS: Record<string, [number, number]> = {
  goodguys_tower1_top: [70, 150], goodguys_tower2_top: [70, 120], goodguys_tower3_top: [72, 96],
  goodguys_tower1_mid: [110, 108], goodguys_tower2_mid: [98, 96], goodguys_tower3_mid: [86, 86],
  goodguys_tower1_bot: [150, 70], goodguys_tower2_bot: [120, 70], goodguys_tower3_bot: [96, 72],
  goodguys_tower4_a: [78, 80], goodguys_tower4_b: [80, 78],
  badguys_tower1_top: [106, 186], badguys_tower2_top: [136, 186], badguys_tower3_top: [160, 184],
  badguys_tower1_mid: [146, 148], badguys_tower2_mid: [158, 160], badguys_tower3_mid: [170, 170],
  badguys_tower1_bot: [186, 106], badguys_tower2_bot: [186, 136], badguys_tower3_bot: [184, 160],
  badguys_tower4_a: [176, 178], badguys_tower4_b: [178, 176],
};

const clamp100 = (value: number) => Math.min(100, Math.max(0, value));

/** OpenDota map cells (about 64-192) -> 0-100 square, y flipped for SVG. */
export function toMapPoint(cellX: number, cellY: number): MapPoint {
  return {
    x: clamp100(((cellX - CELL_MIN) / CELL_SPAN) * 100),
    y: clamp100(100 - ((cellY - CELL_MIN) / CELL_SPAN) * 100),
  };
}

const teamOfSlot = (slot: number): Team => (slot < 128 ? "radiant" : "dire");

function cellEntries(cells: RawCellCounts | null | undefined): { x: number; y: number; count: number }[] {
  return Object.entries(cells ?? {}).flatMap(([x, column]) =>
    Object.entries(column).map(([y, count]) => ({ x: Number(x), y: Number(y), count })),
  );
}

function pairWards(placed: RawPositionLog[], removed: RawPositionLog[], kind: WardMark["kind"], team: Team): WardMark[] {
  const unused = [...removed];
  return placed.map((ward) => {
    const index = unused.findIndex(
      (left) => left.time >= ward.time && (ward.ehandle ? left.ehandle === ward.ehandle : left.x === ward.x && left.y === ward.y),
    );
    const [match] = index === -1 ? [] : unused.splice(index, 1);
    return { ...toMapPoint(ward.x, ward.y), kind, team, placedAt: ward.time, removedAt: match?.time ?? null };
  });
}

function playerWards(player: RawFullPlayer): WardMark[] {
  const team = teamOfSlot(player.player_slot);
  return [
    ...pairWards(player.obs_log ?? [], player.obs_left_log ?? [], "observer", team),
    ...pairWards(player.sen_log ?? [], player.sen_left_log ?? [], "sentry", team),
  ];
}

function towers(raw: RawFullMatch): TowerMark[] {
  const destroyed = new Map<string, number>();
  for (const objective of raw.objectives ?? []) {
    if (objective.type !== "building_kill" || !objective.key?.includes("tower")) continue;
    const base = objective.key.replace("npc_dota_", "");
    const key = base.endsWith("tower4") ? [`${base}_a`, `${base}_b`].find((tier4) => !destroyed.has(tier4)) : base;
    if (key) destroyed.set(key, objective.time);
  }
  return Object.entries(TOWER_CELLS).map(([key, [x, y]]) => ({
    ...toMapPoint(x, y),
    key,
    team: key.startsWith("goodguys") ? "radiant" : "dire",
    destroyedAt: destroyed.get(key) ?? null,
  }));
}

const HEAT_GRID = 2; // minimap units per heat cell: plenty for a 0-100 map, keeps the payload small

/** Laning positions bucketed to a 2-unit grid (cells on the same spot are summed), weights 0-1. */
function laneHeat(player: RawFullPlayer): HeatCell[] {
  const buckets = new Map<string, { x: number; y: number; count: number }>();
  for (const cell of cellEntries(player.lane_pos)) {
    const point = toMapPoint(cell.x, cell.y);
    const x = Math.floor(point.x / HEAT_GRID) * HEAT_GRID;
    const y = Math.floor(point.y / HEAT_GRID) * HEAT_GRID;
    const bucket = buckets.get(`${x},${y}`) ?? { x, y, count: 0 };
    buckets.set(`${x},${y}`, { ...bucket, count: bucket.count + cell.count });
  }
  const busiest = Math.max(1, ...[...buckets.values()].map((bucket) => bucket.count));
  return [...buckets.values()].map((bucket) => ({ x: bucket.x, y: bucket.y, weight: Math.round((bucket.count / busiest) * 100) / 100 }));
}

/** Null when the match is unparsed. `players` is accepted for symmetry with the other view builders. */
export function toMatchMap(raw: RawFullMatch, players: ScoreboardPlayer[]): MatchMap | null {
  if (!isParsed(raw) || players.length === 0) return null;
  const deaths: DeathMark[] = (raw.teamfights ?? []).flatMap((fight) =>
    fight.players.flatMap((fighter, index) => {
      const slot = raw.players[index]?.player_slot;
      if (slot === undefined) return [];
      return cellEntries(fighter.deaths_pos).map((cell) => ({ ...toMapPoint(cell.x, cell.y), time: fight.start, team: teamOfSlot(slot) }));
    }),
  );
  return {
    wards: raw.players.flatMap(playerWards),
    deaths,
    towers: towers(raw),
    laneHeat: Object.fromEntries(raw.players.map((player) => [player.player_slot, laneHeat(player)])),
  };
}

export function wardsAliveAt(wards: WardMark[], time: number): WardMark[] {
  return wards.filter((ward) => ward.placedAt <= time && (ward.removedAt === null || ward.removedAt > time));
}

export function towersStandingAt(towerMarks: TowerMark[], time: number): TowerMark[] {
  return towerMarks.filter((tower) => tower.destroyedAt === null || tower.destroyedAt > time);
}
