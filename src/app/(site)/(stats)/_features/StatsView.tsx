import { Suspense } from "react";
import { CoachSection, CoachSkeleton } from "./CoachSection";
import { MatchSyncScheduler } from "../_components/MatchSyncScheduler";
import { PageBackdrop } from "@/app/(site)/_components/PageBackdrop";
import { PlayerDataNotice, type NoticeReason } from "@/app/(site)/_components/PlayerDataNotice";
import { PlayerStats } from "./PlayerStats";
import { PlaystyleSection } from "./PlaystyleSection";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import { getHeroIndex } from "@/lib/opendota/opendota-heroes";
import { getRecentMatches } from "@/lib/opendota/opendota-matches";
import { formTrend } from "../_utils/player-trends";
import { requireUserId } from "@/app/(site)/_utils/require-user";
import { summarize } from "@/lib/player/player-summary";
import { getWords } from "@/lib/i18n/server";

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
  const clerkUserId = await requireUserId();
  const words = await getWords(); // the layout's check does not stop this component from running
  const accountId = await getLinkedAccountId();
  if (!accountId) return <Notice reason="not-linked" />;

  const [matches, heroes] = await Promise.all([getRecentMatches(accountId), getHeroIndex()]);
  if (matches === null) return <Notice reason="error" />;

  const summary = summarize(matches, heroes);
  if (!summary) return <Notice reason="no-matches" />;
  const form = formTrend(matches);
  const heroMatches = matches.filter((match) => match.heroId === summary.mostPlayed.hero.id);

  return (
    <>
      <Suspense fallback={null}>
        <MatchSyncScheduler matchIds={matches.map((match) => match.id)} />
      </Suspense>
      <PageBackdrop heroSlug={summary.mostPlayed.hero.slug} />
      {/* Desktop: stats on the left, coach on the right, sized to fit the fixed-height frame without scrolling */}
      <div className="glass-blur relative w-full flex-1 pb-12 md:px-8 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,34rem)] lg:gap-[1.6rem] lg:overflow-y-auto lg:px-[5rem] lg:pb-[2.4rem]">
        <PlayerStats summary={summary} form={form}>
          <Suspense fallback={<div className="glass-panel shimmer h-[7.5rem] rounded-[1.4rem]" />}>
            <PlaystyleSection accountId={accountId} />
          </Suspense>
        </PlayerStats>
        <aside className="relative z-20 mt-[1.1rem] flex flex-col gap-[1.1rem] px-[1.3rem] lg:mt-0 lg:min-h-0 lg:px-0" aria-label={words.stats.coachAside}>
          <Suspense fallback={<CoachSkeleton />}>
            <CoachSection accountId={accountId} clerkUserId={clerkUserId} summary={summary} heroMatches={heroMatches} form={form} />
          </Suspense>
        </aside>
      </div>
    </>
  );
}
