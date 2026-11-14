import { describe, expect, it } from "vitest";
import { linePath, valueRange } from "@/lib/chart-paths";

describe("linePath", () => {
  it("draws values on a shared scale", () => {
    expect(linePath([0, 50, 100], 100, 50, { min: 0, max: 100 })).toBe("M0,50 L50,25 L100,0");
    expect(linePath([0, 50], 100, 50, { min: 0, max: 100 })).toBe("M0,50 L100,25");
  });

  it("supports negative values (team advantage)", () => {
    expect(linePath([-100, 100], 100, 50, { min: -100, max: 100 })).toBe("M0,50 L100,0");
  });

  it("is empty with fewer than two points or a flat range", () => {
    expect(linePath([5], 100, 50, { min: 0, max: 10 })).toBe("");
    expect(linePath([1, 1], 100, 50, { min: 1, max: 1 })).toBe("");
  });

  it("can stretch a short series over the longest one's width", () => {
    expect(linePath([0, 100], 100, 50, { min: 0, max: 100 }, 5)).toBe("M0,50 L25,0");
  });
});

describe("valueRange", () => {
  it("spans every series and includes zero", () => {
    expect(valueRange([[5, 10], [-3, 2]])).toEqual({ min: -3, max: 10 });
    expect(valueRange([[5, 10]])).toEqual({ min: 0, max: 10 });
    expect(valueRange([[]])).toEqual({ min: 0, max: 0 });
  });
});
