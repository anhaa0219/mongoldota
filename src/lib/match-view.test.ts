import { describe, expect, it } from "vitest";
import { fixtureHeroes, fixtureItems, fixtureMatch } from "@/lib/match-test-fixture";
import { toMatchView } from "@/lib/match-view";

describe("toMatchView", () => {
  it("builds the header", () => {
    expect(toMatchView(fixtureMatch(), fixtureHeroes, fixtureItems, 42).header).toEqual({
      radiantWin: true,
      radiantScore: 30,
      direScore: 20,
      durationSeconds: 2464,
      startTime: 1794497398000,
      ranked: true,
    });
  });

  it("follows the linked player and knows their lane opponent", () => {
    const view = toMatchView(fixtureMatch(), fixtureHeroes, fixtureItems, 42);
    expect(view.defaultFollowedSlot).toBe(0);
    expect(view.laneOpponent[0]).toBe(128);
    expect(view.players).toHaveLength(6);
  });

  it("leaves the parsed-only parts empty for an unparsed match", () => {
    const raw = fixtureMatch();
    delete raw.version;
    const view = toMatchView(raw, fixtureHeroes, fixtureItems, 42);
    expect(view.parsed).toBe(false);
    expect([view.series, view.map, view.combat, view.log]).toEqual([null, null, null, null]);
    expect(view.events).toEqual([]);
  });
});
