/** Maps a full OpenDota match to database rows, and picks which matches to sync. Pure. */

import type { RawFullMatch } from "@/types/opendota-match";

const ONE_HOUR_MS = 3_600_000;
/** Unparsed matches older than this are not re-fetched: their replays can no longer be parsed. */
const REPLAY_WINDOW_MS = 7 * 24 * ONE_HOUR_MS;

export interface MatchRow {
  matchId: number;
  parsed: boolean;
  startTime: Date;
  durationS: number;
  radiantWin: boolean;
  data: RawFullMatch;
}

export interface PlayerMatchRow {
  accountId: number;
  matchId: number;
  heroId: number;
  playerSlot: number;
  won: boolean;
}

export interface StoredMatchInfo {
  matchId: number;
  parsed: boolean;
  fetchedAt: Date;
  startTime: Date;
}

export function isParsed(raw: RawFullMatch): boolean {
  return raw.version !== null && raw.version !== undefined;
}

export function toMatchRows(raw: RawFullMatch): { match: MatchRow; players: PlayerMatchRow[] } {
  const match: MatchRow = {
    matchId: raw.match_id,
    parsed: isParsed(raw),
    startTime: new Date(raw.start_time * 1000),
    durationS: raw.duration,
    radiantWin: raw.radiant_win,
    data: raw,
  };
  const players = raw.players.flatMap((player) =>
    player.account_id === null || player.account_id === undefined
      ? []
      : [
          {
            accountId: player.account_id,
            matchId: raw.match_id,
            heroId: player.hero_id,
            playerSlot: player.player_slot,
            won: (player.player_slot < 128) === raw.radiant_win,
          },
        ],
  );
  return { match, players };
}

/** Missing matches first (in recentIds order), then unparsed ones from the last 7 days fetched over an hour ago; at most `limit`. */
export function pickMatchesToSync(recentIds: number[], stored: StoredMatchInfo[], now: Date, limit: number): number[] {
  const byId = new Map(stored.map((info) => [info.matchId, info]));
  const missing = recentIds.filter((id) => !byId.has(id));
  const stale = recentIds.filter((id) => {
    const info = byId.get(id);
    if (info === undefined || info.parsed) return false;
    const recentEnough = now.getTime() - info.startTime.getTime() < REPLAY_WINDOW_MS;
    return recentEnough && now.getTime() - info.fetchedAt.getTime() > ONE_HOUR_MS;
  });
  return [...missing, ...stale].slice(0, limit);
}
