"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectDota } from "@/components/live/ConnectDota";
import { DraftStrip } from "@/components/live/DraftStrip";
import { LivePanel } from "@/components/live/LivePanel";
import { PositionPicker } from "@/components/live/PositionPicker";
import { TipList } from "@/components/live/TipList";
import { isDotaConnected } from "@/lib/live-freshness";
import type { LiveFeedState } from "@/lib/live-rows";
import { useLiveCoach } from "@/lib/use-live-coach";
import { useLiveFeed } from "@/lib/use-live-feed";
import { useLivePosition } from "@/lib/use-live-position";
import type { LiveFeed, LiveTip, LockedDraft } from "@/types/live";

const CLOCK_TICK_MS = 10_000;

export interface LiveCoachProps {
  clerkUserId: string;
  initialFeed: LiveFeed;
  initialTips: LiveTip[];
  initialPlan: LiveFeedState["plan"];
  initialHasToken: boolean;
  /** The server's clock, so the first render matches. */
  initialNow: number;
  draft: LockedDraft | null;
  heroes: { id: number; name: string; slug: string; roles: string[] }[];
  items: { key: string; name: string; image: string; cost: number }[];
}

/** The Live Coach page body: setup until Dota connects, then the live game, the draft and the coach's tips. */
export function LiveCoach({ clerkUserId, initialFeed, initialTips, initialPlan, initialHasToken, initialNow, draft, heroes, items }: LiveCoachProps) {
  const [hasToken, setHasToken] = useState(initialHasToken);
  const [now, setNow] = useState(initialNow);
  /** Dota's last update when a new setup file was downloaded; undefined when none was this visit. */
  const [resetFrom, setResetFrom] = useState<number | null | undefined>(undefined);
  const { feed, tips, plan, addLocalTip } = useLiveFeed({ feed: initialFeed, tips: initialTips, plan: initialPlan }, clerkUserId);
  const costs = useMemo(() => new Map(items.map((item) => [item.key, item.cost])), [items]);
  const itemInfo = useMemo(() => new Map(items.map((item) => [item.key, { name: item.name, image: item.image }])), [items]);
  const heroNames = useMemo(() => new Map(heroes.map((hero) => [hero.id, hero.name])), [heroes]);
  const { position, isGuess, choose } = useLivePosition(feed.snapshot, draft, heroes);
  const coach = useLiveCoach({ feed, plan, costs, onTip: addLocalTip, position, positionIsGuess: isGuess });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const connected = isDotaConnected({ updatedAt: feed.updatedAt, nowMs: now, resetFrom });
  const onDownloaded = () => {
    setHasToken(true);
    setResetFrom(feed.updatedAt);
  };
  const setup = <ConnectDota connected={connected} hasToken={hasToken} lastSeen={feed.updatedAt} now={now} onDownloaded={onDownloaded} />;
  if (!connected) return setup;

  const { snapshot } = feed;
  const tipList = <TipList tips={tips} asking={coach.asking} error={coach.error} canAsk={snapshot !== null} onAsk={coach.ask} />;

  if (!snapshot) {
    return (
      <div className="flex flex-col gap-[1rem]">
        <p className="glass-panel rounded-[1.2rem] px-[1rem] py-[0.8rem] text-[1.05rem] text-radiant">✓ Connected. Start a match to get live coaching.</p>
        {tipList}
        <details className="text-white/70">
          <summary className="cursor-pointer text-[0.95rem]">Setup and reset connection</summary>
          <div className="mt-[0.8rem]">{setup}</div>
        </details>
      </div>
    );
  }

  const heroName = heroes.find((hero) => hero.slug === snapshot.heroKey)?.name ?? snapshot.heroKey;
  return (
    <div className="grid min-h-0 flex-1 gap-[1rem] lg:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)]">
      <div className="flex min-w-0 flex-col gap-[1rem]">
        <LivePanel snapshot={snapshot} heroName={heroName} items={itemInfo} updatedAt={feed.updatedAt} now={now} />
        {position !== null && <PositionPicker value={position} isGuess={isGuess} onChange={choose} />}
        <DraftStrip draft={draft} heroNames={heroNames} liveHeroId={snapshot.heroId} />
        <p className="text-[0.85rem] text-white/45">
          Numbers come from your game and OpenDota. Tips are written by AI (Qwen) and can get small details wrong.
        </p>
      </div>
      {tipList}
    </div>
  );
}
