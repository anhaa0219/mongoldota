import { HeroComparison } from "@/components/HeroComparison";
import { SuggestionList } from "@/components/SuggestionList";
import { compareToHero } from "@/lib/hero-benchmarks";
import { getHeroBenchmarks } from "@/lib/opendota-benchmarks";
import { buildSuggestions } from "@/lib/suggestions";
import type { FormTrend } from "@/types/coach";
import type { MatchSummary, PlayerSummary } from "@/types/opendota";

interface CoachSectionProps {
  summary: PlayerSummary;
  /** The player's matches on their most played hero. */
  heroMatches: MatchSummary[];
  form: FormTrend | null;
}

/** Right column of the Stats page. Loads on its own (inside Suspense) so the benchmarks request never holds back the stats. */
export async function CoachSection({ summary, heroMatches, form }: CoachSectionProps) {
  const { hero } = summary.mostPlayed;
  const benchmarks = await getHeroBenchmarks(hero.id);
  // OpenDota down: no comparison, but suggestions from form, lanes and heroes still work.
  const comparison = benchmarks ? compareToHero(heroMatches, benchmarks) : [];
  const suggestions = buildSuggestions({ heroName: hero.name, comparison, form, summary });

  return (
    <>
      <HeroComparison heroName={hero.name} rows={comparison} />
      <SuggestionList suggestions={suggestions} />
    </>
  );
}

export function CoachSkeleton() {
  return (
    <>
      <div className="glass-panel h-[17rem] animate-pulse rounded-[1.4rem]" />
      <div className="glass-panel min-h-[20rem] flex-1 animate-pulse rounded-[1.4rem]" />
    </>
  );
}
