/** Prompt for the vision model and parsing of its reply into draft slots. Pure. */

import { z } from "zod";
import { TEAM_SIZE } from "@/lib/draft/draft";
import type { DraftSlots } from "@/types/draft";
import type { HeroInfo } from "@/types/opendota";

const teamSchema = z.array(z.string().nullable()).max(TEAM_SIZE * 2);
const replySchema = z.object({ radiant: teamSchema, dire: teamSchema });

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export function buildDraftPrompt(heroNames: string[]): string {
  return [
    "This is a Dota 2 screenshot taken during a draft or a match.",
    "Identify the heroes each team has picked. Radiant is the left (green) team, Dire is the right (red) team.",
    "List each team's heroes left to right, at most 5 per team. Use null for an empty slot or a hero you cannot see clearly. Never guess.",
    'Answer with JSON only, no other text: {"radiant": [...], "dire": [...]}',
    `Use hero names exactly as written in this list: ${heroNames.join(", ")}.`,
  ].join("\n");
}

/** The model may wrap its JSON in prose or a code fence: take the outermost {...}. */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Hero ids for the model's names (by display name or slug, ignoring case and punctuation); unknown names become empty slots. */
export function parseDraftReply(text: string, heroes: HeroInfo[]): DraftSlots | null {
  const parsed = replySchema.safeParse(extractJson(text));
  if (!parsed.success) return null;

  const byName = new Map<string, number>();
  for (const hero of heroes) {
    byName.set(normalize(hero.name), hero.id);
    if (hero.slug) byName.set(normalize(hero.slug), hero.id);
  }

  const seen = new Set<number>();
  const toIds = (names: (string | null)[]) => {
    const ids = names.slice(0, TEAM_SIZE).map((name) => {
      const heroId = name === null ? undefined : byName.get(normalize(name));
      if (heroId === undefined || seen.has(heroId)) return null;
      seen.add(heroId);
      return heroId;
    });
    return [...ids, ...Array<null>(TEAM_SIZE - ids.length).fill(null)];
  };
  return { radiant: toIds(parsed.data.radiant), dire: toIds(parsed.data.dire) };
}
