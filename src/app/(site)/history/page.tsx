import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryList } from "@/components/HistoryList";
import { PageBackdrop } from "@/components/PageBackdrop";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `History · ${site.gameTitle}`,
};

/** Placeholder rows while OpenDota answers. */
function HistorySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-[0.6rem]">
      {Array.from({ length: 8 }, (_, row) => (
        <div key={row} className="glass-panel h-[4.1rem] rounded-[1.2rem]" />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <>
      <PageBackdrop />
      {/* Scrolls inside the fixed-height desktop frame */}
      <div className="relative flex w-full flex-1 flex-col gap-[1.6rem] px-[1.3rem] pb-12 md:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-[5rem] lg:pb-[4rem]">
        <h1 className="title-metal font-display text-[3.5rem] uppercase leading-none lg:text-[5rem]">History</h1>
        <Suspense fallback={<HistorySkeleton />}>
          <HistoryList />
        </Suspense>
      </div>
    </>
  );
}
