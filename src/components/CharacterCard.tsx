import { CharacterPortrait } from "@/components/CharacterPortrait";
import { LaneCalculator, lanes, pick } from "@/components/LaneCalculator";
import { NameBanner } from "@/components/NameBanner";
import { StatBar } from "@/components/StatBar";
import type { GameCharacter } from "@/types/game";

interface CharacterCardProps {
  character: GameCharacter;
  radiant: GameCharacter[];
  dire: GameCharacter[];
}

/** Heroes this hero faces in its lane. */
function laneOpponents(character: GameCharacter, radiant: GameCharacter[], dire: GameCharacter[]) {
  const isDire = character.side === "dire";
  const lane = lanes.find((l) => (isDire ? l.dire : l.radiant).includes(character.position ?? 0));
  if (!lane) return [];
  return isDire ? pick(radiant, lane.radiant) : pick(dire, lane.dire);
}

/** The centre card between the two wheels: selected hero, laning tips and lane winner calculator. */
export function CharacterCard({ character, radiant, dire }: CharacterCardProps) {
  const isDire = character.side === "dire";
  const opponents = laneOpponents(character, radiant, dire);

  return (
    <article className="glass-card relative rounded-[2.5rem] border border-white/10 p-[1.6rem] lg:absolute lg:left-1/2 lg:top-[6rem] lg:w-[41rem] lg:-translate-x-1/2">
      <div aria-live="polite">
        <p
          className={`text-center font-display text-[1.4rem] uppercase tracking-[0.06em] ${isDire ? "text-dire" : "text-radiant"}`}
        >
          {isDire ? "Dire" : "Radiant"} · Pos {character.position} · {character.role}
        </p>

        {/* Portrait centred, name banner below it overlapping only the bottom edge */}
        <div className="mx-auto mt-[0.8rem] flex w-full max-w-[22rem] flex-col items-center">
          <div className="relative aspect-[256/144] w-full overflow-hidden rounded-[1.6rem] bg-[#1b1817]">
            <CharacterPortrait character={character} sizes="(min-width: 1024px) 22rem, 100vw" />
          </div>
          <div className="relative -mt-[1.4rem] w-[22rem] max-w-full">
            <NameBanner name={character.shortName} />
          </div>
        </div>

        <ul className="mt-[0.4rem] grid grid-cols-1 gap-x-[1.6rem] gap-y-[0.4rem] sm:grid-cols-2">
          {character.stats.map((stat) => (
            <li key={stat.label}>
              <StatBar stat={stat} />
            </li>
          ))}
        </ul>

        <section aria-label="Laning tips" className="mt-[1.2rem] border-t border-white/10 pt-[1rem]">
          <h3 className="font-display text-[1.5rem] uppercase tracking-[0.06em] text-white/80">
            Laning tips
            {opponents.length > 0 && (
              <span className="ml-[0.6rem] font-sans text-[1.05rem] normal-case tracking-normal text-white/55">
                vs {opponents.map((hero) => hero.fullName).join(" & ")}
              </span>
            )}
          </h3>
          <ul className="mt-[0.5rem] flex list-disc flex-col gap-[0.3rem] pl-[1.4rem] text-[1.1rem] leading-[1.45] text-white/90 marker:text-accent">
            {character.laningTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </div>

      <LaneCalculator radiant={radiant} dire={dire} />
    </article>
  );
}
