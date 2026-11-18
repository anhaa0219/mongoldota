/** Who laned with and against whom, and a first guess of each hero's position from its roles. Pure. */

import type { DraftHero, Position } from "@/types/draft";
import type { Side } from "@/types/game";

export const POSITIONS: readonly Position[] = [1, 2, 3, 4, 5];

/** Safe lane = pos 1 + 5, off lane = pos 3 + 4, mid = pos 2. */
const LANE_OF: Record<Position, "safe" | "mid" | "off"> = { 1: "safe", 5: "safe", 2: "mid", 3: "off", 4: "off" };
/** A team's safe lane faces the enemy off lane; mid faces mid. */
const OPPOSITE = { safe: "off", mid: "mid", off: "safe" } as const;

/** Enemy positions you lane against: pos 1 and 5 face their 3 and 4; pos 3 and 4 face their 1 and 5; mid faces mid. */
export function laneOpponentPositions(position: Position): Position[] {
  return POSITIONS.filter((other) => LANE_OF[other] === OPPOSITE[LANE_OF[position]]);
}

/** "safe lane", "mid" or "off lane". */
export function laneName(position: Position): "safe lane" | "mid" | "off lane" {
  const lane = LANE_OF[position];
  return lane === "mid" ? "mid" : `${lane} lane`;
}

export type MapLane = "top" | "mid" | "bot";

/** Where on the map a position lanes: the safe lane is bot for Radiant and top for Dire; the off lane is the other one. */
export function mapLane(side: Side, position: Position): MapLane {
  const lane = LANE_OF[position];
  if (lane === "mid") return "mid";
  return (lane === "safe") === (side === "radiant") ? "bot" : "top";
}

/** Your own team's other position in the same lane (none for mid). */
export function lanePartnerPositions(position: Position): Position[] {
  return POSITIONS.filter((other) => other !== position && LANE_OF[other] === LANE_OF[position]);
}

/** How well a hero's OpenDota roles fit each position. */
const ROLE_WEIGHTS: Record<Position, Partial<Record<string, number>>> = {
  1: { Carry: 3, Escape: 0.5, Pusher: 0.5, Support: -3 },
  2: { Nuker: 1.5, Carry: 1, Escape: 1, Pusher: 0.3, Support: -2 },
  3: { Durable: 2, Initiator: 1.5, Disabler: 0.5, Carry: 0.3, Support: -1 },
  4: { Support: 2, Initiator: 1, Disabler: 1, Nuker: 0.5, Escape: 0.5, Carry: -1.5 },
  5: { Support: 3, Disabler: 1, Nuker: 0.3, Durable: -0.5, Carry: -3 },
};

function fitRoles(roles: string[], position: Position) {
  return roles.reduce((total, role) => total + (ROLE_WEIGHTS[position][role] ?? 0), 0);
}

function fit(hero: DraftHero, position: Position) {
  return fitRoles(hero.roles, position);
}

/** The best-fitting position for one hero on its own; ties (and a hero with no roles) go to the lowest position. */
export function guessPosition(roles: string[]): Position {
  return POSITIONS.reduce((best, position) => (fitRoles(roles, position) > fitRoles(roles, best) ? position : best));
}

/** Every way to give `count` heroes different positions. */
function arrangements(count: number, free: readonly Position[] = POSITIONS): Position[][] {
  if (count === 0) return [[]];
  return free.flatMap((position) => arrangements(count - 1, free.filter((other) => other !== position)).map((rest) => [position, ...rest]));
}

/** The best-fitting distinct position for each hero (at most 5 heroes; 120 arrangements at most). */
export function guessPositions(heroes: DraftHero[]): Map<number, Position> {
  const team = heroes.slice(0, POSITIONS.length);
  let best: Position[] = [];
  let bestScore = -Infinity;
  for (const arrangement of arrangements(team.length)) {
    const score = arrangement.reduce((total, position, index) => total + fit(team[index], position), 0);
    if (score > bestScore) {
      best = arrangement;
      bestScore = score;
    }
  }
  return new Map(team.map((hero, index) => [hero.id, best[index]]));
}

/** Sets a hero's position; a teammate who had it takes the hero's old one, so positions stay distinct. */
export function assignPosition(positions: Map<number, Position>, heroId: number, position: Position): Map<number, Position> {
  const next = new Map(positions);
  const previous = next.get(heroId);
  for (const [otherId, otherPosition] of next) {
    if (otherId !== heroId && otherPosition === position) {
      if (previous === undefined) next.delete(otherId);
      else next.set(otherId, previous);
    }
  }
  next.set(heroId, position);
  return next;
}
