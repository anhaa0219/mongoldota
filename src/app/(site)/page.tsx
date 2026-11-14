import { Suspense } from "react";
import { PageBackdrop } from "@/components/PageBackdrop";
import { StatsView } from "@/components/StatsView";

/** Placeholder while OpenDota answers: the three stat panels, pulsing. */
function StatsSkeleton() {
  return (
    <>
      <PageBackdrop />
      <div className="w-full flex-1 px-[1.3rem] pb-12 md:px-8 lg:flex lg:flex-col lg:justify-center lg:px-[5rem]">
        <div className="mt-[2.2rem] grid animate-pulse gap-[1.2rem] md:grid-cols-3 lg:max-w-[62rem]">
          {[0, 1, 2].map((panel) => (
            <div key={panel} className="glass-panel h-[16rem] rounded-[1.6rem]" />
          ))}
        </div>
      </div>
    </>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      <StatsView />
    </Suspense>
  );
}
