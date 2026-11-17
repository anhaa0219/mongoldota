/** The player's lane for the live coach: from the locked draft when there is one, otherwise from the position they picked. Pure. */

import { POSITION_NAMES } from "@/lib/draft-advice";
import { laneName, laneOpponentPositions, mapLane, type MapLane } from "@/lib/draft-lanes";
import type { AdviceFacts, Position } from "@/types/draft";
import type { Side } from "@/types/game";

const LANING_STAGE_SECONDS = 600;

export interface LaneInfo {
  position: Position;
  /** Null when Dota did not say which team the player is on. */
  lane: MapLane | null;
  /** "Lion (pos 5)". */
  partners: string[];
  /** Null when the enemy heroes are unknown (no usable draft). */
  opponents: { name: string; position: Position; myWinRate: number | null; games: number }[] | null;
  /** Set when the position is our guess from the hero's roles and the player has not confirmed it. */
  isGuess?: true;
}

/** The draft's lane wins over the picked position; null when neither is known. */
export function laneInfo({ team, facts, position, isGuess }: { team: Side | null; facts: AdviceFacts | null; position: Position | null; isGuess?: boolean }): LaneInfo | null {
  if (facts) {
    return { position: facts.position, lane: team ? mapLane(team, facts.position) : null, partners: facts.lane.partners, opponents: facts.lane.opponents };
  }
  if (!position) return null;
  return { position, lane: team ? mapLane(team, position) : null, partners: [], opponents: null, ...(isGuess ? { isGuess: true as const } : {}) };
}

const joinNames = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? ""));

/** "bot (safe lane)", "mid", or just "off lane" when the team is unknown. */
function laneLabel({ position, lane }: LaneInfo): string {
  const role = laneName(position);
  if (role === "mid") return "mid";
  return lane ? `${lane} (${role})` : role;
}

/** The lane block of a coach prompt. */
export function laneLines(lane: LaneInfo, heroName: string, clockSeconds: number): string[] {
  const { opponents, partners } = lane;
  const against = opponents
    ? joinNames(opponents.map((opponent) => `${opponent.name} (pos ${opponent.position})`))
    : `the enemy ${joinNames(laneOpponentPositions(lane.position).map((position) => `pos ${position}`))} (heroes unknown)`;
  const withPartners = partners.length > 0 ? ` with ${joinNames(partners)}` : "";
  const records = (opponents ?? [])
    .filter((opponent) => opponent.myWinRate !== null)
    .map((opponent) => `${Math.round(opponent.myWinRate ?? 0)}% vs ${opponent.name} (${opponent.games.toLocaleString("en-US")} games)`);

  return [
    // With a draft the team block already says the position.
    ...(opponents ? [] : [lane.isGuess ? `They probably play ${POSITION_NAMES[lane.position]}: a guess from the hero's roles that the player has not confirmed.` : `They play ${POSITION_NAMES[lane.position]}.`]),
    `${lane.isGuess ? "Likely lane" : "Lane"}: ${laneLabel(lane)}${withPartners}${against ? `, against ${against}` : ""}.`,
    ...(records.length > 0 ? [`${heroName} wins ${joinNames(records)}.`] : []),
    ...(clockSeconds < LANING_STAGE_SECONDS ? ["The laning stage is still on."] : []),
  ];
}
