import { describe, expect, it } from "vitest";
import { coachMatch, curve } from "@/lib/coach-test-fixture";
import { compareToHero, percentileOf } from "@/lib/hero-benchmarks";

describe("percentileOf", () => {
  const points = curve(100, 500); // 10% -> 100, 50% -> 300, 90% -> 500

  it("interpolates between points", () => {
    expect(percentileOf(300, points)).toBeCloseTo(50);
    expect(percentileOf(200, points)).toBeCloseTo(30);
  });

  it("clamps to the ends of the curve", () => {
    expect(percentileOf(0, points)).toBeCloseTo(10);
    expect(percentileOf(9999, points)).toBeCloseTo(90);
  });
});

describe("compareToHero", () => {
  const benchmarks = { gold_per_min: curve(300, 700), deaths_per_min: curve(0.05, 0.25) };

  it("needs at least 3 matches on the hero", () => {
    expect(compareToHero([coachMatch(), coachMatch()], benchmarks)).toEqual([]);
  });

  it("averages per-minute values and skips metrics OpenDota has no curve for", () => {
    const rows = compareToHero([coachMatch(), coachMatch(), coachMatch()], benchmarks);
    expect(rows.map((row) => row.metric)).toEqual(["gold_per_min", "deaths_per_min"]);
    expect(rows[0]).toMatchObject({ yours: 500, median: 500, betterThan: 50 });
  });

  it("scales deaths to 10 minutes and counts fewer deaths as better", () => {
    // 4 deaths in 40 min = 0.1 / min -> 30th percentile of deaths -> dies less than 70%
    const deaths = compareToHero([coachMatch(), coachMatch(), coachMatch()], benchmarks)[1];
    expect(deaths.yours).toBeCloseTo(1);
    expect(deaths.betterThan).toBeCloseTo(70);
  });
});
