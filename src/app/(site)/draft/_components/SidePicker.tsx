import type { Side } from "@/types/game";
import { useWords } from "@/lib/i18n/use-words";

const SIDES: readonly Side[] = ["radiant", "dire"];

function sideClass(side: Side, isMine: boolean) {
  if (!isMine) return "bg-white/[0.07] text-white/70";
  return side === "radiant" ? "bg-radiant text-ink" : "bg-dire text-white";
}

/** "My team: Radiant | Dire" toggle above the draft board. */
export function SidePicker({ mySide, onChange }: { mySide: Side; onChange: (side: Side) => void }) {
  const words = useWords().draft;
  return (
    <div className="flex items-center gap-[0.4rem] text-[0.92rem] text-white/60" role="group" aria-label={words.myTeam}>
      {words.myTeam}
      {SIDES.map((side) => (
        <button
          key={side}
          type="button"
          aria-pressed={mySide === side}
          onClick={() => onChange(side)}
          className={`rounded-full px-[0.8rem] py-[0.3rem] capitalize ${sideClass(side, mySide === side)}`}
        >
          {side}
        </button>
      ))}
    </div>
  );
}
