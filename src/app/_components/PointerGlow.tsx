"use client";

import { useEffect } from "react";

const PANEL = ".glass-panel";

/** Every glass panel under the pointer, innermost first. */
function panelsUnder(target: EventTarget | null) {
  const panels: HTMLElement[] = [];
  let panel = target instanceof Element ? target.closest<HTMLElement>(PANEL) : null;
  while (panel) {
    panels.push(panel);
    panel = panel.parentElement?.closest<HTMLElement>(PANEL) ?? null;
  }
  return panels;
}

/**
 * Makes the soft light on glass panels follow the pointer (the panel's CSS reads --spot-x / --spot-y).
 * One listener for the whole app, at most one update per frame, and only on devices with a mouse.
 */
export function PointerGlow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let latest: PointerEvent | null = null;

    function moveLight() {
      frame = 0;
      if (!latest) return;
      const { clientX, clientY, target } = latest;
      // Measure every panel first, then write, so the browser lays out at most once.
      const measured = panelsUnder(target).map((panel) => ({ panel, box: panel.getBoundingClientRect() }));
      for (const { panel, box } of measured) {
        panel.style.setProperty("--spot-x", `${Math.round(clientX - box.left)}px`);
        panel.style.setProperty("--spot-y", `${Math.round(clientY - box.top)}px`);
      }
    }

    function onPointerMove(event: PointerEvent) {
      latest = event;
      if (frame === 0) frame = requestAnimationFrame(moveLight);
    }

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
