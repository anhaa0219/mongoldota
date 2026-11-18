import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBackdrop } from "@/app/(site)/_components/PageBackdrop";
import { requireUserId } from "@/app/(site)/_utils/require-user";
import { AiHeroPicks } from "./_features/AiHeroPicks";
import { TrendingBoard } from "./_features/TrendingBoard";
import { bracketForTier } from "./_utils/hero-meta";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import { getPlayerRank } from "@/lib/opendota/opendota";
import { getPersonalRecords } from "@/lib/opendota/opendota-draft";
import { getHeroIndex } from "@/lib/opendota/opendota-heroes";
import { getRecentMatches } from "@/lib/opendota/opendota-matches";
import { getHeroMeta } from "./_utils/opendota-meta";
import { summarize } from "@/lib/player/player-summary";
import { site } from "@/lib/site-content";
import { getWords } from "@/lib/i18n/server";
import { PicksSkeleton } from "./_components/PicksSkeleton";

export const metadata: Metadata = {
  title: `Trending Heroes · ${site.gameTitle}`,
};


/** The player's rank, record per hero and main lane (when Steam is linked), then the picks and the board. Reads cookies. */
async function TrendingLoader() {
  const clerkUserId = await requireUserId();
  const words = await getWords(); // the layout's check does not stop this component from running
  const [heroes, accountId] = await Promise.all([getHeroMeta(), getLinkedAccountId()]);
  if (heroes.length === 0) {
    return <p className="relative z-20 m-auto text-[1.4rem] text-white/80">{words.trending.statsFailed}</p>;
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
          <AiHeroPicks accountId={accountId} clerkUserId={clerkUserId} heroes={heroes} bracket={myBracket ?? "all"} personal={personal} mainLane={mainLane} />
        </Suspense>
      ) : (
        <p className="glass-panel rounded-[1.2rem] p-[0.9rem] text-[0.95rem] text-white/70">{words.trending.linkForPicks}</p>
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
