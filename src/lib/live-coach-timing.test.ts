import { describe, expect, it } from "vitest";
import { coachSlot, IDLE_CLOCK, markSpoke, stepCoach, type CoachClock } from "@/lib/live-coach-timing";
import type { LiveEvent } from "@/types/live";

const DEATH: LiveEvent = { kind: "death", detail: "" };
const KILL: LiveEvent = { kind: "kill", detail: "1" };
/** A clock whose look-ahead baseline is already set, so only events can fire. */
const READY: CoachClock = { ...IDLE_CLOCK, lastTipClock: 600 };

function run(state: CoachClock, steps: { nowMs: number; clockSeconds?: number; events?: LiveEvent[] }[]) {
  let current = state;
  const fired: (LiveEvent[] | null)[] = [];
  for (const step of steps) {
    const result = stepCoach(current, { nowMs: step.nowMs, clockSeconds: step.clockSeconds ?? 600, events: step.events ?? [] });
    current = result.state;
    fired.push(result.fire);
  }
  return { state: current, fired };
}

describe("stepCoach", () => {
  it("waits for the merge window", () => {
    const { fired } = run(READY, [{ nowMs: 0, events: [DEATH] }, { nowMs: 9_999 }, { nowMs: 10_000 }]);
    expect(fired).toEqual([null, null, [DEATH]]);
  });

  it("merges events inside the window", () => {
    const { fired } = run(READY, [{ nowMs: 0, events: [DEATH] }, { nowMs: 4_000, events: [KILL] }, { nowMs: 10_000 }]);
    expect(fired[2]).toEqual([DEATH, KILL]);
  });

  it("holds events until the gap has passed", () => {
    const spoke = markSpoke(READY, 100_000, 600);
    const { fired } = run(spoke, [{ nowMs: 130_000, events: [DEATH] }, { nowMs: 140_000 }, { nowMs: 189_999 }, { nowMs: 190_000 }]);
    expect(fired).toEqual([null, null, null, [DEATH]]);
  });

  it("does not fire again while the last tip is being written", () => {
    const { fired } = run(READY, [{ nowMs: 0, events: [DEATH] }, { nowMs: 10_000 }, { nowMs: 15_000, events: [KILL] }, { nowMs: 30_000 }]);
    expect(fired).toEqual([null, [DEATH], null, null]);
  });

  it("sets the look-ahead baseline on the first clock", () => {
    const { state, fired } = run(IDLE_CLOCK, [{ nowMs: 0, clockSeconds: 300 }]);
    expect(fired).toEqual([null]);
    expect(state.lastTipClock).toBe(300);
  });

  it("looks ahead after 240 quiet game-seconds", () => {
    const { fired } = run(IDLE_CLOCK, [{ nowMs: 0, clockSeconds: 300 }, { nowMs: 1_000, clockSeconds: 539 }, { nowMs: 2_000, clockSeconds: 540 }]);
    expect(fired).toEqual([null, null, [{ kind: "lookahead", detail: "" }]]);
  });

  it("does not look ahead while the game clock is frozen", () => {
    const steps = Array.from({ length: 60 }, (_, index) => ({ nowMs: index * 10_000, clockSeconds: 400 }));
    const { fired } = run(IDLE_CLOCK, steps);
    expect(fired.every((fire) => fire === null)).toBe(true);
  });
});

describe("coachSlot", () => {
  const NOW = 1_000_000;
  it("gives automatic tips a 90 s slot per match", () => expect(coachSlot(["death"], "m1", NOW)).toEqual({ slot: "tip:m1", cutoff: new Date(NOW - 90_000) }));
  it("lets Ask coach through after 15 s", () => expect(coachSlot(["asked"], "m1", NOW).cutoff).toEqual(new Date(NOW - 15_000)));
  it("keeps the item plan in its own slot, retried after a minute", () => expect(coachSlot(["plan"], "m1", NOW)).toEqual({ slot: "plan:m1", cutoff: new Date(NOW - 60_000) }));
});
