import { AdviceTimer } from "@/components/AdviceTimer";
import { HeroPickCards } from "@/components/trending/HeroPickCards";
import { bracketLabel } from "@/lib/hero-meta";
import { fallbackReason, PICK_COUNT, shortlist, storedPicksSchema, type PickCard } from "@/lib/hero-picks";
import { getAiHeroPicks } from "@/lib/hero-picks-ai";
import { getTimedAdvice } from "@/lib/timed-advice";
import type { PersonalRecord } from "@/types/draft";
import type { HeroMeta, MetaBracket } from "@/types/meta";
import type { LaneRole } from "@/types/opendota";

interface AiHeroPicksProps {
  accountId: string;
  heroes: HeroMeta[];
  bracket: MetaBracket;
  personal: Record<number, PersonalRecord>;
  mainLane: LaneRole | null;
}

/**
 * Top of the Trending page: 5 heroes for this player, chosen by AI from a scored shortlist.
 * Stored per player and refreshed at most every 12 hours (sooner if their rank changes). Render inside Suspense.
 */
export async function AiHeroPicks({ accountId, heroes, bracket, personal, mainLane }: AiHeroPicksProps) {
  const candidates = shortlist({ heroes, bracket, personal, mainLane });
  if (candidates.length === 0) return null;

  const advice = await getTimedAdvice({
    accountId,
    kind: "hero-picks",
    schema: storedPicksSchema,
    stillFits: (stored) => stored.bracket === bracket,
    generate: async () => {
      const picks = await getAiHeroPicks(candidates, bracket, mainLane);
      if (!picks) return null;
      const byId = new Map(candidates.map((candidate) => [candidate.heroId, candidate]));
      const cards: PickCard[] = picks.flatMap(({ heroId, reason }) => {
        const candidate = byId.get(heroId);
        return candidate ? [{ candidate, reason }] : [];
      });
      return cards.length > 0 ? { bracket, cards } : null;
    },
  });

  if (!advice) {
    const cards = candidates.slice(0, PICK_COUNT).map((candidate) => ({ candidate, reason: fallbackReason(candidate, bracket) }));
    return <HeroPickCards cards={cards} title={`Top picks for you · ${bracketLabel(bracket)}`} isAi={false} />;
  }
  return (
    <HeroPickCards
      cards={advice.value.cards}
      title={`AI picks for you · ${bracketLabel(bracket)}`}
      isAi
      timer={<AdviceTimer createdAt={advice.createdAt} initialNow={advice.now} />}
    />
  );
}
