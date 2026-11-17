/** Coach events from two consecutive live snapshots: deaths, kills, fallen buildings, item buys and gold for the next planned item. Pure. */

import { fallenBuildings } from "@/lib/gsi-buildings";
import type { LiveEvent, LiveSnapshot } from "@/types/live";

/** Cheaper items (consumables, small components) never trigger a tip. */
export const MIN_ITEM_COST = 1000;

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

/** `seen`: the most of each item had at once before `next` (see raiseSeen). */
export function detectEvents(prev: LiveSnapshot | null, next: LiveSnapshot, plan: string[] | null, costs: Map<string, number>, seen: Map<string, number>): LiveEvent[] {
  if (!prev || prev.matchId !== next.matchId) return [];

  const events: LiveEvent[] = [];
  if (next.deaths > prev.deaths) events.push({ kind: "death", detail: "" });
  if (next.kills > prev.kills) events.push({ kind: "kill", detail: String(next.kills - prev.kills) });
  for (const key of fallenBuildings(prev, next)) events.push({ kind: "building", detail: key });

  for (const [key, count] of countItems(next.owned)) {
    if ((costs.get(key) ?? 0) < MIN_ITEM_COST) continue;
    for (let copy = seen.get(key) ?? 0; copy < count; copy += 1) events.push({ kind: "item", detail: key });
  }

  const target = plan ? nextPlannedItem(plan, next.owned) : null;
  const cost = target ? costs.get(target) : undefined;
  if (target && cost !== undefined && prev.gold < cost && next.gold >= cost) events.push({ kind: "gold", detail: target });

  return events;
}
