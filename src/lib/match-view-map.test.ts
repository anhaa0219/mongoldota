import { describe, expect, it } from "vitest";
import { fixtureHeroes, fixtureItems, fixtureMatch } from "@/lib/match-test-fixture";
import { toMapPoint, toMatchMap, towersStandingAt, wardsAliveAt } from "@/lib/match-view-map";
import { toScoreboard } from "@/lib/match-view-players";

function mapMatch() {
  const raw = fixtureMatch({
    objectives: [
      { time: 822, type: "building_kill", key: "npc_dota_badguys_tower1_top" },
      { time: 2000, type: "building_kill", key: "npc_dota_badguys_tower4" },
      { time: 2010, type: "building_kill", key: "npc_dota_badguys_tower4" },
    ],
    teamfights: [{ start: 710, end: 749, deaths: 1, players: [{}, {}, {}, { deaths_pos: { "128": { "128": 1 } } }, {}, {}] }],
  });
  const me = raw.players[0];
  me.obs_log = [{ time: 333, x: 133.4, y: 114.3, ehandle: 5 }];
  me.obs_left_log = [{ time: 600, x: 133.4, y: 114.3, ehandle: 5 }];
  me.sen_log = [{ time: 100, x: 100, y: 100 }];
  me.lane_pos = { "76": { "76": 2, "79": 10 } };
  return raw;
}

function build(raw = mapMatch()) {
  return toMatchMap(raw, toScoreboard(raw, fixtureHeroes, fixtureItems, 42));
}

describe("toMapPoint", () => {
  it("maps OpenDota cells to a 0-100 square with y growing downward", () => {
    expect(toMapPoint(64, 64)).toEqual({ x: 0, y: 100 });
    expect(toMapPoint(192, 192)).toEqual({ x: 100, y: 0 });
    expect(toMapPoint(128, 128)).toEqual({ x: 50, y: 50 });
  });

  it("clamps points outside the playable area", () => {
    expect(toMapPoint(40, 250)).toEqual({ x: 0, y: 0 });
  });
});

describe("wards", () => {
  const wards = build()?.wards ?? [];

  it("pairs a placed ward with the log entry that removed it", () => {
    expect(wards.find((ward) => ward.kind === "observer")).toMatchObject({ team: "radiant", placedAt: 333, removedAt: 600 });
  });

  it("keeps a ward without a removal log alive until the end", () => {
    expect(wardsAliveAt(wards, 99999).map((ward) => ward.kind)).toEqual(["sentry"]);
  });

  it("shows only wards placed and not yet removed at a time", () => {
    expect(wardsAliveAt(wards, 200).map((ward) => ward.kind)).toEqual(["sentry"]);
    expect(wardsAliveAt(wards, 400).map((ward) => ward.kind).sort()).toEqual(["observer", "sentry"]);
  });
});

describe("towers", () => {
  const towers = build()?.towers ?? [];

  it("places all 22 towers and drops destroyed ones", () => {
    expect(towers).toHaveLength(22);
    expect(towersStandingAt(towers, 900)).toHaveLength(21);
    expect(towers.find((tower) => tower.key === "badguys_tower1_top")?.destroyedAt).toBe(822);
  });

  it("assigns the two tier-4 kills to the two tier-4 towers", () => {
    const fallen = towers.filter((tower) => tower.key.startsWith("badguys_tower4")).map((tower) => tower.destroyedAt);
    expect(fallen.sort()).toEqual([2000, 2010]);
  });
});

describe("deaths and lane heat", () => {
  it("places teamfight deaths for the player who died", () => {
    expect(build()?.deaths).toEqual([{ x: 50, y: 50, time: 710, team: "dire" }]);
  });

  it("normalises the laning heatmap to the busiest cell", () => {
    const heat = build()?.laneHeat[0] ?? [];
    expect(heat.map((cell) => cell.weight).sort()).toEqual([0.2, 1]);
  });

  it("merges heatmap cells that land on the same 2-unit spot and keeps whole-number coordinates", () => {
    const raw = mapMatch();
    raw.players[0].lane_pos = { "64": { "64": 3 }, "65": { "64": 1 }, "100": { "100": 2 } };
    const heat = build(raw)?.laneHeat[0] ?? [];
    expect(heat).toHaveLength(2);
    expect(heat.find((cell) => cell.x === 0)).toEqual({ x: 0, y: 100, weight: 1 });
    expect(heat.every((cell) => Number.isInteger(cell.x) && Number.isInteger(cell.y))).toBe(true);
  });
});

describe("unparsed match", () => {
  it("has no map", () => {
    const raw = mapMatch();
    delete raw.version;
    expect(build(raw)).toBeNull();
  });
});
