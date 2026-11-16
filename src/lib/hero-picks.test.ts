import { describe, expect, it } from "vitest";
import { buildHeroPicksPrompt, fallbackReason, parseHeroPicks, shortlist } from "@/lib/hero-picks";
import type { HeroMeta, MetaBracket, PickWin } from "@/types/meta";

const zero: PickWin = { picks: 0, wins: 0 };
function meta(id: number, name: string, roles: string[], divine: PickWin): HeroMeta {
  const brackets = Object.fromEntries(["all", "1", "2", "3", "4", "5", "6", "8", "pro"].map((key) => [key, zero])) as Record<MetaBracket, PickWin>;
  return { id, name, slug: name.toLowerCase(), roles, attribute: "agi", brackets: { ...brackets, "7": divine }, proBans: 0, pickTrend: [], winTrend: [] };
}

const heroes = [
  meta(1, "Strong", ["Carry"], { picks: 3000, wins: 1650 }), // 55%
  meta(2, "Weak", ["Support"], { picks: 3000, wins: 1350 }), // 45%
  meta(3, "Comfort", ["Support"], { picks: 3000, wins: 1470 }), // 49%, but the player wins it
  meta(4, "Rare", ["Carry"], { picks: 10, wins: 9 }), // tiny sample: never shortlisted
];

describe("shortlist", () => {
  it("ranks meta strength, the player's own wins and lane fit; skips tiny samples", () => {
    const list = shortlist({ heroes, bracket: "7", personal: { 3: { games: 30, winRate: 70 } }, mainLane: 1 });
    expect(list.map((candidate) => candidate.name)).toEqual(["Comfort", "Strong", "Weak"]);
    expect(list[1].fitsLane).toBe(true);
  });
});

describe("prompt and parsing", () => {
  const list = shortlist({ heroes, bracket: "7", personal: {}, mainLane: null });

  it("lists candidates with their numbers", () => {
    expect(buildHeroPicksPrompt(list, "7", null)).toContain("- Strong [Carry]: 55% win rate in Divine; player has not played it recently");
  });

  it("keeps only shortlisted heroes, once each", () => {
    const picks = parseHeroPicks('{"picks": [{"hero": "strong", "reason": "a"}, {"hero": "Invoker", "reason": "b"}, {"hero": "Strong", "reason": "c"}]}', list);
    expect(picks).toEqual([{ heroId: 1, reason: "a" }]);
    expect(parseHeroPicks('{"picks": [{"hero": "Invoker", "reason": "b"}]}', list)).toBeNull();
  });

  it("explains a pick from the numbers when there is no AI", () => {
    expect(fallbackReason({ ...list[0], personal: { games: 12, winRate: 58 }, fitsLane: true }, "7")).toBe(
      "55% win rate in Divine; you win 58% over 12 games; fits the lane you play most.",
    );
  });
});
