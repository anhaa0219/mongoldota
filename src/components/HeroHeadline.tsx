import { Crosshair, HeartHandshake, Shield, Sparkles, Sword, type LucideIcon } from "lucide-react";
import { player } from "@/lib/player-stats";

/** Icon for each Dota position (1 Carry … 5 Hard Support). */
const positionIcons: Record<number, LucideIcon> = {
  1: Sword,
  2: Crosshair,
  3: Shield,
  4: Sparkles,
  5: HeartHandshake,
};

function Stat({ value, label, tone = "text-white" }: { value: string; label: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-[0.3rem] px-[1.4rem] first:pl-0 last:pr-0">
      <span className={`font-display text-[2.2rem] leading-none ${tone}`}>{value}</span>
      <span className="text-[0.95rem] uppercase tracking-[0.12em] text-white/55">{label}</span>
    </div>
  );
}

/** "Your best hero is URSA", then the player's position emblem and hero stats. */
export function HeroHeadline() {
  const { bestHero, role } = player;
  const PositionIcon = positionIcons[role.position] ?? Sword;

  return (
    <header>
      <p className="mt-10 flex items-center gap-[0.8rem] font-display text-[1.8rem] uppercase tracking-[0.12em] text-accent lg:mt-0 lg:text-[2.2rem]">
        <span className="h-px w-[2.4rem] bg-accent/70" aria-hidden="true" />
        Your best hero is
      </p>
      <h1 className="title-metal font-display text-[6rem] uppercase leading-[0.9] tracking-[0.02em] lg:text-[12rem]">
        {bestHero.name}
      </h1>

      <div className="mt-[1.6rem] flex flex-wrap items-center gap-[1.2rem]">
        {/* Position emblem */}
        <div className="glass-panel flex items-center gap-[1rem] rounded-full py-[0.5rem] pl-[0.5rem] pr-[1.6rem]">
          <span className="relative grid size-[3.8rem] place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd9b8,#feba87_45%,#c9783f)] shadow-[0_0_1.4rem_rgb(254_186_135/0.45)]">
            <span className="font-display text-[2rem] leading-none text-ink">{role.position}</span>
            <span className="absolute -bottom-[0.2rem] -right-[0.2rem] grid size-[1.6rem] place-items-center rounded-full bg-ink ring-2 ring-accent/70">
              <PositionIcon className="size-[0.95rem] text-accent" aria-hidden="true" />
            </span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[0.95rem] uppercase tracking-[0.14em] text-white/55">Position {role.position}</span>
            <span className="font-display text-[1.9rem] uppercase leading-none tracking-[0.04em] text-white">{role.name}</span>
          </span>
        </div>

        {/* Hero stats */}
        <div className="glass-panel flex items-center divide-x divide-white/10 rounded-[1.4rem] px-[1.6rem] py-[0.9rem]">
          <Stat value={String(bestHero.matches)} label="Matches" />
          <Stat value={`${bestHero.winRate}%`} label="Win rate" tone="text-radiant" />
          <Stat value={`${role.share}%`} label={`Games as Pos ${role.position}`} />
        </div>
      </div>
    </header>
  );
}
