import { AdviceTimer } from "@/app/(site)/_components/AdviceTimer";
import { HeroPickCards } from "../_components/HeroPickCards";
import { bracketLabel } from "../_utils/hero-meta";
import { fallbackReason, PICK_COUNT, shortlist, storedPicksSchema, type PickCard } from "../_utils/hero-picks";
import { getAiHeroPicks } from "../_utils/hero-picks-ai";
import { getTimedAdvice } from "@/app/(site)/_utils/timed-advice";
import { answerLanguage } from "@/lib/ai/answer-language";
import { getLanguage, getWords } from "@/lib/i18n/server";
import type { PersonalRecord } from "@/types/draft";
import type { HeroMeta, MetaBracket } from "../_utils/meta-types";
import type { LaneRole } from "@/types/opendota";

interface AiHeroPicksProps {
  accountId: string;
  /** The MongolDota account, for the AI limits. */
  clerkUserId: string;
  heroes: HeroMeta[];
  bracket: MetaBracket;
  personal: Record<number, PersonalRecord>;
  mainLane: LaneRole | null;
}

/**
 * Top of the Trending page: 5 heroes for this player, chosen by AI from a scored shortlist.
 * Stored per player and refreshed at most every 12 hours (sooner if their rank changes). Render inside Suspense.
 */
export async function AiHeroPicks({ accountId, clerkUserId, heroes, bracket, personal, mainLane }: AiHeroPicksProps) {
  const candidates = shortlist({ heroes, bracket, personal, mainLane });
  if (candidates.length === 0) return null;

  const language = answerLanguage(await getLanguage());
  const words = (await getWords()).trending;
  const bracketName = bracket === "all" ? words.all : bracketLabel(bracket);
  const advice = await getTimedAdvice({
    accountId,
    kind: "hero-picks",
    language,
    schema: storedPicksSchema,
    stillFits: (stored) => stored.bracket === bracket,
    generate: async () => {
      const picks = await getAiHeroPicks(candidates, bracket, mainLane, clerkUserId, language);
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
    const cards = candidates.slice(0, PICK_COUNT).map((candidate) => ({ candidate, reason: fallbackReason(candidate, bracketName, words.fallback) }));
    return <HeroPickCards cards={cards} title={words.topPicks(bracketName)} isAi={false} />;
  }
  return (
    <HeroPickCards
      cards={advice.value.cards}
      title={words.aiPicks(bracketName)}
      isAi
      timer={<AdviceTimer createdAt={advice.createdAt} initialNow={advice.now} />}
    />
  );
}
