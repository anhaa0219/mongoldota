import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { buildAdvicePrompt, parseAdvice } from "@/lib/draft-advice";
import { gatherAdviceFacts } from "@/lib/draft-advice-facts";
import { askTextModel } from "@/lib/hf";
import { getLinkedAccountId } from "@/lib/linked-account";
import type { AdviceResponse } from "@/types/draft";

const heroId = z.number().int().min(1).max(1000);
const placedHero = z.object({ heroId, position: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) });
const requestSchema = z.object({
  myHeroId: heroId,
  allies: z.array(placedHero).min(1).max(5),
  enemies: z.array(placedHero).min(1).max(5),
});

const FAILURE_MESSAGES = {
  "no-key": "Advice is not set up yet (HF_API_KEY is missing).",
  "no-credits": "Hugging Face has no credits left for advice.",
  failed: "The coach could not answer. Try again.",
} as const;

function reply(body: AdviceResponse, status = 200) {
  return Response.json(body, { status });
}

/** Draft page: coaching advice for the locked draft, grounded in OpenDota data and written by a Hugging Face model. */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return reply({ error: "Sign in first." }, 401);

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return reply({ error: "Pick your hero, positions, and at least one enemy." }, 400);
  if (!input.data.allies.some((ally) => ally.heroId === input.data.myHeroId)) return reply({ error: "Your hero must be on your team." }, 400);

  const facts = await gatherAdviceFacts({ ...input.data, accountId: await getLinkedAccountId() });
  if (!facts) return reply({ error: "Could not load hero data from OpenDota. Try again." }, 502);

  const result = await askTextModel(buildAdvicePrompt(facts));
  if (!result.ok) return reply({ error: FAILURE_MESSAGES[result.reason] }, result.reason === "failed" ? 502 : 503);

  const advice = parseAdvice(result.text);
  if (!advice) return reply({ error: FAILURE_MESSAGES.failed }, 502);
  return reply({ advice });
}
