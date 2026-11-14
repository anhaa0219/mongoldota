/** Builds the match page's view model from a stored/fetched full match. Pure; runs on the server. */

import { isParsed } from "@/lib/match-rows";
import { toCombat, toLog } from "@/lib/match-view-combat";
import { toMatchMap } from "@/lib/match-view-map";
import { defaultFollowedSlot, laneOpponents, toScoreboard } from "@/lib/match-view-players";
import { toEvents, toSeries } from "@/lib/match-view-timeline";
import type { HeroInfo, ItemIndex } from "@/types/opendota";
import type { RawFullMatch } from "@/types/opendota-match";
import type { MatchView } from "@/types/match-view";

const RANKED_LOBBY = 7;
const LANING_MINUTE = 10;

export function toMatchView(raw: RawFullMatch, heroes: Map<number, HeroInfo>, items: ItemIndex, linkedAccountId: number | null): MatchView {
  const players = toScoreboard(raw, heroes, items, linkedAccountId);
  const series = toSeries(raw);
  const lastHitsAt10 = Object.fromEntries(
    players.map((player) => [player.slot, series?.lastHits[player.slot]?.[LANING_MINUTE] ?? player.lastHits]),
  );
  return {
    matchId: raw.match_id,
    parsed: isParsed(raw),
    header: {
      radiantWin: raw.radiant_win,
      radiantScore: raw.radiant_score,
      direScore: raw.dire_score,
      durationSeconds: raw.duration,
      startTime: raw.start_time * 1000,
      ranked: raw.lobby_type === RANKED_LOBBY,
    },
    players,
    defaultFollowedSlot: defaultFollowedSlot(players),
    laneOpponent: laneOpponents(players, lastHitsAt10),
    series,
    events: toEvents(raw, players, items),
    map: toMatchMap(raw, players),
    combat: toCombat(raw, players),
    log: toLog(raw, items),
  };
}
