import { describe, expect, it } from "vitest";
import { bracketForTier, bracketRows, dataBracket } from "@/lib/hero-meta";
import type { HeroMeta, MetaBracket, PickWin } from "@/types/meta";

const empty: PickWin = { picks: 0, wins: 0 };
function meta(id: number, divine: PickWin, extra: Partial<HeroMeta> = {}): HeroMeta {
  const brackets = Object.fromEntries(["all", "1", "2", "3", "4", "5", "6", "7", "8", "pro"].map((key) => [key, empty])) as Record<MetaBracket, PickWin>;
  return { id, name: `H${id}`, slug: `h${id}`, roles: [], attribute: "str", brackets: { ...brackets, "7": divine }, proBans: 0, pickTrend: [100, 150], winTrend: [50, 90], ...extra };
}

describe("bracketRows", () => {
  const heroes = [meta(1, { picks: 600, wins: 330 }), meta(2, { picks: 400, wins: 180 })];

  it("computes win, loss and pick rates per match", () => {
    const [first, second] = bracketRows(heroes, "7");
    expect(first).toMatchObject({ heroId: 1, matches: 600, banRate: null });
    expect(first.winRate).toBeCloseTo(55);
    expect(first.lossRate).toBeCloseTo(45);
    expect(second.winRate).toBeCloseTo(45);
    // 1000 picks = 100 matches (10 picks each), so 600 picks = in 600% of them in this tiny test.
    expect(first.pickRate).toBeCloseTo(600);
  });

  it("reports the weekly pick and win-rate trend", () => {
    const [row] = bracketRows(heroes, "7");
    expect(row.pickChange).toBe(50);
    expect(row.winChange).toBeCloseTo(60 - 50);
  });

  it("falls back from empty Immortal data to Divine", () => {
    expect(dataBracket(heroes, "8")).toBe("7");
    expect(bracketRows(heroes, "8")[0].winRate).toBeCloseTo(55);
  });

  it("gives ban rates only for pro", () => {
    const pro = [meta(1, empty, { brackets: { ...meta(1, empty).brackets, pro: { picks: 10, wins: 6 } }, proBans: 5 })];
    expect(bracketRows(pro, "pro")[0].banRate).toBe(500);
  });
});

describe("bracketForTier", () => {
  it("maps a medal tier to its bracket", () => {
    expect(bracketForTier(5)).toBe("5");
    expect(bracketForTier(null)).toBe("all");
  });
});
