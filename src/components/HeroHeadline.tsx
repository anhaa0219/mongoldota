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
    <div className="flex flex-col gap-[0.3rem] px-[1.4rem] first:pl-0 last:pr-0">
      <span className={`font-display text-[2.2rem] leading-none ${tone}`}>{value}</span>
      <span className="text-[0.95rem] uppercase tracking-[0.12em] text-white/55">{label}</span>
    </div>
  );
}

function LaneEmblem({ lane }: { lane: LaneRole }) {
  const { name, icon: LaneIcon } = lanes[lane];
  return (
    <div className="glass-panel flex items-center gap-[1rem] rounded-full py-[0.5rem] pl-[0.5rem] pr-[1.6rem]">
      <span className="grid size-[3.8rem] place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd9b8,#feba87_45%,#c9783f)] shadow-[0_0_1.4rem_rgb(254_186_135/0.45)]">
        <LaneIcon className="size-[1.7rem] text-ink" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[0.95rem] uppercase tracking-[0.14em] text-white/55">Main lane</span>
        <span className="font-display text-[1.9rem] uppercase leading-none tracking-[0.04em] text-white">{name}</span>
      </span>
    </div>
  );
}

/** "Your most played hero" + name, then the player's main lane and stats on that hero. */
export function HeroHeadline({ summary }: { summary: PlayerSummary }) {
  const { mostPlayed, mainLane } = summary;

  return (
    <header>
      <p className="mt-10 flex items-center gap-[0.8rem] font-display text-[1.8rem] uppercase tracking-[0.12em] text-accent lg:mt-0 lg:text-[2.2rem]">
        <span className="h-px w-[2.4rem] bg-accent/70" aria-hidden="true" />
        Your most played hero
      </p>
      <h1 className="title-metal font-display text-[6rem] uppercase leading-[0.9] tracking-[0.02em] lg:text-[12rem]">
        {mostPlayed.hero.name}
      </h1>

      <div className="mt-[1.6rem] flex flex-wrap items-center gap-[1.2rem]">
        {mainLane && <LaneEmblem lane={mainLane.lane} />}

        <div className="glass-panel flex items-center divide-x divide-white/10 rounded-[1.4rem] px-[1.6rem] py-[0.9rem]">
          <Stat value={String(mostPlayed.matches)} label="Matches" />
          <Stat value={`${Math.round(mostPlayed.winRate)}%`} label="Win rate" tone="text-radiant" />
          {mainLane && <Stat value={`${mainLane.share}%`} label="Main lane share" />}
        </div>
      </div>
    </header>
  );
}
