import Image from "next/image";
import { POSITIONS } from "@/lib/draft/draft-lanes";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { DraftHero, Position } from "@/types/draft";
import { useWords } from "@/lib/i18n/use-words";

const POSITION_HINTS: Record<Position, string> = { 1: "Carry", 2: "Mid", 3: "Off lane", 4: "Soft support", 5: "Hard support" };

interface LineupColumnProps {
  title: string;
  tone: "radiant" | "dire";
  heroes: DraftHero[];
  positions: Map<number, Position>;
  onPosition: (heroId: number, position: Position) => void;
  /** Only on the player's team: tap a hero to mark it as yours. */
  myHeroId?: number | null;
  onChooseMe?: (heroId: number) => void;
}

/** One team: hero cards with position pills 1-5; on the player's team, tapping a card marks it "YOU". */
export function LineupColumn({ title, tone, heroes, positions, onPosition, myHeroId, onChooseMe }: LineupColumnProps) {
  const words = useWords().draft.lock;
  const accent = tone === "radiant" ? "text-radiant" : "text-dire";
  return (
    <section aria-label={title} className="min-w-0">
      <h3 className={`font-display text-[1.2rem] uppercase tracking-[0.08em] ${accent}`}>{title}</h3>
      <ul className="mt-[0.5rem] flex flex-col gap-[0.45rem]">
        {heroes.map((hero) => {
          const isMe = myHeroId === hero.id;
          return (
            <li
              key={hero.id}
              className={`flex items-center gap-[0.7rem] rounded-[0.9rem] p-[0.35rem] pr-[0.6rem] transition ${isMe ? "bg-accent/15 ring-2 ring-accent" : "bg-white/[0.04]"}`}
            >
              <button
                type="button"
                disabled={!onChooseMe}
                onClick={() => onChooseMe?.(hero.id)}
                title={onChooseMe ? words.iPlay(hero.name) : hero.name}
                className="flex min-w-0 flex-1 items-center gap-[0.7rem] text-left disabled:cursor-default"
              >
                <span className="relative block h-[2.4rem] w-[4.3rem] shrink-0 overflow-hidden rounded-[0.45rem] bg-white/10">
                  <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="4.3rem" className="object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[1rem] text-white">{hero.name}</span>
                  {isMe ? (
                    <span className="text-[0.85rem] font-semibold uppercase tracking-wider text-accent">{words.you}</span>
                  ) : (
                    onChooseMe && <span className="text-[0.85rem] text-white/40">{words.tapIfYou}</span>
                  )}
                </span>
              </button>
              <span className="flex gap-[0.2rem]" role="radiogroup" aria-label={words.positionOf(hero.name)}>
                {POSITIONS.map((position) => {
                  const isSet = positions.get(hero.id) === position;
                  return (
                    <button
                      key={position}
                      type="button"
                      role="radio"
                      aria-checked={isSet}
                      title={words.positionTitle(position, POSITION_HINTS[position])}
                      onClick={() => onPosition(hero.id, position)}
                      className={`grid size-[1.7rem] place-items-center rounded-full text-[0.85rem] font-semibold transition ${
                        isSet ? "bg-white text-ink" : "bg-white/[0.07] text-white/50 hover:bg-white/[0.15]"
                      }`}
                    >
                      {position}
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
