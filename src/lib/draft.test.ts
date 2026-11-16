import { describe, expect, it } from "vitest";
import { clearSlot, countPicked, emptyDraft, firstEmpty, firstEmptyOn, pickHero } from "@/lib/draft";

describe("draft board", () => {
  it("fills Radiant left to right, then Dire", () => {
    let draft = emptyDraft();
    for (const heroId of [1, 2, 3, 4, 5, 6]) draft = pickHero(draft, heroId, null).draft;
    expect(draft.radiant).toEqual([1, 2, 3, 4, 5]);
    expect(draft.dire).toEqual([6, null, null, null, null]);
  });

  it("fills the chosen slot and points at the next empty one", () => {
    const { draft, next } = pickHero(emptyDraft(), 7, { side: "dire", index: 2 });
    expect(draft.dire[2]).toBe(7);
    expect(next).toEqual({ side: "radiant", index: 0 });
  });

  it("never adds the same hero twice", () => {
    const once = pickHero(emptyDraft(), 7, null).draft;
    expect(pickHero(once, 7, null).draft).toBe(once);
  });

  it("clears a slot, and reports a full draft", () => {
    let draft = emptyDraft();
    for (let heroId = 1; heroId <= 10; heroId++) draft = pickHero(draft, heroId, null).draft;
    expect(firstEmpty(draft)).toBeNull();
    expect(countPicked(clearSlot(draft, { side: "radiant", index: 0 }))).toBe(9);
  });

  it("finds the first empty slot on one team", () => {
    const draft = pickHero(emptyDraft(), 1, { side: "dire", index: 0 }).draft;
    expect(firstEmptyOn(draft, "dire")).toEqual({ side: "dire", index: 1 });
  });
});
