"use client";

import { useId, useState } from "react";
import { linePath, valueRange } from "../_utils/chart-paths";
import { useWords } from "@/lib/i18n/use-words";

const WIDTH = 600;
const HEIGHT = 160;

export interface ChartSeries {
  id: string;
  label: string;
  values: number[];
  /** Tailwind stroke + text classes for the line and its legend swatch. */
  strokeClass: string;
  swatchClass: string;
  dashed?: boolean;
}

interface LineChartProps {
  title: string;
  series: ChartSeries[];
  /** Cursor position in seconds (shared match time). */
  time: number;
  onTime: (seconds: number) => void;
  format: (value: number) => string;
  /** Team advantage: one series, Radiant green above zero and Dire red below. */
  split?: boolean;
}

/** Minute-by-minute line chart: one y axis, zero line, hover crosshair + tooltip, click to move the match cursor. */
export function LineChart({ title, series, time, onTime, format, split = false }: LineChartProps) {
  const words = useWords();
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const points = Math.max(0, ...series.map((line) => line.values.length));
  const range = valueRange(series.map((line) => line.values));
  if (points < 2 || range.max === range.min) return null;

  const xOf = (minute: number) => (minute / (points - 1)) * WIDTH;
  const zeroY = HEIGHT - ((0 - range.min) / (range.max - range.min)) * HEIGHT;
  const cursorMinute = Math.min(points - 1, time / 60);
  const ticks = Array.from({ length: Math.floor((points - 1) / 10) + 1 }, (_, index) => index * 10);

  function minuteAt(event: React.MouseEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.round(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * (points - 1));
  }

  return (
    <figure className="glass-panel flex min-w-0 flex-col gap-[0.6rem] rounded-[1.6rem] p-[1.2rem]">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-[0.6rem]">
        <span className="font-display text-[1.3rem] uppercase tracking-[0.06em] text-white/75">{title}</span>
        {series.length > 1 && (
          <span className="flex flex-wrap gap-[0.9rem] text-[0.85rem] text-white/60">
            {series.map((line) => (
              <span key={line.id} className="flex items-center gap-[0.35rem]">
                <i className={`inline-block h-[0.2rem] w-[1rem] rounded-full ${line.swatchClass}`} />
                {line.label}
              </span>
            ))}
          </span>
        )}
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={words.match.graphs.chartLabel(title, points - 1)}
          className="h-[11rem] w-full cursor-crosshair touch-pan-y overflow-visible"
          onPointerMove={(event) => setHovered(minuteAt(event))}
          onPointerLeave={() => setHovered(null)}
          onClick={(event) => onTime(minuteAt(event) * 60)}
        >
          {split && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2={HEIGHT} gradientUnits="userSpaceOnUse">
                <stop offset={zeroY / HEIGHT} stopColor="#92c84a" />
                <stop offset={zeroY / HEIGHT} stopColor="#e2492f" />
              </linearGradient>
            </defs>
          )}
          <line x1={0} x2={WIDTH} y1={zeroY} y2={zeroY} className="stroke-white/20" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          {split && series[0] && (
            <path d={`${linePath(series[0].values, WIDTH, HEIGHT, range, points)} L${xOf(series[0].values.length - 1)},${zeroY} L0,${zeroY} Z`} fill={`url(#${gradientId})`} opacity={0.18} />
          )}
          {series.map((line) => (
            <path
              key={line.id}
              d={linePath(line.values, WIDTH, HEIGHT, range, points)}
              className={split ? "fill-none" : `fill-none ${line.strokeClass}`}
              stroke={split ? `url(#${gradientId})` : undefined}
              strokeWidth={2}
              strokeDasharray={line.dashed ? "6 4" : undefined}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line x1={xOf(cursorMinute)} x2={xOf(cursorMinute)} y1={0} y2={HEIGHT} className="stroke-accent" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {hovered !== null && <line x1={xOf(hovered)} x2={xOf(hovered)} y1={0} y2={HEIGHT} className="stroke-white/40" vectorEffect="non-scaling-stroke" />}
        </svg>
        <span className="pointer-events-none absolute left-0 top-0 text-[0.85rem] text-white/40">{format(range.max)}</span>
        {range.min < 0 && <span className="pointer-events-none absolute bottom-0 left-0 text-[0.85rem] text-white/40">{format(range.min)}</span>}
        {hovered !== null && (
          <div
            className="pointer-events-none absolute top-[0.4rem] z-10 flex -translate-x-1/2 flex-col gap-[0.15rem] whitespace-nowrap rounded-[0.5rem] bg-ink/95 px-[0.7rem] py-[0.4rem] text-[0.85rem] text-white ring-1 ring-white/15"
            style={{ left: `${Math.min(88, Math.max(12, (hovered / (points - 1)) * 100))}%` }}
          >
            <span className="text-white/55">{hovered}′</span>
            {series.map((line) =>
              line.values[hovered] === undefined ? null : (
                <span key={line.id} className="flex items-center gap-[0.4rem] tabular-nums">
                  <i className={`inline-block size-[0.5rem] rounded-full ${split ? (line.values[hovered] >= 0 ? "bg-radiant" : "bg-dire") : line.swatchClass}`} />
                  {series.length > 1 && `${line.label}: `}
                  {format(line.values[hovered])}
                </span>
              ),
            )}
          </div>
        )}
      </div>
      <div className="relative h-[1rem] text-[0.85rem] text-white/40" aria-hidden="true">
        {ticks.map((minute) => (
          <span key={minute} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(minute / (points - 1)) * 100}%` }}>
            {minute}′
          </span>
        ))}
      </div>
    </figure>
  );
}
