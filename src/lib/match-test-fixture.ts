/** Test-only fixture: a small parsed match. Imported by *.test.ts files only. */

import type { HeroInfo, ItemIndex, ItemInfo } from "@/types/opendota";
import type { RawFullMatch, RawFullPlayer } from "@/types/opendota-match";

export const fixtureHeroes = new Map<number, HeroInfo>([
  [1, { id: 1, name: "Anti-Mage", slug: "antimage" }],
  [2, { id: 2, name: "Axe", slug: "axe" }],
  [3, { id: 3, name: "Bane", slug: "bane" }],
  [4, { id: 4, name: "Bloodseeker", slug: "bloodseeker" }],
  [5, { id: 5, name: "Crystal Maiden", slug: "crystal_maiden" }],
  [6, { id: 6, name: "Drow Ranger", slug: "drow_ranger" }],
]);

function item(id: number, key: string, cost: number): ItemInfo {
  return { id, key, name: key, image: `https://cdn.example/${key}.png`, cost };
}

const itemList = [item(116, "black_king_bar", 4050), item(1, "blink", 2250), item(63, "power_treads", 1400)];
export const fixtureItems: ItemIndex = {
  byId: new Map(itemList.map((entry) => [entry.id, entry])),
  byKey: new Map(itemList.map((entry) => [entry.key, entry])),
};

export function fixturePlayer(overrides: Partial<RawFullPlayer>): RawFullPlayer {
  return { account_id: null, player_slot: 0, hero_id: 1, kills: 0, assists: 0, ...overrides };
}

/** Radiant: 0 linked mid (AM), 1 safe (Axe), 2 jungle (Bane). Dire: 128 mid (BS), 129 off (CM), 130 off (Drow). */
export function fixtureMatch(overrides: Partial<RawFullMatch> = {}): RawFullMatch {
  return {
    match_id: 9086993848,
    start_time: 1794497398,
    duration: 2464,
    radiant_win: true,
    lobby_type: 7,
    version: 22,
    radiant_score: 30,
    dire_score: 20,
    players: [
      fixturePlayer({ account_id: 42, player_slot: 0, hero_id: 1, personaname: "Me", lane_role: 2, position_est: 2, item_0: 116, item_1: 0, net_worth: 20000 }),
      fixturePlayer({ player_slot: 1, hero_id: 2, lane_role: 1 }),
      fixturePlayer({ account_id: 8, player_slot: 2, hero_id: 3, personaname: "Jungler", lane_role: 4 }),
      fixturePlayer({ account_id: 7, player_slot: 128, hero_id: 4, personaname: "Mid", lane_role: 2 }),
      fixturePlayer({ account_id: 9, player_slot: 129, hero_id: 5, personaname: "Off A", lane_role: 3 }),
      fixturePlayer({ account_id: 10, player_slot: 130, hero_id: 6, personaname: "Off B", lane_role: 3 }),
    ],
    ...overrides,
  };
}
