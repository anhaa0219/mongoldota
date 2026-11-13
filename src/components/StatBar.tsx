import { useId } from "react";
import type { CharacterStat } from "@/types/game";

const TRACK_START = 18;
const TRACK_END = 372;

/** A steel bar with pointed ends and an orange fill, like a game HUD gauge. */
export function StatBar({ stat }: { stat: CharacterStat }) {
  const id = useId();
  const steelId = `${id}-steel`;
  const fillId = `${id}-fill`;
  const ratio = Math.min(Math.max(stat.value / stat.max, 0), 1);
  const fillEnd = TRACK_START + 8 + (TRACK_END - TRACK_START - 8) * ratio;

  return (
    <div>
      <div className="flex items-baseline justify-between pl-[1.4rem] pr-[2.2rem] text-[1.375rem] font-medium">
        <span>{stat.label}</span>
        <span>{stat.value}</span>
      </div>
      <svg
        viewBox="0 0 390 36"
        className="mt-[0.3rem] h-auto w-full"
        role="meter"
        aria-label={stat.label}
        aria-valuenow={stat.value}
        aria-valuemin={0}
        aria-valuemax={stat.max}
      >
        <defs>
          <linearGradient id={steelId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a7bba9" />
            <stop offset="0.45" stopColor="#6e8873" />
            <stop offset="1" stopColor="#3f5245" />
          </linearGradient>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd36b" />
            <stop offset="0.5" stopColor="#f6a523" />
            <stop offset="1" stopColor="#c86e0c" />
          </linearGradient>
        </defs>
        <polygon points="0,18 16,4 374,4 390,18 374,32 16,32" fill={`url(#${steelId})`} />
        <polygon points="0,18 16,4 16,32" fill="#c9d6ca" opacity="0.7" />
        <polygon points="390,18 374,4 374,32" fill="#c9d6ca" opacity="0.7" />
        <rect x="16" y="10" width="358" height="16" rx="3" fill="#2b3a30" opacity="0.55" />
        <rect x="193" y="4" width="2" height="6" fill="#d9e3da" opacity="0.6" />
        <polygon
          points={`${TRACK_START},18 ${TRACK_START + 8},11 ${fillEnd},11 ${fillEnd + 6},18 ${fillEnd},25 ${TRACK_START + 8},25`}
          fill={`url(#${fillId})`}
          stroke="#7a3d06"
          strokeWidth="1"
        />
        <rect x={TRACK_START + 8} y="12.5" width={Math.max(fillEnd - TRACK_START - 10, 0)} height="2.5" rx="1" fill="#fff3c4" opacity="0.55" />
      </svg>
    </div>
  );
}
