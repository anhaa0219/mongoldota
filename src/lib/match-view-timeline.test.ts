import { describe, expect, it } from "vitest";
import { fixtureHeroes, fixtureItems, fixtureMatch } from "@/lib/match-test-fixture";
import { clampTime, eventsNear, nearestEvents, playbackStep, toEvents, toSeries } from "@/lib/match-view-timeline";
import { toScoreboard } from "@/lib/match-view-players";
import type { MatchEvent } from "@/types/match-view";

function eventfulMatch() {
  const raw = fixtureMatch({
    radiant_gold_adv: [0, 120, -40],
    radiant_xp_adv: [0, 50, 90],
    objectives: [
      { time: 1430, type: "CHAT_MESSAGE_ROSHAN_KILL", team: 2 },
      { time: 822, type: "building_kill", key: "npc_dota_badguys_tower1_top" },
      { time: 47, type: "CHAT_MESSAGE_COURIER_LOST", team: 3 },
    ],
    teamfights: [{ start: 710, end: 749, deaths: 4, players: [] }],
  });
  const me = raw.players[0];
  me.networth_t = [0, 600, 1300];
  me.lh_t = [0, 5, 12];
  me.xp_t = [0, 300, 800];
  me.kills_log = [{ time: 600, key: "npc_dota_hero_bloodseeker" }];
  me.deaths_log = [{ time: 727, key: "npc_dota_hero_bloodseeker" }, { time: 900, key: "npc_dota_badguys_tower1_mid" }];
  me.purchase_log = [{ time: 300, key: "power_treads" }, { time: 1122, key: "black_king_bar" }, { time: 1500, key: "black_king_bar" }];
  return raw;
}

describe("toSeries", () => {
  it("collects team advantages and each player's curves by slot", () => {
    const series = toSeries(eventfulMatch());
    expect(series?.radiantGoldAdv).toEqual([0, 120, -40]);
    expect(series?.netWorth[0]).toEqual([0, 600, 1300]);
    expect(series?.lastHits[0]).toEqual([0, 5, 12]);
    expect(series?.xp[128]).toEqual([]);
  });
});

describe("toEvents", () => {
  const raw = eventfulMatch();
  const events = toEvents(raw, toScoreboard(raw, fixtureHeroes, fixtureItems, 42), fixtureItems);
  const summary = events.map((event: MatchEvent) => `${event.time} ${event.kind} ${event.label}`);

  it("lists kills, deaths, big items, Roshan, towers and teamfights in time order", () => {
    expect(summary).toEqual([
      "600 kill Killed Bloodseeker",
      "710 teamfight Teamfight: 4 deaths",
      "727 death Died to Bloodseeker",
      "822 tower Dire tier 1 top destroyed",
      "900 death Died",
      "1122 item Bought black_king_bar",
      "1430 roshan Radiant killed Roshan",
    ]);
  });

  it("attaches the player and item icon", () => {
    const bkb = events.find((event) => event.kind === "item");
    expect(bkb).toMatchObject({ slot: 0, team: "radiant", image: "https://cdn.example/black_king_bar.png" });
  });
});

describe("unparsed match", () => {
  it("has no series and no events", () => {
    const raw = eventfulMatch();
    delete raw.version;
    expect(toSeries(raw)).toBeNull();
    expect(toEvents(raw, toScoreboard(raw, fixtureHeroes, fixtureItems, 42), fixtureItems)).toEqual([]);
  });
});

describe("time helpers", () => {
  const event = (time: number): MatchEvent => ({ time, kind: "item", slot: 0, team: "radiant", label: "x", image: null });

  it("finds events near a time, treating pre-horn times as 0:00", () => {
    expect(eventsNear([event(-77), event(100)], 0, 30).map((found) => found.time)).toEqual([-77]);
    expect(eventsNear([event(-77), event(100)], 90, 30).map((found) => found.time)).toEqual([100]);
  });

  it("clamps the cursor to the match", () => {
    expect(clampTime(-5, 100)).toBe(0);
    expect(clampTime(150, 100)).toBe(100);
    expect(clampTime(42, 100)).toBe(42);
  });
});

describe("nearestEvents", () => {
  const at = (time: number): MatchEvent => ({ time, kind: "item", slot: 0, team: "radiant", label: String(time), image: null });

  it("keeps the moments closest to the cursor, shown in time order", () => {
    const events = [100, 130, 140, 150, 160, 170, 200].map(at);
    expect(nearestEvents(events, 150, 45, 3).map((event) => event.time)).toEqual([140, 150, 160]);
  });
});

describe("playbackStep", () => {
  it("advances by real time x speed", () => {
    expect(playbackStep(100, 50, 60, 2000)).toBe(103);
  });

  it("caps a long gap (a hidden browser tab) instead of jumping ahead", () => {
    expect(playbackStep(100, 60_000, 60, 2000)).toBe(106);
  });

  it("stops at the end of the match", () => {
    expect(playbackStep(1999, 100, 60, 2000)).toBe(2000);
  });
});
