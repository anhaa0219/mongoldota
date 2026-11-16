import Image from "next/image";
import { heroPortrait } from "@/lib/hero-images";
import type { DraftHero } from "@/types/draft";
import type { Side } from "@/types/game";

const STYLES: Record<Side, { label: string; active: string; text: string }> = {
  radiant: { label: "Radiant", active: "border-radiant bg-radiant/15 shadow-[0_0_1.6rem_rgb(146_200_74/0.35)]", text: "text-radiant" },
  dire: { label: "Dire", active: "border-dire bg-dire/15 shadow-[0_0_1.6rem_rgb(226_73_47/0.35)]", text: "text-dire" },
};

/** Two big cards: tap the side you are playing on. */
export function SideSwitch({ mySide, teams, onChange }: { mySide: Side; teams: Record<Side, DraftHero[]>; onChange: (side: Side) => void }) {
  return (
    <div className="grid grid-cols-2 gap-[0.8rem]" role="radiogroup" aria-label="Which side are you on?">
      {(["radiant", "dire"] as const).map((side) => {
        const isMine = mySide === side;
        const { label, active, text } = STYLES[side];
        return (
          <button
            key={side}
            type="button"
            role="radio"
            aria-checked={isMine}
            onClick={() => onChange(side)}
            className={`flex items-center gap-[1rem] rounded-[1.2rem] border-2 px-[1rem] py-[0.7rem] text-left transition ${isMine ? active : "border-white/10 bg-white/[0.04] opacity-70 hover:opacity-100"}`}
          >
            <span className="min-w-[7rem]">
              <span className={`block font-display text-[1.7rem] uppercase leading-none ${text}`}>{label}</span>
              <span className="mt-[0.2rem] block text-[0.85rem] text-white/60">{isMine ? "Your team" : "Tap if this is your team"}</span>
            </span>
            <span className="flex -space-x-[0.5rem]">
              {teams[side].map((hero) => (
                <span key={hero.id} className="relative block h-[2rem] w-[3.5rem] overflow-hidden rounded-[0.35rem] ring-2 ring-ink">
                  <Image unoptimized src={heroPortrait(hero.slug)} alt={hero.name} fill sizes="3.5rem" className="object-cover" />
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
