/** The lines of a live coach prompt that describe the game right now and what just happened. Pure. */

import type { MapLane } from "@/lib/draft-lanes";
import { formatDuration } from "@/lib/format";
import { buildingLabel, describeBuildings, parseBuildingKey, teamName } from "@/lib/gsi-buildings";
import { parseTeamfightDetail } from "@/lib/live-moments";
import type { Side } from "@/types/game";
import type { LiveEvent, LiveSnapshot } from "@/types/live";

export type ItemName = (key: string) => string;

const gold = (value: number) => value.toLocaleString("en-US");
const plural = (count: number | string, word: string) => `${count} ${word}${String(count) === "1" ? "" : "s"}`;

/** Whether the player can buy back right now; null when Dota does not send the buyback cost. */
export function buybackLine(snapshot: LiveSnapshot): string | null {
  const { buybackCost, buybackCooldown } = snapshot;
  if (buybackCost === undefined) return null;
  if (buybackCooldown !== undefined && buybackCooldown > 0) return `Buyback on cooldown ${formatDuration(Math.round(buybackCooldown))}.`;
  if (snapshot.gold >= buybackCost) return `Buyback ready, costs ${gold(buybackCost)}.`;
  return `Buyback: cannot afford (costs ${gold(buybackCost)}, has ${gold(snapshot.gold)}).`;
}

export function gameLine(snapshot: LiveSnapshot, heroName: string, itemName: ItemName): string {
  const items = snapshot.inventory.flatMap((key) => (key ? itemName(key) : [])).join(", ") || "none";
  const buyback = buybackLine(snapshot);
  return [
    `Game time ${formatDuration(snapshot.clockSeconds)}. The player is ${heroName}, level ${snapshot.level}${snapshot.alive ? "" : `, dead (respawn in ${snapshot.respawnSeconds}s)`}.`,
    `K ${snapshot.kills} / D ${snapshot.deaths} / A ${snapshot.assists}. Last hits ${snapshot.lastHits}. Gold ${snapshot.gold}, GPM ${snapshot.gpm}, XPM ${snapshot.xpm}.`,
    `Items: ${items}.`,
    ...(buyback ? [buyback] : []),
    ...describeBuildings(snapshot),
  ].join("\n");
}

function buildingLine(detail: string, playerTeam: Side | null, lane: MapLane | null): string {
  const building = parseBuildingKey(detail);
  if (!building) return "- A building just fell.";
  const inLane = lane !== null && building.lane === lane ? ", in their lane" : "";
  return `- ${teamName(building.team, playerTeam)} just lost the ${buildingLabel(building)}${inLane}.`;
}

function teamfightLine(detail: string): string {
  const fight = parseTeamfightDetail(detail);
  if (!fight) return "- A teamfight just ended.";
  const scores = fight.ours === null || fight.theirs === null ? "." : `: their team got ${plural(fight.ours, "kill")}, the enemy got ${fight.theirs}.`;
  return `- A teamfight just ended${scores} They got ${plural(fight.kills, "kill")} and ${plural(fight.assists, "assist")} and ${fight.died ? "died" : "survived"}.`;
}

/** `lane`: the player's own map lane, so a building that falls there is pointed out. */
export function eventLine(event: LiveEvent, itemName: ItemName, playerTeam: Side | null, lane: MapLane | null): string {
  switch (event.kind) {
    case "death":
      return "- They just died.";
    case "kill":
      return `- They just got ${plural(event.detail, "kill")}.`;
    case "assist":
      return `- They just got ${plural(event.detail, "assist")}.`;
    case "streak":
      return `- They are on a ${event.detail}-kill streak.`;
    case "teamfight":
      return teamfightLine(event.detail);
    case "buyback":
      return "- They just bought back.";
    case "nobuyback":
      return "- They no longer have gold for buyback.";
    case "aegis":
      return "- They just picked up the Aegis; it expires 5 minutes after pickup.";
    case "building":
      return buildingLine(event.detail, playerTeam, lane);
    case "item":
      return `- They just bought ${itemName(event.detail)}.`;
    case "gold":
      return `- They now have enough gold for ${itemName(event.detail)}.`;
    case "lookahead":
      return "- Quiet moment: tell them what to expect and prepare for in the next 3-5 minutes.";
    case "asked":
      return "- They asked for advice right now.";
    case "plan":
      return "- The match just started.";
    default: {
      // A new kind without a line fails to compile here.
      const unknown: never = event.kind;
      return unknown;
    }
  }
}
