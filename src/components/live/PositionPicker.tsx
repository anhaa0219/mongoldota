import { POSITIONS } from "@/lib/draft-lanes";
import type { Position } from "@/types/draft";

const POSITION_HINTS: Record<Position, string> = { 1: "Carry", 2: "Mid", 3: "Off lane", 4: "Soft support", 5: "Hard support" };

interface PositionPickerProps {
  value: Position;
  /** True until the player taps a position: `value` is then only our guess from the hero's roles. */
  isGuess: boolean;
  onChange: (position: Position) => void;
}

/** Shown on the Live page when no draft is locked for this hero: the player says which position they play, so the coach knows their lane. */
export function PositionPicker({ value, isGuess, onChange }: PositionPickerProps) {
  return (
    <div className="glass-panel rise-in flex flex-wrap items-center gap-x-[1rem] gap-y-[0.5rem] rounded-[1.2rem] px-[1rem] py-[0.7rem] text-[0.95rem] text-white/80">
      <span id="position-picker-label" className="text-[0.8rem] uppercase tracking-[0.12em] text-white/50">
        Your position
      </span>
      <span className="flex gap-[0.3rem]" role="radiogroup" aria-labelledby="position-picker-label">
        {POSITIONS.map((position) => (
          <button
            key={position}
            type="button"
            role="radio"
            aria-checked={position === value}
            title={`Position ${position}: ${POSITION_HINTS[position]}`}
            onClick={() => onChange(position)}
            className={`grid size-[2rem] place-items-center rounded-full text-[0.95rem] font-semibold transition-colors ${
              position === value ? "bg-accent text-ink" : "bg-white/[0.07] text-white/60 hover:bg-white/[0.15]"
            }`}
          >
            {position}
          </button>
        ))}
      </span>
      <span className="text-white/55">
        {POSITION_HINTS[value]}. {isGuess && "Our guess — tap to change. "}Lock a draft for lane matchups.
      </span>
    </div>
  );
}
