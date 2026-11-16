import { StatPanel } from "@/components/StatPanel";
import { MIN_HERO_MATCHES } from "@/lib/hero-benchmarks";
import type { HeroComparisonRow } from "@/types/coach";

function formatValue(value: number) {
  return value >= 100 ? Math.round(value).toLocaleString("en-US") : value.toFixed(1);
}

/** Red below 40%, green from 65%, accent in between (same limits as the suggestions). */
function tone(betterThan: number) {
  if (betterThan < 40) return { bar: "bg-dire", text: "text-dire" };
  if (betterThan >= 65) return { bar: "bg-radiant", text: "text-radiant" };
  return { bar: "bg-accent", text: "text-accent" };
}

function ComparisonRow({ row, heroName }: { row: HeroComparisonRow; heroName: string }) {
  const betterThan = Math.round(row.betterThan);
  const { bar, text } = tone(betterThan);
  return (
    <li title={`Typical ${heroName} player: ${formatValue(row.median)}`}>
      <div className="flex items-baseline justify-between gap-[0.6rem] text-[0.98rem] tabular-nums">
        <span className="truncate text-white/75">{row.label}</span>
        <span className="shrink-0">
          {formatValue(row.yours)} <span className={`ml-[0.3rem] ${text}`}>beats {betterThan}%</span>
        </span>
      </div>
      <div
        className="relative mt-[0.25rem] h-[0.35rem] rounded-full bg-white/10"
        role="meter"
        aria-label={`${row.label}: better than ${betterThan}% of ${heroName} players`}
        aria-valuenow={betterThan}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${betterThan}%` }} />
        {/* The typical player sits at 50% */}
        <span className="absolute left-1/2 top-[-0.15rem] h-[0.65rem] w-px bg-white/50" aria-hidden="true" />
      </div>
    </li>
  );
}

/** The player's averages on their most played hero against everyone else on that hero (OpenDota benchmarks). */
export function HeroComparison({ heroName, rows }: { heroName: string; rows: HeroComparisonRow[] }) {
  return (
    <StatPanel title={`You vs other ${heroName} players`}>
      {rows.length === 0 ? (
        <p className="text-[0.95rem] text-white/50">Play {MIN_HERO_MATCHES}+ games on {heroName} to compare.</p>
      ) : (
        <ul className="flex flex-col gap-[0.55rem]">
          {rows.map((row) => (
            <ComparisonRow key={row.metric} row={row} heroName={heroName} />
          ))}
        </ul>
      )}
    </StatPanel>
  );
}
