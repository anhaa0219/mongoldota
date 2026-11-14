import { afterEach, describe, expect, it, vi } from "vitest";
import type { RawFullMatch } from "@/types/opendota-match";

const getMatch = vi.fn();
const saveMatch = vi.fn();
const getStoredInfo = vi.fn();
const fetchJson = vi.fn();
vi.mock("@/lib/match-db", () => ({
  getMatch: (id: number) => getMatch(id),
  saveMatch: (raw: RawFullMatch) => saveMatch(raw),
  getStoredInfo: (ids: number[]) => getStoredInfo(ids),
}));
vi.mock("@/lib/opendota", () => ({ fetchJson: (path: string) => fetchJson(path) }));

const { loadMatch, syncRecentMatches } = await import("@/lib/match-store");

const NOW = new Date("2026-11-14T12:00:00Z");
const fresh = { match_id: 1, version: 22 } as unknown as RawFullMatch;
const old = { match_id: 1 } as unknown as RawFullMatch;
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

function runNow() {
  const tasks: (() => Promise<void>)[] = [];
  return { schedule: (task: () => Promise<void>) => tasks.push(task), tasks };
}

afterEach(() => {
  vi.useRealTimers();
  for (const mock of [getMatch, saveMatch, getStoredInfo, fetchJson]) mock.mockReset();
});

describe("loadMatch", () => {
  it("returns a stored parsed match without calling OpenDota", async () => {
    getMatch.mockImplementationOnce(async () => ({ data: fresh, parsed: true, fetchedAt: minutesAgo(600) }));
    expect(await loadMatch(1, runNow().schedule)).toBe(fresh);
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("reuses a stored unparsed match fetched under 2 minutes ago", async () => {
    vi.useFakeTimers({ now: NOW });
    getMatch.mockImplementationOnce(async () => ({ data: old, parsed: false, fetchedAt: minutesAgo(1) }));
    expect(await loadMatch(1, runNow().schedule)).toBe(old);
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("re-fetches an older unparsed match and schedules the save instead of waiting for it", async () => {
    vi.useFakeTimers({ now: NOW });
    getMatch.mockImplementationOnce(async () => ({ data: old, parsed: false, fetchedAt: minutesAgo(10) }));
    fetchJson.mockImplementationOnce(async () => fresh);
    saveMatch.mockImplementation(() => new Promise(() => undefined)); // a database that never answers
    const { schedule, tasks } = runNow();
    expect(await loadMatch(1, schedule)).toBe(fresh);
    expect(tasks).toHaveLength(1);
    expect(saveMatch).not.toHaveBeenCalled();
  });

  it("falls back to the stored copy when OpenDota fails", async () => {
    vi.useFakeTimers({ now: NOW });
    getMatch.mockImplementationOnce(async () => ({ data: old, parsed: false, fetchedAt: minutesAgo(10) }));
    fetchJson.mockImplementationOnce(async () => {
      throw new Error("OpenDota 500");
    });
    expect(await loadMatch(1, runNow().schedule)).toBe(old);
  });

  it("returns null when nothing is stored and OpenDota fails", async () => {
    getMatch.mockImplementationOnce(async () => null);
    fetchJson.mockImplementationOnce(async () => {
      throw new Error("timeout");
    });
    expect(await loadMatch(1, runNow().schedule)).toBeNull();
  });

  it("still loads from OpenDota when the database throws", async () => {
    getMatch.mockImplementationOnce(async () => {
      throw new Error("connect timeout");
    });
    fetchJson.mockImplementationOnce(async () => fresh);
    expect(await loadMatch(1, runNow().schedule)).toBe(fresh);
  });
});

describe("syncRecentMatches", () => {
  it("never fetches the same match twice when two syncs overlap", async () => {
    getStoredInfo.mockImplementation(async () => []);
    fetchJson.mockImplementation(async (path: string) => ({ match_id: Number(path.split("/").pop()) }));
    saveMatch.mockImplementation(async () => undefined);
    await Promise.all([syncRecentMatches([1, 2, 3], 0), syncRecentMatches([1, 2, 3], 0)]);
    expect(fetchJson.mock.calls.map(([path]) => path).sort()).toEqual(["/matches/1", "/matches/2", "/matches/3"]);
  });
});
