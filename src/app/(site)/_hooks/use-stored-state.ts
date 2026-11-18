"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { z } from "zod";
import { readStorage, subscribeStorage, writeStorage } from "../_utils/browser-storage";

function parse<T>(raw: string | null, schema: z.ZodType<T>, fallback: T): T {
  if (raw === null) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Like useState, but saved as JSON in this browser so it survives a refresh. Values that no longer match
 * `schema` (old format, edited by hand) fall back to `fallback`. Keep `fallback` stable (a module constant).
 * The server render and first paint use `fallback`; the saved value appears right after.
 */
export function useStoredState<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  const raw = useSyncExternalStore(subscribeStorage, () => readStorage(key), () => null);
  const value = useMemo(() => parse(raw, schema, fallback), [raw, schema, fallback]);

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      // Read the latest saved value so quick successive updates build on each other.
      const current = parse(readStorage(key), schema, fallback);
      writeStorage(key, JSON.stringify(typeof next === "function" ? (next as (current: T) => T)(current) : next));
    },
    [key, schema, fallback],
  );

  return [value, setValue] as const;
}
