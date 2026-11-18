"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * While `isOpen`, a press outside `rootRef` or the Escape key calls `onDismiss`.
 * Listens to `pointerdown` (not `mousedown`) so a tap closes it on phones too.
 */
export function useDismiss(rootRef: RefObject<HTMLElement | null>, isOpen: boolean, onDismiss: () => void): void {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onDismissRef.current();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismissRef.current();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [rootRef, isOpen]);
}
