import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MATCH_TABS, MatchExplorer, type MatchTab } from "@/components/match/MatchExplorer";
import { PageBackdrop } from "@/components/PageBackdrop";
import { timeAgo } from "@/lib/format";
import { getLinkedAccountId } from "@/lib/linked-account";
import { parseMatchId } from "@/lib/match-id";
import { loadMatch } from "@/lib/match-store";
import { toMatchView } from "@/lib/match-view";
import { getHeroIndex, getItemIndex } from "@/lib/opendota-heroes";
import { site } from "@/lib/site-content";

export async function generateMetadata({ params }: PageProps<"/matches/[matchId]">): Promise<Metadata> {
  const { matchId } = await params;
  return { title: `Match ${matchId} · ${site.gameTitle}` };
}

function toTab(value: string | string[] | undefined): MatchTab {
  return MATCH_TABS.find((option) => option.id === value)?.id ?? "story";
}

function MatchSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-[1.2rem]">
      <div className="glass-panel h-[9rem] rounded-[1.8rem]" />
      <div className="glass-panel h-[24rem] rounded-[1.6rem]" />
      <div className="glass-panel h-[14rem] rounded-[1.6rem]" />
    </div>
  );
}

async function MatchLoader({ params, searchParams }: PageProps<"/matches/[matchId]">) {
  const matchId = parseMatchId((await params).matchId);
  if (matchId === null) notFound();

  // Request time: loadMatch and "ago" read the clock.
  await connection();
  const [raw, heroes, items, accountId] = await Promise.all([loadMatch(matchId), getHeroIndex(), getItemIndex(), getLinkedAccountId()]);
  if (!raw) {
    return (
      <div className="glass-panel flex flex-col items-start gap-[1rem] rounded-[1.6rem] p-[1.6rem]">
        <p className="text-[1.3rem] text-white/80">Could not load this match. Try again.</p>
        <Link href="/history" className="text-accent hover:underline">Back to History</Link>
      </div>
    );
  }

  const view = toMatchView(raw, heroes, items, accountId ? Number(accountId) : null);
  // eslint-disable-next-line react-hooks/purity -- request-time Server Component (after connection())
  const ago = timeAgo(view.header.startTime + view.header.durationSeconds * 1000, Date.now());
  return <MatchExplorer view={view} initialTab={toTab((await searchParams).tab)} ago={ago} />;
}

export default function MatchPage(props: PageProps<"/matches/[matchId]">) {
  return (
    <>
      <PageBackdrop />
      <div className="relative w-full flex-1 px-[1.3rem] pb-12 md:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-[5rem] lg:pb-[4rem]">
        <Suspense fallback={<MatchSkeleton />}>
          <MatchLoader {...props} />
        </Suspense>
      </div>
    </>
  );
}
