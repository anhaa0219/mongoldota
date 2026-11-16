import { describe, expect, it } from "vitest";
import { adviceRequestKey, boardSchema, EMPTY_BOARD, lineupKey, lockSchema } from "@/lib/draft-storage";

describe("draft storage", () => {
  it("accepts a saved board and rejects a damaged one", () => {
    expect(boardSchema.safeParse(EMPTY_BOARD).success).toBe(true);
    expect(boardSchema.safeParse({ draft: { radiant: [1, 2], dire: [] }, locked: false }).success).toBe(false);
  });

  it("keys the lineup by slot order", () => {
    expect(lineupKey({ radiant: [1, null, null, null, null], dire: [2, null, null, null, null] })).toBe("1,,,,|2,,,,");
  });

  it("changes the advice key when side, hero or any position changes, not when map order does", () => {
    const base = { radiant: new Map([[1, 1], [2, 2]] as const), dire: new Map([[3, 3]] as const) };
    const reordered = { radiant: new Map([[2, 2], [1, 1]] as const), dire: base.dire };
    const key = adviceRequestKey("radiant", 1, base);
    expect(adviceRequestKey("radiant", 1, reordered)).toBe(key);
    expect(adviceRequestKey("dire", 1, base)).not.toBe(key);
    expect(adviceRequestKey("radiant", 2, base)).not.toBe(key);
    expect(adviceRequestKey("radiant", 1, { ...base, dire: new Map([[3, 4]] as const) })).not.toBe(key);
  });

  it("accepts saved lock-screen choices with advice", () => {
    const saved = { lineup: "x", positions: { radiant: [[1, 1]], dire: [] }, chosenId: 1, advice: { request: "r", items: [{ category: "Items", title: "t", detail: "d" }] } };
    expect(lockSchema.safeParse(saved).success).toBe(true);
    expect(lockSchema.safeParse(null).success).toBe(true);
  });
});
