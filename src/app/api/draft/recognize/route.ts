import { auth } from "@clerk/nextjs/server";
import { buildDraftPrompt, parseDraftReply } from "@/lib/draft-recognition";
import { countPicked } from "@/lib/draft";
import { askVisionModel } from "@/lib/hf";
import { getHeroIndex } from "@/lib/opendota-heroes";
import type { RecognizeResponse } from "@/types/draft";

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const FAILURE_MESSAGES = {
  "no-key": "Screenshot reading is not set up yet (HF_API_KEY is missing). Pick heroes by clicking.",
  "no-credits": "Hugging Face has no credits left for screenshot reading. Pick heroes by clicking.",
  failed: "Could not read the screenshot. Try again, or pick heroes by clicking.",
} as const;

function reply(body: RecognizeResponse, status = 200) {
  return Response.json(body, { status });
}

/** Draft page: reads the heroes from an uploaded draft screenshot with a Hugging Face vision model. */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return reply({ error: "Sign in first." }, 401);

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File)) return reply({ error: "Attach a screenshot." }, 400);
  if (!IMAGE_TYPES.has(image.type)) return reply({ error: "Use a PNG, JPG or WebP image." }, 400);
  if (image.size > MAX_BYTES) return reply({ error: "The image is too large (4 MB max)." }, 413);

  const heroes = [...(await getHeroIndex()).values()];
  if (heroes.length === 0) return reply({ error: "Could not load the hero list. Try again later." }, 502);

  const dataUrl = `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;
  const prompt = buildDraftPrompt(heroes.map((hero) => hero.name).sort());
  const result = await askVisionModel(prompt, dataUrl);
  if (!result.ok) return reply({ error: FAILURE_MESSAGES[result.reason] }, result.reason === "failed" ? 502 : 503);

  const draft = parseDraftReply(result.text, heroes);
  if (!draft) return reply({ error: FAILURE_MESSAGES.failed }, 502);
  return reply({ draft, found: countPicked(draft) });
}
