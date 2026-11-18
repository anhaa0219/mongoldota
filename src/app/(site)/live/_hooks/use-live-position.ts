"use client";

import { z } from "zod";
import { guessPosition } from "@/lib/draft/draft-lanes";
import { useStoredState } from "@/app/(site)/_hooks/use-stored-state";
import type { Position } from "@/types/draft";
import type { LiveSnapshot, LockedDraft } from "@/types/live";

const STORAGE_KEY = "live-position";
const positionSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
/** The position the player tapped, and the match it was for (a new match starts from a guess again). */
const choiceSchema = z.object({ matchId: z.string().nullable(), position: positionSchema.nullable() });
const NO_CHOICE: z.infer<typeof choiceSchema> = { matchId: null, position: null };

interface LivePosition {
  /** Null when a locked draft already gives the position, or outside a match. */
  position: Position | null;
  /** True while `position` is only our guess from the hero's roles. */
  isGuess: boolean;
  choose: (position: Position) => void;
}

/**
 * The position the player plays when no draft is locked for the hero they are on: what they tapped for this
 * match (remembered in this browser), otherwise the best fit for the hero's roles.
 */
export function useLivePosition(snapshot: LiveSnapshot | null, draft: LockedDraft | null, heroes: { id: number; roles: string[] }[]): LivePosition {
  const [choice, setChoice] = useStoredState(STORAGE_KEY, choiceSchema, NO_CHOICE);
  const matchId = snapshot?.matchId ?? null;
  const choose = (position: Position) => setChoice({ matchId, position });

  if (!snapshot || draft?.myHeroId === snapshot.heroId) return { position: null, isGuess: false, choose };
  if (choice.matchId === snapshot.matchId && choice.position !== null) return { position: choice.position, isGuess: false, choose };

  const roles = heroes.find((hero) => hero.id === snapshot.heroId)?.roles ?? [];
  return { position: guessPosition(roles), isGuess: true, choose };
}
