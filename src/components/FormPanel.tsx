import { StatPanel } from "@/components/StatPanel";
import { formatDuration } from "@/lib/format";
import type { FormTrend, FormWindow } from "@/types/coach";
import type { PlayerSummary, WinRecord } from "@/types/opendota";

type Row = { label: string; pick: (window: FormWindow) => number; format: (value: number) => string; lowerIsBetter?: boolean };

const ROWS: Row[] = [
  { label: "Win rate", pick: (window) => window.winRate, format: (value) => `${Math.round(value)}%` },
  { label: "KDA", pick: (window) => window.kda, format: (value) => value.toFixed(1) },
  { label: "Deaths", pick: (window) => window.deaths, format: (value) => value.toFixed(1), lowerIsBetter: true },
  { label: "GPM", pick: (window) => window.gpm, format: (value) => String(Math.round(value)) },
];

/** Green when the recent value is better, red when worse, plain when about the same (within 3%). */
function changeTone(row: Row, form: FormTrend) {
  const recent = row.pick(form.recent);
  const earlier = row.pick(form.earlier);
  if (Math.abs(recent - earlier) <= Math.abs(earlier) * 0.03) return "text-white";
  const better = row.lowerIsBetter ? recent < earlier : recent > earlier;
  return better ? "text-radiant" : "text-dire";
}

function Trend({ form }: { form: FormTrend }) {
  return (
    <table className="mt-[0.8rem] w-full text-[0.95rem] tabular-nums">
      <thead>
        <tr className="text-[0.8rem] uppercase tracking-wider text-white/45">
          <th className="pb-[0.2rem] text-left font-normal">Form</th>
          <th className="pb-[0.2rem] text-right font-normal">Last {form.recent.matches}</th>
          <th className="pb-[0.2rem] text-right font-normal">Before</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.label}>
            <td className="py-[0.12rem] text-white/70">{row.label}</td>
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
export function FormPanel({ summary, form }: { summary: PlayerSummary; form: FormTrend | null }) {
  const { streaks, queues, averageDurationSeconds } = summary;
  const { result, length } = streaks.current;
  const stats = [
    { label: "Streak", value: `${result}${length}`, tone: result === "W" ? "text-radiant" : "text-dire" },
    { label: "Best", value: `W${streaks.longestWin}`, tone: "" },
    { label: "Avg game", value: formatDuration(Math.round(averageDurationSeconds)), tone: "" },
  ];
  return (
    <StatPanel title="Form & streaks">
      <dl className="grid grid-cols-3 gap-[0.8rem]">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-[0.85rem] uppercase tracking-wider text-white/55">{stat.label}</dt>
            <dd className={`font-display text-[1.7rem] leading-none ${stat.tone}`}>{stat.value}</dd>
          </div>
        ))}
      </dl>
      {form ? <Trend form={form} /> : <p className="mt-[0.8rem] text-[0.95rem] text-white/50">Form needs 30+ matches.</p>}
      <p className="mt-[0.6rem] flex flex-wrap gap-x-[1rem] text-[0.9rem] text-white/55">
        <QueueLine label="Ranked" record={queues.ranked} />
        <QueueLine label="Unranked" record={queues.unranked} />
      </p>
    </StatPanel>
  );
}
