import { describe, expect, it } from "vitest";
import { fixtureHeroes, fixtureItems, fixtureMatch } from "@/lib/match-test-fixture";
import { toLaneSummaries } from "@/lib/match-view-lanes";
import { toScoreboard } from "@/lib/match-view-players";
import type { MatchSeries } from "@/types/match-view";

const curve = (at10: number) => Array.from({ length: 12 }, (_, minute) => Math.round((at10 / 10) * minute));
const series: MatchSeries = {
  radiantGoldAdv: [],
  radiantXpAdv: [],
  netWorth: { 0: curve(5000), 1: curve(4000), 2: curve(3000), 128: curve(4500), 129: curve(2000), 130: curve(1500) },
  lastHits: { 0: curve(60), 1: curve(70), 2: curve(40), 128: curve(55), 129: curve(20), 130: curve(15) },
  xp: { 0: curve(6000), 1: curve(4000), 2: curve(3000), 128: curve(5500), 129: curve(3000), 130: curve(2500) },
};
const players = toScoreboard(fixtureMatch(), fixtureHeroes, fixtureItems, 42);

describe("toLaneSummaries", () => {
  const lanes = toLaneSummaries(players, series);

  it("puts Radiant's safe lane and Dire's off lane in the bottom lane", () => {
    const bot = lanes.find((lane) => lane.lane === "bot");
    expect(bot?.radiant.map((stat) => stat.slot)).toEqual([1]);
    expect(bot?.dire.map((stat) => stat.slot)).toEqual([129, 130]);
  });

  it("pairs the mid players", () => {
    const mid = lanes.find((lane) => lane.lane === "mid");
    expect(mid?.radiant.map((stat) => stat.slot)).toEqual([0]);
    expect(mid?.dire.map((stat) => stat.slot)).toEqual([128]);
  });

  it("reads last hits, net worth and XP at 5 and 10 minutes", () => {
    const mid = lanes.find((lane) => lane.lane === "mid");
    expect(mid?.radiant[0].at10).toEqual({ lastHits: 60, netWorth: 5000, xp: 6000 });
    expect(mid?.radiant[0].at5).toEqual({ lastHits: 30, netWorth: 2500, xp: 3000 });
  });

  it("names the lane winner by net worth at 10 minutes", () => {
    expect(lanes.find((lane) => lane.lane === "mid")?.winner).toBe("radiant");
    expect(lanes.find((lane) => lane.lane === "bot")?.winner).toBe("radiant");
  });

  it("has no winner when one side is empty", () => {
    const top = lanes.find((lane) => lane.lane === "top");
    expect(top?.radiant).toEqual([]);
    expect(top?.winner).toBeNull();
  });

  it("leaves minute stats empty when the curve is too short", () => {
    const short: MatchSeries = { ...series, netWorth: { ...series.netWorth, 0: [0, 100] } };
    expect(toLaneSummaries(players, short).find((lane) => lane.lane === "mid")?.radiant[0].at10).toBeNull();
  });
});
