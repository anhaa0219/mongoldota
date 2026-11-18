import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MatchExplorer } from "./_features/MatchExplorer";
import { PageBackdrop } from "@/app/(site)/_components/PageBackdrop";
import { timeAgo } from "@/lib/format";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import { parseMatchId } from "@/lib/matches/match-id";
import { toMatchTab } from "./_utils/match-tabs";
import { loadMatch } from "@/lib/matches/match-store";
import { requireUserId } from "@/app/(site)/_utils/require-user";
import { toMatchView } from "./_utils/match-view";
import { getHeroIndex, getItemIndex } from "@/lib/opendota/opendota-heroes";
import { site } from "@/lib/site-content";
import { getWords } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/matches/[matchId]">): Promise<Metadata> {
  const { matchId } = await params;
  return { title: `Match ${matchId} · ${site.gameTitle}` };
}

function MatchSkeleton() {
  return (
    <div className="flex flex-col gap-[1.2rem]">
      <div className="glass-panel shimmer h-[9rem] rounded-[1.8rem]" />
      <div className="glass-panel shimmer h-[24rem] rounded-[1.6rem]" />
      <div className="glass-panel shimmer h-[14rem] rounded-[1.6rem]" />
    </div>
  );
}

async function MatchLoader({ params, searchParams }: PageProps<"/matches/[matchId]">) {
  // Before any OpenDota call or database write: the layout's sign-in check does not cover this.
  await requireUserId();
  const words = await getWords();
  const matchId = parseMatchId((await params).matchId);
  if (matchId === null) notFound();

  // Request time: loadMatch and "ago" read the clock.
  await connection();
  const [raw, heroes, items, accountId] = await Promise.all([loadMatch(matchId), getHeroIndex(), getItemIndex(), getLinkedAccountId()]);
  if (!raw) {
    return (
      <div className="glass-panel flex flex-col items-start gap-[1rem] rounded-[1.6rem] p-[1.6rem]">
        <p className="text-[1.3rem] text-white/80">{words.match.loadFailed}</p>
        <Link href="/history" className="text-accent hover:underline">{words.match.backToHistory}</Link>
      </div>
    );
  }

  const view = toMatchView(raw, heroes, items, accountId ? Number(accountId) : null, words.match);
  // eslint-disable-next-line react-hooks/purity -- request-time Server Component (after connection())
  const ago = timeAgo(view.header.startTime + view.header.durationSeconds * 1000, Date.now(), words.common.ago);
  return <MatchExplorer view={view} initialTab={toMatchTab((await searchParams).tab)} ago={ago} />;
}

export default function MatchPage(props: PageProps<"/matches/[matchId]">) {
  return (
    <>
      <PageBackdrop tone="steel" />
      <div className="page-enter relative w-full flex-1 px-[1.3rem] pb-12 md:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-[5rem] lg:pb-[4rem]">
        <Suspense fallback={<MatchSkeleton />}>
          <MatchLoader {...props} />
        </Suspense>
      </div>
    </>
  );
}
