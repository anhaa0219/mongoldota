import { getSignedInUserId } from "@/lib/sentry/sentry-user";
import { z } from "zod";
import { adviceQuery, buildAdvicePrompt, parseAdvice } from "@/app/api/_utils/draft-advice";
import { gatherAdviceFacts } from "@/app/api/_utils/draft-advice-facts";
import { gatedAiCall } from "@/lib/ai/ai-gate";
import { answerLanguage } from "@/lib/ai/answer-language";
import { askTextModel } from "@/lib/ai/hf";
import { getLanguage } from "@/lib/i18n/server";
import { getDraftHeroes } from "@/lib/opendota/opendota-heroes";
import { referenceLines, searchGameKnowledge } from "@/lib/rag/knowledge-search";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import type { AdviceResponse } from "@/types/draft";
import { getWords } from "@/lib/i18n/server";

/** The draft coach has a 2-minute answer budget, so its knowledge search can wait longer than the live coach's. */
const SEARCH_MS = 3000;

const heroId = z.number().int().min(1).max(1000);
const placedHero = z.object({ heroId, position: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) });
const requestSchema = z.object({
  myHeroId: heroId,
  allies: z.array(placedHero).min(1).max(5),
  enemies: z.array(placedHero).min(1).max(5),
});


function reply(body: AdviceResponse, status = 200) {
  return Response.json(body, { status });
}

/** Draft page: coaching advice for the locked draft, grounded in OpenDota data and written by a Hugging Face model. */
export async function POST(request: Request) {
  const say = (await getWords()).errors;
  const failures = { "no-key": say.ai.noKey, "no-credits": say.ai.noCredits, failed: say.ai.failed };
  const userId = await getSignedInUserId();
  if (!userId) return reply({ error: say.signIn }, 401);

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return reply({ error: say.pickDraft }, 400);
  if (!input.data.allies.some((ally) => ally.heroId === input.data.myHeroId)) return reply({ error: say.heroOnTeam }, 400);

  const [facts, heroes] = await Promise.all([gatherAdviceFacts({ ...input.data, accountId: await getLinkedAccountId() }), getDraftHeroes()]);
  if (!facts) return reply({ error: say.heroDataFailed }, 502);

  // Knowledge search: the player's hero first, then the enemies (allies would share the enemies' few hits).
  const { myHeroId, enemies } = input.data;
  const heroIds = [myHeroId, ...enemies.map((enemy) => enemy.heroId)];
  const heroKeys = [...new Set(heroIds.flatMap((heroId) => heroes.find((hero) => hero.id === heroId)?.slug ?? []))];
  const reference = referenceLines(await searchGameKnowledge({ query: adviceQuery(facts), heroKeys, itemKeys: [] }, SEARCH_MS));

  const language = answerLanguage(await getLanguage());
  const result = await gatedAiCall({ clerkUserId: userId, kind: "draft-advice", matchId: null }, () => askTextModel(buildAdvicePrompt(facts, language, reference)));
  if (!result.ok && result.reason === "limit") return reply({ limit: result.limit }, 429);
  if (!result.ok) return reply({ error: failures[result.reason] }, result.reason === "failed" ? 502 : 503);

  const advice = parseAdvice(result.text);
  if (!advice) return reply({ error: failures.failed }, 502);
  return reply({ advice });
}
