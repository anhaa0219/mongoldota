import { CharacterPortrait } from "@/components/CharacterPortrait";
import type { GameCharacter } from "@/types/game";

interface Lane {
  name: string;
  radiant: number[];
  dire: number[];
}

/** Standard lane matchups by position. */
export const lanes: Lane[] = [
  { name: "Top", radiant: [3, 4], dire: [1, 5] },
  { name: "Mid", radiant: [2], dire: [2] },
  { name: "Bot", radiant: [1, 5], dire: [3, 4] },
];

/** Share of laning strength (0–1) below which the lane is called even. */
const EVEN_MARGIN = 0.03;

export function pick(team: GameCharacter[], positions: number[]) {
  return positions.map((p) => team.find((hero) => hero.position === p)).filter((hero) => hero !== undefined);
}

function laneScore(heroes: GameCharacter[]) {
  return heroes.reduce((sum, hero) => sum + (hero.laning ?? 50), 0);
}

function Faces({ heroes }: { heroes: GameCharacter[] }) {
  return (
    <div className="flex -space-x-[0.6rem]">
      {heroes.map((hero) => (
        <span
          key={hero.id}
          title={`${hero.fullName} (Pos ${hero.position})`}
          className="relative block size-[2.6rem] overflow-hidden rounded-full border border-white/20"
        >
          <CharacterPortrait character={hero} sizes="3rem" />
        </span>
      ))}
    </div>
  );
}

export function LaneCalculator({ radiant, dire }: { radiant: GameCharacter[]; dire: GameCharacter[] }) {
  return (
    <section aria-label="Lane winner" className="mt-[1.2rem] border-t border-white/10 pt-[1rem]">
      <h3 className="font-display text-[1.5rem] uppercase tracking-[0.06em] text-white/80">Lane winner</h3>
      <ul className="mt-[0.8rem] flex flex-col gap-[0.7rem]">
        {lanes.map((lane) => {
          const r = pick(radiant, lane.radiant);
          const d = pick(dire, lane.dire);
          const rScore = laneScore(r);
          const dScore = laneScore(d);
          const share = rScore / (rScore + dScore || 1);
          const winner =
            share > 0.5 + EVEN_MARGIN ? "Radiant" : share < 0.5 - EVEN_MARGIN ? "Dire" : "Even";
          const winnerClass =
            winner === "Radiant" ? "text-radiant" : winner === "Dire" ? "text-dire" : "text-white/70";

          return (
            <li key={lane.name} className="grid grid-cols-[3.2rem_auto_minmax(0,1fr)_auto_5.6rem] items-center gap-[0.8rem]">
              <span className="text-[1.1rem] font-medium text-white/70">{lane.name}</span>
              <Faces heroes={r} />
              <div
                className="flex h-[0.7rem] overflow-hidden rounded-full bg-white/10"
                role="meter"
                aria-label={`${lane.name} lane Radiant advantage`}
                aria-valuenow={Math.round(share * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span className="bg-radiant transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
                <span className="flex-1 bg-dire" />
              </div>
              <Faces heroes={d} />
              <span className={`text-right font-display text-[1.25rem] uppercase ${winnerClass}`}>{winner}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
