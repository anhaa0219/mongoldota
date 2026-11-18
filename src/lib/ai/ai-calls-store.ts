/**
 * AI call records per player (server only). Without a database, or when it fails (e.g. the ai_calls migration
 * is not applied yet), nothing is counted and nothing is blocked: every function returns null or does nothing.
 */

import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { aiCalls } from "@/db/schema";
import { isAiCallKind, toUsage, WINDOW_MS, type UsageFacts } from "@/lib/ai/ai-limits";
import type { TokenUsage } from "@/lib/ai/hf";
import type { AiCallKind, AiUsage } from "@/types/ai";

export async function getUsageFacts(clerkUserId: string, matchId: string | null, nowMs: number): Promise<UsageFacts | null> {
  if (!db) return null;
  try {
    const mine = eq(aiCalls.clerkUserId, clerkUserId);
    const [day, match] = await Promise.all([
      db.select({ kind: aiCalls.kind, createdAt: aiCalls.createdAt }).from(aiCalls).where(and(mine, gte(aiCalls.createdAt, new Date(nowMs - WINDOW_MS)))),
      matchId
        ? db.select({ kind: aiCalls.kind, calls: count() }).from(aiCalls).where(and(mine, eq(aiCalls.matchId, matchId))).groupBy(aiCalls.kind)
        : Promise.resolve([]),
    ]);
    const inMatch = (kind: AiCallKind) => match.find((row) => row.kind === kind)?.calls ?? 0;
    return {
      dayCalls: day.flatMap((row) => (isAiCallKind(row.kind) ? [{ kind: row.kind, at: row.createdAt.getTime() }] : [])),
      matchTips: inMatch("live-tip"),
      matchPlans: inMatch("live-plan"),
    };
  } catch {
    return null;
  }
}

export async function recordAiCall(call: { clerkUserId: string; kind: AiCallKind; matchId: string | null; usage: TokenUsage | null; ok: boolean }): Promise<void> {
  if (!db) return;
  try {
    await db.insert(aiCalls).values({
      clerkUserId: call.clerkUserId,
      kind: call.kind,
      matchId: call.matchId,
      promptTokens: call.usage?.promptTokens ?? null,
      answerTokens: call.usage?.answerTokens ?? null,
      ok: call.ok,
    });
  } catch {
    // Not recorded: the call itself already happened, so the player is not affected.
  }
}

/** For the Live page's usage line; null when nothing is counted. */
export async function getAiUsage(clerkUserId: string, matchId: string | null): Promise<AiUsage | null> {
  const facts = await getUsageFacts(clerkUserId, matchId, Date.now());
  return facts ? toUsage(facts, matchId !== null) : null;
}
