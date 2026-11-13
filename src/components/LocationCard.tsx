import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GameLocation } from "@/types/game";

interface LocationCardProps {
  location: GameLocation;
  onPrevious: () => void;
  onNext: () => void;
}

const arrowClass =
  "absolute top-1/2 grid size-[2.5rem] -translate-y-1/2 place-items-center rounded-full border-[0.1rem] border-accent bg-ink/90 text-white transition-colors hover:bg-accent hover:text-ink";

export function LocationCard({ location, onPrevious, onNext }: LocationCardProps) {
  const rows = [
    { label: "Type", value: location.type },
    { label: "Country", value: location.country },
    { label: "Region", value: location.region },
    { label: "Location", value: location.position },
  ];

  return (
    <div className="relative z-10 w-full max-w-[24.4rem] rounded-[0.9rem] border-[0.1rem] border-accent/80 bg-[#151311]/90 px-[2.4rem] pb-[1.5rem] pt-[1.4rem] shadow-[0_0_2rem_rgb(254_186_135/0.12)] backdrop-blur-sm">
      <div aria-live="polite">
        <h2 className="text-[1.375rem] font-semibold leading-[1.6]">Location: {location.name}</h2>
        <dl className="mt-[0.35rem] text-[1.2rem] leading-[1.45] text-[#a8a8a8]">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="inline">{row.label}: </dt>
              <dd className="inline">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <button type="button" aria-label="Previous location" onClick={onPrevious} className={`${arrowClass} -left-[1.3rem]`}>
        <ChevronLeft className="size-[1.4rem]" strokeWidth={1.75} />
      </button>
      <button type="button" aria-label="Next location" onClick={onNext} className={`${arrowClass} -right-[1.3rem]`}>
        <ChevronRight className="size-[1.4rem]" strokeWidth={1.75} />
      </button>
    </div>
  );
}
