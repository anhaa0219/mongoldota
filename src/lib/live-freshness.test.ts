import { describe, expect, it } from "vitest";
import { freshDraft, isDotaConnected } from "@/lib/live-freshness";
import type { LockedDraft } from "@/types/live";

const NOW = 1_800_000_000_000;

describe("isDotaConnected", () => {
  it("is connected when Dota sent data in the last 75 s", () => expect(isDotaConnected({ updatedAt: NOW - 30_000, nowMs: NOW })).toBe(true));
  it("is not connected when the last data is old", () => expect(isDotaConnected({ updatedAt: NOW - 10 * 60_000, nowMs: NOW })).toBe(false));
  it("is not connected when Dota never sent data", () => expect(isDotaConnected({ updatedAt: null, nowMs: NOW })).toBe(false));
  it("waits for new data after the setup file was reset", () => {
    expect(isDotaConnected({ updatedAt: NOW - 5_000, nowMs: NOW, resetFrom: NOW - 5_000 })).toBe(false);
    expect(isDotaConnected({ updatedAt: NOW - 1_000, nowMs: NOW, resetFrom: NOW - 5_000 })).toBe(true);
  });
});

describe("freshDraft", () => {
  const draft: LockedDraft = { side: "radiant", myHeroId: 47, allies: [{ heroId: 47, position: 2 }], enemies: [{ heroId: 44, position: 1 }] };
  it("uses a draft locked in the last two hours", () => expect(freshDraft({ draft, updatedAt: NOW - 30 * 60_000 }, NOW)).toEqual(draft));
  it("ignores a draft from an earlier session", () => expect(freshDraft({ draft, updatedAt: NOW - 3 * 3_600_000 }, NOW)).toBeNull());
  it("is null without a draft", () => expect(freshDraft(null, NOW)).toBeNull());
});
