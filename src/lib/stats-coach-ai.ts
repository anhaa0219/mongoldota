/** Stats page AI coach (server only). Answers are cached per prompt, so a page reload never spends credits twice. */

import { cacheLife } from "next/cache";
import { askTextModel } from "@/lib/hf";
import { parseCoachSuggestions } from "@/lib/stats-coach";
import type { Suggestion } from "@/types/coach";

const SIX_HOURS = 6 * 3600;

/** Throws on failure so a failed answer is never cached. The prompt holds every number, so new matches mean a new answer. */
async function cachedCoach(prompt: string): Promise<Suggestion[]> {
  "use cache";
  cacheLife({ revalidate: SIX_HOURS });
  const result = await askTextModel(prompt);
  if (!result.ok) throw new Error(`AI coach unavailable: ${result.reason}`);
  const suggestions = parseCoachSuggestions(result.text);
  if (!suggestions) throw new Error("AI coach reply could not be read");
  return suggestions;
}

/** Null when the model is not set up, out of credits, slow or unreadable: the page keeps its rule-based suggestions. */
export async function getAiSuggestions(prompt: string): Promise<Suggestion[] | null> {
  try {
    return await cachedCoach(prompt);
  } catch {
    return null;
  }
}
