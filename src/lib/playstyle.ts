/** Per-match playstyle averages from /players/{id}/totals. Pure. */

import type { PlaystyleStat, RawTotal } from "@/types/opendota";

/** Shown in this order; other fields are ignored. */
const FIELDS: { field: string; label: string }[] = [
  { field: "denies", label: "Denies" },
  { field: "hero_damage", label: "Hero damage" },
  { field: "tower_damage", label: "Tower damage" },
  { field: "hero_healing", label: "Healing" },
  { field: "stuns", label: "Stun seconds" },
  { field: "actions_per_min", label: "APM" },
  { field: "purchase_ward_observer", label: "Observers bought" },
  { field: "purchase_ward_sentry", label: "Sentries bought" },
];

/** Fields missing or with no matches (e.g. only in parsed matches) are left out. */
export function toPlaystyle(totals: RawTotal[]): PlaystyleStat[] {
  return FIELDS.flatMap(({ field, label }) => {
    const total = totals.find((entry) => entry.field === field);
    if (!total || total.n === 0) return [];
    return [{ label, average: total.sum / total.n, matches: total.n }];
  });
}
