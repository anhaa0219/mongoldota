/** Hugging Face client (server only): chat through the Inference Providers router. */

import { z } from "zod";

const ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
/** Verified on this account's providers (Nov 2026). Qwen3-VL-8B had no enabled provider. */
const DEFAULT_MODEL = "Qwen/Qwen3.8-27B";

const replySchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  // OpenAI format; some providers leave it out.
  usage: z.object({ prompt_tokens: z.number().optional(), completion_tokens: z.number().optional() }).optional(),
});

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

/** Tokens the provider reports for one call; null where it does not say. */
export interface TokenUsage {
  promptTokens: number | null;
  answerTokens: number | null;
}

/** `sent`: the request reached (or may have reached) the provider, so it counts as a call. False only without a key. */
export type ModelResult =
  | { ok: true; text: string; usage: TokenUsage | null }
  | { ok: false; reason: "no-key" | "no-credits" | "failed"; sent: boolean };

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
  if (!apiKey) return { ok: false, reason: "no-key", sent: false };

  try {
    const response = await fetch(ROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, reasoning_effort: effort, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 402) return { ok: false, reason: "no-credits", sent: true };
    if (!response.ok) return { ok: false, reason: "failed", sent: true };

    const parsed = replySchema.safeParse(await response.json());
    if (!parsed.success) return { ok: false, reason: "failed", sent: true };
    const text = parsed.data.choices[0].message.content?.trim();
    const reported = parsed.data.usage;
    const usage = reported ? { promptTokens: reported.prompt_tokens ?? null, answerTokens: reported.completion_tokens ?? null } : null;
    return text ? { ok: true, text, usage } : { ok: false, reason: "failed", sent: true };
  } catch {
    // Network error, timeout, or a non-JSON answer. Counted: a timed-out request may still have been billed.
    return { ok: false, reason: "failed", sent: true };
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

/**
 * The live coach's item plan: not urgent like a tip, so it gets room to think. With askQuickModel's 1,500 tokens
 * the thinking alone (700-3,400 tokens seen) could use them up and leave no answer.
 */
export function askPlanModel(prompt: string): Promise<ModelResult> {
  return chat({ model: process.env.HF_ADVICE_MODEL || DEFAULT_MODEL, content: prompt, maxTokens: 6000, effort: "low", timeoutMs: 60_000 });
}

/** Short live-coach answers: low effort and a 30 s limit so tips arrive while they still matter. Model: HF_ADVICE_MODEL or the default. */
export function askQuickModel(prompt: string): Promise<ModelResult> {
  return chat({ model: process.env.HF_ADVICE_MODEL || DEFAULT_MODEL, content: prompt, maxTokens: 1500, effort: "low", timeoutMs: 30_000 });
}
