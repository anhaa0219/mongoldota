/** What the live coach searches its knowledge base for: a short query per moment and the items it is about. Pure. */

import type { LiveEvent, LiveEventKind, LiveSnapshot } from "@/types/live";
import type { ItemName } from "./live-coach-lines";

const EVENT_WORDS: Record<LiveEventKind, string> = {
  death: "died",
  kill: "got a kill",
  assist: "got an assist",
  streak: "is on a kill streak",
  teamfight: "fought a teamfight",
  buyback: "bought back",
  nobuyback: "cannot afford buyback",
  aegis: "picked up the Aegis",
  gold: "can afford",
  item: "bought",
  building: "a building fell",
  lookahead: "what to prepare for in the next minutes",
  asked: "asked for advice",
  plan: "core item build",
};

function eventWords(event: LiveEvent, itemName: ItemName): string {
  const words = EVENT_WORDS[event.kind];
  return (event.kind === "item" || event.kind === "gold") && event.detail ? `${words} ${itemName(event.detail)}` : words;
}

/** e.g. "Viper died, fought a teamfight. Enemies: Pudge, Lina. Items: Dragon Lance, Power Treads." */
export function tipQuery(heroName: string, events: LiveEvent[], enemyNames: string[], items: string[], itemName: ItemName): string {
  return [
    `${heroName} ${events.map((event) => eventWords(event, itemName)).join(", ")}.`,
    enemyNames.length > 0 ? `Enemies: ${enemyNames.join(", ")}.` : "",
    items.length > 0 ? `Items: ${items.map(itemName).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** The items a tip may be about: the inventory plus items the moments name, once each. */
export function tipItemKeys(snapshot: LiveSnapshot, events: LiveEvent[]): string[] {
  const named = events.flatMap((event) => ((event.kind === "item" || event.kind === "gold") && event.detail ? [event.detail] : []));
  const inventory = snapshot.inventory.flatMap((key) => (key ? [key] : []));
  return [...new Set([...named, ...inventory])];
}

export function planQuery(heroName: string, laneOpponents: string[]): string {
  return `${heroName} core item build${laneOpponents.length > 0 ? ` against ${laneOpponents.join(", ")}` : ""}.`;
}
