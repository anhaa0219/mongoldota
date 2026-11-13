import { PageBackdrop } from "@/components/PageBackdrop";
import { PlayerStats } from "@/components/PlayerStats";

export default function StatsPage() {
  return (
    <>
      <PageBackdrop showHero />
      <div className="relative mx-auto w-full max-w-[103.125rem] flex-1 pb-12 md:px-8 lg:px-0 lg:pb-0">
        <PlayerStats />
      </div>
    </>
  );
}
