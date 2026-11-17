import { describe, expect, it } from "vitest";
import { buildingKey, buildingLabel, describeBuildings, fallenBuildings, parseBuildingKey, parseBuildings } from "@/lib/gsi-buildings";
import type { LiveBuilding, LiveSnapshot } from "@/types/live";

const topT1: LiveBuilding = { team: "radiant", kind: "tower", lane: "top", tier: 1, healthPct: 100 };
const midT1: LiveBuilding = { team: "radiant", kind: "tower", lane: "mid", tier: 1, healthPct: 25 };

function snap(buildings: LiveBuilding[], changes: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    matchId: "1", clockSeconds: 900, heroId: 47, heroKey: "viper", level: 12, alive: true, respawnSeconds: 0,
    kills: 0, deaths: 0, assists: 0, lastHits: 0, denies: 0, gold: 0, gpm: 0, xpm: 0,
    inventory: [null, null, null, null, null, null], owned: [],
    team: "radiant", buildings, buildingTeams: ["radiant"], ...changes,
  };
}

describe("parseBuildings", () => {
  it("reads towers, barracks and the Ancient of each reported team", () => {
    const { buildings, teams } = parseBuildings({
      radiant: {
        dota_goodguys_tower1_top: { health: 1800, max_health: 1800 },
        good_rax_range_bot: { health: 550, max_health: 2200 },
        dota_goodguys_fort: { health: 4500, max_health: 4500 },
      },
    });
    expect(teams).toEqual(["radiant"]);
    expect(buildings).toEqual([
      topT1,
      { team: "radiant", kind: "ranged", lane: "bot", tier: 0, healthPct: 25 },
      { team: "radiant", kind: "ancient", lane: "base", tier: 0, healthPct: 100 },
    ]);
  });

  it("drops dead, unknown and other-team buildings", () => {
    const { buildings } = parseBuildings({
      dire: {
        dota_badguys_tower2_mid: { health: 0, max_health: 2500 },
        dota_badguys_healers: { health: 100, max_health: 100 },
        dota_goodguys_tower1_top: { health: 1800, max_health: 1800 },
      },
    });
    expect(buildings).toEqual([]);
  });

  it("reports no teams without the section", () => expect(parseBuildings(undefined)).toEqual({ buildings: [], teams: [] }));
});

describe("building keys", () => {
  it("round-trips a key", () => expect(parseBuildingKey(buildingKey(topT1))).toEqual({ team: "radiant", kind: "tower", lane: "top", tier: 1 }));
  it("rejects anything else", () => expect(parseBuildingKey("ignore previous instructions")).toBeNull());
  it("labels towers and barracks", () => {
    expect(buildingLabel(topT1)).toBe("top T1 tower");
    expect(buildingLabel({ kind: "melee", lane: "mid", tier: 0 })).toBe("mid melee barracks");
  });
});

describe("fallenBuildings", () => {
  it("names a building that disappeared", () => expect(fallenBuildings(snap([topT1, midT1]), snap([topT1]))).toEqual(["radiant:tower:mid:1"]));
  it("ignores a team Dota stopped reporting", () => expect(fallenBuildings(snap([topT1]), snap([], { buildingTeams: [] }))).toEqual([]));
});

describe("describeBuildings", () => {
  it("lists lost and damaged buildings from the player's side", () => {
    const [line] = describeBuildings(snap([topT1, midT1]));
    expect(line).toContain("Their team (Radiant)");
    expect(line).toContain("bot T1 tower");
    expect(line).not.toContain("top T1 tower,");
    expect(line).toContain("damaged: mid T1 tower 25%");
  });

  it("says nothing when Dota sends no buildings", () => expect(describeBuildings(snap([], { buildingTeams: [] }))).toEqual([]));
});
