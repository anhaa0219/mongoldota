import { describe, expect, it } from "vitest";
import { fixtureHeroes, fixtureItems, fixtureMatch } from "@/lib/match-test-fixture";
import { toCombat, toLog } from "@/lib/match-view-combat";
import { toScoreboard } from "@/lib/match-view-players";

function combatMatch() {
  const raw = fixtureMatch({
    teamfights: [
      {
        start: 710,
        end: 749,
        deaths: 2,
        players: [{ gold_delta: 100 }, { gold_delta: 50 }, {}, { gold_delta: -30 }, { gold_delta: -20 }, {}],
      },
    ],
    chat: [
      { time: 10, type: "chat", key: "gg", player_slot: 0 },
      { time: -86, type: "chatwheel", key: "2004", player_slot: 130 },
    ],
  });
  raw.players[0].damage_targets = {
    null: { npc_dota_hero_bloodseeker: 100 },
    antimage_mana_void: { npc_dota_hero_bloodseeker: 50, npc_dota_hero_crystal_maiden: 25 },
  };
  raw.players[0].purchase_log = [
    { time: 300, key: "power_treads" },
    { time: 50, key: "recipe_unknown" },
    { time: 1122, key: "black_king_bar" },
  ];
  return raw;
}

const players = (raw = combatMatch()) => toScoreboard(raw, fixtureHeroes, fixtureItems, 42);

describe("toCombat", () => {
  it("sums damage over all abilities per enemy hero", () => {
    const combat = toCombat(combatMatch(), players());
    expect(combat?.damage[0]).toEqual({ 128: 150, 129: 25 });
  });

  it("gives each teamfight's gold swing from Radiant's side", () => {
    expect(toCombat(combatMatch(), players())?.teamfights).toEqual([{ start: 710, end: 749, deaths: 2, radiantGoldSwing: 200 }]);
  });
});

describe("toLog", () => {
  it("lists chat in time order, chat wheel lines as a placeholder", () => {
    expect(toLog(combatMatch(), fixtureItems)?.chat).toEqual([
      { time: -86, slot: 130, text: "(chat wheel)" },
      { time: 10, slot: 0, text: "gg" },
    ]);
  });

  it("lists each player's known purchases in time order, by item key", () => {
    const purchases = toLog(combatMatch(), fixtureItems)?.purchases[0] ?? [];
    expect(purchases).toEqual([
      { time: 300, key: "power_treads" },
      { time: 1122, key: "black_king_bar" },
    ]);
  });

  it("carries each purchased item's details once", () => {
    const log = toLog(combatMatch(), fixtureItems);
    expect(Object.keys(log?.items ?? {}).sort()).toEqual(["black_king_bar", "power_treads"]);
    expect(log?.items.black_king_bar?.name).toBe("black_king_bar");
  });
});

describe("unparsed match", () => {
  it("has no combat or log", () => {
    const raw = combatMatch();
    delete raw.version;
    expect(toCombat(raw, players(raw))).toBeNull();
    expect(toLog(raw, fixtureItems)).toBeNull();
  });
});
