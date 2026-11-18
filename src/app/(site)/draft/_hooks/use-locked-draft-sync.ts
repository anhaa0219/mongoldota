"use client";

import { useEffect } from "react";
import type { LockedDraft } from "@/types/live";

const SYNC_DELAY_MS = 800;

/**
 * Saves the locked draft for Live Coach shortly after it last changed (side, hero or a position).
 * Failures are ignored: the Draft page keeps working from this browser's storage either way.
 */
export function useLockedDraftSync(draft: LockedDraft | null): void {
  const key = draft ? JSON.stringify(draft) : null;

  useEffect(() => {
    if (key === null) return;
    const timer = setTimeout(() => {
      fetch("/api/draft/lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: key }).catch(() => undefined);
    }, SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key]);
}
