/** Item plan candidates: what this hero's players buy most, with how often and when, from OpenDota's item popularity. Pure. */

import { MIN_ITEM_COST } from "@/lib/live/live-events";
import type { ItemPopularity } from "@/lib/opendota/opendota-draft";
import type { ItemIndex, ItemInfo } from "@/types/opendota";
import type { PlanCandidate } from "./live-plan-prompt";

/** Boot upgrades every hero buys anyway; the plan is about the items after them. */
const BOOTS = new Set(["power_treads", "phase_boots", "arcane_boots", "tranquil_boots", "travel_boots", "travel_boots_2"]);
/** Complete items bought straight from the shop; every other item without parts is only a part of one. */
const SHOP_ITEMS = new Set(["blink", "aghanims_shard", "ghost"]);
/** Enough choice for every slot, few enough that the rare picks stay out. */
const MAX_CANDIDATES = 25;
/** Late-game items outside the most bought: situational counters (Monkey King Bar, Nullifier) are bought rarely overall. */
const MAX_LATE_EXTRAS = 10;
const PHASES = [
  ["early", "early_game_items"],
  ["mid", "mid_game_items"],
  ["late", "late_game_items"],
] as const;

type Counted = Omit<PlanCandidate, "partOf"> & { most: number; lateBought: number };

const fits = (item: ItemInfo) => item.cost >= MIN_ITEM_COST && !BOOTS.has(item.key) && (item.parts.length > 0 || SHOP_ITEMS.has(item.key));

/** Times each fitting item was bought over the three phases, and the phase it was bought in most. */
function countBuys(popularity: ItemPopularity | null, items: ItemIndex): Counted[] {
  const byKey = new Map<string, Counted>();
  for (const [phase, field] of PHASES) {
    for (const [id, count] of Object.entries(popularity?.[field] ?? {})) {
      const item = items.byId.get(Number(id));
      if (!item || !fits(item)) continue;
      const seen = byKey.get(item.key) ?? { key: item.key, name: item.name, bought: 0, phase, most: 0, lateBought: 0 };
      const lateBought = seen.lateBought + (phase === "late" ? count : 0);
      byKey.set(item.key, { ...seen, bought: (seen.bought ?? 0) + count, lateBought, ...(count > seen.most ? { phase, most: count } : {}) });
    }
  }
  return [...byKey.values()];
}

/** The most bought, then the most bought late in the game among the rest. */
function mostBought(counted: Counted[]): Counted[] {
  const top = [...counted].sort((a, b) => (b.bought ?? 0) - (a.bought ?? 0)).slice(0, MAX_CANDIDATES);
  const late = counted
    .filter((item) => item.lateBought > 0 && !top.includes(item))
    .sort((a, b) => b.lateBought - a.lateBought)
    .slice(0, MAX_LATE_EXTRAS);
  return [...top, ...late];
}

/**
 * The items this hero's players buy most (finished items of 1,000+ gold; no boots, no recipe parts), most bought
 * first, then the late-game items bought most among the rest; each with the phase it is bought in most and the other
 * candidates it builds into (Yasha → Manta Style). When OpenDota has nothing for the hero, every such item without counts.
 */
export function rankPlanCandidates(popularity: ItemPopularity | null, items: ItemIndex): PlanCandidate[] {
  const counted = countBuys(popularity, items);
  const chosen: Omit<PlanCandidate, "partOf">[] =
    counted.length > 0
      ? mostBought(counted).map(({ key, name, bought, phase }) => ({ key, name, bought, phase }))
      : [...items.byKey.values()].filter(fits).map(({ key, name }) => ({ key, name, bought: null, phase: null }));
  const keys = new Set(chosen.map((item) => item.key));
  const partOf = (key: string) => [...keys].filter((other) => items.byKey.get(other)?.parts.includes(key));
  return chosen.map((item) => ({ ...item, partOf: partOf(item.key) }));
}
