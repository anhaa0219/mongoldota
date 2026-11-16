import { describe, expect, it } from "vitest";
import { assignPosition, guessPositions, laneOpponentPositions, lanePartnerPositions } from "@/lib/draft-lanes";
import type { DraftHero } from "@/types/draft";

const hero = (id: number, roles: string[]): DraftHero => ({ id, name: `Hero ${id}`, slug: `h${id}`, winRate: 50, roles });

describe("lanes", () => {
  it("matches the real Dota lanes", () => {
    expect(laneOpponentPositions(1)).toEqual([3, 4]);
    expect(laneOpponentPositions(5)).toEqual([3, 4]);
    expect(laneOpponentPositions(2)).toEqual([2]);
    expect(laneOpponentPositions(3)).toEqual([1, 5]);
    expect(laneOpponentPositions(4)).toEqual([1, 5]);
  });

  it("finds the lane partner", () => {
    expect(lanePartnerPositions(1)).toEqual([5]);
    expect(lanePartnerPositions(4)).toEqual([3]);
    expect(lanePartnerPositions(2)).toEqual([]);
  });
});

describe("guessPositions", () => {
  it("gives a typical lineup sensible, distinct positions", () => {
    const lineup = [
      hero(1, ["Support", "Disabler"]), // hard support
      hero(2, ["Carry", "Escape"]), // carry
      hero(3, ["Durable", "Initiator"]), // offlaner
      hero(4, ["Nuker", "Escape", "Carry"]), // mid
      hero(5, ["Support", "Initiator", "Nuker"]), // soft support
    ];
    const positions = guessPositions(lineup);
    expect(new Set(positions.values()).size).toBe(5);
    expect(positions.get(2)).toBe(1);
    expect(positions.get(4)).toBe(2);
    expect(positions.get(3)).toBe(3);
    expect([4, 5]).toContain(positions.get(1));
  });

  it("works with fewer than 5 heroes", () => {
    expect(guessPositions([hero(9, ["Carry"])]).get(9)).toBe(1);
  });
});

describe("assignPosition", () => {
  it("swaps with the teammate who had that position", () => {
    const positions = assignPosition(new Map([[1, 1], [2, 2]]), 1, 2);
    expect([...positions]).toEqual([[1, 2], [2, 1]]);
  });
});
