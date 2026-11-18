import type { DeathMark, HeatCell, TowerMark, WardMark } from "../_utils/match-view-types";
import { useWords } from "@/lib/i18n/use-words";

const TEAM_FILL = { radiant: "#92c84a", dire: "#e2492f" } as const;
const RECENT_SECONDS = 60;

export interface MiniMapLayers {
  wards: WardMark[];
  deaths: DeathMark[];
  towers: TowerMark[];
  heat: HeatCell[];
}

/** Drawn Dota minimap (0-100 square, Radiant bottom-left, Dire top-right) with the given layers at `time`. */
export function MiniMap({ layers, time }: { layers: MiniMapLayers; time: number }) {
  const words = useWords();
  return (
    <svg viewBox="0 0 100 100" className="aspect-square w-full rounded-[1.2rem]" role="img" aria-label={words.match.map.minimap}>
      <defs>
        <radialGradient id="radiant-base" cx="0" cy="1" r="0.75">
          <stop offset="0" stopColor="#1f4a2a" />
          <stop offset="1" stopColor="#0d1a24" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dire-base" cx="1" cy="0" r="0.75">
          <stop offset="0" stopColor="#4a1f1f" />
          <stop offset="1" stopColor="#0d1a24" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="#0b1520" />
      <rect width="100" height="100" fill="url(#radiant-base)" />
      <rect width="100" height="100" fill="url(#dire-base)" />
      {/* River, then the three lanes from base to base */}
      <path d="M4,22 C28,36 40,46 50,50 S74,66 96,78" fill="none" stroke="#2b6f8f" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />
      <g fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9,91 L8,9 L91,8" />
        <path d="M9,91 L91,9" />
        <path d="M9,91 L92,92 L91,9" />
      </g>
      <circle cx="9" cy="91" r="5" fill={TEAM_FILL.radiant} fillOpacity="0.25" />
      <circle cx="91" cy="9" r="5" fill={TEAM_FILL.dire} fillOpacity="0.25" />

      {layers.heat.map((cell) => (
        <rect key={`h${cell.x},${cell.y}`} x={cell.x} y={cell.y} width="2" height="2" fill="#feba87" fillOpacity={0.15 + cell.weight * 0.6} />
      ))}

      {layers.towers.map((tower) => {
        const standing = tower.destroyedAt === null || tower.destroyedAt > time;
        return standing ? (
          <rect key={tower.key} x={tower.x - 1.5} y={tower.y - 1.5} width="3" height="3" rx="0.6" fill={TEAM_FILL[tower.team]} />
        ) : (
          <rect key={tower.key} x={tower.x - 1.2} y={tower.y - 1.2} width="2.4" height="2.4" rx="0.5" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="0.4" />
        );
      })}

      {layers.wards.map((ward) => (
        <g key={ward.id} className="animate-[fadeIn_300ms_ease-out] motion-reduce:animate-none">
          {ward.kind === "observer" && <circle cx={ward.x} cy={ward.y} r="7" fill="#ffd34d" fillOpacity="0.06" />}
          <circle cx={ward.x} cy={ward.y} r={ward.kind === "observer" ? 1.5 : 1.2} fill={ward.kind === "observer" ? "#ffd34d" : "#5ec8ff"} stroke={TEAM_FILL[ward.team]} strokeWidth="0.5" />
        </g>
      ))}

      {layers.deaths.map((death, index) => {
        const recent = time - death.time <= RECENT_SECONDS;
        const size = recent ? 2.2 : 1.4;
        return (
          <g key={`d${index}-${death.time}`} stroke={TEAM_FILL[death.team]} strokeWidth={recent ? 0.9 : 0.6} strokeOpacity={recent ? 1 : 0.4} strokeLinecap="round">
            <line x1={death.x - size} y1={death.y - size} x2={death.x + size} y2={death.y + size} />
            <line x1={death.x - size} y1={death.y + size} x2={death.x + size} y2={death.y - size} />
          </g>
        );
      })}
    </svg>
  );
}
