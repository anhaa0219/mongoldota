"use client";

import { useState } from "react";
import { goldChartPath, goldLinePath } from "@/lib/match-detail";

const WIDTH = 300;
const HEIGHT = 80;

/** "Gold earned" area chart (one point per minute) with a hover crosshair + tooltip. */
export function GoldChart({ values }: { values: number[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const area = goldChartPath(values, WIDTH, HEIGHT);
  if (!area) return null;

  const lastMinute = values.length - 1;
  const ticks = Array.from({ length: Math.floor(lastMinute / 10) + 1 }, (_, index) => index * 10);
  const percent = (minute: number) => `${(minute / lastMinute) * 100}%`;

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setHovered(Math.round(ratio * lastMinute));
  }

  return (
    <figure className="flex min-w-0 flex-col gap-[0.5rem]">
      <figcaption className="text-[0.95rem] uppercase tracking-wider text-white/55">Gold earned</figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Gold earned: ${values[lastMinute].toLocaleString("en-US")} by minute ${lastMinute}`}
          className="h-[6rem] w-full touch-none overflow-visible"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHovered(null)}
        >
          <path d={area} className="fill-accent/15" />
          <path
            d={goldLinePath(values, WIDTH, HEIGHT)}
            className="fill-none stroke-accent"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {hovered !== null && (
            <line
              x1={(hovered / lastMinute) * WIDTH}
              x2={(hovered / lastMinute) * WIDTH}
              y1={0}
              y2={HEIGHT}
              className="stroke-white/40"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {hovered !== null && (
          <div
            className="pointer-events-none absolute -top-[2.4rem] -translate-x-1/2 whitespace-nowrap rounded-[0.4rem] bg-ink/90 px-[0.6rem] py-[0.25rem] text-[0.9rem] text-white ring-1 ring-white/15"
            style={{ left: percent(hovered) }}
          >
            {hovered}′ · {values[hovered].toLocaleString("en-US")} gold
          </div>
        )}
      </div>
      <div className="relative h-[1.2rem] text-[0.85rem] text-white/45" aria-hidden="true">
        {ticks.map((minute) => (
          <span key={minute} className="absolute -translate-x-1/2 tabular-nums" style={{ left: percent(minute) }}>
            {minute}′
          </span>
        ))}
      </div>
    </figure>
  );
}
