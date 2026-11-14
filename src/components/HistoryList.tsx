import { MatchRow, type MatchRowData } from "@/components/MatchRow";
import { PlayerDataNotice } from "@/components/PlayerDataNotice";
import { timeAgo } from "@/lib/format";
import { getLinkedAccountId } from "@/lib/linked-account";
import { getHeroIndex, getItemIndex } from "@/lib/opendota-heroes";
import { getRecentMatches } from "@/lib/opendota-matches";

/** The linked player's last 100 matches, newest first. Reads cookies. */
export async function HistoryList() {
  const accountId = await getLinkedAccountId();
  if (!accountId) return <PlayerDataNotice reason="not-linked" />;

  const [matches, heroes, items] = await Promise.all([getRecentMatches(accountId), getHeroIndex(), getItemIndex()]);
  if (matches === null) return <PlayerDataNotice reason="error" />;
  if (matches.length === 0) return <PlayerDataNotice reason="no-matches" />;

  // Server Component: renders once per request (dynamic after the cookie read), so "now" is the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const rows: MatchRowData[] = matches.map((match) => {
    const hero = heroes.get(match.heroId);
    return {
      id: match.id,
      heroName: hero?.name ?? "Unknown hero",
      heroSlug: hero?.slug ?? "",
      won: match.won,
      ranked: match.ranked,
      kills: match.kills,
      deaths: match.deaths,
      assists: match.assists,
      gpm: match.gpm,
      durationMinutes: Math.round(match.durationSeconds / 60),
      ago: timeAgo(match.playedAt, now),
      itemImages: match.items.map((itemId) => items.byId.get(itemId)?.image ?? null),
    };
  });

  return (
    <ul className="flex flex-col gap-[0.6rem]">
      {rows.map((row) => (
        <MatchRow key={row.id} match={row} />
      ))}
    </ul>
  );
}
