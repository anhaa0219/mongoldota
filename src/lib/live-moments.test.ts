import { describe, expect, it } from "vitest";
import { isBigKind, parseTeamfightDetail, teamfightDetail } from "@/lib/live-moments";
import type { LiveEventKind } from "@/types/live";

describe("teamfight detail", () => {
  it("round-trips a teamfight summary", () => {
    const summary = { ours: 3, theirs: 1, kills: 1, assists: 2, died: false };
    expect(teamfightDetail(summary)).toBe("3:1:1:2:0");
    expect(parseTeamfightDetail("3:1:1:2:0")).toEqual(summary);
    expect(parseTeamfightDetail("?:?:0:2:1")).toEqual({ ours: null, theirs: null, kills: 0, assists: 2, died: true });
  });

  it("rejects anything else", () => {
    for (const bad of ["", "3:1", "a:b:c:d:e", "3:1:1:2:5", "-1:1:1:2:0"]) expect(parseTeamfightDetail(bad)).toBeNull();
  });
});

describe("isBigKind", () => {
  it("knows the big kinds", () => {
    const big: LiveEventKind[] = ["death", "teamfight", "buyback", "aegis"];
    const small: LiveEventKind[] = ["kill", "assist", "streak", "nobuyback", "building", "item", "gold", "lookahead", "asked", "plan"];
    expect(big.every(isBigKind)).toBe(true);
    expect(small.some(isBigKind)).toBe(false);
  });
});
