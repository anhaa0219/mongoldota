import { describe, expect, it } from "vitest";
import { applyTip, rowToFeed, rowToTip } from "@/lib/live-rows";

describe("rowToFeed", () => {
  it("maps a live_states row", () => {
    expect(rowToFeed({ snapshot: null, updated_at: "2026-11-17T10:00:00.000Z" })).toEqual({
      snapshot: null,
      updatedAt: Date.parse("2026-11-17T10:00:00.000Z"),
    });
  });
});

describe("rowToTip", () => {
  const row = { id: 3, match_id: "m1", clock_seconds: 600, kind: "death", text: "Stay back.", plan: null, created_at: "2026-11-17T10:00:00.000Z" };

  it("maps a live_tips row", () => {
    expect(rowToTip(row)).toEqual({ id: 3, matchId: "m1", clockSeconds: 600, kind: "death", text: "Stay back.", plan: null, createdAt: Date.parse(row.created_at) });
  });

  it("drops a tip with an unknown kind", () => {
    expect(rowToTip({ ...row, kind: "shout" })).toBeNull();
  });
});

describe("applyTip", () => {
  const empty = { feed: { snapshot: null, updatedAt: null }, tips: [], plan: null };
  const planTip = { id: 7, matchId: "m1", clockSeconds: 0, kind: "plan" as const, text: "Item plan: A", plan: ["dragon_lance"], createdAt: 1 };

  it("keeps a new plan apart from the tips list", () => {
    expect(applyTip(empty, planTip).plan).toEqual({ matchId: "m1", items: ["dragon_lance"] });
  });

  it("adds each tip once", () => {
    expect(applyTip(applyTip(empty, planTip), planTip).tips).toHaveLength(1);
  });
});
