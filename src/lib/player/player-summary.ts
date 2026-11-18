/** Turns OpenDota match rows into the numbers on the Stats page. Pure: no fetching. */

import {
  heroOf,
  laneWinRates,
  queueWinRates,
  rankHeroes,
  sideWinRates,
  streaks,
} from "@/lib/player/player-breakdowns";
import type { HeroInfo, LaneRole, MatchSummary, PlayerSummary, RawMatch, RecordLabel } from "@/types/opendota";

const RANKED_LOBBY = 7;
const LANES: readonly LaneRole[] = [1, 2, 3, 4];

function toLane(value: number | null | undefined): LaneRole | null {
  return LANES.find((lane) => lane === value) ?? null;
}

export function toMatchSummary(raw: RawMatch): MatchSummary {
  const parsed = raw.version !== null && raw.version !== undefined;
  const items = [raw.item_0, raw.item_1, raw.item_2, raw.item_3, raw.item_4, raw.item_5];
  return {
    id: raw.match_id,
    heroId: raw.hero_id,
    won: (raw.player_slot < 128) === raw.radiant_win, // slots 0-127 are Radiant
    radiant: raw.player_slot < 128,
    ranked: raw.lobby_type === RANKED_LOBBY,
    kills: raw.kills,
    deaths: raw.deaths,
    assists: raw.assists,
    gpm: raw.gold_per_min ?? 0,
    xpm: raw.xp_per_min ?? 0,
    lastHits: raw.last_hits ?? 0,
    heroDamage: raw.hero_damage ?? 0,
    items: items.map((item) => item ?? 0),
    laneRole: parsed ? toLane(raw.lane_role) : null,
    parsed,
    durationSeconds: raw.duration,
    playedAt: raw.start_time * 1000,
  };
}

const RECORD_FIELDS: { label: RecordLabel; field: "kills" | "deaths" | "assists" | "heroDamage" }[] = [
  { label: "Most kills", field: "kills" },
  { label: "Most deaths", field: "deaths" },
  { label: "Most assists", field: "assists" },
  { label: "Most hero damage", field: "heroDamage" },
];

function records(matches: MatchSummary[], heroes: Map<number, HeroInfo>): PlayerSummary["records"] {
  return RECORD_FIELDS.map(({ label, field }) => {
    // Strictly greater keeps the first (most recent) match on ties.
    const top = matches.reduce((best, match) => (match[field] > best[field] ? match : best));
    return { label, value: top[field], hero: heroOf(top.heroId, heroes), matchId: top.id };
  });
}

function average(matches: MatchSummary[], pick: (match: MatchSummary) => number) {
  return matches.reduce((sum, match) => sum + pick(match), 0) / matches.length;
}

/** (kills + assists) / deaths over all matches; a deathless stretch counts as 1 death. */
function kda(matches: MatchSummary[]) {
  const sum = (pick: (match: MatchSummary) => number) => matches.reduce((total, match) => total + pick(match), 0);
  return (sum((match) => match.kills) + sum((match) => match.assists)) / Math.max(1, sum((match) => match.deaths));
}

/** Most common lane among parsed matches; ties go to the lowest lane number. */
function mainLane(matches: MatchSummary[]): PlayerSummary["mainLane"] {
  const lanes = matches.flatMap((match) => (match.parsed && match.laneRole ? [match.laneRole] : []));
  if (lanes.length === 0) return null;

  const counts = LANES.map((lane) => ({ lane, count: lanes.filter((value) => value === lane).length }));
  const top = counts.reduce((best, entry) => (entry.count > best.count ? entry : best));
  return { lane: top.lane, share: Math.round((top.count / lanes.length) * 100) };
}

/** Matches must be newest first. Null when there are no matches. */
export function summarize(matches: MatchSummary[], heroes: Map<number, HeroInfo>): PlayerSummary | null {
  if (matches.length === 0) return null;

  const wins = matches.filter((match) => match.won).length;
  const ranked = rankHeroes(matches, heroes);
  return {
    mostPlayed: ranked[0],
    topHeroes: ranked.slice(0, 5),
    lanes: laneWinRates(matches),
    sides: sideWinRates(matches),
    streaks: streaks(matches),
    queues: queueWinRates(matches),
    averageDurationSeconds: average(matches, (match) => match.durationSeconds),
    wins,
    losses: matches.length - wins,
    last10: matches.slice(0, 10).map((match) => (match.won ? "W" : "L")),
    records: records(matches, heroes),
    averages: {
      kills: average(matches, (match) => match.kills),
      deaths: average(matches, (match) => match.deaths),
      assists: average(matches, (match) => match.assists),
      gpm: average(matches, (match) => match.gpm),
      xpm: average(matches, (match) => match.xpm),
      lastHits: average(matches, (match) => match.lastHits),
      heroDamage: average(matches, (match) => match.heroDamage),
      kda: kda(matches),
    },
    mainLane: mainLane(matches),
  };
}
