import { getSignedInUserId } from "@/lib/sentry/sentry-user";
import { buildDraftPrompt, parseDraftReply } from "./_utils/draft-recognition";
import { countPicked } from "@/lib/draft/draft";
import { gatedAiCall } from "@/lib/ai/ai-gate";
import { askVisionModel } from "@/lib/ai/hf";
import { getHeroIndex } from "@/lib/opendota/opendota-heroes";
import type { RecognizeResponse } from "@/types/draft";
import { getWords } from "@/lib/i18n/server";

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);


function reply(body: RecognizeResponse, status = 200) {
  return Response.json(body, { status });
}

/** Draft page: reads the heroes from an uploaded draft screenshot with a Hugging Face vision model. */
export async function POST(request: Request) {
  const say = (await getWords()).errors;
  const failures = { "no-key": say.screenshotAi.noKey, "no-credits": say.screenshotAi.noCredits, failed: say.screenshotAi.failed };
  const userId = await getSignedInUserId();
  if (!userId) return reply({ error: say.signIn }, 401);

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File)) return reply({ error: say.attachScreenshot }, 400);
  if (!IMAGE_TYPES.has(image.type)) return reply({ error: say.imageType }, 400);
  if (image.size > MAX_BYTES) return reply({ error: say.imageTooLarge }, 413);

  const heroes = [...(await getHeroIndex()).values()];
  if (heroes.length === 0) return reply({ error: say.heroListFailed }, 502);

  const dataUrl = `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;
  const prompt = buildDraftPrompt(heroes.map((hero) => hero.name).sort());
  const result = await gatedAiCall({ clerkUserId: userId, kind: "draft-screenshot", matchId: null }, () => askVisionModel(prompt, dataUrl));
  if (!result.ok && result.reason === "limit") return reply({ limit: result.limit }, 429);
  if (!result.ok) return reply({ error: failures[result.reason] }, result.reason === "failed" ? 502 : 503);

  const draft = parseDraftReply(result.text, heroes);
  if (!draft) return reply({ error: failures.failed }, 502);
  return reply({ draft, found: countPicked(draft) });
}
