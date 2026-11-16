import Image from "next/image";
import { FormPanel } from "@/components/FormPanel";
import { StatPanel } from "@/components/StatPanel";
import { WinRateRow } from "@/components/WinRateRow";
import { heroPortrait } from "@/lib/hero-images";
import type { FormTrend } from "@/types/coach";
import type { LaneRole, PlayerSummary, WinRecord } from "@/types/opendota";

const laneNames: Record<LaneRole, string> = { 1: "Safe lane", 2: "Mid lane", 3: "Off lane", 4: "Jungle" };

function TopHeroes({ summary }: { summary: PlayerSummary }) {
  return (
    <StatPanel title="Top heroes">
      <ul className="flex flex-col gap-[0.5rem]">
        {summary.topHeroes.map(({ hero, ...record }) => (
          <WinRateRow key={hero.id} label={hero.name} record={record}>
            <span className="relative block h-[1.8rem] w-[3.2rem] shrink-0 overflow-hidden rounded-[0.3rem] bg-white/10">
              {hero.slug && <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="3.2rem" className="object-cover" />}
            </span>
          </WinRateRow>
        ))}
      </ul>
    </StatPanel>
  );
}

function SideChip({ label, record, tone }: { label: string; record: WinRecord | null; tone: string }) {
  if (!record) return null;
  return (
    <span className="rounded-full bg-white/[0.06] px-[0.7rem] py-[0.2rem]">
      <span className={tone}>{label}</span> {Math.round(record.winRate)}% <span className="text-white/45">· {record.matches}</span>
    </span>
  );
}

function LanesAndSides({ summary }: { summary: PlayerSummary }) {
  const { lanes, sides } = summary;
  return (
    <StatPanel title="Lanes & sides">
      <ul className="flex flex-col gap-[0.5rem]">
        {lanes.map(({ lane, ...record }) => (
          <WinRateRow key={lane} label={laneNames[lane]} record={record} />
        ))}
      </ul>
      {lanes.length === 0 && <p className="text-[0.95rem] text-white/50">Lanes need analysed matches.</p>}
      <p className="mt-[0.8rem] flex flex-wrap gap-[0.5rem] text-[0.9rem] tabular-nums">
        <SideChip label="Radiant" record={sides.radiant} tone="text-radiant" />
        <SideChip label="Dire" record={sides.dire} tone="text-dire" />
      </p>
    </StatPanel>
  );
}

/** Second row of the Stats page: top heroes, lanes & sides, form & streaks. */
export function MoreStats({ summary, form }: { summary: PlayerSummary; form: FormTrend | null }) {
  return (
    <div className="grid gap-[1.1rem] md:grid-cols-3">
      <TopHeroes summary={summary} />
      <LanesAndSides summary={summary} />
      <FormPanel summary={summary} form={form} />
    </div>
  );
}
