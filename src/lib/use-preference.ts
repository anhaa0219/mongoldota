"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "preference-change";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

/** A setting saved in this browser (localStorage), limited to `allowed` values. */
export function usePreference<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const stored = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = allowed.includes(stored as T) ? (stored as T) : fallback;

  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, setValue] as const;
}
