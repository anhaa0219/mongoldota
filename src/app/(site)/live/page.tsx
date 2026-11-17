import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LiveCoach } from "@/components/live/LiveCoach";
import { PageBackdrop } from "@/components/PageBackdrop";
import { PlayerDataNotice } from "@/components/PlayerDataNotice";
import { getLinkedSteamId } from "@/lib/linked-account";
import { freshDraft } from "@/lib/live-freshness";
import { getLiveRow, hasGsiToken } from "@/lib/live-store";
import { getLockedDraft, getPlanTip, getTips } from "@/lib/live-tips-store";
import { getDraftHeroes, getItemIndex } from "@/lib/opendota-heroes";
import { requireUserId } from "@/lib/require-user";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Live Coach · ${site.gameTitle}`,
};

/** Everything Live Coach needs on first render: the player's live row, tips, draft, and hero and item names. */
async function LiveLoader() {
  const userId = await requireUserId();
  if (!(await getLinkedSteamId())) return <PlayerDataNotice reason="not-linked" />;

  // Request time: the page compares "now" with Dota's last update.
  await connection();
  const [row, hasToken, locked, heroes, itemIndex] = await Promise.all([getLiveRow(userId), hasGsiToken(userId), getLockedDraft(userId), getDraftHeroes(), getItemIndex()]);
  const [tips, planTip] = row?.matchId ? await Promise.all([getTips(userId, row.matchId), getPlanTip(userId, row.matchId)]) : [[], null];
  const items = [...itemIndex.byKey.values()].map(({ key, name, image, cost }) => ({ key, name, image, cost }));
  // eslint-disable-next-line react-hooks/purity -- request-time Server Component (after connection())
  const now = Date.now();
  const draft = freshDraft(locked, now);

  return (
    <LiveCoach
      clerkUserId={userId}
      initialFeed={{ snapshot: row?.snapshot ?? null, updatedAt: row ? row.updatedAt.getTime() : null }}
      initialTips={tips}
      initialPlan={planTip?.plan ? { matchId: planTip.matchId, items: planTip.plan } : null}
      initialHasToken={hasToken}
      initialNow={now}
      draft={draft}
      heroes={heroes.map(({ id, name, slug, roles }) => ({ id, name, slug, roles }))}
      items={items}
    />
  );
}

/** Live Coach: the player's own game from Dota, live, with AI tips grounded in the locked draft and OpenDota data. */
export default function LivePage() {
  return (
    <>
      <PageBackdrop />
      <div className="relative z-20 flex w-full flex-1 flex-col gap-[1.2rem] px-[1.3rem] pb-12 md:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-[5rem] lg:pb-[2.4rem]">
        <h1 className="title-metal font-display text-[3.5rem] uppercase leading-none lg:text-[5rem]">Live Coach</h1>
        <Suspense fallback={<div className="glass-panel h-[18rem] animate-pulse rounded-[1.4rem]" />}>
          <LiveLoader />
        </Suspense>
      </div>
    </>
  );
}
