import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryList } from "./_features/HistoryList";
import { PageBackdrop } from "@/app/(site)/_components/PageBackdrop";
import { site } from "@/lib/site-content";
import { PageTitle } from "@/app/(site)/_components/PageTitle";

export const metadata: Metadata = {
  title: `History · ${site.gameTitle}`,
};

/** Placeholder rows while OpenDota answers. */
function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-[0.6rem]">
      {Array.from({ length: 8 }, (_, row) => (
        <div key={row} className="glass-panel shimmer h-[4.1rem] rounded-[1.2rem]" />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <>
      <PageBackdrop tone="steel" />
      {/* Scrolls inside the fixed-height desktop frame */}
      <div className="page-enter relative flex w-full flex-1 flex-col gap-[1.6rem] px-[1.3rem] pb-12 md:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-[5rem] lg:pb-[4rem]">
        <PageTitle id="history" />
        <Suspense fallback={<HistorySkeleton />}>
          <HistoryList />
        </Suspense>
      </div>
    </>
  );
}
