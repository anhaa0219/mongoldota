import { Suspense } from "react";
import { AiSuggestions } from "./AiSuggestions";
import { HeroComparison } from "../_components/HeroComparison";
import { SuggestionList } from "../_components/SuggestionList";
import { compareToHero } from "../_utils/hero-benchmarks";
import { getHeroBenchmarks } from "../_utils/opendota-benchmarks";
import { getAbilityIndex } from "@/lib/opendota/opendota-draft";
import { getPlaystyle } from "@/lib/opendota/opendota-matches";
import { buildSuggestions } from "../_utils/suggestions";
import type { FormTrend } from "../_utils/coach-types";
import type { MatchSummary, PlayerSummary } from "@/types/opendota";
import { getWords } from "@/lib/i18n/server";

interface CoachSectionProps {
  accountId: string;
  /** The MongolDota account, for the AI limits. */
  clerkUserId: string;
  summary: PlayerSummary;
  /** The player's matches on their most played hero. */
  heroMatches: MatchSummary[];
  form: FormTrend | null;
}

/**
 * Right column of the Stats page. Loads on its own (inside Suspense) so the benchmarks request never holds back the stats.
 * Rule-based suggestions show at once; the AI coach's tips replace them when ready.
 */
export async function CoachSection({ accountId, clerkUserId, summary, heroMatches, form }: CoachSectionProps) {
  const { hero } = summary.mostPlayed;
  const [benchmarks, playstyle, abilities] = await Promise.all([getHeroBenchmarks(hero.id), getPlaystyle(accountId), getAbilityIndex()]);
  // OpenDota down: no comparison, but suggestions from form, lanes and heroes still work.
  const comparison = benchmarks ? compareToHero(heroMatches, benchmarks) : [];
  const words = await getWords();
  const ruleSuggestions = buildSuggestions({ heroName: hero.name, comparison, form, summary }, words);
  const coachInput = { summary, comparison, form, playstyle: playstyle ?? [], abilities: abilities?.[hero.slug] ?? [], ruleSuggestions };

  return (
    <>
      <HeroComparison heroName={hero.name} rows={comparison} />
      <Suspense fallback={<SuggestionList suggestions={ruleSuggestions} source="loading" />}>
        <AiSuggestions accountId={accountId} clerkUserId={clerkUserId} input={coachInput} />
      </Suspense>
    </>
  );
}

export function CoachSkeleton() {
  return (
    <>
      <div className="glass-panel shimmer h-[17rem] rounded-[1.4rem]" />
      <div className="glass-panel shimmer min-h-[20rem] flex-1 rounded-[1.4rem]" />
    </>
  );
}
