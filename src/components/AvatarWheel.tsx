import type { CSSProperties } from "react";
import { CharacterPortrait } from "@/components/CharacterPortrait";
import type { GameCharacter, Side } from "@/types/game";

interface AvatarWheelProps {
  side: Side;
  characters: GameCharacter[];
  /** The hero sitting in the big slot of this wheel. */
  focusedId: string;
  /** Whether this wheel's focused hero is the one shown in the card. */
  isActive: boolean;
  onSelect: (characterId: string) => void;
}

/**
 * Slot positions along the curve (center x, center y, diameter) in rem, measured
 * from the outer edge. The Dire wheel uses the same numbers from the right edge,
 * so the two wheels mirror each other. Slot 1 is the focused one.
 */
const slots = [
  { x: 20.75, y: 13.9, size: 7.1 },
  { x: 13.25, y: 24.8, size: 12.1 },
  { x: 10, y: 38.6, size: 8.4 },
  { x: 13.1, y: 50.8, size: 7.75 },
  { x: 20.3, y: 60.3, size: 6.9 },
];
const FOCUSED_SLOT = 1;

/** Rotates the list so the focused hero always sits in the big slot. */
function slotFor(index: number, focusedIndex: number, total: number) {
  return (index - focusedIndex + FOCUSED_SLOT + total) % total;
}

const sideStyle = {
  radiant: {
    label: "Radiant",
    heading: "text-radiant lg:left-[5rem]",
    item: "lg:left-[var(--x)]",
    ring: "border-radiant",
    badgeOn: "border-radiant bg-radiant text-ink",
    badgePlace: "lg:right-full lg:mr-[0.6rem]",
  },
  dire: {
    label: "Dire",
    heading: "text-dire lg:right-[5rem] lg:text-right",
    item: "lg:right-[var(--x)]",
    ring: "border-dire",
    badgeOn: "border-dire bg-dire text-white",
    badgePlace: "lg:left-full lg:ml-[0.6rem]",
  },
} as const;

export function AvatarWheel({ side, characters, focusedId, isActive, onSelect }: AvatarWheelProps) {
  const style = sideStyle[side];
  const focusedIndex = characters.findIndex((character) => character.id === focusedId);

  return (
    <section aria-label={style.label} className="flex flex-col gap-3 lg:contents">
      <h2
        className={`font-display text-[2rem] uppercase tracking-[0.08em] lg:absolute lg:top-[2.5rem] lg:text-[2.4rem] ${style.heading}`}
      >
        {style.label}
      </h2>
      <ul aria-label={`${style.label} heroes`} className="flex gap-4 overflow-x-auto pb-6 lg:contents">
        {characters.map((character, index) => {
          const slot = slots[slotFor(index, focusedIndex, characters.length) % slots.length];
          const isFocused = character.id === focusedId;
          const isShown = isFocused && isActive;
          const position = {
            "--x": `${slot.x - slot.size / 2}rem`,
            "--y": `${slot.y - slot.size / 2}rem`,
            "--size": `${slot.size}rem`,
          } as CSSProperties;

          return (
            <li
              key={character.id}
              style={position}
              className={`relative shrink-0 transition-all duration-500 ease-out lg:absolute lg:top-[var(--y)] ${style.item}`}
            >
              <button
                type="button"
                onClick={() => onSelect(character.id)}
                aria-pressed={isShown}
                aria-label={`${character.fullName}, position ${character.position}`}
                className={`relative block size-20 rounded-full transition-all duration-500 lg:size-[var(--size)] ${
                  isFocused ? `border-[0.1rem] p-[0.55rem] ${isShown ? style.ring : "border-white/30"}` : "hover:scale-105"
                }`}
              >
                <span
                  className={`relative block size-full overflow-hidden rounded-full shadow-[0_0.6rem_1.6rem_rgb(0_0_0/0.5)] transition-[filter] duration-500 ${
                    isShown ? "" : "grayscale"
                  }`}
                >
                  <CharacterPortrait character={character} sizes="12rem" />
                </span>
              </button>
              {character.position && (
                <span
                  className={`pointer-events-none absolute left-1/2 top-full -mt-3 -translate-x-1/2 whitespace-nowrap rounded-full border px-[0.6rem] py-[0.15rem] font-display text-[1rem] leading-none shadow-[0_0.3rem_0.8rem_rgb(0_0_0/0.5)] transition-colors duration-500 lg:left-auto lg:top-1/2 lg:mt-0 lg:translate-x-0 lg:-translate-y-1/2 lg:text-[1.15rem] ${style.badgePlace} ${
                    isShown ? style.badgeOn : "border-white/25 bg-ink/85 text-white/80"
                  }`}
                >
                  POS {character.position}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
