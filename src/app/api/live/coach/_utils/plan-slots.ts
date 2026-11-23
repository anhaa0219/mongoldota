/** The item plan's shape: core items first, then optional late-game picks. Stored as one list of item keys. Pure. */

/** Bought in this order, one job each. */
export const CORE_ITEMS = 4;
/** Items 5 and 6: situational late-game picks (winning, losing, countering the enemy). */
export const LATE_ITEMS = 2;

/** The stored plan split back into its core and its optional late-game items. */
export function splitPlan(plan: string[]): { core: string[]; late: string[] } {
  return { core: plan.slice(0, CORE_ITEMS), late: plan.slice(CORE_ITEMS, CORE_ITEMS + LATE_ITEMS) };
}
