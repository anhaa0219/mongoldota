import { StatPanel } from "@/components/StatPanel";
import { MIN_HERO_MATCHES } from "@/lib/hero-benchmarks";
import type { HeroComparisonRow } from "@/types/coach";

function formatValue(value: number) {
  return value >= 100 ? Math.round(value).toLocaleString("en-US") : value.toFixed(1);
}

/** Red below 40%, green from 65%, accent in between (same limits as the suggestions). */
function tone(betterThan: number) {
  if (betterThan < 40) return { knob: "bg-dire shadow-[0_0_0.8rem_rgb(226_73_47/0.9)]", text: "text-dire bg-dire/15" };
  if (betterThan >= 65) return { knob: "bg-radiant shadow-[0_0_0.8rem_rgb(146_200_74/0.9)]", text: "text-radiant bg-radiant/15" };
  return { knob: "bg-accent shadow-[0_0_0.8rem_rgb(254_186_135/0.9)]", text: "text-accent bg-accent/15" };
}

/** "Top 12%" when better than most, "Bottom 28%" otherwise. */
function rankLabel(betterThan: number) {
  return betterThan >= 50 ? `Top ${Math.max(1, 100 - betterThan)}%` : `Bottom ${Math.max(1, betterThan)}%`;
}

function ComparisonRow({ row, heroName }: { row: HeroComparisonRow; heroName: string }) {
  const betterThan = Math.round(row.betterThan);
  const { knob, text } = tone(betterThan);
  return (
    <li title={`Typical ${heroName} player: ${formatValue(row.median)}. You beat ${betterThan}% of them.`}>
      <div className="flex items-baseline justify-between gap-[0.6rem] text-[0.98rem] tabular-nums">
        <span className="truncate text-white/75">{row.label}</span>
        <span className="flex shrink-0 items-baseline gap-[0.45rem]">
          <span className="font-medium text-white">{formatValue(row.yours)}</span>
          <span className={`rounded-full px-[0.5rem] py-[0.02rem] text-[0.85rem] font-semibold ${text}`}>{rankLabel(betterThan)}</span>
        </span>
      </div>
      <div
        className="relative mt-[0.45rem] h-[0.4rem] rounded-full bg-[linear-gradient(90deg,rgb(226_73_47/0.55),rgb(254_186_135/0.45)_50%,rgb(146_200_74/0.6))]"
        role="meter"
        aria-label={`${row.label}: better than ${betterThan}% of ${heroName} players`}
        aria-valuenow={betterThan}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* The typical player sits at 50% */}
        <span className="absolute left-1/2 top-[-0.2rem] h-[0.8rem] w-[2px] -translate-x-1/2 rounded-full bg-white/60" aria-hidden="true" />
        <span
          className={`absolute top-1/2 size-[0.95rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${knob} animate-[knobIn_0.9s_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none`}
          style={{ left: `${Math.min(97, Math.max(3, betterThan))}%` }}
          aria-hidden="true"
        />
      </div>
    </li>
  );
}

/** The player's averages on their most played hero against everyone else on that hero (OpenDota benchmarks). */
export function HeroComparison({ heroName, rows }: { heroName: string; rows: HeroComparisonRow[] }) {
  return (
    <StatPanel title={`You vs other ${heroName} players`}>
      {rows.length > 0 && (
        <p className="-mt-[0.3rem] mb-[0.6rem] text-[0.85rem] text-white/45">White line = typical {heroName} player. Further right = better.</p>
      )}
      {rows.length === 0 ? (
        <p className="text-[0.95rem] text-white/50">Play {MIN_HERO_MATCHES}+ games on {heroName} to compare.</p>
      ) : (
        <ul className="flex flex-col gap-[0.7rem]">
          {rows.map((row) => (
            <ComparisonRow key={row.metric} row={row} heroName={heroName} />
          ))}
        </ul>
      )}
    </StatPanel>
  );
}
