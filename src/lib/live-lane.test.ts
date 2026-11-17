import { describe, expect, it } from "vitest";
import { laneInfo, laneLines } from "@/lib/live-lane";
import type { AdviceFacts } from "@/types/draft";

const FACTS: AdviceFacts = {
  myHero: { name: "Viper", roles: ["Carry"], winRate: 51 },
  position: 1,
  allies: [{ name: "Lion", roles: ["Support"], position: 5 }],
  enemies: [],
  lane: {
    partners: ["Lion (pos 5)"],
    opponents: [
      { name: "Axe", position: 3, myWinRate: 54, games: 1240 },
      { name: "Earth Spirit", position: 4, myWinRate: null, games: 0 },
    ],
  },
  items: { start: [], early: [], mid: [], late: [] },
  bkb: [],
  durations: [],
  personal: null,
  abilities: [],
};

describe("laneInfo", () => {
  it("uses the draft's lane when there are facts", () => {
    expect(laneInfo({ team: "radiant", facts: FACTS, position: 3 })).toMatchObject({ position: 1, lane: "bot", partners: ["Lion (pos 5)"] });
  });

  it("falls back to the picked position with unknown heroes", () => {
    expect(laneInfo({ team: "dire", facts: null, position: 3 })).toEqual({ position: 3, lane: "bot", partners: [], opponents: null });
  });

  it("is null without facts or a position", () => {
    expect(laneInfo({ team: "radiant", facts: null, position: null })).toBeNull();
  });
});

describe("laneLines", () => {
  it("writes the lane block", () => {
    const lane = laneInfo({ team: "radiant", facts: FACTS, position: null });
    if (!lane) throw new Error("expected a lane");
    expect(laneLines(lane, "Viper", 300)).toEqual([
      "Lane: bot (safe lane) with Lion (pos 5), against Axe (pos 3) and Earth Spirit (pos 4).",
      "Viper wins 54% vs Axe (1,240 games).",
      "The laning stage is still on.",
    ]);
  });

  it("drops the laning line from 10:00 and names unknown opponents by position", () => {
    expect(laneLines({ position: 3, lane: "top", partners: [], opponents: null }, "Axe", 600)).toEqual([
      "They play Position 3 (off lane).",
      "Lane: top (off lane), against the enemy pos 1 and pos 5 (heroes unknown).",
    ]);
  });

  it("words a guessed position as a guess", () => {
    const lane = laneInfo({ team: "radiant", facts: null, position: 3, isGuess: true });
    if (!lane) throw new Error("expected a lane");
    expect(laneLines(lane, "Axe", 600)).toEqual([
      "They probably play Position 3 (off lane): a guess from the hero's roles that the player has not confirmed.",
      "Likely lane: top (off lane), against the enemy pos 1 and pos 5 (heroes unknown).",
    ]);
  });

  it("never treats a locked draft's position as a guess", () => {
    expect(laneInfo({ team: "radiant", facts: FACTS, position: 3, isGuess: true })?.isGuess).toBeUndefined();
  });

  it("says just the lane role when the team is unknown, and no doubled 'mid'", () => {
    expect(laneLines({ position: 2, lane: null, partners: [], opponents: null }, "Puck", 900)[1]).toBe("Lane: mid, against the enemy pos 2 (heroes unknown).");
  });
});
