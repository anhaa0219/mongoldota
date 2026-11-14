import { describe, expect, it } from "vitest";
import { pickMatchesToSync, toMatchRows, type StoredMatchInfo } from "@/lib/match-rows";
import type { RawFullMatch, RawFullPlayer } from "@/types/opendota-match";

function player(account_id: number | null, player_slot: number, hero_id = 1): RawFullPlayer {
  return { account_id, player_slot, hero_id, kills: 0, assists: 0 };
}

function match(overrides: Partial<RawFullMatch> = {}): RawFullMatch {
  return {
    match_id: 9,
    start_time: 1794497398,
    duration: 2464,
    radiant_win: true,
    version: 22,
    radiant_score: 30,
    dire_score: 20,
    players: [player(42, 1, 5), player(null, 2), player(7, 129, 8)],
    ...overrides,
  };
}

describe("toMatchRows", () => {
  it("maps the match row", () => {
    const raw = match();
    const { match: row } = toMatchRows(raw);
    expect(row).toEqual({
      matchId: 9,
      parsed: true,
      startTime: new Date(1794497398000),
      durationS: 2464,
      radiantWin: true,
      data: raw,
    });
    expect(row.data).toBe(raw);
  });

  it("marks matches without a version as unparsed", () => {
    const raw = match();
    delete raw.version;
    expect(toMatchRows(raw).match.parsed).toBe(false);
  });

  it("skips anonymous players whose account_id is missing entirely (not just null)", () => {
    const anonymous: RawFullPlayer = { player_slot: 3, hero_id: 2, kills: 0, assists: 0 };
    const rows = toMatchRows(match({ players: [player(42, 1, 5), anonymous] })).players;
    expect(rows.map((row) => row.accountId)).toEqual([42]);
  });

  it("indexes every named player and who won", () => {
    expect(toMatchRows(match()).players).toEqual([
      { accountId: 42, matchId: 9, heroId: 5, playerSlot: 1, won: true },
      { accountId: 7, matchId: 9, heroId: 8, playerSlot: 129, won: false },
    ]);
  });
});

describe("pickMatchesToSync", () => {
  const now = new Date("2026-11-14T12:00:00Z");
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);
  const stored = (matchId: number, parsed: boolean, fetchedAt = hoursAgo(5)): StoredMatchInfo => ({ matchId, parsed, fetchedAt });

  it("picks matches that are not stored yet, in order", () => {
    expect(pickMatchesToSync([1, 2, 3], [stored(2, true)], now, 5)).toEqual([1, 3]);
  });

  it("re-fetches unparsed matches only after an hour", () => {
    expect(pickMatchesToSync([1, 2], [stored(1, false, hoursAgo(2)), stored(2, false, hoursAgo(10 / 60))], now, 5)).toEqual([1]);
  });

  it("puts missing matches before stale ones", () => {
    expect(pickMatchesToSync([1, 2], [stored(1, false, hoursAgo(2))], now, 5)).toEqual([2, 1]);
  });

  it("respects the limit", () => {
    expect(pickMatchesToSync([1, 2, 3, 4, 5, 6, 7, 8], [], now, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("works with nothing stored", () => {
    expect(pickMatchesToSync([1, 2], [], now, 5)).toEqual([1, 2]);
  });
});
