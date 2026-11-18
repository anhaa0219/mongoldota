/** Dota 2 Game State Integration payloads: validation, mapping to a LiveSnapshot, and write throttling. Pure. */

import { z } from "zod";
import { parseBuildings } from "@/lib/live/gsi-buildings";
import type { LiveSnapshot } from "@/types/live";

const HERO_PREFIX = "npc_dota_hero_";
const ITEM_PREFIX = "item_";
/** Only these states have a hero on the map; hero selection, strategy time and post-game do not count. */
const IN_GAME_STATES = new Set(["DOTA_GAMERULES_STATE_PRE_GAME", "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS"]);
const INVENTORY_SLOTS = 6;
const OWNED_SLOTS = [
  ...Array.from({ length: 9 }, (_, index) => `slot${index}`),
  ...Array.from({ length: 6 }, (_, index) => `stash${index}`),
  "neutral0",
];

const WRITE_GAP_MS = 1000;
const TOUCH_GAP_MS = 20_000;

const num = z.number().optional();
const gsiSchema = z.object({
  auth: z.object({ token: z.string().min(1) }).passthrough(),
  map: z
    .object({ matchid: z.string().optional(), clock_time: num, game_state: z.string().optional(), radiant_score: num, dire_score: num })
    .passthrough()
    .optional(),
  player: z
    .object({
      steamid: z.string().optional(),
      team_name: z.string().optional(),
      kills: num,
      deaths: num,
      assists: num,
      last_hits: num,
      denies: num,
      gold: num,
      gpm: num,
      xpm: num,
      kill_streak: num,
    })
    .passthrough()
    .optional(),
  hero: z
    .object({ id: num, name: z.string().optional(), level: num, alive: z.boolean().optional(), respawn_seconds: num, buyback_cost: num, buyback_cooldown: num })
    .passthrough()
    .optional(),
  items: z.record(z.string(), z.unknown()).optional(),
  buildings: z.record(z.string(), z.unknown()).optional(),
});

export type GsiPayload = z.infer<typeof gsiSchema>;

export function parseGsiPayload(body: unknown): GsiPayload | null {
  const parsed = gsiSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

const itemSchema = z.object({ name: z.string() });

function itemKey(items: Record<string, unknown> | undefined, slot: string): string | null {
  const parsed = itemSchema.safeParse(items?.[slot]);
  if (!parsed.success || !parsed.data.name.startsWith(ITEM_PREFIX)) return null;
  return parsed.data.name.slice(ITEM_PREFIX.length);
}

/** The player's own game, or null in menus, hero selection, post-game, or another player's game (spectating). */
export function toLiveSnapshot(payload: GsiPayload, steamId: string): LiveSnapshot | null {
  const { map, player, hero, items } = payload;
  if (!map?.matchid || !map.game_state || !IN_GAME_STATES.has(map.game_state)) return null;
  if (!player?.steamid || player.steamid !== steamId) return null;
  if (!hero?.id || hero.id <= 0 || !hero.name) return null;
  const { buildings, teams } = parseBuildings(payload.buildings);

  return {
    matchId: map.matchid,
    clockSeconds: map.clock_time ?? 0,
    heroId: hero.id,
    heroKey: hero.name.replace(HERO_PREFIX, ""),
    level: hero.level ?? 1,
    alive: hero.alive ?? true,
    respawnSeconds: hero.respawn_seconds ?? 0,
    kills: player.kills ?? 0,
    deaths: player.deaths ?? 0,
    assists: player.assists ?? 0,
    lastHits: player.last_hits ?? 0,
    denies: player.denies ?? 0,
    gold: player.gold ?? 0,
    gpm: player.gpm ?? 0,
    xpm: player.xpm ?? 0,
    inventory: Array.from({ length: INVENTORY_SLOTS }, (_, index) => itemKey(items, `slot${index}`)),
    owned: OWNED_SLOTS.flatMap((slot) => itemKey(items, slot) ?? []),
    team: player.team_name === "radiant" || player.team_name === "dire" ? player.team_name : null,
    buildings,
    buildingTeams: teams,
    killStreak: player.kill_streak,
    buybackCost: hero.buyback_cost,
    buybackCooldown: hero.buyback_cooldown,
    score: map.radiant_score !== undefined && map.dire_score !== undefined ? { radiant: map.radiant_score, dire: map.dire_score } : undefined,
  };
}

/** At most one write per second; an unchanged state only refreshes its timestamp every 20 seconds. */
export function shouldWrite(lastUpdatedAt: number | null, nowMs: number, changed: boolean): "write" | "touch" | "skip" {
  if (lastUpdatedAt === null) return "write";
  const elapsed = nowMs - lastUpdatedAt;
  if (changed) return elapsed >= WRITE_GAP_MS ? "write" : "skip";
  return elapsed >= TOUCH_GAP_MS ? "touch" : "skip";
}
