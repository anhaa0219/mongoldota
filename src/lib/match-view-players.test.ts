import { describe, expect, it } from "vitest";
import { fixtureHeroes, fixtureItems, fixtureMatch, fixturePlayer } from "@/lib/match-test-fixture";
import { defaultFollowedSlot, laneOpponents, toScoreboard } from "@/lib/match-view-players";

describe("toScoreboard", () => {
  const players = toScoreboard(fixtureMatch(), fixtureHeroes, fixtureItems, 42);

  it("lists Radiant first, each team by slot", () => {
    const shuffled = fixtureMatch();
    shuffled.players = [...shuffled.players].reverse();
    const ordered = toScoreboard(shuffled, fixtureHeroes, fixtureItems, 42);
    expect(ordered.map((player) => player.slot)).toEqual([0, 1, 2, 128, 129, 130]);
    expect(ordered.map((player) => player.team)).toEqual(["radiant", "radiant", "radiant", "dire", "dire", "dire"]);
  });

  it("marks only the linked player", () => {
    expect(players.filter((player) => player.isLinked).map((player) => player.slot)).toEqual([0]);
  });

  it("names players without a public profile 'Anonymous'", () => {
    expect(players[1].name).toBe("Anonymous");
    expect(players[0].name).toBe("Me");
  });

  it("maps lane, position, hero, net worth and items", () => {
    expect(players[0]).toMatchObject({ lane: 2, position: 2, netWorth: 20000, hero: { name: "Anti-Mage" } });
    expect(players[0].items[0]?.key).toBe("black_king_bar");
    expect(players[0].items[1]).toBeNull();
    expect(players[0].items).toHaveLength(6);
  });

  it("falls back for heroes missing from the index", () => {
    const raw = fixtureMatch({ players: [fixturePlayer({ hero_id: 999 })] });
    expect(toScoreboard(raw, fixtureHeroes, fixtureItems, null)[0].hero).toEqual({ id: 999, name: "Unknown hero", slug: "" });
  });
});

describe("defaultFollowedSlot", () => {
  it("follows the linked player", () => {
    const players = toScoreboard(fixtureMatch(), fixtureHeroes, fixtureItems, 7);
    expect(defaultFollowedSlot(players)).toBe(128);
  });

  it("follows the first player when the linked player is not in the match", () => {
    const players = toScoreboard(fixtureMatch(), fixtureHeroes, fixtureItems, 12345);
    expect(defaultFollowedSlot(players)).toBe(0);
  });
});

describe("laneOpponents", () => {
  const players = toScoreboard(fixtureMatch(), fixtureHeroes, fixtureItems, 42);
  const opponents = laneOpponents(players, { 129: 30, 130: 45 });

  it("pairs mid with mid", () => {
    expect(opponents[0]).toBe(128);
    expect(opponents[128]).toBe(0);
  });

  it("pairs Radiant safe lane with the Dire off lane, preferring more last hits at 10", () => {
    expect(opponents[1]).toBe(130);
  });

  it("has no opponent for the jungle", () => {
    expect(opponents[2]).toBeNull();
  });
});
