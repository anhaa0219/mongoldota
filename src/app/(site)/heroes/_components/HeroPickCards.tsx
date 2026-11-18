import Image from "next/image";
import { Sparkles } from "lucide-react";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { PickCard } from "../_utils/hero-picks";
import { getWords } from "@/lib/i18n/server";

/** The five heroes picked for the player: portrait, rank win rate, their own record, and why. */
export async function HeroPickCards({ cards, title, isAi, timer }: { cards: PickCard[]; title: string; isAi: boolean; timer?: React.ReactNode }) {
  const words = (await getWords()).trending;
  return (
    <section aria-label={title} className="glass-panel rise-in rounded-[1.4rem] p-[1rem]">
      <h2 className="flex items-center gap-[0.5rem] font-display text-[1.3rem] uppercase tracking-[0.06em] text-accent">
        {isAi && <Sparkles className="size-[1.1rem]" aria-hidden="true" />}
        {title}
      </h2>
      {timer && <div className="mt-[0.2rem]">{timer}</div>}
      <ol className="stagger mt-[0.7rem] grid gap-[0.7rem] sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ candidate, reason }, index) => (
          <li key={candidate.heroId} className="group relative overflow-hidden rounded-[1rem] bg-white/[0.05] ring-1 ring-white/10 transition-[translate,box-shadow] duration-200 hover:-translate-y-[0.25rem] hover:shadow-[0_1rem_2rem_rgb(0_0_0/0.45)] hover:ring-accent/60">
            <div className="relative h-[5.2rem]">
              <Image unoptimized src={heroPortrait(candidate.slug)} alt="" fill sizes="16rem" className="object-cover object-top opacity-90 transition-transform duration-500 ease-out group-hover:scale-110" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgb(6_14_24/0.95))]" />
              <span className="absolute left-[0.6rem] top-[0.4rem] font-display text-[1.6rem] leading-none text-white/80 drop-shadow">{index + 1}</span>
              <span className="absolute bottom-[0.35rem] left-[0.6rem] font-display text-[1.25rem] uppercase leading-none text-white">{candidate.name}</span>
            </div>
            <div className="p-[0.6rem]">
              <p className="flex flex-wrap gap-[0.35rem] text-[0.85rem] tabular-nums">
                <span className="rounded-full bg-radiant/15 px-[0.45rem] text-radiant">{words.inRank(Math.round(candidate.bracketWinRate))}</span>
                {candidate.personal && (
                  <span className="rounded-full bg-accent/15 px-[0.45rem] text-accent">
                    {words.youRecord(Math.round(candidate.personal.winRate), candidate.personal.games)}
                  </span>
                )}
              </p>
              <p className="mt-[0.4rem] line-clamp-4 text-[0.85rem] leading-snug text-white/70" title={reason}>
                {reason}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
