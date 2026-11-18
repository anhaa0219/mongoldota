import { after, connection } from "next/server";
import type { MatchRowData } from "../_utils/match-row-types";
import { FilteredMatchList } from "./FilteredMatchList";
import { PlayerDataNotice } from "@/app/(site)/_components/PlayerDataNotice";
import { timeAgo } from "@/lib/format";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import { syncRecentMatches } from "@/lib/matches/match-store";
import { requireUserId } from "@/app/(site)/_utils/require-user";
import { getHeroIndex, getItemIndex } from "@/lib/opendota/opendota-heroes";
import { getRecentMatches } from "@/lib/opendota/opendota-matches";
import { getWords } from "@/lib/i18n/server";

/** The linked player's last 100 matches, newest first, filterable, 10 per page. Reads cookies. */
export async function HistoryList() {
  await requireUserId(); // the layout's check does not stop this component from running
  const accountId = await getLinkedAccountId();
  if (!accountId) return <PlayerDataNotice reason="not-linked" />;

  const [matches, heroes, items] = await Promise.all([getRecentMatches(accountId), getHeroIndex(), getItemIndex()]);
  if (matches === null) return <PlayerDataNotice reason="error" />;
  if (matches.length === 0) return <PlayerDataNotice reason="no-matches" />;
  // Cache Components: reading the current time needs an explicit request-time marker first,
  // otherwise Next reports "unstable value Date.now() while prerendering" (a cookie read is not enough).
  // after() reads the clock too, so it must also come after this line.
  await connection();
  // Save these matches to the database after the response is sent (never slows the page).
  after(() => syncRecentMatches(matches.map((match) => match.id)));
  // Server Component: renders once per request, so "now" is the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const words = await getWords();
  const rows: MatchRowData[] = matches.map((match) => {
    const hero = heroes.get(match.heroId);
    return {
      id: match.id,
      heroName: hero?.name ?? words.history.unknownHero,
      heroSlug: hero?.slug ?? "",
      won: match.won,
      ranked: match.ranked,
      kills: match.kills,
      deaths: match.deaths,
      assists: match.assists,
      gpm: match.gpm,
      durationMinutes: Math.round(match.durationSeconds / 60),
      ago: timeAgo(match.playedAt, now, words.common.ago),
      itemImages: match.items.map((itemId) => items.byId.get(itemId)?.image ?? null),
    };
  });

  return <FilteredMatchList rows={rows} />;
}
