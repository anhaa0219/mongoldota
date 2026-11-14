import { describe, expect, it } from "vitest";
import { summarize, toMatchSummary } from "@/lib/player-summary";
import type { HeroInfo, MatchSummary, RawMatch } from "@/types/opendota";

const antiMage: HeroInfo = { id: 1, name: "Anti-Mage", slug: "antimage" };
const axe: HeroInfo = { id: 2, name: "Axe", slug: "axe" };
const heroes = new Map([
  [1, antiMage],
  [2, axe],
]);

let nextId = 1;
function match(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: nextId++,
    heroId: 1,
    won: true,
    radiant: true,
    ranked: true,
    kills: 5,
    deaths: 3,
    assists: 7,
    gpm: 500,
    xpm: 600,
    lastHits: 200,
    heroDamage: 20000,
    items: [0, 0, 0, 0, 0, 0],
    laneRole: null,
    parsed: false,
    durationSeconds: 2400,
    playedAt: 0,
    ...overrides,
  };
}

function raw(overrides: Partial<RawMatch> = {}): RawMatch {
  return {
    match_id: 1,
    player_slot: 1,
    radiant_win: true,
    duration: 2464,
    lobby_type: 7,
    start_time: 1794497398,
    hero_id: 1,
    kills: 3,
    deaths: 2,
    assists: 8,
    version: 22,
    lane_role: 1,
    ...overrides,
  };
}

describe("toMatchSummary", () => {
  it("counts a radiant player as winning when radiant wins", () => {
    expect(toMatchSummary(raw({ player_slot: 1, radiant_win: true })).won).toBe(true);
  });

  it("counts a dire player as winning only when radiant loses", () => {
    expect(toMatchSummary(raw({ player_slot: 129, radiant_win: false })).won).toBe(true);
    expect(toMatchSummary(raw({ player_slot: 129, radiant_win: true })).won).toBe(false);
  });

  it("maps ranked, duration, time and items", () => {
    const summary = toMatchSummary(
      raw({ item_0: 249, item_1: 263, item_2: null, item_3: 0, item_4: 1, item_5: 63 }),
    );
    expect(summary.ranked).toBe(true);
    expect(toMatchSummary(raw({ lobby_type: 0 })).ranked).toBe(false);
    expect(summary.durationSeconds).toBe(2464);
    expect(summary.playedAt).toBe(1794497398000);
    expect(summary.items).toEqual([249, 263, 0, 0, 1, 63]);
  });

  it("marks unparsed matches and drops unknown lanes", () => {
    const unparsed = toMatchSummary(raw({ version: null, lane_role: 1 }));
    expect(unparsed.parsed).toBe(false);
    expect(unparsed.laneRole).toBeNull();
    expect(toMatchSummary(raw({ lane_role: 7 })).laneRole).toBeNull();
    expect(toMatchSummary(raw({ lane_role: 2 })).laneRole).toBe(2);
  });

  it("records the side the player was on", () => {
    expect(toMatchSummary(raw({ player_slot: 1 })).radiant).toBe(true);
    expect(toMatchSummary(raw({ player_slot: 129 })).radiant).toBe(false);
  });

  it("uses 0 for missing numbers", () => {
    expect(toMatchSummary(raw()).gpm).toBe(0);
  });
});

describe("summarize", () => {
  it("returns null for no matches", () => {
    expect(summarize([], heroes)).toBeNull();
  });

  it("picks the hero with the most games", () => {
    const matches = [match({ heroId: 2 }), match({ heroId: 1 }), match({ heroId: 2 }), match({ heroId: 1 }), match({ heroId: 2 })];
    const summary = summarize(matches, heroes);
    expect(summary?.mostPlayed.hero.name).toBe("Axe");
    expect(summary?.mostPlayed.matches).toBe(3);
  });

  it("breaks a games tie by win rate", () => {
    const matches = [
      match({ heroId: 2, won: true }),
      match({ heroId: 1, won: true }),
      match({ heroId: 2, won: false }),
      match({ heroId: 1, won: true }),
    ];
    const summary = summarize(matches, heroes);
    expect(summary?.mostPlayed.hero).toEqual(antiMage);
    expect(summary?.mostPlayed.winRate).toBe(100);
  });

  it("breaks a games and win rate tie by most recent", () => {
    const matches = [match({ heroId: 2 }), match({ heroId: 1 }), match({ heroId: 1 }), match({ heroId: 2 })];
    expect(summarize(matches, heroes)?.mostPlayed.hero).toEqual(axe);
  });

  it("names heroes missing from the hero index 'Unknown hero'", () => {
    const summary = summarize([match({ heroId: 999 })], heroes);
    expect(summary?.mostPlayed.hero).toEqual({ id: 999, name: "Unknown hero", slug: "" });
  });

  it("counts wins and losses over all matches and keeps the last 10", () => {
    const matches = [
      ...Array.from({ length: 3 }, () => match({ won: false })),
      ...Array.from({ length: 9 }, () => match({ won: true })),
    ];
    const summary = summarize(matches, heroes);
    expect(summary?.wins).toBe(9);
    expect(summary?.losses).toBe(3);
    expect(summary?.last10).toHaveLength(10);
    expect(summary?.last10[0]).toBe("L");
  });

  it("finds records, preferring the most recent match on ties", () => {
    const matches = [match({ kills: 3, heroId: 1 }), match({ kills: 16, heroId: 2 }), match({ kills: 16, heroId: 1 })];
    const records = summarize(matches, heroes)?.records ?? [];
    expect(records.map((record) => record.label)).toEqual(["Most kills", "Most deaths", "Most assists", "Most hero damage"]);
    expect(records[0]).toEqual({ label: "Most kills", value: 16, hero: axe, matchId: matches[1].id });
  });

  it("links each record to the match it came from", () => {
    const record = match({ kills: 30 });
    const records = summarize([match({ kills: 3 }), record], heroes)?.records ?? [];
    expect(records[0].matchId).toBe(record.id);
  });

  it("averages the stats", () => {
    const summary = summarize([match({ kills: 3, gpm: 400 }), match({ kills: 4, gpm: 601 })], heroes);
    expect(summary?.averages.kills).toBe(3.5);
    expect(summary?.averages.gpm).toBe(500.5);
  });

  it("finds the main lane among parsed matches only", () => {
    const matches = [
      match({ parsed: true, laneRole: 1 }),
      match({ parsed: true, laneRole: 1 }),
      match({ parsed: true, laneRole: 2 }),
      match(),
      match(),
    ];
    expect(summarize(matches, heroes)?.mainLane).toEqual({ lane: 1, share: 67 });
  });

  it("breaks a main lane tie by the lowest lane number", () => {
    const matches = [match({ parsed: true, laneRole: 3 }), match({ parsed: true, laneRole: 1 })];
    expect(summarize(matches, heroes)?.mainLane?.lane).toBe(1);
  });

  it("has no main lane when no match is parsed", () => {
    expect(summarize([match(), match()], heroes)?.mainLane).toBeNull();
  });
});

describe("summarize breakdowns", () => {
  const many = new Map(Array.from({ length: 6 }, (_, i) => [i + 1, { id: i + 1, name: `Hero ${i + 1}`, slug: `h${i + 1}` }]));

  it("lists up to 5 top heroes, most played first, with mostPlayed as the first", () => {
    const matches = [1, 2, 2, 3, 3, 3, 4, 5, 6].map((heroId) => match({ heroId }));
    const summary = summarize(matches, many);
    expect(summary?.topHeroes.map((entry) => entry.hero.id)).toEqual([3, 2, 1, 4, 5]);
    expect(summary?.topHeroes[0]).toEqual(summary?.mostPlayed);
  });

  it("gives win rates per lane from parsed matches only", () => {
    const matches = [
      match({ parsed: true, laneRole: 2, won: true }),
      match({ parsed: true, laneRole: 1, won: true }),
      match({ parsed: true, laneRole: 1, won: false }),
      match({ won: false }),
    ];
    expect(summarize(matches, heroes)?.lanes).toEqual([
      { lane: 1, matches: 2, winRate: 50 },
      { lane: 2, matches: 1, winRate: 100 },
    ]);
  });

  it("gives win rates per side, null for a side never played", () => {
    const matches = [match({ radiant: true, won: true }), match({ radiant: true, won: false })];
    expect(summarize(matches, heroes)?.sides).toEqual({ radiant: { matches: 2, winRate: 50 }, dire: null });
  });

  it("finds the current streak and the longest win streak", () => {
    const results = [true, true, false, true, true, true, false];
    const summary = summarize(results.map((won) => match({ won })), heroes);
    expect(summary?.streaks).toEqual({ current: { result: "W", length: 2 }, longestWin: 3 });
  });

  it("has a zero longest win streak when every match is lost", () => {
    const summary = summarize([match({ won: false }), match({ won: false })], heroes);
    expect(summary?.streaks).toEqual({ current: { result: "L", length: 2 }, longestWin: 0 });
  });

  it("splits win rate by ranked and unranked", () => {
    const matches = [match({ ranked: true, won: true }), match({ ranked: true, won: false })];
    expect(summarize(matches, heroes)?.queues).toEqual({ ranked: { matches: 2, winRate: 50 }, unranked: null });
  });

  it("averages the match length", () => {
    const matches = [match({ durationSeconds: 2400 }), match({ durationSeconds: 3000 })];
    expect(summarize(matches, heroes)?.averageDurationSeconds).toBe(2700);
  });
});
