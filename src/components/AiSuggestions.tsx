import { AdviceTimer } from "@/components/AdviceTimer";
import { SuggestionList } from "@/components/SuggestionList";
import { buildStatsCoachPrompt, storedSuggestionsSchema, type StatsCoachInput } from "@/lib/stats-coach";
import { getAiSuggestions } from "@/lib/stats-coach-ai";
import { getTimedAdvice } from "@/lib/timed-advice";

/**
 * AI coach tips grounded in the player's numbers, stored per player and refreshed at most every 12 hours.
 * Falls back to the rule-based tips. Render inside Suspense.
 */
export async function AiSuggestions({ accountId, input }: { accountId: string; input: StatsCoachInput }) {
  const advice = await getTimedAdvice({
    accountId,
    kind: "stats-coach",
    schema: storedSuggestionsSchema,
    generate: () => getAiSuggestions(buildStatsCoachPrompt(input)),
  });
  if (!advice) return <SuggestionList suggestions={input.ruleSuggestions} source="rules" />;
  return (
    <SuggestionList
      suggestions={advice.value}
      source="ai"
      timer={<AdviceTimer createdAt={advice.createdAt} initialNow={advice.now} />}
    />
  );
}
