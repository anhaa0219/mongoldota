import { describe, expect, it } from "vitest";
import { coachSlot, IDLE_CLOCK, markSpoke, stepCoach, type CoachClock } from "@/lib/live-coach-timing";
import type { LiveEvent, Moment } from "@/types/live";

const DEATH: LiveEvent = { kind: "death", detail: "" };
const KILL: LiveEvent = { kind: "kill", detail: "1" };
// Items, not kills or assists: five of those in one group would fold into a single teamfight.
const ITEM: LiveEvent = { kind: "item", detail: "dragon_lance" };
/** A clock whose look-ahead baseline is already set, so only moments can fire. */
const READY: CoachClock = { ...IDLE_CLOCK, lastTipClock: 600 };

function run(state: CoachClock, steps: { nowMs: number; clockSeconds?: number; moments?: Moment[] }[]) {
  let current = state;
  const fired: (LiveEvent[] | null)[] = [];
  for (const step of steps) {
    const result = stepCoach(current, { nowMs: step.nowMs, clockSeconds: step.clockSeconds ?? 600, moments: step.moments ?? [] });
    current = result.state;
    fired.push(result.fire);
  }
  return { state: current, fired };
}

describe("stepCoach", () => {
  it("closes a group after 6 quiet seconds", () => {
    const { fired } = run(READY, [{ nowMs: 0, moments: [KILL] }, { nowMs: 5_999 }, { nowMs: 6_000 }]);
    expect(fired).toEqual([null, null, [KILL]]);
  });

  it("keeps a group open while moments keep arriving, 20 s at most", () => {
    const steps = [0, 5_000, 10_000, 15_000, 19_999].map((nowMs) => ({ nowMs, moments: [ITEM] }));
    const { fired } = run(READY, [...steps, { nowMs: 20_000 }]);
    expect(fired.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(fired[5]).toHaveLength(5);
  });

  it("lets a big group through 25 s after the last tip", () => {
    const spoke = markSpoke(READY, 100_000, 600);
    expect(run(spoke, [{ nowMs: 119_000, moments: [DEATH] }, { nowMs: 125_000 }]).fired).toEqual([null, [DEATH]]);
    expect(run(spoke, [{ nowMs: 110_000, moments: [DEATH] }, { nowMs: 116_000 }, { nowMs: 124_999 }, { nowMs: 125_000 }]).fired).toEqual([null, null, null, [DEATH]]);
  });

  it("holds a small group for 90 s and sends it with the next group", () => {
    const spoke = markSpoke(READY, 100_000, 600);
    const { fired } = run(spoke, [{ nowMs: 110_000, moments: [KILL] }, { nowMs: 116_000 }, { nowMs: 130_000, moments: [DEATH] }, { nowMs: 136_000 }]);
    expect(fired).toEqual([null, null, null, [KILL, DEATH]]);
  });

  it("sends a held small group once 90 s have passed", () => {
    const spoke = markSpoke(READY, 100_000, 600);
    const { fired } = run(spoke, [{ nowMs: 110_000, moments: [KILL] }, { nowMs: 116_000 }, { nowMs: 189_999 }, { nowMs: 190_000 }]);
    expect(fired).toEqual([null, null, null, [KILL]]);
  });

  it("does not fire again while the last tip is being written", () => {
    const { fired } = run(READY, [{ nowMs: 0, moments: [DEATH] }, { nowMs: 6_000 }, { nowMs: 8_000, moments: [KILL] }, { nowMs: 14_000 }]);
    expect(fired).toEqual([null, [DEATH], null, null]);
  });

  it("drops a group with nothing to say without touching the gaps or the look-ahead", () => {
    const teamkill: Moment = { kind: "teamkill", detail: "ours" };
    const { state, fired } = run(READY, [{ nowMs: 0, moments: [teamkill] }, { nowMs: 6_000 }]);
    expect(fired).toEqual([null, null]);
    expect(state).toMatchObject({ pending: [], held: [], lastTipAt: null, lastTipClock: 600 });
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
  // The browser keeps the full 90 s and 25 s gaps; the server's claim is 3 s more lenient so a tip sent exactly on the gap is not refused.
  it("gives small automatic tips a slot per match, 3 s short of 90 s", () => expect(coachSlot(["kill"], "m1", NOW)).toEqual({ slot: "tip:m1", cutoff: new Date(NOW - 87_000) }));
  it("lets a big moment through 3 s short of 25 s", () => expect(coachSlot(["kill", "death"], "m1", NOW).cutoff).toEqual(new Date(NOW - 22_000)));
  it("lets Ask coach through after 15 s", () => expect(coachSlot(["asked"], "m1", NOW).cutoff).toEqual(new Date(NOW - 15_000)));
  it("keeps the item plan in its own slot, retried after a minute", () => expect(coachSlot(["plan"], "m1", NOW)).toEqual({ slot: "plan:m1", cutoff: new Date(NOW - 60_000) }));
});
