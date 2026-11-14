import Image from "next/image";
import { StatPanel } from "@/components/StatPanel";
import { WinRateRow } from "@/components/WinRateRow";
import { formatDuration } from "@/lib/format";
import { heroPortrait } from "@/lib/hero-images";
import type { LaneRole, PlayerSummary } from "@/types/opendota";

const laneNames: Record<LaneRole, string> = { 1: "Safe lane", 2: "Mid lane", 3: "Off lane", 4: "Jungle" };

function TopHeroes({ summary }: { summary: PlayerSummary }) {
  return (
    <StatPanel title="Top heroes">
      <ul className="flex flex-col gap-[0.8rem]">
        {summary.topHeroes.map(({ hero, ...record }) => (
          <WinRateRow key={hero.id} label={hero.name} record={record}>
            <span className="relative block h-[2rem] w-[3.5rem] shrink-0 overflow-hidden rounded-[0.35rem] bg-white/10">
              {hero.slug && <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="3.5rem" className="object-cover" />}
            </span>
          </WinRateRow>
        ))}
      </ul>
    </StatPanel>
  );
}

function LanesAndSides({ summary }: { summary: PlayerSummary }) {
  const { lanes, sides } = summary;
  return (
    <StatPanel title="Lanes & sides">
      <ul className="flex flex-col gap-[0.8rem]">
        {lanes.map(({ lane, ...record }) => (
          <WinRateRow key={lane} label={laneNames[lane]} record={record} />
        ))}
        {sides.radiant && <WinRateRow label="Radiant" record={sides.radiant} />}
        {sides.dire && <WinRateRow label="Dire" record={sides.dire} />}
      </ul>
      {lanes.length === 0 && <p className="mt-[0.8rem] text-[0.95rem] text-white/50">Lanes need parsed matches.</p>}
    </StatPanel>
  );
}

function StreaksAndQueues({ summary }: { summary: PlayerSummary }) {
  const { streaks, queues, averageDurationSeconds } = summary;
  const { result, length } = streaks.current;
  return (
    <StatPanel title="Streaks & ranked">
      <dl className="grid grid-cols-3 gap-[1rem]">
        <div>
          <dt className="text-[1rem] uppercase tracking-wider text-white/55">Streak</dt>
          <dd className={`font-display text-[2rem] leading-none ${result === "W" ? "text-radiant" : "text-dire"}`}>
            {result}
            {length}
          </dd>
        </div>
        <div>
          <dt className="text-[1rem] uppercase tracking-wider text-white/55">Best</dt>
          <dd className="font-display text-[2rem] leading-none">W{streaks.longestWin}</dd>
        </div>
        <div>
          <dt className="text-[1rem] uppercase tracking-wider text-white/55">Avg game</dt>
          <dd className="font-display text-[2rem] leading-none">{formatDuration(Math.round(averageDurationSeconds))}</dd>
        </div>
      </dl>
      <ul className="mt-[1.1rem] flex flex-col gap-[0.8rem]">
        {queues.ranked && <WinRateRow label="Ranked" record={queues.ranked} />}
        {queues.unranked && <WinRateRow label="Unranked" record={queues.unranked} />}
      </ul>
    </StatPanel>
  );
}

/** Second row of the Stats page: top heroes, lanes & sides, streaks & ranked. */
export function MoreStats({ summary }: { summary: PlayerSummary }) {
  return (
    <div className="grid gap-[1.2rem] md:grid-cols-3">
      <TopHeroes summary={summary} />
      <LanesAndSides summary={summary} />
      <StreaksAndQueues summary={summary} />
    </div>
  );
}
