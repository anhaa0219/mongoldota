import type { KeyboardEvent } from "react";
import { mapRegions } from "@/lib/map-regions";

interface RegionMapProps {
  activeRegionId: string;
  onSelectRegion: (regionId: string) => void;
}

/** Where the dotted line leaves the location card, in map coordinates. */
const CARD_ANCHOR_X = 43;
const CARD_ANCHOR_Y = -10;

export function RegionMap({ activeRegionId, onSelectRegion }: RegionMapProps) {
  const activeRegion = mapRegions.find((region) => region.id === activeRegionId);

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, regionId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectRegion(regionId);
  };

  return (
    <svg
      viewBox="0 0 470 390"
      className="relative mt-[0.6rem] w-full max-w-[29.4rem] overflow-visible lg:ml-[1.56rem]"
      role="group"
      aria-label="World map regions"
    >
      {mapRegions.map((region) => {
        const isActive = region.id === activeRegionId;
        return (
          <g
            key={region.id}
            role="button"
            tabIndex={0}
            aria-label={`Region ${region.id}`}
            aria-pressed={isActive}
            onClick={() => onSelectRegion(region.id)}
            onKeyDown={(event) => handleKeyDown(event, region.id)}
            className="group cursor-pointer outline-none"
          >
            <path
              d={region.path}
              className={`transition-colors duration-300 ${
                isActive
                  ? "fill-[#3a3016]/85"
                  : "fill-transparent group-hover:fill-accent/10 group-focus-visible:fill-accent/10"
              }`}
              stroke="rgb(255 255 255 / 0.35)"
              strokeWidth="1.2"
              strokeDasharray="2 4"
              strokeLinecap="round"
            />
            <text
              x={region.labelX}
              y={region.labelY}
              textAnchor="middle"
              className="pointer-events-none fill-white font-sans text-[19px] font-medium tracking-[0.14em]"
            >
              {region.id.replace("M", "M ")}
            </text>
          </g>
        );
      })}

      {activeRegion && (
        <g className="pointer-events-none">
          <path
            d={`M${CARD_ANCHOR_X} ${CARD_ANCHOR_Y} L${CARD_ANCHOR_X} ${Math.max(CARD_ANCHOR_Y, activeRegion.markerY - 38)} L${activeRegion.markerX} ${activeRegion.markerY}`}
            fill="none"
            stroke="rgb(254 186 135 / 0.7)"
            strokeWidth="1.2"
            strokeDasharray="2 3"
          />
          <circle cx={activeRegion.markerX} cy={activeRegion.markerY} r="15" fill="rgb(254 186 135 / 0.18)" />
          <circle
            cx={activeRegion.markerX}
            cy={activeRegion.markerY}
            r="11"
            className="fill-accent"
            stroke="rgb(255 236 220 / 0.9)"
            strokeWidth="2.5"
          />
        </g>
      )}
    </svg>
  );
}
