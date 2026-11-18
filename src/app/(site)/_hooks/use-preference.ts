"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readStorage, subscribeStorage, writeStorage } from "../_utils/browser-storage";

/** A setting saved in this browser (localStorage), limited to `allowed` values. */
export function usePreference<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const stored = useSyncExternalStore(subscribeStorage, () => readStorage(key), () => null);
  const value = allowed.includes(stored as T) ? (stored as T) : fallback;
  const setValue = useCallback((next: T) => writeStorage(key, next), [key]);
  return [value, setValue] as const;
}
