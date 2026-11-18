import { AdviceTimer } from "@/app/(site)/_components/AdviceTimer";
import { SuggestionList } from "../_components/SuggestionList";
import { buildStatsCoachPrompt, storedSuggestionsSchema, type StatsCoachInput } from "../_utils/stats-coach";
import { getAiSuggestions } from "../_utils/stats-coach-ai";
import { getTimedAdvice } from "@/app/(site)/_utils/timed-advice";
import { answerLanguage } from "@/lib/ai/answer-language";
import { getLanguage } from "@/lib/i18n/server";

/**
 * AI coach tips grounded in the player's numbers, stored per player and refreshed at most every 12 hours.
 * Falls back to the rule-based tips. Render inside Suspense.
 */
export async function AiSuggestions({ accountId, clerkUserId, input }: { accountId: string; clerkUserId: string; input: StatsCoachInput }) {
  const language = answerLanguage(await getLanguage());
  const advice = await getTimedAdvice({
    accountId,
    kind: "stats-coach",
    language,
    schema: storedSuggestionsSchema,
    generate: () => getAiSuggestions(buildStatsCoachPrompt(input, language), clerkUserId),
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
