import Image from "next/image";
import { AnalyseMatch } from "@/app/(site)/_components/AnalyseMatch";
import { GoldChart } from "./GoldChart";
import { MatchBasicsGrid } from "./MatchBasicsGrid";
import { formatDuration } from "@/lib/format";
import type { ItemTiming, MatchDetail } from "@/types/match-detail";
import { useWords } from "@/lib/i18n/use-words";

function ItemTimings({ timings }: { timings: ItemTiming[] }) {
  const words = useWords().history;
  if (timings.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-[0.6rem]" aria-label={words.itemTimings}>
      {timings.map((item) => (
        <li key={item.key} className="flex flex-col items-center gap-[0.2rem]" title={item.name}>
          <span
            className={`relative block h-[2rem] w-[2.75rem] overflow-hidden rounded-[0.3rem] ${
              item.isBkb ? "ring-2 ring-accent" : "ring-1 ring-white/10"
            }`}
          >
            <Image unoptimized src={item.image} alt={item.name} fill sizes="3rem" className="object-cover" />
          </span>
          <span className="text-[0.85rem] tabular-nums text-white/70">{formatDuration(item.seconds)}</span>
        </li>
      ))}
    </ul>
  );
}

interface PanelProps {
  detail: MatchDetail;
  matchId: number;
  /** Reloads the details (after "Analyse with OpenDota"). */
  onCheckAgain: () => void;
}

/** One match's details under its History row: basic stats always, the replay timeline once parsed. */
export function MatchDetailPanel({ detail, matchId, onCheckAgain }: PanelProps) {
  const words = useWords().history;
  if (!detail.parsed) {
    return (
      <div className="flex flex-col gap-[1.4rem]">
        <MatchBasicsGrid basics={detail.basics} />
        <AnalyseMatch matchId={matchId} onCheckAgain={onCheckAgain} />
      </div>
    );
  }

  const { deathMinutes } = detail;
  const deaths = deathMinutes?.length
    ? words.deathsToHeroes(deathMinutes.map((minute) => `${minute}'`).join(", "))
    : words.noDeathsToHeroes;

  return (
    <div className="flex flex-col gap-[1.6rem]">
      <MatchBasicsGrid basics={detail.basics} />
      <div className="grid gap-[1.6rem] md:grid-cols-2">
        <GoldChart values={detail.goldEarned} />
        <div className="flex flex-col gap-[1rem] text-[1.05rem] text-white/75">
          <ItemTimings timings={detail.itemTimings} />
          <p>
            {words.wards(detail.observers, detail.sentries)}
          </p>
          {deathMinutes && <p>{deaths}</p>}
        </div>
      </div>
    </div>
  );
}
