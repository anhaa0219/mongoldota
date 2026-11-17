import { Suspense } from "react";
import { AiSuggestions } from "@/components/AiSuggestions";
import { HeroComparison } from "@/components/HeroComparison";
import { SuggestionList } from "@/components/SuggestionList";
import { compareToHero } from "@/lib/hero-benchmarks";
import { getHeroBenchmarks } from "@/lib/opendota-benchmarks";
import { getAbilityIndex } from "@/lib/opendota-draft";
import { getPlaystyle } from "@/lib/opendota-matches";
import { buildSuggestions } from "@/lib/suggestions";
import type { FormTrend } from "@/types/coach";
import type { MatchSummary, PlayerSummary } from "@/types/opendota";

interface CoachSectionProps {
  accountId: string;
  summary: PlayerSummary;
  /** The player's matches on their most played hero. */
  heroMatches: MatchSummary[];
  form: FormTrend | null;
}

/**
 * Right column of the Stats page. Loads on its own (inside Suspense) so the benchmarks request never holds back the stats.
 * Rule-based suggestions show at once; the AI coach's tips replace them when ready.
 */
export async function CoachSection({ accountId, summary, heroMatches, form }: CoachSectionProps) {
  const { hero } = summary.mostPlayed;
  const [benchmarks, playstyle, abilities] = await Promise.all([getHeroBenchmarks(hero.id), getPlaystyle(accountId), getAbilityIndex()]);
  // OpenDota down: no comparison, but suggestions from form, lanes and heroes still work.
  const comparison = benchmarks ? compareToHero(heroMatches, benchmarks) : [];
  const ruleSuggestions = buildSuggestions({ heroName: hero.name, comparison, form, summary });
  const coachInput = { summary, comparison, form, playstyle: playstyle ?? [], abilities: abilities?.[hero.slug] ?? [], ruleSuggestions };

  return (
    <>
      <HeroComparison heroName={hero.name} rows={comparison} />
      <Suspense fallback={<SuggestionList suggestions={ruleSuggestions} source="loading" />}>
        <AiSuggestions accountId={accountId} input={coachInput} />
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
