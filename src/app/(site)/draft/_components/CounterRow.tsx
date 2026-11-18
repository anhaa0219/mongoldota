import Image from "next/image";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { CounterSuggestion, DraftHero, PersonalRecord } from "@/types/draft";
import { useWords } from "@/lib/i18n/use-words";

const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
const tone = (value: number) => (value >= 0.5 ? "text-radiant" : value <= -0.5 ? "text-dire" : "text-white/60");

interface CounterRowProps {
  suggestion: CounterSuggestion;
  hero: DraftHero;
  heroes: Map<number, DraftHero>;
  personal: PersonalRecord | undefined;
  onPick: (heroId: number) => void;
}

/** One suggested (or to-avoid) hero: total advantage, the advantage against each enemy, and the player's own record. */
export function CounterRow({ suggestion, hero, heroes, personal, onPick }: CounterRowProps) {
  const words = useWords().draft.counters;
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(hero.id)}
        title={words.addHero(hero.name)}
        className="group flex w-full items-center gap-[0.7rem] rounded-[0.7rem] px-[0.4rem] py-[0.3rem] text-left transition-colors hover:bg-white/[0.07] active:scale-[0.995]"
      >
        <span className="relative block h-[1.9rem] w-[3.4rem] shrink-0 overflow-hidden rounded-[0.3rem] bg-white/10">
          <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="3.4rem" className="object-cover transition-transform duration-300 group-hover:scale-110" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.98rem] text-white">{hero.name}</span>
          <span className="flex flex-wrap gap-x-[0.5rem] text-[0.85rem] tabular-nums">
            {suggestion.perEnemy.map((entry) => (
              <span key={entry.enemyId} className={tone(entry.advantage)} title={words.versus(heroes.get(entry.enemyId)?.name ?? "", entry.games)}>
                {heroes.get(entry.enemyId)?.name.split(" ")[0]} {signed(entry.advantage)}
              </span>
            ))}
            {personal && (
              <span className="text-accent" title={words.yourGames}>
                {words.you(Math.round(personal.winRate), personal.games)}
              </span>
            )}
          </span>
        </span>
        <span className={`shrink-0 font-display text-[1.5rem] leading-none tabular-nums ${tone(suggestion.score)}`}>{signed(suggestion.score)}</span>
      </button>
    </li>
  );
}
