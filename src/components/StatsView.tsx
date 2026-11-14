import { PageBackdrop } from "@/components/PageBackdrop";
import { PlayerDataNotice, type NoticeReason } from "@/components/PlayerDataNotice";
import { PlayerStats } from "@/components/PlayerStats";
import { getLinkedAccountId } from "@/lib/linked-account";
import { getHeroIndex } from "@/lib/opendota-heroes";
import { getRecentMatches } from "@/lib/opendota-matches";
import { summarize } from "@/lib/player-summary";

function Notice({ reason }: { reason: NoticeReason }) {
  return (
    <>
      <PageBackdrop />
      <PlayerDataNotice reason={reason} />
    </>
  );
}

/** Stats page body: the linked player's last 100 matches, with their most played hero behind. Reads cookies. */
export async function StatsView() {
  const accountId = await getLinkedAccountId();
  if (!accountId) return <Notice reason="not-linked" />;

  const [matches, heroes] = await Promise.all([getRecentMatches(accountId), getHeroIndex()]);
  if (matches === null) return <Notice reason="error" />;

  const summary = summarize(matches, heroes);
  if (!summary) return <Notice reason="no-matches" />;

  return (
    <>
      <PageBackdrop heroSlug={summary.mostPlayed.hero.slug} />
      {/* Desktop: stats sit in the left half, vertically centred; the hero owns the right half */}
      <div className="relative w-full flex-1 pb-12 md:px-8 lg:flex lg:flex-col lg:justify-center lg:px-[5rem] lg:pb-[4rem]">
        <PlayerStats summary={summary} />
      </div>
    </>
  );
}
