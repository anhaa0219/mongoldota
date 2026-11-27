"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useStoredState } from "@/app/(site)/_hooks/use-stored-state";

type DemoAction = "play" | "step" | "hold" | "stop" | "reset";
type DemoReply = { clockSeconds?: number | null; error?: string };

const TICK_MS = 1000;
/** While paused, keep the page "connected" (Dota counts as gone after 75 s without data). */
const HOLD_MS = 10_000;
/** Double speed builds the coach's tip history and pauses here, ready for the demo. */
const FAST_UNTIL_SECONDS = 32 * 60;
const modeSchema = z.object({ isPlaying: z.boolean(), speed: z.union([z.literal(1), z.literal(2)]) });
type DemoMode = z.infer<typeof modeSchema>;
const PAUSED: DemoMode = { isPlaying: false, speed: 1 };

/**
 * Drives the demo replay from this page: one step per second while playing (saved, so a refresh keeps playing),
 * a keep-alive while paused. Button presses wait for a tick in flight, so Stop is never undone by a late step.
 */
export function useDemoReplay(initialClock: number | null) {
  const [mode, setMode] = useStoredState("live-demo-mode", modeSchema, PAUSED);
  const [clock, setClock] = useState(initialClock);
  const [hasFailed, setHasFailed] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const isTicking = useRef(false);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const send = useCallback(
    async (action: DemoAction, seconds?: number) => {
      try {
        const response = await fetch("/api/live/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, seconds }),
        });
        const reply = (await response.json()) as DemoReply;
        setHasFailed(!response.ok);
        if (!response.ok) return;
        const next = reply.clockSeconds ?? null;
        setClock(next);
        const isFast = modeRef.current.isPlaying && modeRef.current.speed === 2;
        if (isFast && next !== null && next >= FAST_UNTIL_SECONDS) setMode(PAUSED);
      } catch {
        setHasFailed(true);
      }
    },
    [setMode],
  );

  const enqueue = useCallback(
    (action: DemoAction, seconds?: number) => {
      queue.current = queue.current.then(() => send(action, seconds));
      return queue.current;
    },
    [send],
  );

  useEffect(() => {
    const timer = setInterval(
      () => {
        if (isTicking.current) return;
        isTicking.current = true;
        void enqueue(mode.isPlaying ? "step" : "hold", mode.isPlaying ? mode.speed : undefined).finally(() => {
          isTicking.current = false;
        });
      },
      mode.isPlaying ? TICK_MS : HOLD_MS,
    );
    return () => clearInterval(timer);
  }, [mode.isPlaying, mode.speed, enqueue]);

  const play = (speed: DemoMode["speed"]) => {
    setMode({ isPlaying: true, speed });
    void enqueue("play", speed);
  };
  const pause = () => {
    setMode(PAUSED);
    void enqueue("hold");
  };
  const stop = () => {
    setMode(PAUSED);
    void enqueue("stop");
  };
  const reset = () => {
    setMode(PAUSED);
    void enqueue("reset");
  };

  return { clock, mode, hasFailed, play, pause, stop, reset };
}
