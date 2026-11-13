import { heroPortrait as portrait } from "@/lib/hero-images";
import type { GameCharacter, Side } from "@/types/game";

type HeroInput = Omit<GameCharacter, "portrait" | "placeholderShape" | "stats" | "side"> & {
  str: number;
  agi: number;
  int: number;
  ms: number;
};

function hero(side: Side, input: HeroInput): GameCharacter {
  const { str, agi, int, ms, ...rest } = input;
  return {
    ...rest,
    side,
    portrait: portrait(input.id),
    placeholderShape: "bust",
    stats: [
      { label: "Strength", value: str, max: 30 },
      { label: "Agility", value: agi, max: 30 },
      { label: "Intelligence", value: int, max: 30 },
      { label: "Move Speed", value: ms, max: 350 },
    ],
  };
}

/**
 * Sample lineups — numbers are placeholders until real match data is wired in.
 * Array order = wheel order. `laningTips` are placeholders for AI-generated tips. `laning` (0–100) feeds the lane winner calculator.
 */
export const teams: Record<Side, GameCharacter[]> = {
  radiant: [
    hero("radiant", {
      id: "antimage", shortName: "Anti-Mage", fullName: "Anti-Mage", position: 1, role: "Carry", laning: 45,
      str: 21, agi: 24, int: 12, ms: 310, placeholderTint: "#8a6fd1",
      laningTips: [
        "Last-hit safely and avoid trades until Battle Fury; your laning is weak early.",
        "Use Blink to escape ganks, not to chase kills before level 6.",
        "Mana Break punishes mana-hungry laners, so right-click them when they step up.",
      ],
    }),
    hero("radiant", {
      id: "invoker", shortName: "Invoker", fullName: "Invoker", position: 2, role: "Mid", laning: 60,
      str: 18, agi: 14, int: 23, ms: 285, placeholderTint: "#d9a066",
      laningTips: [
        "Pick Exort early to win last hits with Forge Spirits.",
        "Cold Snap stops regen items, so use it when the enemy mid drinks a salve.",
        "Push the wave and rune every two minutes to keep the tempo.",
      ],
    }),
    hero("radiant", {
      id: "axe", shortName: "Axe", fullName: "Axe", position: 3, role: "Offlane", laning: 80,
      str: 25, agi: 20, int: 18, ms: 310, placeholderTint: "#c0392b",
      laningTips: [
        "Stand next to creeps to proc Counter Helix while the enemy last-hits.",
        "Battle Hunger forces the carry away from the wave. Use it before they hit the creep.",
        "Blink-Call from fog at level 6 once you see the support out of position.",
      ],
    }),
    hero("radiant", {
      id: "earthshaker", shortName: "Earthshaker", fullName: "Earthshaker", position: 4, role: "Soft Support", laning: 65,
      str: 22, agi: 12, int: 18, ms: 310, placeholderTint: "#a08a6a",
      laningTips: [
        "Fissure behind the enemy to block their escape and set up your carry.",
        "Pull or stack between waves rather than taking last hits.",
        "Leave the lane to rotate once you hit level 6 with Blink Dagger.",
      ],
    }),
    hero("radiant", {
      id: "crystal_maiden", shortName: "Maiden", fullName: "Crystal Maiden", position: 5, role: "Hard Support", laning: 60,
      str: 18, agi: 16, int: 16, ms: 275, placeholderTint: "#7fb3d5",
      laningTips: [
        "Stay behind your creeps. You are the slowest and squishiest hero in lane.",
        "Frostbite the enemy carry when they walk up for a last hit.",
        "Ward the enemy jungle entrance and pull to keep the lane at your tower.",
      ],
    }),
  ],
  dire: [
    hero("dire", {
      id: "phantom_assassin", shortName: "Phantom", fullName: "Phantom Assassin", position: 1, role: "Carry", laning: 60,
      str: 19, agi: 21, int: 15, ms: 300, placeholderTint: "#6d7f99",
      laningTips: [
        "Stifling Dagger last-hits ranged creeps and slows the support chasing you.",
        "Blur hides you on the minimap, so jungle when the lane gets too hard.",
        "Wait for Battle Fury or Desolator before taking long fights.",
      ],
    }),
    hero("dire", {
      id: "nevermore", shortName: "Shadow Fiend", fullName: "Shadow Fiend", position: 2, role: "Mid", laning: 75,
      str: 19, agi: 20, int: 18, ms: 305, placeholderTint: "#8e2c2c",
      laningTips: [
        "Raze the creep wave to secure souls and zone the enemy mid.",
        "Don't miss last hits. Each soul is permanent damage.",
        "Bottle and the next rune let you trade razes all lane long.",
      ],
    }),
    hero("dire", {
      id: "tidehunter", shortName: "Tidehunter", fullName: "Tidehunter", position: 3, role: "Offlane", laning: 70,
      str: 22, agi: 15, int: 18, ms: 305, placeholderTint: "#3f7f6f",
      laningTips: [
        "Anchor Smash reduces enemy damage, so smash creeps and heroes together.",
        "Kraken Shell blocks harass and dispels damage-over-time spells.",
        "Hold Ravage for the fight. One great Ravage is worth more than a lane kill.",
      ],
    }),
    hero("dire", {
      id: "rubick", shortName: "Rubick", fullName: "Rubick", position: 4, role: "Soft Support", laning: 55,
      str: 21, agi: 23, int: 25, ms: 290, placeholderTint: "#5c9a3c",
      laningTips: [
        "Telekinesis the enemy carry into your offlaner for an early kill.",
        "Watch which spells the enemy uses and be ready to steal the best one.",
        "Fade Bolt lowers enemy attack damage, so cast it on the wave before trades.",
      ],
    }),
    hero("dire", {
      id: "lion", shortName: "Lion", fullName: "Lion", position: 5, role: "Hard Support", laning: 70,
      str: 18, agi: 15, int: 22, ms: 290, placeholderTint: "#a0522d",
      laningTips: [
        "Earth Spike hits through creep lines. Line it up to stun two heroes.",
        "Mana Drain the enemy support to stop their spell harass.",
        "At level 6, Hex followed by Finger of Death kills most supports.",
      ],
    }),
  ],
};

export const defaultFocus: Record<Side, string> = { radiant: "antimage", dire: "phantom_assassin" };
