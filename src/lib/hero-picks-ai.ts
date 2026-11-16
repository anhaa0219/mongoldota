/** "AI picks for you" (server only). Cached per shortlist, so a reload never spends credits twice. */

import { cacheLife } from "next/cache";
import { askTextModel } from "@/lib/hf";
import { buildHeroPicksPrompt, parseHeroPicks, type HeroPick, type PickCandidate } from "@/lib/hero-picks";
import type { MetaBracket } from "@/types/meta";
import type { LaneRole } from "@/types/opendota";

const SIX_HOURS = 6 * 3600;

/** Throws on failure so a failed answer is never cached. */
async function cachedPicks(candidates: PickCandidate[], bracket: MetaBracket, mainLane: LaneRole | null): Promise<HeroPick[]> {
  "use cache";
  cacheLife({ revalidate: SIX_HOURS });
  const result = await askTextModel(buildHeroPicksPrompt(candidates, bracket, mainLane));
  if (!result.ok) throw new Error(`AI picks unavailable: ${result.reason}`);
  const picks = parseHeroPicks(result.text, candidates);
  if (!picks) throw new Error("AI picks reply could not be read");
  return picks;
}

/** Null when the AI is not set up, out of credits, slow or unreadable: the page shows the top of the shortlist instead. */
export async function getAiHeroPicks(candidates: PickCandidate[], bracket: MetaBracket, mainLane: LaneRole | null): Promise<HeroPick[] | null> {
  try {
    return await cachedPicks(candidates, bracket, mainLane);
  } catch {
    return null;
  }
}
