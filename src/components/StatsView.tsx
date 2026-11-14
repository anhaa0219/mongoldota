import { after } from "next/server";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/PageBackdrop";
import { PlayerDataNotice, type NoticeReason } from "@/components/PlayerDataNotice";
import { PlayerStats } from "@/components/PlayerStats";
import { PlaystyleSection } from "@/components/PlaystyleSection";
import { getLinkedAccountId } from "@/lib/linked-account";
import { getHeroIndex } from "@/lib/opendota-heroes";
import { getRecentMatches } from "@/lib/opendota-matches";
import { syncRecentMatches } from "@/lib/match-store";
import { summarize } from "@/lib/player-summary";

function Notice({ reason }: { reason: NoticeReason }) {
  return (
    <>
      <PageBackdrop />
      <PlayerDataNotice reason={reason} />
    </>
  );
}

/** Stats page body: the linked player's last 100 matches, over their most played hero's art. Reads cookies. */
export async function StatsView() {
  const accountId = await getLinkedAccountId();
  if (!accountId) return <Notice reason="not-linked" />;

  const [matches, heroes] = await Promise.all([getRecentMatches(accountId), getHeroIndex()]);
  if (matches === null) return <Notice reason="error" />;

  const summary = summarize(matches, heroes);
  // Save these matches to the database after the response is sent (never slows the page).
  after(() => syncRecentMatches(matches.map((match) => match.id)));
  if (!summary) return <Notice reason="no-matches" />;

  return (
    <>
      <PageBackdrop heroSlug={summary.mostPlayed.hero.slug} />
      {/* Desktop: stats on the left over the hero art, scrolling inside the fixed-height frame */}
      <div className="relative w-full flex-1 pb-12 md:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-[5rem] lg:pb-[4rem]">
        <PlayerStats summary={summary}>
          <Suspense fallback={<div className="glass-panel h-[11rem] animate-pulse rounded-[1.6rem]" />}>
            <PlaystyleSection accountId={accountId} />
          </Suspense>
        </PlayerStats>
      </div>
    </>
  );
}
