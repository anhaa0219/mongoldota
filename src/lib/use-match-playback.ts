"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True when the visitor asked the OS for less motion (false while rendering on the server). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
}

/**
 * Advances `time` (seconds) by `speed` game-seconds per real second while `active`.
 * One animation frame per render; calls `onEnd` when the match end is reached.
 */
export function useMatchPlayback(
  active: boolean,
  time: number,
  speed: number,
  duration: number,
  setTime: (time: number) => void,
  onEnd: () => void,
) {
  const lastFrame = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      lastFrame.current = null;
      return;
    }
    const frame = requestAnimationFrame((now) => {
      const realMs = lastFrame.current === null ? 16 : now - lastFrame.current;
      lastFrame.current = now;
      const next = Math.min(duration, time + (realMs / 1000) * speed);
      setTime(next);
      if (next >= duration) onEnd();
    });
    return () => cancelAnimationFrame(frame);
  }, [active, time, speed, duration, setTime, onEnd]);
}
