/** Win-rate breakdowns of a player's matches (heroes, lanes, sides, streaks, queues). Pure. */

import type { HeroInfo, LaneRole, MatchSummary, PlayerSummary, WinRecord } from "@/types/opendota";

const LANES: readonly LaneRole[] = [1, 2, 3, 4];

/** Null when there are no matches. */
export function winRecord(matches: MatchSummary[]): WinRecord | null {
  if (matches.length === 0) return null;
  const wins = matches.filter((match) => match.won).length;
  return { matches: matches.length, winRate: (wins / matches.length) * 100 };
}

export function heroOf(id: number, heroes: Map<number, HeroInfo>): HeroInfo {
  return heroes.get(id) ?? { id, name: "Unknown hero", slug: "" };
}

/** Every hero played: most games first; ties -> higher win rate, then most recently played (input is newest first). */
export function rankHeroes(matches: MatchSummary[], heroes: Map<number, HeroInfo>): PlayerSummary["topHeroes"] {
  const byHero = new Map<number, MatchSummary[]>(); // insertion order = most recent first
  for (const match of matches) byHero.set(match.heroId, [...(byHero.get(match.heroId) ?? []), match]);

  return [...byHero]
    .map(([heroId, played]) => ({ hero: heroOf(heroId, heroes), matches: played.length, winRate: winRecord(played)?.winRate ?? 0 }))
    .sort((a, b) => b.matches - a.matches || b.winRate - a.winRate); // stable sort keeps recency on full ties
}

/** Lanes with at least one parsed match, in lane order. */
export function laneWinRates(matches: MatchSummary[]): PlayerSummary["lanes"] {
  return LANES.flatMap((lane) => {
    const record = winRecord(matches.filter((match) => match.parsed && match.laneRole === lane));
    return record ? [{ lane, ...record }] : [];
  });
}

export function sideWinRates(matches: MatchSummary[]): PlayerSummary["sides"] {
  return {
    radiant: winRecord(matches.filter((match) => match.radiant)),
    dire: winRecord(matches.filter((match) => !match.radiant)),
  };
}

export function queueWinRates(matches: MatchSummary[]): PlayerSummary["queues"] {
  return {
    ranked: winRecord(matches.filter((match) => match.ranked)),
    unranked: winRecord(matches.filter((match) => !match.ranked)),
  };
}

/** Input must be non-empty and newest first. */
export function streaks(matches: MatchSummary[]): PlayerSummary["streaks"] {
  const firstWon = matches[0].won;
  const firstChange = matches.findIndex((match) => match.won !== firstWon);
  const length = firstChange === -1 ? matches.length : firstChange;

  let longestWin = 0;
  let run = 0;
  for (const match of matches) {
    run = match.won ? run + 1 : 0;
    longestWin = Math.max(longestWin, run);
  }
  return { current: { result: firstWon ? "W" : "L", length }, longestWin };
}
