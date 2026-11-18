import Image from "next/image";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { HeroMeta, MetaRow } from "../_utils/meta-types";
import { useWords } from "@/lib/i18n/use-words";

interface Highlight {
  label: string;
  row: MetaRow | undefined;
  value: (row: MetaRow) => string;
  tone: string;
}

/** Three quick facts for the chosen rank: best win rate, most picked, rising fastest this week. */
export function MetaHighlights({ rows, heroById }: { rows: MetaRow[]; heroById: Map<number, HeroMeta> }) {
  const words = useWords().trending.highlights;
  const best = (score: (row: MetaRow) => number) => rows.reduce<MetaRow | undefined>((top, row) => (!top || score(row) > score(top) ? row : top), undefined);
  const highlights: Highlight[] = [
    { label: words.bestWinRate, row: best((row) => row.winRate), value: (row) => `${row.winRate.toFixed(1)}%`, tone: "text-radiant" },
    { label: words.mostPicked, row: best((row) => row.pickRate), value: (row) => words.ofGames(row.pickRate.toFixed(1)), tone: "text-accent" },
    { label: words.rising, row: best((row) => row.pickChange), value: (row) => words.picks(Math.round(row.pickChange)), tone: "text-sky-300" },
  ];
  return (
    <div className="stagger grid gap-[0.7rem] sm:grid-cols-3">
      {highlights.map(({ label, row, value, tone }) => {
        const hero = row && heroById.get(row.heroId);
        return (
          <div key={label} className="glass-panel group flex items-center gap-[0.8rem] rounded-[1.1rem] p-[0.6rem]">
            {hero && (
              <span className="relative block h-[2.6rem] w-[4.6rem] shrink-0 overflow-hidden rounded-[0.5rem]">
                <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="4.6rem" className="object-cover transition-transform duration-300 group-hover:scale-110" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[0.85rem] uppercase tracking-wider text-white/50">{label}</span>
              <span className="block truncate text-[1.05rem] text-white">{hero?.name ?? "—"}</span>
              {row && <span className={`text-[0.85rem] font-medium tabular-nums ${tone}`}>{value(row)}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
