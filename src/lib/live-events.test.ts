import { describe, expect, it } from "vitest";
import { countItems, detectEvents, nextPlannedItem, raiseSeen } from "@/lib/live-events";
import { closeGroup } from "@/lib/live-moments";
import type { LiveSnapshot } from "@/types/live";

const COSTS = new Map([
  ["dragon_lance", 1900],
  ["tango", 90],
  ["hurricane_pike", 4450],
  ["ultimate_orb", 2800],
]);

function snap(changes: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    matchId: "1",
    clockSeconds: 600,
    heroId: 47,
    heroKey: "viper",
    level: 16,
    alive: true,
    respawnSeconds: 0,
    kills: 7,
    deaths: 3,
    assists: 5,
    lastHits: 80,
    denies: 10,
    gold: 1000,
    gpm: 512,
    xpm: 600,
    inventory: [null, null, null, null, null, null],
    owned: [],
    team: "radiant",
    buildings: [],
    buildingTeams: [],
    ...changes,
  };
}

/** What the coach had seen before `prev`: by default exactly what `prev` owns. */
const seenOf = (prev: LiveSnapshot) => countItems(prev.owned);

describe("detectEvents", () => {
  it("reports a death", () => {
    expect(detectEvents(snap({ deaths: 3 }), snap({ deaths: 4 }), null, COSTS, seenOf(snap({ deaths: 3 })))).toEqual([{ kind: "death", detail: "" }]);
  });

  it("reports kills once with the count", () => {
    expect(detectEvents(snap({ kills: 7 }), snap({ kills: 9 }), null, COSTS, seenOf(snap({ kills: 7 })))).toEqual([{ kind: "kill", detail: "2" }]);
  });

  it("reports a fallen tower", () => {
    const tower = { team: "radiant" as const, kind: "tower" as const, lane: "top" as const, tier: 1, healthPct: 10 };
    const before = snap({ buildings: [tower], buildingTeams: ["radiant"] });
    const after = snap({ buildings: [], buildingTeams: ["radiant"] });
    expect(detectEvents(before, after, null, COSTS, seenOf(before))).toEqual([{ kind: "building", detail: "radiant:tower:top:1" }]);
  });

  it("reports a bought item", () => {
    expect(detectEvents(snap(), snap({ owned: ["dragon_lance"] }), null, COSTS, seenOf(snap()))).toEqual([{ kind: "item", detail: "dragon_lance" }]);
  });

  it("counts an item bought into the stash", () => {
    const after = snap({ owned: ["ultimate_orb"], inventory: [null, null, null, null, null, null] });
    expect(detectEvents(snap(), after, null, COSTS, seenOf(snap()))).toEqual([{ kind: "item", detail: "ultimate_orb" }]);
  });

  it("ignores cheap items", () => {
    expect(detectEvents(snap(), snap({ owned: ["tango"] }), null, COSTS, seenOf(snap()))).toEqual([]);
  });

  it("reports gold ready when crossing the next item's cost", () => {
    const plan = ["dragon_lance", "hurricane_pike"];
    const before = snap({ owned: ["dragon_lance"], gold: 4300 });
    const after = snap({ owned: ["dragon_lance"], gold: 4500 });
    expect(detectEvents(before, after, plan, COSTS, seenOf(before))).toEqual([{ kind: "gold", detail: "hurricane_pike" }]);
  });

  it("stays quiet when gold was already enough", () => {
    const plan = ["dragon_lance", "hurricane_pike"];
    const before = snap({ owned: ["dragon_lance"], gold: 4500 });
    const after = snap({ owned: ["dragon_lance"], gold: 4600 });
    expect(detectEvents(before, after, plan, COSTS, seenOf(before))).toEqual([]);
  });

  it("returns no events when the match changes", () => {
    expect(detectEvents(snap({ matchId: "1", deaths: 3 }), snap({ matchId: "2", deaths: 0, kills: 0 }), null, COSTS, seenOf(snap({ matchId: "1", deaths: 3 })))).toEqual([]);
  });

  it("returns no events without a previous snapshot", () => {
    expect(detectEvents(null, snap({ deaths: 9 }), null, COSTS, new Map())).toEqual([]);
  });
});

describe("item counts", () => {
  it("does not count an item again when the courier delivers it", () => {
    const seen = countItems(["ultimate_orb"]);
    const onCourier = snap({ owned: [] });
    const delivered = snap({ owned: ["ultimate_orb"] });
    expect(detectEvents(onCourier, delivered, null, COSTS, raiseSeen(seen, onCourier.owned))).toEqual([]);
  });

  it("counts a second copy of an item", () => {
    expect(detectEvents(snap({ owned: ["dragon_lance"] }), snap({ owned: ["dragon_lance", "dragon_lance"] }), null, COSTS, countItems(["dragon_lance"]))).toEqual([
      { kind: "item", detail: "dragon_lance" },
    ]);
  });

  it("keeps the highest count seen", () => {
    expect(raiseSeen(countItems(["a", "a"]), ["a", "b"])).toEqual(new Map([["a", 2], ["b", 1]]));
  });
});

describe("nextPlannedItem", () => {
  it("skips items already owned", () => {
    expect(nextPlannedItem(["dragon_lance", "hurricane_pike"], ["dragon_lance"])).toBe("hurricane_pike");
  });

  it("is null when the plan is done", () => {
    expect(nextPlannedItem(["dragon_lance"], ["dragon_lance"])).toBeNull();
  });
});

describe("new moments", () => {
  const detect = (prev: LiveSnapshot, next: LiveSnapshot) => detectEvents(prev, next, null, COSTS, seenOf(prev));

  it("reports assists", () => {
    expect(detect(snap({ assists: 5 }), snap({ assists: 7 }))).toEqual([{ kind: "assist", detail: "2" }]);
  });

  it("reports a streak when it reaches 3, 5 or 8", () => {
    expect(detect(snap({ killStreak: 2 }), snap({ killStreak: 3 }))).toContainEqual({ kind: "streak", detail: "3" });
    expect(detect(snap({ killStreak: 3 }), snap({ killStreak: 4 }))).not.toContainEqual(expect.objectContaining({ kind: "streak" }));
    expect(detect(snap({ killStreak: 4 }), snap({ killStreak: 6 }))).toContainEqual({ kind: "streak", detail: "6" });
  });

  it("reports a buyback when the cooldown starts", () => {
    expect(detect(snap({ buybackCooldown: 0 }), snap({ buybackCooldown: 480 }))).toEqual([{ kind: "buyback", detail: "" }]);
  });

  it("warns once when buyback gold is lost after 30:00", () => {
    const late = { clockSeconds: 1800, buybackCost: 1500, buybackCooldown: 0 };
    expect(detect(snap({ ...late, gold: 1600 }), snap({ ...late, gold: 900 }))).toEqual([{ kind: "nobuyback", detail: "" }]);
    expect(detect(snap({ ...late, gold: 900 }), snap({ ...late, gold: 800 }))).toEqual([]);
    expect(detect(snap({ ...late, clockSeconds: 1799, gold: 1600 }), snap({ ...late, clockSeconds: 1799, gold: 900 }))).toEqual([]);
    expect(detect(snap({ ...late, gold: 1600 }), snap({ ...late, gold: 900, buybackCooldown: 480 }))).toEqual([{ kind: "buyback", detail: "" }]);
  });

  it("reports picking up the Aegis", () => {
    expect(detect(snap(), snap({ owned: ["aegis"] }))).toEqual([{ kind: "aegis", detail: "" }]);
  });

  it("counts kills for each team from the scores", () => {
    const moments = detect(snap({ score: { radiant: 10, dire: 8 } }), snap({ score: { radiant: 12, dire: 9 } }));
    expect(moments).toEqual([{ kind: "teamkill", detail: "ours" }, { kind: "teamkill", detail: "ours" }, { kind: "teamkill", detail: "theirs" }]);
  });

  it("reports nothing new for game states stored before these fields existed", () => {
    expect(detect(snap(), snap())).toEqual([]);
  });

  it("does not treat the first appearance of a field as a change", () => {
    expect(detect(snap(), snap({ killStreak: 5, buybackCost: 1500, buybackCooldown: 480, score: { radiant: 9, dire: 9 } }))).toEqual([]);
  });

  it("ignores score jumps across a gap of more than 30 game-seconds", () => {
    expect(detect(snap({ clockSeconds: 600, score: { radiant: 10, dire: 8 } }), snap({ clockSeconds: 720, score: { radiant: 15, dire: 12 } }))).toEqual([]);
  });

  it("does not fold the player's own numbers across a long gap into a teamfight", () => {
    const before = { clockSeconds: 600, kills: 2, deaths: 1, assists: 1 };
    const after = { clockSeconds: 720, kills: 4, deaths: 2, assists: 3 };
    const separate = [{ kind: "death", detail: "" }, { kind: "kill", detail: "2" }, { kind: "assist", detail: "2" }];
    // With team scores, and without them (when Dota does not send any).
    expect(closeGroup(detect(snap({ ...before, score: { radiant: 10, dire: 8 } }), snap({ ...after, score: { radiant: 15, dire: 12 } })))).toEqual(separate);
    expect(closeGroup(detect(snap(before), snap(after)))).toEqual(separate);
  });

  it("ignores scores when the player's team is unknown", () => {
    expect(detect(snap({ team: null, score: { radiant: 10, dire: 8 } }), snap({ team: null, score: { radiant: 13, dire: 8 } }))).toEqual([]);
  });
});
