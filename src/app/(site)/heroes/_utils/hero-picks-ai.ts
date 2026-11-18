/** "AI picks for you" (server only). Cached per shortlist, so a reload never spends credits twice. */

import { cacheLife } from "next/cache";
import { gatedAiCall } from "@/lib/ai/ai-gate";
import { askTextModel } from "@/lib/ai/hf";
import { buildHeroPicksPrompt, parseHeroPicks, type HeroPick, type PickCandidate } from "./hero-picks";
import type { MetaBracket } from "./meta-types";
import type { Language } from "@/lib/i18n/language";
import type { LaneRole } from "@/types/opendota";

const SIX_HOURS = 6 * 3600;

/** Throws on failure so a failed answer is never cached. */
async function cachedPicks(candidates: PickCandidate[], bracket: MetaBracket, mainLane: LaneRole | null, clerkUserId: string, language: Language): Promise<HeroPick[]> {
  "use cache";
  cacheLife({ revalidate: SIX_HOURS });
  // Inside the cache: a cache hit is neither checked against the limits nor recorded (no AI call happens).
  const result = await gatedAiCall({ clerkUserId, kind: "hero-picks", matchId: null }, () => askTextModel(buildHeroPicksPrompt(candidates, bracket, mainLane, language)));
  if (!result.ok) throw new Error(`AI picks unavailable: ${result.reason}`);
  const picks = parseHeroPicks(result.text, candidates);
  if (!picks) throw new Error("AI picks reply could not be read");
  return picks;
}

/** Null when the AI is not set up, out of credits, slow or unreadable: the page shows the top of the shortlist instead. */
/** `clerkUserId` counts the call toward the player's AI limits. */
export async function getAiHeroPicks(candidates: PickCandidate[], bracket: MetaBracket, mainLane: LaneRole | null, clerkUserId: string, language: Language): Promise<HeroPick[] | null> {
  try {
    return await cachedPicks(candidates, bracket, mainLane, clerkUserId, language);
  } catch {
    return null;
  }
}
