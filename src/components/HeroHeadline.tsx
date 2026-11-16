import { Crosshair, Shield, Sword, Trees, type LucideIcon } from "lucide-react";
import type { LaneRole, PlayerSummary } from "@/types/opendota";

const lanes: Record<LaneRole, { name: string; icon: LucideIcon }> = {
  1: { name: "Safe lane", icon: Sword },
  2: { name: "Mid lane", icon: Crosshair },
  3: { name: "Off lane", icon: Shield },
  4: { name: "Jungle", icon: Trees },
};

function Stat({ value, label, tone = "text-white" }: { value: string; label: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-[0.25rem] px-[1.2rem] first:pl-0 last:pr-0">
      <span className={`font-display text-[1.9rem] leading-none ${tone}`}>{value}</span>
      <span className="text-[0.85rem] uppercase tracking-[0.12em] text-white/55">{label}</span>
    </div>
  );
}

/** The lane played most, and in what share of the matches whose lane OpenDota knows (all heroes). */
function LaneEmblem({ lane, share }: NonNullable<PlayerSummary["mainLane"]>) {
  const { name, icon: LaneIcon } = lanes[lane];
  return (
    <div
      className="glass-panel flex items-center gap-[0.8rem] rounded-full py-[0.4rem] pl-[0.4rem] pr-[1.4rem]"
      title={`${share}% of your analysed matches (all heroes) were in the ${name.toLowerCase()}. Unanalysed matches have no lane data.`}
    >
      <span className="grid size-[3rem] place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd9b8,#feba87_45%,#c9783f)] shadow-[0_0_1.2rem_rgb(254_186_135/0.45)]">
        <LaneIcon className="size-[1.4rem] text-ink" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[1.6rem] uppercase leading-none tracking-[0.04em] text-white">{name}</span>
        <span className="mt-[0.2rem] text-[0.85rem] text-white/60">Main lane · {share}% of analysed games</span>
      </span>
    </div>
  );
}

/** "Your most played hero" + name, then the player's main lane and their record on that hero. */
export function HeroHeadline({ summary }: { summary: PlayerSummary }) {
  const { mostPlayed, mainLane } = summary;

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-[2rem] gap-y-[1rem]">
      <div className="min-w-0">
        <p className="mt-10 flex items-center gap-[0.7rem] font-display text-[1.5rem] uppercase tracking-[0.12em] text-accent lg:mt-0">
          <span className="h-px w-[2rem] bg-accent/70" aria-hidden="true" />
          Your most played hero
        </p>
        <h1 className="title-metal font-display text-[5.4rem] uppercase leading-[0.9] tracking-[0.02em] lg:text-[6.4rem]">
          {mostPlayed.hero.name}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-[1rem]">
        {mainLane && <LaneEmblem {...mainLane} />}
        <div className="glass-panel flex items-center divide-x divide-white/10 rounded-[1.2rem] px-[1.4rem] py-[0.7rem]">
          <Stat value={String(mostPlayed.matches)} label={`${mostPlayed.hero.name} games`} />
          <Stat value={`${Math.round(mostPlayed.winRate)}%`} label="Win rate" tone="text-radiant" />
        </div>
      </div>
    </header>
  );
}
