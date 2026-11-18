/** What the Draft page saves in the browser, and the keys that tie saved advice to one exact lineup. Pure. */

import { z } from "zod";
import { emptyDraft, TEAM_SIZE } from "@/lib/draft/draft";
import type { Language } from "@/lib/i18n/language";
import type { DraftSlots, Position } from "@/types/draft";
import type { Side } from "@/types/game";

const team = z.array(z.number().int().nullable()).length(TEAM_SIZE);
const position = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const pairs = z.array(z.tuple([z.number().int(), position]));

export const BOARD_KEY = "draft-board";
export const boardSchema = z.object({ draft: z.object({ radiant: team, dire: team }), locked: z.boolean() });
export type SavedBoard = z.infer<typeof boardSchema>;
export const EMPTY_BOARD: SavedBoard = { draft: emptyDraft(), locked: false };

export const LOCK_KEY = "draft-lock";
export const lockSchema = z
  .object({
    lineup: z.string(),
    positions: z.object({ radiant: pairs, dire: pairs }),
    chosenId: z.number().int().nullable(),
    advice: z
      .object({
        request: z.string(),
        items: z.array(z.object({ category: z.string(), title: z.string(), detail: z.string() })).min(1),
      })
      .nullable(),
  })
  .nullable();
export type SavedLock = z.infer<typeof lockSchema>;

/** The ten picks in slot order: saved lock-screen choices only apply to this exact lineup. */
export function lineupKey(draft: DraftSlots): string {
  return `${draft.radiant.join(",")}|${draft.dire.join(",")}`;
}

/**
 * Everything the advice depends on besides the lineup: side, hero, every position, and the language it is written in.
 * English keeps the old key, so advice saved before languages existed still shows.
 */
export function adviceRequestKey(mySide: Side, myHeroId: number, positions: Record<Side, Map<number, Position>>, language: Language): string {
  const sorted = (side: Side) => [...positions[side]].sort(([a], [b]) => a - b);
  const parts = [mySide, myHeroId, sorted("radiant"), sorted("dire")];
  return JSON.stringify(language === "en" ? parts : [language, ...parts]);
}
