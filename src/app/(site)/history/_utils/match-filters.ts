/** History filters: hero, result and queue over the matches already on the page. Pure. */

import type { MatchRowData } from "./match-row-types";

export type ResultFilter = "all" | "wins" | "losses";
export type QueueFilter = "all" | "ranked" | "unranked";

export interface MatchFilters {
  /** Rows carry no hero id, so heroes are matched by name ("Unknown hero" included). Null = every hero. */
  heroName: string | null;
  result: ResultFilter;
  queue: QueueFilter;
}

export interface HeroOption {
  name: string;
  games: number;
}

export const NO_FILTERS: MatchFilters = { heroName: null, result: "all", queue: "all" };

/** The rows that match every filter, in their original order. */
export function filterMatches(rows: MatchRowData[], filters: MatchFilters): MatchRowData[] {
  return rows.filter((row) => {
    if (filters.heroName !== null && row.heroName !== filters.heroName) return false;
    if (filters.result !== "all" && row.won !== (filters.result === "wins")) return false;
    return filters.queue === "all" || row.ranked === (filters.queue === "ranked");
  });
}

/** Every hero in these rows with its number of games: most games first, ties by name A to Z. */
export function heroOptions(rows: MatchRowData[]): HeroOption[] {
  const games = new Map<string, number>();
  for (const row of rows) games.set(row.heroName, (games.get(row.heroName) ?? 0) + 1);
  return [...games]
    .map(([name, count]) => ({ name, games: count }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
}

/** Whole-percent win rate; null for no rows (never NaN). */
export function winRate(rows: MatchRowData[]): number | null {
  if (rows.length === 0) return null;
  return Math.round((rows.filter((row) => row.won).length / rows.length) * 100);
}

export function hasFilters(filters: MatchFilters): boolean {
  return filters.heroName !== null || filters.result !== "all" || filters.queue !== "all";
}
