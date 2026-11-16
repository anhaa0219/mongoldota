/** Draft board rules: which slot a click fills, clearing, applying a recognised screenshot. Pure. */

import type { DraftSlots, SlotRef } from "@/types/draft";
import type { Side } from "@/types/game";

export const TEAM_SIZE = 5;
const SIDES: readonly Side[] = ["radiant", "dire"];

export function emptyDraft(): DraftSlots {
  return { radiant: Array(TEAM_SIZE).fill(null), dire: Array(TEAM_SIZE).fill(null) };
}

export function isPicked(draft: DraftSlots, heroId: number): boolean {
  return SIDES.some((side) => draft[side].includes(heroId));
}

export function countPicked(draft: DraftSlots): number {
  return SIDES.reduce((total, side) => total + draft[side].filter((heroId) => heroId !== null).length, 0);
}

/** First empty slot, Radiant left to right, then Dire. Null when the draft is full. */
export function firstEmpty(draft: DraftSlots): SlotRef | null {
  for (const side of SIDES) {
    const index = draft[side].indexOf(null);
    if (index !== -1) return { side, index };
  }
  return null;
}

/** First empty slot on one team, or null when that team is full. */
export function firstEmptyOn(draft: DraftSlots, side: Side): SlotRef | null {
  const index = draft[side].indexOf(null);
  return index === -1 ? null : { side, index };
}

function withSlot(draft: DraftSlots, { side, index }: SlotRef, heroId: number | null): DraftSlots {
  return { ...draft, [side]: draft[side].map((current, slot) => (slot === index ? heroId : current)) };
}

/**
 * Puts the hero in `target` (or the first empty slot) and returns the slot to fill next.
 * A hero already in the draft is not added twice.
 */
export function pickHero(draft: DraftSlots, heroId: number, target: SlotRef | null): { draft: DraftSlots; next: SlotRef | null } {
  const slot = target ?? firstEmpty(draft);
  if (!slot || isPicked(draft, heroId)) return { draft, next: target };
  const updated = withSlot(draft, slot, heroId);
  return { draft: updated, next: firstEmpty(updated) };
}

export function clearSlot(draft: DraftSlots, slot: SlotRef): DraftSlots {
  return withSlot(draft, slot, null);
}
