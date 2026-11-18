"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectDota } from "./ConnectDota";
import { DraftStrip } from "../_components/DraftStrip";
import { LivePanel } from "../_components/LivePanel";
import { PositionPicker } from "../_components/PositionPicker";
import { TipList } from "../_components/TipList";
import { limitMessage, localTime } from "@/lib/ai/ai-limits";
import { isDotaConnected } from "@/lib/live/live-freshness";
import { isHeld } from "../_utils/coach-limit";
import type { LiveFeedState } from "@/lib/live/live-rows";
import { useLiveCoach } from "../_hooks/use-live-coach";
import { useLiveFeed } from "../_hooks/use-live-feed";
import { useLivePosition } from "../_hooks/use-live-position";
import type { AiUsage } from "@/types/ai";
import type { LiveFeed, LiveTip, LockedDraft } from "@/types/live";
import { useWords } from "@/lib/i18n/use-words";

const CLOCK_TICK_MS = 10_000;

export interface LiveCoachProps {
  clerkUserId: string;
  initialFeed: LiveFeed;
  initialTips: LiveTip[];
  initialPlan: LiveFeedState["plan"];
  initialHasToken: boolean;
  /** The server's clock, so the first render matches. */
  initialNow: number;
  /** AI calls used (null when nothing is counted, e.g. no database). */
  initialUsage: AiUsage | null;
  draft: LockedDraft | null;
  heroes: { id: number; name: string; slug: string; roles: string[] }[];
  items: { key: string; name: string; image: string; cost: number }[];
}

/** The Live Coach page body: setup until Dota connects, then the live game, the draft and the coach's tips. */
export function LiveCoach({ clerkUserId, initialFeed, initialTips, initialPlan, initialHasToken, initialNow, initialUsage, draft, heroes, items }: LiveCoachProps) {
  const [hasToken, setHasToken] = useState(initialHasToken);
  const words = useWords();
  const aiWords = words.ai;
  const [now, setNow] = useState(initialNow);
  /** Dota's last update when a new setup file was downloaded; undefined when none was this visit. */
  const [resetFrom, setResetFrom] = useState<number | null | undefined>(undefined);
  const { feed, tips, plan, addLocalTip } = useLiveFeed({ feed: initialFeed, tips: initialTips, plan: initialPlan }, clerkUserId);
  const costs = useMemo(() => new Map(items.map((item) => [item.key, item.cost])), [items]);
  const itemInfo = useMemo(() => new Map(items.map((item) => [item.key, { name: item.name, image: item.image }])), [items]);
  const heroNames = useMemo(() => new Map(heroes.map((hero) => [hero.id, hero.name])), [heroes]);
  const { position, isGuess, choose } = useLivePosition(feed.snapshot, draft, heroes);
  const coach = useLiveCoach({ feed, plan, costs, onTip: addLocalTip, position, positionIsGuess: isGuess, initialUsage });

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
  // Rendered with the page clock (`now`), so the line goes away within 10 s of the limit freeing up.
  const limitText = coach.held && isHeld(coach.held, snapshot?.matchId ?? null, now) ? limitMessage(coach.held.limit, localTime, aiWords) : null;
  // "This match" only while in one.
  const usage = snapshot ? coach.usage : coach.usage && { ...coach.usage, match: null };
  const tipList = (
    <TipList tips={tips} asking={coach.asking} error={coach.error} canAsk={snapshot !== null} onAsk={coach.ask} usage={usage} limitText={limitText} />
  );

  if (!snapshot) {
    return (
      <div className="flex flex-col gap-[1rem]">
        <p className="glass-panel rounded-[1.2rem] px-[1rem] py-[0.8rem] text-[1.05rem] text-radiant">{words.live.connected}</p>
        {tipList}
        <details className="text-white/70">
          <summary className="cursor-pointer text-[0.95rem]">{words.live.setupReset}</summary>
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
          {words.live.disclaimer}
        </p>
      </div>
      {tipList}
    </div>
  );
}
