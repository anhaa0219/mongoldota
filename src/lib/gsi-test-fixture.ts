/** Test-only fixture: a GSI payload from the player's own game (Viper, 10:00). Imported by *.test.ts files only. */

export const FIXTURE_STEAM_ID = "76561198000000001";

const empty = { name: "empty" };

export function gsiFixture() {
  return {
    provider: { name: "Dota 2", appid: 570, version: 47, timestamp: 1_800_000_000 },
    map: {
      name: "start",
      matchid: "7400000001",
      game_time: 690,
      clock_time: 600,
      daytime: true,
      game_state: "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS",
      paused: false,
    },
    player: {
      steamid: FIXTURE_STEAM_ID,
      name: "Tester",
      team_name: "radiant",
      activity: "playing",
      kills: 7,
      deaths: 3,
      assists: 5,
      last_hits: 80,
      denies: 10,
      gold: 1840,
      gpm: 512,
      xpm: 600,
    },
    hero: { id: 47, name: "npc_dota_hero_viper", level: 16, alive: true, respawn_seconds: 0 },
    items: {
      slot0: { name: "item_dragon_lance" },
      slot1: empty,
      slot2: { name: "item_power_treads" },
      slot3: empty,
      slot4: empty,
      slot5: empty,
      slot6: empty,
      slot7: empty,
      slot8: empty,
      stash0: { name: "item_ultimate_orb" },
      stash1: empty,
      neutral0: empty,
    },
    buildings: {
      radiant: {
        dota_goodguys_tower1_top: { health: 1800, max_health: 1800 },
        dota_goodguys_tower1_mid: { health: 450, max_health: 1800 },
        good_rax_melee_top: { health: 2200, max_health: 2200 },
        dota_goodguys_fort: { health: 4500, max_health: 4500 },
      },
    },
    auth: { token: "t0k" },
  };
}
