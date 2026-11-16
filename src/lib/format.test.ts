import { describe, expect, it } from "vitest";
import { formatDuration, timeAgo } from "@/lib/format";

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(2464)).toBe("41:04");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats pre-horn purchases as negative", () => {
    expect(formatDuration(-77)).toBe("-1:17");
  });
});

describe("timeAgo", () => {
  const now = Date.UTC(2026, 10, 14, 12);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  it("says just now under a minute", () => {
    expect(timeAgo(now - 30_000, now)).toBe("just now");
  });

  it("uses minutes, hours, days, then months", () => {
    expect(timeAgo(now - 5 * minute, now)).toBe("5 min ago");
    expect(timeAgo(now - 2 * hour, now)).toBe("2 h ago");
    expect(timeAgo(now - 3 * day, now)).toBe("3 d ago");
    expect(timeAgo(now - 65 * day, now)).toBe("2 mo ago");
  });
});

describe("timeAgo without a time", () => {
  it("prints nothing instead of NaN", () => {
    expect(timeAgo(Number.NaN, 0)).toBe("");
  });
});
