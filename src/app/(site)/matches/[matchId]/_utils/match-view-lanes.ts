/** The laning stage per map lane (top / mid / bottom): who laned there and who came out ahead. Pure. */

import type { LaneRole } from "@/types/opendota";
import type { MatchSeries, ScoreboardPlayer, Team } from "./match-view-types";

export type MapLane = "top" | "mid" | "bot";

export interface LaneMinuteStats {
  lastHits: number;
  netWorth: number;
  xp: number;
}

export interface LanePlayerStats {
  slot: number;
  at5: LaneMinuteStats | null;
  at10: LaneMinuteStats | null;
}

export interface LaneSummary {
  lane: MapLane;
  radiant: LanePlayerStats[];
  dire: LanePlayerStats[];
  /** Higher combined net worth at 10 minutes; null when a side is empty, the sides are uneven, or data is missing. */
  winner: Team | null;
}

/** Radiant's safe lane is the bottom lane, Dire's safe lane is the top lane. */
const LANE_ROLES: Record<MapLane, Record<Team, LaneRole>> = {
  top: { radiant: 3, dire: 1 },
  mid: { radiant: 2, dire: 2 },
  bot: { radiant: 1, dire: 3 },
};

function minuteStats(series: MatchSeries, slot: number, minute: number): LaneMinuteStats | null {
  const lastHits = series.lastHits[slot]?.[minute];
  const netWorth = series.netWorth[slot]?.[minute];
  const xp = series.xp[slot]?.[minute];
  if (lastHits === undefined || netWorth === undefined || xp === undefined) return null;
  return { lastHits, netWorth, xp };
}

function sideStats(players: ScoreboardPlayer[], series: MatchSeries, team: Team, role: LaneRole): LanePlayerStats[] {
  return players
    .filter((player) => player.team === team && player.lane === role)
    .map((player) => ({ slot: player.slot, at5: minuteStats(series, player.slot, 5), at10: minuteStats(series, player.slot, 10) }));
}

function netWorthAt10(side: LanePlayerStats[]): number | null {
  if (side.length === 0 || side.some((stats) => stats.at10 === null)) return null;
  return side.reduce((sum, stats) => sum + (stats.at10?.netWorth ?? 0), 0);
}

export function toLaneSummaries(players: ScoreboardPlayer[], series: MatchSeries): LaneSummary[] {
  return (Object.keys(LANE_ROLES) as MapLane[]).map((lane) => {
    const radiant = sideStats(players, series, "radiant", LANE_ROLES[lane].radiant);
    const dire = sideStats(players, series, "dire", LANE_ROLES[lane].dire);
    const radiantWorth = netWorthAt10(radiant);
    const direWorth = netWorthAt10(dire);
    let winner: Team | null = null;
    // Uneven lanes (2 vs 1) are not judged: the bigger side would win by default.
    const even = radiant.length === dire.length;
    if (even && radiantWorth !== null && direWorth !== null && radiantWorth !== direWorth) {
      winner = radiantWorth > direWorth ? "radiant" : "dire";
    }
    return { lane, radiant, dire, winner };
  });
}
