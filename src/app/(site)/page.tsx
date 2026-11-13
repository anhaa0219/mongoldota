import { PageBackdrop } from "@/components/PageBackdrop";
import { PlayerStats } from "@/components/PlayerStats";

export default function StatsPage() {
  return (
    <>
      <PageBackdrop showHero />
      {/* Desktop: stats sit in the left half, vertically centred; the hero owns the right half */}
      <div className="relative w-full flex-1 pb-12 md:px-8 lg:flex lg:flex-col lg:justify-center lg:px-[5rem] lg:pb-[4rem]">
        <PlayerStats />
      </div>
    </>
  );
}
