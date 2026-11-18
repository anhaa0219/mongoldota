import Image from "next/image";
import { FormPanel } from "./FormPanel";
import { StatPanel } from "./StatPanel";
import { WinRateRow } from "./WinRateRow";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { FormTrend } from "../_utils/coach-types";
import type { LaneRole, PlayerSummary, WinRecord } from "@/types/opendota";
import { getWords } from "@/lib/i18n/server";
import type { Words } from "@/lib/i18n/words";

const laneNames: Record<LaneRole, string> = { 1: "Safe lane", 2: "Mid lane", 3: "Off lane", 4: "Jungle" };

function TopHeroes({ summary, words }: { summary: PlayerSummary; words: Words }) {
  return (
    <StatPanel title={words.stats.more.topHeroes}>
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

function LanesAndSides({ summary, words }: { summary: PlayerSummary; words: Words }) {
  const { lanes, sides } = summary;
  return (
    <StatPanel title={words.stats.more.lanesSides}>
      <ul className="flex flex-col gap-[0.5rem]">
        {lanes.map(({ lane, ...record }) => (
          <WinRateRow key={lane} label={laneNames[lane]} record={record} />
        ))}
      </ul>
      {lanes.length === 0 && <p className="text-[0.95rem] text-white/50">{words.stats.more.lanesNeedParsed}</p>}
      <p className="mt-[0.8rem] flex flex-wrap gap-[0.5rem] text-[0.9rem] tabular-nums">
        <SideChip label="Radiant" record={sides.radiant} tone="text-radiant" />
        <SideChip label="Dire" record={sides.dire} tone="text-dire" />
      </p>
    </StatPanel>
  );
}

/** Second row of the Stats page: top heroes, lanes & sides, form & streaks. */
export async function MoreStats({ summary, form }: { summary: PlayerSummary; form: FormTrend | null }) {
  const words = await getWords();
  return (
    <div className="stagger grid gap-[1.1rem] [--stagger-base:140ms] md:grid-cols-3">
      <TopHeroes summary={summary} words={words} />
      <LanesAndSides summary={summary} words={words} />
      <FormPanel summary={summary} form={form} />
    </div>
  );
}
