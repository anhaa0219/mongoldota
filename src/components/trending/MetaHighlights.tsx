import Image from "next/image";
import { heroPortrait } from "@/lib/hero-images";
import type { HeroMeta, MetaRow } from "@/types/meta";

interface Highlight {
  label: string;
  row: MetaRow | undefined;
  value: (row: MetaRow) => string;
  tone: string;
}

/** Three quick facts for the chosen rank: best win rate, most picked, rising fastest this week. */
export function MetaHighlights({ rows, heroById }: { rows: MetaRow[]; heroById: Map<number, HeroMeta> }) {
  const best = (score: (row: MetaRow) => number) => rows.reduce<MetaRow | undefined>((top, row) => (!top || score(row) > score(top) ? row : top), undefined);
  const highlights: Highlight[] = [
    { label: "Best win rate", row: best((row) => row.winRate), value: (row) => `${row.winRate.toFixed(1)}%`, tone: "text-radiant" },
    { label: "Most picked", row: best((row) => row.pickRate), value: (row) => `${row.pickRate.toFixed(1)}% of games`, tone: "text-accent" },
    { label: "Rising this week", row: best((row) => row.pickChange), value: (row) => `+${Math.round(row.pickChange)}% picks`, tone: "text-sky-300" },
  ];
  return (
    <div className="grid gap-[0.7rem] sm:grid-cols-3">
      {highlights.map(({ label, row, value, tone }) => {
        const hero = row && heroById.get(row.heroId);
        return (
          <div key={label} className="glass-panel flex items-center gap-[0.8rem] rounded-[1.1rem] p-[0.6rem]">
            {hero && (
              <span className="relative block h-[2.6rem] w-[4.6rem] shrink-0 overflow-hidden rounded-[0.5rem]">
                <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="4.6rem" className="object-cover" />
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
