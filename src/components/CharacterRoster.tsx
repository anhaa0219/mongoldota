"use client";

import { useState } from "react";
import { AvatarWheel } from "@/components/AvatarWheel";
import { CharacterCard } from "@/components/CharacterCard";
import { defaultFocus, teams } from "@/lib/characters-content";
import type { Side } from "@/types/game";

/** Dotted line from the focused avatar to the card (desktop only). Mirrored for Dire. */
function Connector({ side }: { side: Side }) {
  const isDire = side === "dire";
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute top-[24.05rem] hidden h-[15rem] w-[11.4rem] overflow-visible lg:block ${
        isDire ? "right-[20.8rem] -scale-x-100" : "left-[20.8rem]"
      }`}
      viewBox="0 0 182 240"
    >
      <circle cx="12" cy="12" r="12" className={isDire ? "fill-dire" : "fill-radiant"} />
      <path d="M28 12 H97 V242 H179" fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="1.5" strokeDasharray="6 5" />
    </svg>
  );
}

export function CharacterRoster() {
  const [focus, setFocus] = useState(defaultFocus);
  const [activeSide, setActiveSide] = useState<Side>("radiant");

  const shownHero = teams[activeSide].find((hero) => hero.id === focus[activeSide]) ?? teams[activeSide][0];

  function select(side: Side, heroId: string) {
    setFocus((current) => ({ ...current, [side]: heroId }));
    setActiveSide(side);
  }

  return (
    <div className="relative flex flex-col gap-8 lg:block lg:h-full">
      {(["radiant", "dire"] as const).map((side) => (
        <AvatarWheel
          key={side}
          side={side}
          characters={teams[side]}
          focusedId={focus[side]}
          isActive={activeSide === side}
          onSelect={(heroId) => select(side, heroId)}
        />
      ))}
      <Connector side={activeSide} />
      <CharacterCard character={shownHero} radiant={teams.radiant} dire={teams.dire} />
    </div>
  );
}
