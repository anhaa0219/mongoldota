import { StatPanel } from "./StatPanel";
import { formatDuration } from "@/lib/format";
import type { FormTrend, FormWindow } from "../_utils/coach-types";
import type { PlayerSummary, WinRecord } from "@/types/opendota";
import { getWords } from "@/lib/i18n/server";
import type { Words } from "@/lib/i18n/words";

type Row = { id: "winRate" | "kda" | "deaths" | "gpm"; pick: (window: FormWindow) => number; format: (value: number) => string; lowerIsBetter?: boolean };

const ROWS: Row[] = [
  { id: "winRate", pick: (window) => window.winRate, format: (value) => `${Math.round(value)}%` },
  { id: "kda", pick: (window) => window.kda, format: (value) => value.toFixed(1) },
  { id: "deaths", pick: (window) => window.deaths, format: (value) => value.toFixed(1), lowerIsBetter: true },
  { id: "gpm", pick: (window) => window.gpm, format: (value) => String(Math.round(value)) },
];

/** Green when the recent value is better, red when worse, plain when about the same (within 3%). */
function changeTone(row: Row, form: FormTrend) {
  const recent = row.pick(form.recent);
  const earlier = row.pick(form.earlier);
  if (Math.abs(recent - earlier) <= Math.abs(earlier) * 0.03) return "text-white";
  const better = row.lowerIsBetter ? recent < earlier : recent > earlier;
  return better ? "text-radiant" : "text-dire";
}

function Trend({ form, words }: { form: FormTrend; words: Words }) {
  const say = words.stats.form;
  const rowLabel: Record<Row["id"], string> = { winRate: words.stats.winRate, kda: say.kda, deaths: say.deaths, gpm: say.gpm };
  return (
    <table className="mt-[0.8rem] w-full text-[0.95rem] tabular-nums">
      <thead>
        <tr className="text-[0.85rem] uppercase tracking-wider text-white/45">
          <th className="pb-[0.2rem] text-left font-normal">{say.form}</th>
          <th className="pb-[0.2rem] text-right font-normal">{say.last(form.recent.matches)}</th>
          <th className="pb-[0.2rem] text-right font-normal">{say.before}</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.id}>
            <td className="py-[0.12rem] text-white/70">{rowLabel[row.id]}</td>
            <td className={`py-[0.12rem] text-right font-medium ${changeTone(row, form)}`}>{row.format(row.pick(form.recent))}</td>
            <td className="py-[0.12rem] text-right text-white/55">{row.format(row.pick(form.earlier))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QueueLine({ label, record }: { label: string; record: WinRecord | null }) {
  if (!record) return null;
  return (
    <span>
      {label} <span className="text-white">{Math.round(record.winRate)}%</span> · {record.matches}
    </span>
  );
}

/** Streaks, average game length, recent form against older matches, and ranked vs unranked. */
export async function FormPanel({ summary, form }: { summary: PlayerSummary; form: FormTrend | null }) {
  const words = await getWords();
  const say = words.stats.form;
  const { streaks, queues, averageDurationSeconds } = summary;
  const { result, length } = streaks.current;
  const stats = [
    { label: say.streak, value: `${result}${length}`, tone: result === "W" ? "text-radiant" : "text-dire" },
    { label: say.best, value: `W${streaks.longestWin}`, tone: "" },
    { label: say.avgGame, value: formatDuration(Math.round(averageDurationSeconds)), tone: "" },
  ];
  return (
    <StatPanel title={say.title}>
      <dl className="grid grid-cols-3 gap-[0.8rem]">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-[0.85rem] uppercase tracking-wider text-white/55">{stat.label}</dt>
            <dd className={`font-display text-[1.7rem] leading-none ${stat.tone}`}>{stat.value}</dd>
          </div>
        ))}
      </dl>
      {form ? <Trend form={form} words={words} /> : <p className="mt-[0.8rem] text-[0.95rem] text-white/50">{say.needsMore}</p>}
      <p className="mt-[0.6rem] flex flex-wrap gap-x-[1rem] text-[0.9rem] text-white/55">
        <QueueLine label={say.ranked} record={queues.ranked} />
        <QueueLine label={say.unranked} record={queues.unranked} />
      </p>
    </StatPanel>
  );
}
