/**
 * The match page's tabs. Kept out of MatchExplorer ("use client"): a Server Component that imports
 * a plain value from a client file gets a client reference, not the array.
 */

export const MATCH_TABS = [
  { id: "story", label: "Story" },
  { id: "laning", label: "Laning" },
  { id: "graphs", label: "Graphs" },
  { id: "combat", label: "Combat" },
  { id: "map", label: "Map" },
  { id: "log", label: "Items & Log" },
] as const;
export type MatchTab = (typeof MATCH_TABS)[number]["id"];

/** The `?tab=` search param as a known tab; anything else opens Story. */
export function toMatchTab(value: string | string[] | undefined): MatchTab {
  return MATCH_TABS.find((option) => option.id === value)?.id ?? "story";
}
