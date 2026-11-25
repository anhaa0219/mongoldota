/**
 * Times one Hugging Face chat request as a Sentry `gen_ai.chat` span (server only): model, effort, token counts and
 * the failure reason. Prompts and answers are left out, since they hold players' match data.
 */

import * as Sentry from "@sentry/nextjs";
import type { ModelResult } from "@/lib/ai/hf";

/** Sentry's span status code for a failed operation. */
const SPAN_STATUS_ERROR = 2;

interface ChatRequest {
  model: string;
  maxTokens: number;
  effort: "low" | "medium" | "high";
}

export function withChatSpan(request: ChatRequest, send: () => Promise<ModelResult>): Promise<ModelResult> {
  const attributes = {
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "huggingface",
    "gen_ai.request.model": request.model,
    "gen_ai.request.max_tokens": request.maxTokens,
    "gen_ai.request.reasoning.level": request.effort,
  };

  return Sentry.startSpan({ op: "gen_ai.chat", name: `chat ${request.model}`, attributes }, async (span) => {
    const result = await send();
    if (!result.ok) {
      span.setStatus({ code: SPAN_STATUS_ERROR, message: result.reason });
      span.setAttribute("error.type", result.reason);
      Sentry.logger.warn("AI call failed", { model: request.model, reason: result.reason });
      return result;
    }

    const promptTokens = result.usage?.promptTokens;
    const answerTokens = result.usage?.answerTokens;
    if (typeof promptTokens === "number") span.setAttribute("gen_ai.usage.input_tokens", promptTokens);
    if (typeof answerTokens === "number") span.setAttribute("gen_ai.usage.output_tokens", answerTokens);
    return result;
  });
}
