"use client";

import Image from "next/image";
import { useState } from "react";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { HeroInfo } from "@/types/opendota";
import { useWords } from "@/lib/i18n/use-words";

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Every hero, alphabetical, with a search box. Heroes already in the draft are dimmed and disabled. */
export function HeroGrid({ heroes, isPicked, onPick }: { heroes: HeroInfo[]; isPicked: (heroId: number) => boolean; onPick: (heroId: number) => void }) {
  const [query, setQuery] = useState("");
  const words = useWords().draft;
  const search = normalize(query);
  const shown = search ? heroes.filter((hero) => normalize(hero.name).includes(search)) : heroes;

  return (
    <section aria-label={words.heroes} className="glass-panel flex min-h-0 flex-1 flex-col rounded-[1.4rem] p-[1rem]">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          // Enter picks the only (or first) match, so typing "vip" + Enter adds Viper.
          const first = shown.find((hero) => !isPicked(hero.id));
          if (event.key === "Enter" && first) {
            onPick(first.id);
            setQuery("");
          }
        }}
        placeholder={words.searchPlaceholder(heroes.length)}
        aria-label={words.searchHeroes}
        className="w-full rounded-full bg-white/[0.07] px-[1.1rem] py-[0.55rem] text-[1rem] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/60"
      />
      <ul className="mt-[0.8rem] grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(6.4rem,1fr))] content-start gap-[0.5rem] overflow-y-auto pr-[0.3rem]">
        {shown.map((hero) => {
          const picked = isPicked(hero.id);
          return (
            <li key={hero.id}>
              <button
                type="button"
                disabled={picked}
                onClick={() => onPick(hero.id)}
                title={hero.name}
                className="group block w-full text-left disabled:cursor-not-allowed disabled:opacity-25"
              >
                <span className="relative block aspect-[16/9] overflow-hidden rounded-[0.45rem] bg-white/10 ring-1 ring-white/10 transition group-enabled:group-hover:ring-accent">
                  {hero.slug && <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="7rem" className="object-cover transition-transform duration-300 group-enabled:group-hover:scale-110" />}
                </span>
                <span className="mt-[0.15rem] block truncate text-[0.85rem] text-white/70 transition-colors group-enabled:group-hover:text-accent">{hero.name}</span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="col-span-full text-[0.95rem] text-white/50">{words.noHeroMatches(query)}</li>}
      </ul>
    </section>
  );
}
