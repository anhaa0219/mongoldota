/** A replayed match's items: what the player owns at a moment and the gold spent so far, from OpenDota's purchase log. Pure. */

import type { RawItemConstants } from "@/types/live-replay";
import type { RawLogEntry } from "@/types/opendota-match";

export interface ItemFacts {
  cost: number;
  /** Items it is built from; one of each that is owned gets used up. */
  parts: string[];
  /** Used up when bought, or never kept in the inventory (tango, wards, TP, shard). */
  isUsedUp: boolean;
}

const INVENTORY_SLOTS = 6;
/** Used up when bought although OpenDota does not list them as consumables. */
const USED_ON_BUY = new Set(["aghanims_shard", "tome_of_knowledge"]);
/** Parts OpenDota lists one way that can also be another item (Power Treads take any stat item). */
const OTHER_PARTS: Record<string, Record<string, string[]>> = {
  power_treads: { belt_of_strength: ["robe", "band_of_elvenskin"] },
};

export function toItemFacts(raw: RawItemConstants): Map<string, ItemFacts> {
  return new Map(
    Object.entries(raw).map(([key, item]) => [
      key,
      { cost: item.cost ?? 0, parts: item.components ?? [], isUsedUp: item.qual === "consumable" || USED_ON_BUY.has(key) },
    ]),
  );
}

/** By time; within one second, parts before the items built from them (OpenDota sometimes logs the built item first). */
export function sortPurchases(purchases: RawLogEntry[], items: Map<string, ItemFacts>): RawLogEntry[] {
  const partCount = (key: string) => items.get(key)?.parts.length ?? 0;
  return [...purchases].sort((a, b) => a.time - b.time || partCount(a.key) - partCount(b.key));
}

/** Where in `owned` the part is: the listed item, or another item that can stand in for it. -1 when none is owned. */
function partIndex(owned: string[], key: string, part: string): number {
  const candidates = [part, ...(OTHER_PARTS[key]?.[part] ?? [])];
  for (const candidate of candidates) {
    const index = owned.indexOf(candidate);
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * Owned items in the order they were bought, and the gold spent, after every purchase up to `second`. `purchases`
 * must come from sortPurchases. Building an item uses up its owned parts, so only the recipe's share counts as spent.
 */
export function itemsAt(purchases: RawLogEntry[], items: Map<string, ItemFacts>, second: number): { owned: string[]; spent: number } {
  const owned: string[] = [];
  let spent = 0;
  for (const { time, key } of purchases) {
    if (time > second) break;
    const facts = items.get(key);
    if (!facts || key.startsWith("recipe_")) continue;

    let partsCost = 0;
    for (const part of facts.parts) {
      const index = partIndex(owned, key, part);
      if (index === -1) continue;
      partsCost += items.get(owned[index])?.cost ?? 0;
      owned.splice(index, 1);
    }
    spent += Math.max(0, facts.cost - partsCost);
    if (!facts.isUsedUp) owned.push(key);
  }
  return { owned, spent };
}

/** The six inventory slots: the most expensive owned items, in the order they were bought. The rest sit in the backpack. */
export function inventoryOf(owned: string[], items: Map<string, ItemFacts>): (string | null)[] {
  const kept = new Set(
    owned
      .map((key, index) => ({ index, cost: items.get(key)?.cost ?? 0 }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, INVENTORY_SLOTS)
      .map(({ index }) => index),
  );
  const slots = owned.filter((_, index) => kept.has(index));
  return Array.from({ length: INVENTORY_SLOTS }, (_, index) => slots[index] ?? null);
}
