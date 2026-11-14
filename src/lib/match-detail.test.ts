import { describe, expect, it } from "vitest";
import { goldChartPath, goldLinePath, toMatchDetail } from "@/lib/match-detail";
import type { HeroInfo, ItemInfo, RawDetailPlayer, RawMatchDetail } from "@/types/opendota";

function item(id: number, key: string, cost: number): ItemInfo {
  return { id, key, name: key, image: `/items/${key}.png`, cost };
}

const items = new Map([
  ["black_king_bar", item(116, "black_king_bar", 4050)],
  ["power_treads", item(63, "power_treads", 1400)],
  ["blink", item(1, "blink", 2250)],
]);
const heroes = new Map<number, HeroInfo>([
  [1, { id: 1, name: "Anti-Mage", slug: "antimage" }],
  [2, { id: 2, name: "Axe", slug: "axe" }],
]);

const me: RawDetailPlayer = {
  account_id: 42,
  player_slot: 1,
  hero_id: 1,
  kills: 5,
  assists: 10,
  gold_t: [0, 300, 700],
  purchase_log: [
    { time: 600, key: "blink" },
    { time: 300, key: "power_treads" },
    { time: 1122, key: "black_king_bar" },
    { time: 1500, key: "blink" },
    { time: 50, key: "recipe_x" },
  ],
  obs_placed: 2,
  sen_placed: null,
};
const enemy: RawDetailPlayer = {
  account_id: 7,
  player_slot: 129,
  hero_id: 2,
  kills: 9,
  assists: 3,
  kills_log: [
    { time: 725, key: "npc_dota_hero_antimage" },
    { time: 100, key: "npc_dota_hero_axe" },
    { time: 200, key: "npc_dota_hero_antimage" },
  ],
};
const teammate: RawDetailPlayer = {
  account_id: 8,
  player_slot: 2,
  hero_id: 2,
  kills: 1,
  assists: 1,
  kills_log: [{ time: 900, key: "npc_dota_hero_antimage" }],
};

function matchDetail(overrides: Partial<RawMatchDetail> = {}): RawMatchDetail {
  return { version: 22, radiant_score: 30, dire_score: 20, players: [me, enemy, teammate], ...overrides };
}

function parsedDetail(raw: RawMatchDetail, accountId = 42) {
  const detail = toMatchDetail(raw, accountId, items, heroes);
  if (!detail?.parsed) throw new Error("expected a parsed detail");
  return detail;
}

describe("toMatchDetail", () => {
  it("returns null when the player is not in the match", () => {
    expect(toMatchDetail(matchDetail(), 99, items, heroes)).toBeNull();
  });

  it("reports unparsed matches", () => {
    expect(toMatchDetail(matchDetail({ version: null }), 42, items, heroes)).toEqual({ parsed: false });
  });

  it("lists first purchases of big items in order and skips unknown items", () => {
    const { itemTimings } = parsedDetail(matchDetail());
    expect(itemTimings.map((timing) => timing.key)).toEqual(["blink", "black_king_bar"]);
    expect(itemTimings.map((timing) => timing.seconds)).toEqual([600, 1122]);
    expect(itemTimings.map((timing) => timing.isBkb)).toEqual([false, true]);
  });

  it("computes kill participation from the player's team score", () => {
    expect(parsedDetail(matchDetail()).killParticipation).toBe(50);
    expect(parsedDetail(matchDetail({ radiant_score: 0 })).killParticipation).toBeNull();
    // Enemy is dire: (9 + 3) / 20 = 60%
    expect(parsedDetail(matchDetail(), 7).killParticipation).toBe(60);
  });

  it("lists minutes the player was killed by enemy heroes", () => {
    expect(parsedDetail(matchDetail()).deathMinutes).toEqual([3, 12]);
  });

  it("counts wards, treating missing values as 0", () => {
    const detail = parsedDetail(matchDetail());
    expect(detail.observers).toBe(2);
    expect(detail.sentries).toBe(0);
  });

  it("passes the gold curve through", () => {
    expect(parsedDetail(matchDetail()).goldEarned).toEqual([0, 300, 700]);
  });
});

describe("goldChartPath", () => {
  it("is empty without at least two points or any gold", () => {
    expect(goldChartPath([], 100, 50)).toBe("");
    expect(goldChartPath([500], 100, 50)).toBe("");
    expect(goldChartPath([0, 0], 100, 50)).toBe("");
  });

  it("draws a closed area scaled to the box", () => {
    const path = goldChartPath([0, 100], 100, 50);
    expect(path.startsWith("M0,50")).toBe(true);
    expect(path).toContain("L100,0");
    expect(path.endsWith("Z")).toBe(true);
    expect(path).not.toContain("NaN");
  });
});

describe("goldLinePath", () => {
  it("is empty when there is nothing to draw", () => {
    expect(goldLinePath([], 100, 50)).toBe("");
    expect(goldLinePath([0, 0], 100, 50)).toBe("");
  });

  it("draws the open top edge of the area", () => {
    expect(goldLinePath([0, 50, 100], 100, 50)).toBe("M0,50 L50,25 L100,0");
  });
});
