"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLAN_RETRY_MS, markSpoke, stepCoach } from "@/lib/live/live-coach-timing";
import type { AiLimit, AiUsage } from "@/types/ai";
import type { Position } from "@/types/draft";
import type { LiveEvent, LiveFeed, LiveTip } from "@/types/live";
import { isHeld, type HeldLimit } from "../_utils/coach-limit";
import { absorbSnapshot, EMPTY_MEMORY, needsReplan, shouldAskPlan } from "../_utils/live-coach-state";
import { useWords } from "@/lib/i18n/use-words";

const TICK_MS = 1000;
/** No coaching on data older than this: Dota is closed or the connection dropped. */
const FRESH_MS = 60_000;

interface CoachInput {
  feed: LiveFeed;
  /** This match's item plan, or null. */
  plan: string[] | null;
  costs: Map<string, number>;
  onTip: (tip: LiveTip) => void;
  /** The position picked on the page; null when a locked draft gives it. */
  position: Position | null;
  /** True while that position is only a guess from the hero's roles. */
  positionIsGuess: boolean;
  initialUsage: AiUsage | null;
}

type CoachReply = { tip?: LiveTip; error?: string; skipped?: boolean; limit?: AiLimit; usage?: AiUsage | null };
type Outcome = "tip" | "skipped" | "busy" | "limited" | "failed";

interface CoachState {
  asking: boolean;
  error: string | null;
  ask: () => void;
  usage: AiUsage | null;
  /** The last AI limit reached; see isHeld for whether it still applies. */
  held: HeldLimit | null;
}

/**
 * Watches the live game, turns changes into coach events and asks /api/live/coach when the timing rules say so.
 * Asks for the item plan once per match (retrying after a minute) and again when the player buys off-plan.
 * While an AI limit holds, it asks for nothing (no tips, no plan, no Ask coach). Runs only while this page is open.
 */
export function useLiveCoach({ feed, plan, costs, onTip, position, positionIsGuess, initialUsage }: CoachInput): CoachState {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState(initialUsage);
  const [held, setHeld] = useState<HeldLimit | null>(null);
  const heldRef = useRef<HeldLimit | null>(null);
  const memory = useRef(EMPTY_MEMORY);
  const planAsk = useRef<{ matchId: string | null; retryAt: number }>({ matchId: null, retryAt: 0 });
  const busy = useRef(false);
  const failed = useWords().live.coach.failed;
  const latest = useRef({ feed, plan, costs, onTip, position, positionIsGuess, failed });

  useEffect(() => {
    latest.current = { feed, plan, costs, onTip, position, positionIsGuess, failed };
  }, [feed, plan, costs, onTip, position, positionIsGuess, failed]);

  const isBlocked = useCallback(() => isHeld(heldRef.current, latest.current.feed.snapshot?.matchId ?? null, Date.now()), []);

  const send = useCallback(async (events: LiveEvent[], replan = false): Promise<Outcome> => {
    if (busy.current) return "busy";
    busy.current = true;
    setAsking(true);
    try {
      const response = await fetch("/api/live/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinds: events.map((event) => event.kind), details: events.map((event) => event.detail), replan, position: latest.current.position ?? undefined, positionIsGuess: latest.current.positionIsGuess }),
      });
      const reply = (await response.json()) as CoachReply;
      if (reply.usage !== undefined) setUsage(reply.usage);
      if (reply.tip) latest.current.onTip(reply.tip);
      if (reply.limit) {
        heldRef.current = { limit: reply.limit, matchId: latest.current.feed.snapshot?.matchId ?? "" };
        setHeld(heldRef.current);
        setError(null);
        return "limited";
      }
      setError(response.ok || reply.skipped ? null : (reply.error ?? latest.current.failed));
      return reply.tip ? "tip" : reply.skipped ? "skipped" : "failed";
    } catch {
      setError(latest.current.failed);
      return "failed";
    } finally {
      busy.current = false;
      setAsking(false);
    }
  }, []);

  const requestPlan = useCallback(
    async (matchId: string, replan: boolean) => {
      planAsk.current = { matchId, retryAt: Number.POSITIVE_INFINITY };
      const outcome = await send([{ kind: "plan", detail: "" }], replan);
      // No plan yet (failed, skipped, busy or limited): allow another try after a minute, once nothing holds it back.
      if (outcome !== "tip") planAsk.current = { matchId, retryAt: Date.now() + PLAN_RETRY_MS };
    },
    [send],
  );

  // Each new snapshot: remember it, queue its events, and make sure this match has a fitting item plan.
  const snapshot = feed.snapshot;
  useEffect(() => {
    if (!snapshot) return;
    const { plan: currentPlan, costs: currentCosts } = latest.current;
    const previous = memory.current.previous;
    // A new match starts its own count (the page's first snapshot already has the right one from the server).
    if (previous && previous.matchId !== snapshot.matchId) setUsage((current) => current && { ...current, match: 0 });
    const before = memory.current.queued.length;
    memory.current = absorbSnapshot(memory.current, snapshot, currentPlan, currentCosts);
    const fresh = memory.current.queued.slice(before);
    if (isBlocked()) return;

    if (needsReplan(fresh, currentPlan, currentCosts)) void requestPlan(snapshot.matchId, true);
    else if (shouldAskPlan({ hasPlan: currentPlan !== null, matchId: snapshot.matchId, askedFor: planAsk.current.matchId, retryAt: planAsk.current.retryAt, nowMs: Date.now() })) {
      void requestPlan(snapshot.matchId, false);
    }
  }, [snapshot, requestPlan, isBlocked]);

  // Every second: let the timing rules decide whether the queued events (or a look-ahead) become a tip.
  useEffect(() => {
    const timer = setInterval(() => {
      const current = latest.current.feed;
      if (!current.snapshot || current.updatedAt === null || Date.now() - current.updatedAt > FRESH_MS || busy.current) return;
      // At a limit, moments are dropped rather than saved up for one big burst when it frees up.
      if (isBlocked()) {
        memory.current = { ...memory.current, queued: [] };
        return;
      }
      const { state, fire } = stepCoach(memory.current.clock, { nowMs: Date.now(), clockSeconds: current.snapshot.clockSeconds, moments: memory.current.queued });
      memory.current = { ...memory.current, queued: [], clock: state };
      if (fire) void send(fire);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [send, isBlocked]);

  const ask = useCallback(() => {
    const current = latest.current.feed.snapshot;
    if (!current || isBlocked()) return;
    memory.current = { ...memory.current, clock: markSpoke(memory.current.clock, Date.now(), current.clockSeconds) };
    void send([{ kind: "asked", detail: "" }]);
  }, [send, isBlocked]);

  return { asking, error, ask, usage, held };
}
