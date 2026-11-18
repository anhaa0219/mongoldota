import Image from "next/image";
import { X } from "lucide-react";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { SlotRef } from "@/types/draft";
import type { Side } from "@/types/game";
import type { HeroInfo } from "@/types/opendota";
import { useWords } from "@/lib/i18n/use-words";

interface TeamSlotsProps {
  side: Side;
  heroIds: (number | null)[];
  heroes: Map<number, HeroInfo>;
  selected: SlotRef | null;
  onSelect: (slot: SlotRef) => void;
  onClear: (slot: SlotRef) => void;
}

/** One team's 5 slots. Click an empty slot to fill it next; click a filled one to clear it. */
export function TeamSlots({ side, heroIds, heroes, selected, onSelect, onClear }: TeamSlotsProps) {
  const words = useWords().draft;
  const isRadiant = side === "radiant";
  return (
    <section aria-label={isRadiant ? words.picks.radiant : words.picks.dire} className="min-w-0 flex-1">
      <h2 className={`font-display text-[1.4rem] uppercase tracking-[0.08em] ${isRadiant ? "text-radiant" : "text-dire text-right"}`}>
        {isRadiant ? "Radiant" : "Dire"}
      </h2>
      <ol className="mt-[0.6rem] grid grid-cols-5 gap-[0.6rem]">
        {heroIds.map((heroId, index) => {
          const hero = heroId === null ? undefined : heroes.get(heroId);
          const isSelected = selected?.side === side && selected.index === index;
          const ring = isSelected ? (isRadiant ? "ring-2 ring-radiant" : "ring-2 ring-dire") : "ring-1 ring-white/15";
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => (hero ? onClear({ side, index }) : onSelect({ side, index }))}
                aria-label={hero ? words.removeHero(hero.name) : words.chooseSlot(isRadiant ? "Radiant" : "Dire", index + 1)}
                className={`group relative block aspect-[16/9] w-full overflow-hidden rounded-[0.6rem] bg-white/[0.06] ${ring} transition-shadow hover:ring-white/40`}
              >
                {hero ? (
                  <>
                    <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="10rem" className="pop-in object-cover" />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-ink/75 px-[0.4rem] py-[0.15rem] text-left text-[0.85rem] text-white">
                      {hero.name}
                    </span>
                    <span className="absolute right-[0.3rem] top-[0.3rem] hidden rounded-full bg-ink/80 p-[0.2rem] group-hover:block">
                      <X className="size-[0.9rem]" aria-hidden="true" />
                    </span>
                  </>
                ) : (
                  <span className="grid h-full place-items-center text-[1.4rem] text-white/30">{index + 1}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
