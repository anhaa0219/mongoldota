/** Hugging Face client (server only): chat through the Inference Providers router. */

import { z } from "zod";

const ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
/** Verified on this account's providers (Nov 2026). Qwen3-VL-8B had no enabled provider. */
const DEFAULT_MODEL = "Qwen/Qwen3.8-27B";

const replySchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export type ModelResult = { ok: true; text: string } | { ok: false; reason: "no-key" | "no-credits" | "failed" };

interface ChatOptions {
  model: string;
  content: string | ContentPart[];
  /** Qwen thinks before answering; thinking counts toward this limit. */
  maxTokens: number;
  effort: "low" | "medium" | "high";
  timeoutMs: number;
}

/** One chat request; never throws. */
async function chat({ model, content, maxTokens, effort, timeoutMs }: ChatOptions): Promise<ModelResult> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-key" };

  try {
    const response = await fetch(ROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, reasoning_effort: effort, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 402) return { ok: false, reason: "no-credits" };
    if (!response.ok) return { ok: false, reason: "failed" };

    const parsed = replySchema.safeParse(await response.json());
    const text = parsed.success ? parsed.data.choices[0].message.content?.trim() : null;
    return text ? { ok: true, text } : { ok: false, reason: "failed" };
  } catch {
    // Network error, timeout, or a non-JSON answer.
    return { ok: false, reason: "failed" };
  }
}

/** Sends one image (a data: URL) and a prompt. Model: HF_VISION_MODEL or the default. */
export function askVisionModel(prompt: string, imageDataUrl: string): Promise<ModelResult> {
  return chat({
    model: process.env.HF_VISION_MODEL || DEFAULT_MODEL,
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: imageDataUrl } },
    ],
    maxTokens: 4000,
    effort: "low",
    timeoutMs: 60_000,
  });
}

/** Text-only question for longer answers (draft advice). Model: HF_ADVICE_MODEL or the default. */
export function askTextModel(prompt: string): Promise<ModelResult> {
  return chat({ model: process.env.HF_ADVICE_MODEL || DEFAULT_MODEL, content: prompt, maxTokens: 8000, effort: "medium", timeoutMs: 120_000 });
}
