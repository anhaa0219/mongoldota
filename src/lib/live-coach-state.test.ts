import { describe, expect, it } from "vitest";
import { absorbSnapshot, EMPTY_MEMORY, needsReplan, shouldAskPlan } from "@/lib/live-coach-state";
import { IDLE_CLOCK } from "@/lib/live-coach-timing";
import type { LiveSnapshot } from "@/types/live";

const COSTS = new Map([
  ["dragon_lance", 1900],
  ["black_king_bar", 4050],
  ["ultimate_orb", 2800],
]);

const snap = (changes: Partial<LiveSnapshot> = {}): LiveSnapshot => ({
  matchId: "m1", clockSeconds: 600, heroId: 47, heroKey: "viper", level: 16, alive: true, respawnSeconds: 0,
  kills: 7, deaths: 3, assists: 5, lastHits: 80, denies: 10, gold: 1000, gpm: 512, xpm: 600,
  inventory: [null, null, null, null, null, null], owned: [], ...changes,
});

describe("absorbSnapshot", () => {
  it("queues the events between two snapshots of one match", () => {
    const first = absorbSnapshot(EMPTY_MEMORY, snap(), null, COSTS);
    expect(absorbSnapshot(first, snap({ deaths: 4 }), null, COSTS).queued).toEqual([{ kind: "death", detail: "" }]);
  });

  it("starts a new match with nothing queued and the timing reset", () => {
    const old = { ...absorbSnapshot(EMPTY_MEMORY, snap(), null, COSTS), queued: [{ kind: "death" as const, detail: "" }], clock: { ...IDLE_CLOCK, lastTipAt: 5 } };
    const next = absorbSnapshot(old, snap({ matchId: "m2", deaths: 0 }), null, COSTS);
    expect(next.queued).toEqual([]);
    expect(next.clock).toEqual(IDLE_CLOCK);
  });

  it("does not report items the player already had when the page opened", () => {
    const first = absorbSnapshot(EMPTY_MEMORY, snap({ owned: ["black_king_bar"] }), null, COSTS);
    expect(absorbSnapshot(first, snap({ owned: ["black_king_bar"] }), null, COSTS).queued).toEqual([]);
  });

  it("reports a stash item once, even after the courier carries it", () => {
    let memory = absorbSnapshot(EMPTY_MEMORY, snap(), null, COSTS);
    memory = absorbSnapshot(memory, snap({ owned: ["ultimate_orb"] }), null, COSTS);
    memory = absorbSnapshot({ ...memory, queued: [] }, snap({ owned: [] }), null, COSTS);
    memory = absorbSnapshot(memory, snap({ owned: ["ultimate_orb"] }), null, COSTS);
    expect(memory.queued).toEqual([]);
  });
});

describe("needsReplan", () => {
  it("replans after an expensive item outside the plan", () => {
    expect(needsReplan([{ kind: "item", detail: "black_king_bar" }], ["dragon_lance"], COSTS)).toBe(true);
  });
  it("keeps the plan for a planned item", () => expect(needsReplan([{ kind: "item", detail: "dragon_lance" }], ["dragon_lance"], COSTS)).toBe(false));
  it("keeps the plan for a cheaper component", () => expect(needsReplan([{ kind: "item", detail: "dragon_lance" }], ["black_king_bar"], COSTS)).toBe(false));
  it("has nothing to replan without a plan", () => expect(needsReplan([{ kind: "item", detail: "black_king_bar" }], null, COSTS)).toBe(false));
});

describe("shouldAskPlan", () => {
  const base = { hasPlan: false, matchId: "m1", askedFor: null, retryAt: 0, nowMs: 1_000 };
  it("asks once for a new match", () => expect(shouldAskPlan(base)).toBe(true));
  it("waits after asking", () => expect(shouldAskPlan({ ...base, askedFor: "m1", retryAt: 61_000 })).toBe(false));
  it("retries after the backoff", () => expect(shouldAskPlan({ ...base, askedFor: "m1", retryAt: 1_000 })).toBe(true));
  it("never asks when the match has a plan", () => expect(shouldAskPlan({ ...base, hasPlan: true })).toBe(false));
});
