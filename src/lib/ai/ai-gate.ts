/** The one way to call the AI: checks the player's limits first, then calls the model and records the call (server only). */

import * as Sentry from "@sentry/nextjs";
import { getUsageFacts, recordAiCall } from "@/lib/ai/ai-calls-store";
import { checkAllowance } from "@/lib/ai/ai-limits";
import type { ModelResult } from "@/lib/ai/hf";
import type { AiCallKind, AiLimit } from "@/types/ai";

export type GatedResult = ModelResult | { ok: false; reason: "limit"; limit: AiLimit };

interface Caller {
  clerkUserId: string;
  kind: AiCallKind;
  /** Live Coach calls only. */
  matchId: string | null;
}

/**
 * Refuses with the reached limit before any AI call, so no money is spent past a limit. Otherwise runs `ask`
 * and records it when it reached the provider. When usage cannot be read, the call goes ahead uncounted.
 */
export function gatedAiCall(caller: Caller, ask: () => Promise<ModelResult>): Promise<GatedResult> {
  // One Sentry span per feature call (draft advice, live tip, …), with the model's chat span inside it.
  return Sentry.startSpan({ op: "ai.gated_call", name: `ai ${caller.kind}`, attributes: { "ai.kind": caller.kind } }, async (span): Promise<GatedResult> => {
    const facts = await getUsageFacts(caller.clerkUserId, caller.matchId, Date.now());
    const limit = facts ? checkAllowance(caller.kind, facts) : null;
    span.setAttribute("ai.limited", limit !== null);
    if (limit) return { ok: false, reason: "limit", limit };

    const result = await ask();
    if (result.ok || result.sent) {
      await recordAiCall({ ...caller, usage: result.ok ? result.usage : null, ok: result.ok });
    }
    return result;
  });
}
