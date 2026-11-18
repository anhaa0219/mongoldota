"use client";

import { useWords } from "@/lib/i18n/use-words";

/** Placeholder while the AI picks load. A client component so the page can show it outside Suspense. */
export function PicksSkeleton() {
  const words = useWords();
  return <div className="glass-panel shimmer h-[15rem] rounded-[1.4rem]" aria-label={words.trending.loadingPicks} />;
}
