import type { WinRecord } from "@/types/opendota";
import { getWords } from "@/lib/i18n/server";

/** Label, "57% · 12 games" and a win-rate bar. */
export async function WinRateRow({ label, record, children }: { label: string; record: WinRecord; children?: React.ReactNode }) {
  const words = await getWords();
  const rate = Math.round(record.winRate);
  return (
    <li className="flex items-center gap-[0.8rem]">
      {children}
      <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem]">
        <div className="flex items-baseline justify-between gap-[0.6rem] text-[0.98rem]">
          <span className="truncate text-white/80">{label}</span>
          <span className="shrink-0 tabular-nums text-white">
            {rate}% <span className="text-white/45">· {record.matches}</span>
          </span>
        </div>
        <div
          className="h-[0.35rem] overflow-hidden rounded-full bg-white/10"
          role="meter"
          aria-label={words.stats.winRateOf(label)}
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="grow-x h-full rounded-full bg-radiant" style={{ width: `${rate}%` }} />
        </div>
      </div>
    </li>
  );
}
