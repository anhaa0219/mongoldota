import Image from "next/image";
import { Pointer } from "lucide-react";
import { heroPortrait } from "@/lib/hero-images";
import type { DraftHero, Position } from "@/types/draft";

const LANE_NAMES: Record<Position, string> = { 1: "Safe lane", 5: "Safe lane", 2: "Mid lane", 3: "Off lane", 4: "Off lane" };

function Portraits({ heroes, highlight }: { heroes: DraftHero[]; highlight?: number }) {
  if (heroes.length === 0) return <span className="text-[0.85rem] text-white/40">Set positions</span>;
  return (
    <span className="flex flex-col items-center gap-[0.35rem]">
      {heroes.map((hero) => (
        <span key={hero.id} className="flex flex-col items-center">
          <span className={`relative block h-[2.6rem] w-[4.6rem] overflow-hidden rounded-[0.5rem] ${hero.id === highlight ? "ring-2 ring-accent" : "ring-1 ring-white/15"}`}>
            <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="4.6rem" className="object-cover" />
          </span>
          <span className="mt-[0.1rem] max-w-[5rem] truncate text-[0.85rem] text-white/70">{hero.name}</span>
        </span>
      ))}
    </span>
  );
}

/** "Your lane": you (and your lane partner) against the enemies in your lane, from the positions set. */
export function LanePreview({ position, myHeroId, partners, opponents }: { position: Position | null; myHeroId: number | null; partners: DraftHero[]; opponents: DraftHero[] }) {
  return (
    <section aria-label="Your lane" className="flex flex-col items-center rounded-[1.1rem] bg-white/[0.04] px-[0.8rem] py-[0.7rem]">
      <h3 className="font-display text-[1.2rem] uppercase tracking-[0.08em] text-accent">{position ? LANE_NAMES[position] : "Your lane"}</h3>
      {myHeroId === null || position === null ? (
        <div className="m-auto flex max-w-[11rem] flex-col items-center gap-[0.6rem] text-center">
          <span className="grid size-[2.6rem] place-items-center rounded-full bg-accent/15 text-accent">
            <Pointer className="size-[1.2rem]" aria-hidden="true" />
          </span>
          <p className="text-[1rem] leading-snug text-white/70">Tap your hero on the left to see who you lane against.</p>
        </div>
      ) : (
        <div className="mt-[0.6rem] flex items-center gap-[0.8rem]">
          <Portraits heroes={partners} highlight={myHeroId} />
          <span className="font-display text-[1.3rem] text-white/40">VS</span>
          <Portraits heroes={opponents} />
        </div>
      )}
    </section>
  );
}
