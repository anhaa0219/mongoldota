"use client";

import { useSession } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { applyTip, rowToFeed, rowToTip, type LiveFeedState, type LiveStateRow, type LiveTipRow } from "@/lib/live/live-rows";
import { createBrowserSupabase } from "../_utils/supabase-browser";
import type { LiveFeed, LiveTip } from "@/types/live";

/** Realtime can report "connected" yet deliver nothing if the auth setup is wrong, so a slow poll always runs. */
const POLL_MS = 5_000;
const SAFETY_POLL_MS = 15_000;

/**
 * The player's live game, coach tips and item plan: pushed by Supabase Realtime (own rows only, by RLS),
 * with polling of /api/live/state as a fallback. Tips from an earlier match drop out when a new one starts.
 */
export function useLiveFeed(
  initial: LiveFeedState,
  clerkUserId: string,
): { feed: LiveFeed; tips: LiveTip[]; plan: string[] | null; realtime: boolean; addLocalTip: (tip: LiveTip) => void } {
  const { session } = useSession();
  const sessionRef = useRef(session);
  const [state, setState] = useState(initial);
  const [realtime, setRealtime] = useState(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const sessionId = session?.id ?? null;
  useEffect(() => {
    if (!sessionId) return;
    const client = createBrowserSupabase(async () => (await sessionRef.current?.getToken()) ?? null);
    if (!client) return;
    const filter = `clerk_user_id=eq.${clerkUserId}`;
    const channel = client
      .channel(`live-coach-${clerkUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_states", filter }, (payload) => {
        const row = payload.new as Partial<LiveStateRow>;
        if (typeof row.updated_at !== "string") return;
        const feed = rowToFeed({ snapshot: row.snapshot ?? null, updated_at: row.updated_at });
        setState((current) => ({ ...current, feed }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_tips", filter }, (payload) => {
        const tip = rowToTip(payload.new as LiveTipRow);
        if (tip) setState((current) => applyTip(current, tip));
      })
      .subscribe((status) => setRealtime(status === "SUBSCRIBED"));
    return () => {
      void client.removeChannel(channel);
    };
  }, [sessionId, clerkUserId]);

  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch("/api/live/state", { cache: "no-store" });
        if (response.ok) setState((await response.json()) as LiveFeedState);
      } catch {
        // Offline for a moment: the next poll tries again.
      }
    };
    const timer = setInterval(poll, realtime ? SAFETY_POLL_MS : POLL_MS);
    return () => clearInterval(timer);
  }, [realtime]);

  const matchId = state.feed.snapshot?.matchId ?? null;
  const tips = matchId ? state.tips.filter((tip) => tip.matchId === matchId) : state.tips;
  const plan = state.plan && state.plan.matchId === matchId ? state.plan.items : null;
  const addLocalTip = (tip: LiveTip) => setState((current) => applyTip(current, tip));
  return { feed: state.feed, tips, plan, realtime, addLocalTip };
}
