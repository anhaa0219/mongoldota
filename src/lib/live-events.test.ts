import { describe, expect, it } from "vitest";
import { countItems, detectEvents, nextPlannedItem, raiseSeen } from "@/lib/live-events";
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
