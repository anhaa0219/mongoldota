/** The text of one match memory: how a finished match went, in at most 800 characters. Pure. */

import { formatDuration } from "@/lib/format";
import type { Position } from "@/types/draft";
import type { LiveSnapshot, LiveTip } from "@/types/live";
import { clip } from "./rag-text";

const MAX_MEMORY = 800;
const MAX_TIP = 140;

export interface MemoryInput {
  snapshot: LiveSnapshot;
  heroName: string;
  /** Null when Dota did not say who won or which team the player was on. */
  won: boolean | null;
  enemyNames: string[];
  position: Position | null;
  /** This match's coach tips, newest first. */
  tips: LiveTip[];
  itemName: (key: string) => string;
  endedAt: Date;
}

function momentCounts(tips: LiveTip[]): string {
  const counts = new Map<string, number>();
  for (const tip of tips) if (tip.kind !== "plan") counts.set(tip.kind, (counts.get(tip.kind) ?? 0) + 1);
  return [...counts].map(([kind, count]) => `${kind} ${count}`).join(", ");
}

export function memoryText({ snapshot, heroName, won, enemyNames, position, tips, itemName, endedAt }: MemoryInput): string {
  const result = won === null ? "result unknown" : won ? "won" : "lost";
  const items = snapshot.inventory.flatMap((key) => (key ? itemName(key) : [])).join(", ") || "none";
  const moments = momentCounts(tips);
  const summary = [
    `Past match on ${endedAt.toISOString().slice(0, 10)}: ${heroName}${position ? ` (pos ${position})` : ""} vs ${enemyNames.join(", ") || "unknown enemies"}, ${result}.`,
    `Final K/D/A ${snapshot.kills}/${snapshot.deaths}/${snapshot.assists} at ${formatDuration(snapshot.clockSeconds)}, level ${snapshot.level}, GPM ${snapshot.gpm}, XPM ${snapshot.xpm}.`,
    `Items: ${items}.`,
    moments ? `Coach moments: ${moments}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Oldest tips first, as many as still fit.
  let text = summary;
  for (const tip of [...tips].reverse()) {
    if (tip.kind === "plan") continue;
    const next = `${text}${text === summary ? " Coach tips:" : ""} "${clip(tip.text, MAX_TIP)}"`;
    if (next.length > MAX_MEMORY) break;
    text = next;
  }
  return clip(text, MAX_MEMORY);
}
