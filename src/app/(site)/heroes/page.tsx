import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBackdrop } from "@/components/PageBackdrop";
import { AiHeroPicks } from "@/components/trending/AiHeroPicks";
import { TrendingBoard } from "@/components/trending/TrendingBoard";
import { bracketForTier } from "@/lib/hero-meta";
import { getLinkedAccountId } from "@/lib/linked-account";
import { getPlayerRank } from "@/lib/opendota";
import { getPersonalRecords } from "@/lib/opendota-draft";
import { getHeroIndex } from "@/lib/opendota-heroes";
import { getRecentMatches } from "@/lib/opendota-matches";
import { getHeroMeta } from "@/lib/opendota-meta";
import { summarize } from "@/lib/player-summary";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Trending Heroes · ${site.gameTitle}`,
};

function PicksSkeleton() {
  return <div className="glass-panel shimmer h-[15rem] rounded-[1.4rem]" aria-label="Loading AI picks" />;
}

/** The player's rank, record per hero and main lane (when Steam is linked), then the picks and the board. Reads cookies. */
async function TrendingLoader() {
  const [heroes, accountId] = await Promise.all([getHeroMeta(), getLinkedAccountId()]);
  if (heroes.length === 0) {
    return <p className="relative z-20 m-auto text-[1.4rem] text-white/80">Could not load hero stats from OpenDota. Try again in a minute.</p>;
  }

  const [rank, personal, matches, heroIndex] = accountId
    ? await Promise.all([getPlayerRank(accountId), getPersonalRecords(accountId), getRecentMatches(accountId), getHeroIndex()])
    : [null, {}, null, new Map()];
  const myBracket = rank ? bracketForTier(rank.medalTier) : null;
  const mainLane = matches ? (summarize(matches, heroIndex)?.mainLane?.lane ?? null) : null;

  return (
    <div className="relative z-20 flex min-h-0 flex-1 flex-col gap-[1rem]">
      {accountId ? (
        <Suspense fallback={<PicksSkeleton />}>
          <AiHeroPicks accountId={accountId} heroes={heroes} bracket={myBracket ?? "all"} personal={personal} mainLane={mainLane} />
        </Suspense>
      ) : (
        <p className="glass-panel rounded-[1.2rem] p-[0.9rem] text-[0.95rem] text-white/70">Link Steam to get 5 hero picks chosen for you.</p>
      )}
      <TrendingBoard heroes={heroes} myBracket={myBracket} />
    </div>
  );
}

/** Trending Heroes: AI picks for the player, then every hero's win, loss, pick and ban rates by rank. */
export default function TrendingHeroesPage() {
  return (
    <>
      <PageBackdrop />
      <div className="page-enter relative flex w-full flex-1 flex-col px-[1.3rem] pb-12 md:px-8 lg:min-h-0 lg:px-[5rem] lg:pb-[2.4rem]">
        <Suspense fallback={<PicksSkeleton />}>
          <TrendingLoader />
        </Suspense>
      </div>
    </>
  );
}
