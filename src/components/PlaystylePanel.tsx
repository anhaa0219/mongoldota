import { StatPanel } from "@/components/StatPanel";
import type { PlaystyleStat } from "@/types/opendota";

/** Large numbers (damage, healing) as whole numbers; small ones with one decimal. */
function formatAverage(stat: PlaystyleStat) {
  if (stat.average >= 100) return Math.round(stat.average).toLocaleString("en-US");
  return stat.average.toFixed(1);
}

/** Per-match averages over the last 100 matches; some fields only exist for parsed matches. */
export function PlaystylePanel({ stats }: { stats: PlaystyleStat[] }) {
  if (stats.length === 0) return null;
  return (
    <StatPanel title="Playstyle · per match">
      <dl className="grid grid-cols-2 gap-x-[1rem] gap-y-[1.1rem] sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-[1rem] uppercase tracking-wider text-white/55">{stat.label}</dt>
            <dd className="font-display text-[2rem] leading-none">{formatAverage(stat)}</dd>
            <dd className="mt-[0.2rem] text-[0.85rem] text-white/40">{stat.matches} games</dd>
          </div>
        ))}
      </dl>
    </StatPanel>
  );
}
