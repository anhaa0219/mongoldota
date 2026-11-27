import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoControls } from "./_features/DemoControls";
import { LiveCoach } from "./_features/LiveCoach";
import { PageBackdrop } from "@/app/(site)/_components/PageBackdrop";
import { PlayerDataNotice } from "@/app/(site)/_components/PlayerDataNotice";
import { getAiUsage } from "@/lib/ai/ai-calls-store";
import { getDemoState } from "@/lib/live/demo-replay";
import { getLinkedAccountId, getLinkedSteamId } from "@/lib/steam/linked-account";
import { freshDraft } from "@/lib/live/live-freshness";
import { getLiveRow, hasGsiToken } from "@/lib/live/live-store";
import { getLockedDraft, getPlanTip, getTips } from "@/lib/live/live-tips-store";
import { getDraftHeroes, getItemIndex } from "@/lib/opendota/opendota-heroes";
import { requireUserId } from "@/app/(site)/_utils/require-user";
import { site } from "@/lib/site-content";
import { PageTitle } from "@/app/(site)/_components/PageTitle";

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
  // "This match" only counts while the player is in one.
  const usage = await getAiUsage(userId, row?.snapshot?.matchId ?? null);
  const items = [...itemIndex.byKey.values()].map(({ key, name, image, cost }) => ({ key, name, image, cost }));
  // eslint-disable-next-line react-hooks/purity -- request-time Server Component (after connection())
  const now = Date.now();
  const draft = freshDraft(locked, now);
  // Demo day: the player of the demo match gets replay buttons above the coach.
  const accountId = await getLinkedAccountId();
  const demo = accountId ? await getDemoState(Number(accountId), row?.snapshot) : null;

  const coach = (
    <LiveCoach
      clerkUserId={userId}
      initialFeed={{ snapshot: row?.snapshot ?? null, updatedAt: row ? row.updatedAt.getTime() : null }}
      initialTips={tips}
      initialPlan={planTip?.plan ? { matchId: planTip.matchId, items: planTip.plan } : null}
      initialHasToken={hasToken}
      initialNow={now}
      initialUsage={usage}
      draft={draft}
      heroes={heroes.map(({ id, name, slug, roles }) => ({ id, name, slug, roles }))}
      items={items}
    />
  );
  if (!demo) return coach;
  return (
    <>
      <DemoControls duration={demo.duration} initialClock={demo.clockSeconds} />
      {coach}
    </>
  );
}

/** Live Coach: the player's own game from Dota, live, with AI tips grounded in the locked draft and OpenDota data. */
export default function LivePage() {
  return (
    <>
      <PageBackdrop tone="live" />
      <div className="page-enter relative z-20 flex w-full flex-1 flex-col gap-[1.2rem] px-[1.3rem] pb-12 md:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-[5rem] lg:pb-[2.4rem]">
        <PageTitle id="live" />
        <Suspense fallback={<div className="glass-panel shimmer h-[18rem] rounded-[1.4rem]" />}>
          <LiveLoader />
        </Suspense>
      </div>
    </>
  );
}
