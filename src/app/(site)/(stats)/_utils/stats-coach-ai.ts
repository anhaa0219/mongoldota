/** Stats page AI coach (server only). Answers are cached per prompt, so a page reload never spends credits twice. */

import { cacheLife } from "next/cache";
import { gatedAiCall } from "@/lib/ai/ai-gate";
import { askTextModel } from "@/lib/ai/hf";
import { parseCoachSuggestions } from "./stats-coach";
import type { Suggestion } from "./coach-types";

const SIX_HOURS = 6 * 3600;

/** Throws on failure so a failed answer is never cached. The prompt holds every number, so new matches mean a new answer. */
async function cachedCoach(prompt: string, clerkUserId: string): Promise<Suggestion[]> {
  "use cache";
  cacheLife({ revalidate: SIX_HOURS });
  // Inside the cache: a cache hit is neither checked against the limits nor recorded (no AI call happens).
  const result = await gatedAiCall({ clerkUserId, kind: "stats-coach", matchId: null }, () => askTextModel(prompt));
  if (!result.ok) throw new Error(`AI coach unavailable: ${result.reason}`);
  const suggestions = parseCoachSuggestions(result.text);
  if (!suggestions) throw new Error("AI coach reply could not be read");
  return suggestions;
}

/** Null when the model is not set up, out of credits, slow or unreadable: the page keeps its rule-based suggestions. */
/** `clerkUserId` counts the call toward the player's AI limits. */
export async function getAiSuggestions(prompt: string, clerkUserId: string): Promise<Suggestion[] | null> {
  try {
    return await cachedCoach(prompt, clerkUserId);
  } catch {
    return null;
  }
}
