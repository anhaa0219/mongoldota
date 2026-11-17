"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLAN_RETRY_MS, markSpoke, stepCoach } from "@/lib/live-coach-timing";
import { absorbSnapshot, EMPTY_MEMORY, needsReplan, shouldAskPlan } from "@/lib/live-coach-state";
import type { LiveEvent, LiveFeed, LiveTip, Moment } from "@/types/live";

const TICK_MS = 1000;
/** No coaching on data older than this: Dota is closed or the connection dropped. */
const FRESH_MS = 60_000;
const FAILED = "The coach could not answer. Try again.";
const isEvent = (moment: Moment): moment is LiveEvent => moment.kind !== "teamkill";

interface CoachInput {
  feed: LiveFeed;
  /** This match's item plan, or null. */
  plan: string[] | null;
  costs: Map<string, number>;
  onTip: (tip: LiveTip) => void;
}

type CoachReply = { tip?: LiveTip; error?: string; skipped?: boolean };
type Outcome = "tip" | "skipped" | "busy" | "failed";

/**
 * Watches the live game, turns changes into coach events and asks /api/live/coach when the timing rules say so.
 * Asks for the item plan once per match (retrying after a minute) and again when the player buys off-plan.
 * Runs only while this page is open.
 */
export function useLiveCoach({ feed, plan, costs, onTip }: CoachInput): { asking: boolean; error: string | null; ask: () => void } {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memory = useRef(EMPTY_MEMORY);
  const planAsk = useRef<{ matchId: string | null; retryAt: number }>({ matchId: null, retryAt: 0 });
  const busy = useRef(false);
  const latest = useRef({ feed, plan, costs, onTip });

  useEffect(() => {
    latest.current = { feed, plan, costs, onTip };
  }, [feed, plan, costs, onTip]);

  const send = useCallback(async (events: LiveEvent[], replan = false): Promise<Outcome> => {
    if (busy.current) return "busy";
    busy.current = true;
    setAsking(true);
    try {
      const response = await fetch("/api/live/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinds: events.map((event) => event.kind), details: events.map((event) => event.detail), replan }),
      });
      const reply = (await response.json()) as CoachReply;
      if (reply.tip) latest.current.onTip(reply.tip);
      setError(response.ok || reply.skipped ? null : (reply.error ?? FAILED));
      return reply.tip ? "tip" : reply.skipped ? "skipped" : "failed";
    } catch {
      setError(FAILED);
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
      // No plan yet (failed, skipped or busy): allow another try after a minute.
      if (outcome !== "tip") planAsk.current = { matchId, retryAt: Date.now() + PLAN_RETRY_MS };
    },
    [send],
  );

  // Each new snapshot: remember it, queue its events, and make sure this match has a fitting item plan.
  const snapshot = feed.snapshot;
  useEffect(() => {
    if (!snapshot) return;
    const { plan: currentPlan, costs: currentCosts } = latest.current;
    const before = memory.current.queued.length;
    memory.current = absorbSnapshot(memory.current, snapshot, currentPlan, currentCosts);
    const fresh = memory.current.queued.slice(before);

    if (needsReplan(fresh, currentPlan, currentCosts)) void requestPlan(snapshot.matchId, true);
    else if (shouldAskPlan({ hasPlan: currentPlan !== null, matchId: snapshot.matchId, askedFor: planAsk.current.matchId, retryAt: planAsk.current.retryAt, nowMs: Date.now() })) {
      void requestPlan(snapshot.matchId, false);
    }
  }, [snapshot, requestPlan]);

  // Every second: let the timing rules decide whether the queued events (or a look-ahead) become a tip.
  useEffect(() => {
    const timer = setInterval(() => {
      const current = latest.current.feed;
      if (!current.snapshot || current.updatedAt === null || Date.now() - current.updatedAt > FRESH_MS || busy.current) return;
      const { state, fire } = stepCoach(memory.current.clock, { nowMs: Date.now(), clockSeconds: current.snapshot.clockSeconds, events: memory.current.queued.filter(isEvent) });
      memory.current = { ...memory.current, queued: [], clock: state };
      if (fire) void send(fire);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [send]);

  const ask = useCallback(() => {
    const current = latest.current.feed.snapshot;
    if (!current) return;
    memory.current = { ...memory.current, clock: markSpoke(memory.current.clock, Date.now(), current.clockSeconds) };
    void send([{ kind: "asked", detail: "" }]);
  }, [send]);

  return { asking, error, ask };
}
