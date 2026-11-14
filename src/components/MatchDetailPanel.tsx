import Image from "next/image";
import { GoldChart } from "@/components/GoldChart";
import { formatDuration } from "@/lib/format";
import type { ItemTiming, MatchDetail } from "@/types/opendota";

function ItemTimings({ timings }: { timings: ItemTiming[] }) {
  if (timings.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-[0.6rem]" aria-label="Item timings">
      {timings.map((item) => (
        <li key={item.key} className="flex flex-col items-center gap-[0.2rem]" title={item.name}>
          <span
            className={`relative block h-[2rem] w-[2.75rem] overflow-hidden rounded-[0.3rem] ${
              item.isBkb ? "ring-2 ring-accent" : "ring-1 ring-white/10"
            }`}
          >
            <Image src={item.image} alt={item.name} fill sizes="3rem" className="object-cover" />
          </span>
          <span className="text-[0.85rem] tabular-nums text-white/70">{formatDuration(item.seconds)}</span>
        </li>
      ))}
    </ul>
  );
}

/** One match's details under its History row. */
export function MatchDetailPanel({ detail }: { detail: MatchDetail }) {
  if (!detail.parsed) {
    return <p className="text-[1.1rem] text-white/60">OpenDota hasn&apos;t parsed this match yet.</p>;
  }

  const { deathMinutes } = detail;
  const deaths = deathMinutes?.length
    ? `Deaths to heroes: ${deathMinutes.map((minute) => `${minute}'`).join(", ")}`
    : "No deaths to heroes";

  return (
    <div className="grid gap-[1.6rem] md:grid-cols-2">
      <GoldChart values={detail.goldEarned} />
      <div className="flex flex-col gap-[1rem] text-[1.05rem] text-white/75">
        <ItemTimings timings={detail.itemTimings} />
        {detail.killParticipation !== null && (
          <p>
            Kill participation <span className="font-semibold text-white">{detail.killParticipation}%</span>
          </p>
        )}
        <p>
          Wards: {detail.observers} observer · {detail.sentries} sentry
        </p>
        {deathMinutes && <p>{deaths}</p>}
      </div>
    </div>
  );
}
