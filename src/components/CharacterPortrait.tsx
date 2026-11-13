import Image from "next/image";
import { useId } from "react";
import type { GameCharacter } from "@/types/game";

interface CharacterPortraitProps {
  character: GameCharacter;
  sizes: string;
}

/** Shows the character's image, or a tinted silhouette until you add one. */
export function CharacterPortrait({ character, sizes }: CharacterPortraitProps) {
  const gradientId = useId();

  if (character.portrait) {
    return <Image src={character.portrait} alt={character.fullName} fill sizes={sizes} className="object-cover" />;
  }

  return (
    <svg viewBox="0 0 200 200" className="size-full" role="img" aria-label={character.fullName}>
      <defs>
        <radialGradient id={`${gradientId}-bg`} cx="0.5" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#3a3330" />
          <stop offset="1" stopColor="#141110" />
        </radialGradient>
        <linearGradient id={`${gradientId}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={character.placeholderTint} />
          <stop offset="1" stopColor="#1c1714" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${gradientId}-bg)`} />
      {character.placeholderShape === "hood" ? (
        <>
          <path d="M40 200 C45 120 70 45 100 40 C130 45 155 120 160 200 Z" fill={`url(#${gradientId}-body)`} />
          <ellipse cx="100" cy="95" rx="24" ry="32" fill="#0b0908" />
        </>
      ) : (
        <>
          <path d="M30 200 C35 150 65 132 100 132 C135 132 165 150 170 200 Z" fill={`url(#${gradientId}-body)`} />
          <ellipse cx="100" cy="88" rx="34" ry="42" fill={character.placeholderTint} opacity="0.85" />
          <path d="M64 82 C62 45 82 34 100 34 C122 34 140 48 136 84 C128 64 112 58 100 58 C86 58 72 64 64 82 Z" fill="#f1ece4" opacity="0.55" />
        </>
      )}
    </svg>
  );
}
