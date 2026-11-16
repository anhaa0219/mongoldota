import { describe, expect, it } from "vitest";
import { ADVICE_TTL_MS, formatDuration, isFresh, refreshLabel } from "@/lib/advice-refresh";

const HOUR = 3_600_000;

describe("advice refresh", () => {
  it("keeps advice for 12 hours", () => {
    expect(isFresh(0, ADVICE_TTL_MS - 1)).toBe(true);
    expect(isFresh(0, ADVICE_TTL_MS)).toBe(false);
  });

  it("formats durations", () => {
    expect(formatDuration(9 * HOUR + 58 * 60_000)).toBe("9h 58m");
    expect(formatDuration(42 * 60_000)).toBe("42m");
    expect(formatDuration(5_000)).toBe("under a minute");
  });

  it("labels the countdown", () => {
    expect(refreshLabel(0, 2 * HOUR)).toBe("Updated 2h 0m ago · new advice in 10h 0m");
    expect(refreshLabel(0, 10_000)).toBe("Updated just now · new advice in 11h 59m");
    expect(refreshLabel(0, 13 * HOUR)).toBe("Updated 13h 0m ago · new advice on the next visit");
  });
});
