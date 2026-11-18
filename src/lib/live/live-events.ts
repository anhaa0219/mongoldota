/** Coach moments from two consecutive live snapshots: deaths, kills, assists, streaks, buyback, the Aegis, fallen buildings, item buys, gold for the next planned item, and kills by either team. Pure. */

import { fallenBuildings } from "@/lib/live/gsi-buildings";
import type { LiveEvent, LiveSnapshot, Moment, TeamKill } from "@/types/live";

/** Cheaper items (consumables, small components) never trigger a tip. */
export const MIN_ITEM_COST = 1000;

/** A kill streak is announced when it reaches one of these. */
export const STREAK_MARKS = [3, 5, 8];
/** "No gold for buyback" only matters late: from 30:00 on the game clock. */
export const NO_BUYBACK_FROM_SECONDS = 1800;
/** Snapshots further apart than this in game time (a dropped connection) are not one fight: no team kills, no teamfight. */
export const MAX_SNAPSHOT_GAP_SECONDS = 30;
const AEGIS = "aegis";

/** How many of each item key. */
export function countItems(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

/**
 * The most of each item the player has had at once this match. An item that leaves `owned` (on the courier,
 * dropped) and comes back is not a new purchase, so purchases are counted only above this mark.
 */
export function raiseSeen(seen: Map<string, number>, owned: string[]): Map<string, number> {
  const next = new Map(seen);
  for (const [key, count] of countItems(owned)) next.set(key, Math.max(count, next.get(key) ?? 0));
  return next;
}

/** The first planned item the player does not own yet. */
export function nextPlannedItem(plan: string[], owned: string[]): string | null {
  return plan.find((key) => !owned.includes(key)) ?? null;
}

/** The streak just reached a mark; null while either snapshot lacks the streak. */
function streakReached(prev: LiveSnapshot, next: LiveSnapshot): number | null {
  const before = prev.killStreak;
  const now = next.killStreak;
  if (before === undefined || now === undefined) return null;
  return STREAK_MARKS.some((mark) => before < mark && mark <= now) ? now : null;
}

/** Buyback used, or (late in the game) gold dropping below its cost while it is off cooldown. Needs the fields in both snapshots. */
function buybackEvents(prev: LiveSnapshot, next: LiveSnapshot): LiveEvent[] {
  if (prev.buybackCooldown === undefined || next.buybackCooldown === undefined) return [];
  if (prev.buybackCooldown === 0 && next.buybackCooldown > 0) return [{ kind: "buyback", detail: "" }];
  if (prev.buybackCost === undefined || next.buybackCost === undefined) return [];
  const lostGold = next.buybackCooldown === 0 && prev.gold >= prev.buybackCost && next.gold < next.buybackCost;
  return lostGold && next.clockSeconds >= NO_BUYBACK_FROM_SECONDS ? [{ kind: "nobuyback", detail: "" }] : [];
}

/** One moment per hero kill either team scored, when the player's team is known. */
function teamKills(prev: LiveSnapshot, next: LiveSnapshot): TeamKill[] {
  if (!prev.score || !next.score || !next.team) return [];
  const enemy = next.team === "radiant" ? "dire" : "radiant";
  const ours = Math.max(0, next.score[next.team] - prev.score[next.team]);
  const theirs = Math.max(0, next.score[enemy] - prev.score[enemy]);
  return [...Array<TeamKill>(ours).fill({ kind: "teamkill", detail: "ours" }), ...Array<TeamKill>(theirs).fill({ kind: "teamkill", detail: "theirs" })];
}

/** `seen`: the most of each item had at once before `next` (see raiseSeen). */
export function detectEvents(prev: LiveSnapshot | null, next: LiveSnapshot, plan: string[] | null, costs: Map<string, number>, seen: Map<string, number>): Moment[] {
  if (!prev || prev.matchId !== next.matchId) return [];

  const events: Moment[] = [];
  if (next.deaths > prev.deaths) events.push({ kind: "death", detail: "" });
  if (next.kills > prev.kills) events.push({ kind: "kill", detail: String(next.kills - prev.kills) });
  if (next.assists > prev.assists) events.push({ kind: "assist", detail: String(next.assists - prev.assists) });
  const streak = streakReached(prev, next);
  if (streak !== null) events.push({ kind: "streak", detail: String(streak) });
  events.push(...buybackEvents(prev, next));
  if (next.owned.includes(AEGIS) && !prev.owned.includes(AEGIS)) events.push({ kind: "aegis", detail: "" });
  for (const key of fallenBuildings(prev, next)) events.push({ kind: "building", detail: key });

  for (const [key, count] of countItems(next.owned)) {
    if ((costs.get(key) ?? 0) < MIN_ITEM_COST) continue;
    for (let copy = seen.get(key) ?? 0; copy < count; copy += 1) events.push({ kind: "item", detail: key });
  }

  const target = plan ? nextPlannedItem(plan, next.owned) : null;
  const cost = target ? costs.get(target) : undefined;
  if (target && cost !== undefined && prev.gold < cost && next.gold >= cost) events.push({ kind: "gold", detail: target });

  // After a long gap the changes still count, but they did not happen together.
  const jumped = next.clockSeconds - prev.clockSeconds > MAX_SNAPSHOT_GAP_SECONDS;
  if (jumped) return events.length > 0 ? [...events, { kind: "gap", detail: "" }] : [];
  return [...events, ...teamKills(prev, next)];
}
