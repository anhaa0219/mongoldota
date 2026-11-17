import { describe, expect, it } from "vitest";
import { closeGroup, isBigKind, parseTeamfightDetail, teamfightDetail } from "@/lib/live-moments";
import type { LiveEventKind, Moment } from "@/types/live";

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

describe("closeGroup", () => {
  const ours: Moment = { kind: "teamkill", detail: "ours" };
  const theirs: Moment = { kind: "teamkill", detail: "theirs" };

  it("folds three hero deaths into one teamfight", () => {
    const group: Moment[] = [{ kind: "kill", detail: "1" }, { kind: "assist", detail: "2" }, ours, ours, ours, theirs];
    expect(closeGroup(group)).toEqual([{ kind: "teamfight", detail: "3:1:1:2:0" }]);
  });

  it("keeps a lone kill as a kill", () => {
    expect(closeGroup([{ kind: "kill", detail: "1" }, ours])).toEqual([{ kind: "kill", detail: "1" }]);
  });

  it("uses the player's own numbers when Dota sends no scores", () => {
    expect(closeGroup([{ kind: "death", detail: "" }, { kind: "assist", detail: "1" }])).toEqual([{ kind: "teamfight", detail: "?:?:0:1:1" }]);
    expect(closeGroup([{ kind: "assist", detail: "1" }])).toEqual([{ kind: "assist", detail: "1" }]);
  });

  it("keeps moments that are not part of the fight", () => {
    const group: Moment[] = [{ kind: "death", detail: "" }, theirs, theirs, theirs, { kind: "buyback", detail: "" }, { kind: "item", detail: "dragon_lance" }];
    expect(closeGroup(group)).toEqual([{ kind: "teamfight", detail: "0:3:0:0:1" }, { kind: "buyback", detail: "" }, { kind: "item", detail: "dragon_lance" }]);
  });

  it("says nothing about a couple of kills the player had no part in", () => {
    expect(closeGroup([ours, theirs])).toEqual([]);
  });
});
