/**
 * Live Coach: one short tip for what just happened in the player's match (or the match's item plan).
 * Reads the live state and locked draft from the database itself, never the client's numbers, and
 * applies the tip gap per player and match so several open tabs never produce two tips.
 * Every AI call goes through the player's limits first (see lib/ai/ai-gate).
 */

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getAiUsage } from "@/lib/ai/ai-calls-store";
import { gatedAiCall, type GatedResult } from "@/lib/ai/ai-gate";
import { answerLanguage } from "@/lib/ai/answer-language";
import { askPlanModel, askQuickModel } from "@/lib/ai/hf";
import { getLanguage, getWords } from "@/lib/i18n/server";
import { coachSlot } from "@/lib/live/live-coach-timing";
import { isBigKind } from "@/lib/live/live-moments";
import { getLiveRow } from "@/lib/live/live-store";
import { addTip, getPlanTip, getTips } from "@/lib/live/live-tips-store";
import { referenceLines, searchGameKnowledge } from "@/lib/rag/knowledge-search";
import { searchPastGames } from "@/lib/rag/match-memory";
import { LIVE_EVENT_KINDS, type LiveEventKind } from "@/types/live";
import { gameContext, planCandidates } from "./_utils/coach-context";
import { buildItemPlanPrompt, buildLiveTipPrompt, parseItemPlan, parseLiveTip } from "./_utils/live-coach-prompt";
import { planQuery, tipItemKeys, tipQuery } from "./_utils/live-coach-reference";
import { reserveSlot } from "./_utils/live-slots-store";

const STALE_MS = 2 * 60_000;
const RECENT_TIPS = 3;
/** Knowledge search budget: tips must arrive while they still matter, so a slow search is skipped. */
const SEARCH_MS = 1500;
/** A long fight can gather this many different moments into one request. */
const MAX_KINDS = 12;

const requestSchema = z.object({
  kinds: z.array(z.enum(LIVE_EVENT_KINDS as [LiveEventKind, ...LiveEventKind[]])).min(1).max(MAX_KINDS),
  details: z.array(z.string().max(60)).max(MAX_KINDS).optional(),
  /** Write a new item plan even if this match has one (the player bought off-plan). */
  replan: z.boolean().optional(),
  /** The position the player picked on the Live page; used only when there is no usable locked draft. */
  position: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  /** True while that position is only the page's guess from the hero's roles. */
  positionIsGuess: z.boolean().optional(),
});


const reply = (body: object, status = 200) => Response.json(body, { status });
type ModelFailure = (reason: "no-key" | "no-credits" | "failed") => Response;

/** A reached limit (the page stops asking until it frees up) or a failed answer. */
async function refusal(result: Extract<GatedResult, { ok: false }>, userId: string, matchId: string, modelFailure: ModelFailure): Promise<Response> {
  if (result.reason === "limit") return reply({ limit: result.limit, usage: await getAiUsage(userId, matchId) }, 429);
  return modelFailure(result.reason);
}

export async function POST(request: Request) {
  const say = (await getWords()).errors;
  const failures = { "no-key": say.ai.noKey, "no-credits": say.ai.noCredits, failed: say.ai.failed };
  const modelFailure: ModelFailure = (reason) => reply({ error: failures[reason] }, reason === "failed" ? 502 : 503);
  const { userId } = await auth();
  if (!userId) return reply({ error: say.signIn }, 401);

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return reply({ error: say.unknownCoachRequest }, 400);
  const { kinds, details, replan, position, positionIsGuess } = input.data;

  const row = await getLiveRow(userId);
  const snapshot = row?.snapshot;
  if (!row || !snapshot || Date.now() - row.updatedAt.getTime() > STALE_MS) return reply({ error: say.startMatch }, 409);
  const { matchId, clockSeconds } = snapshot;

  const planTip = await getPlanTip(userId, matchId);
  if (kinds.includes("plan") && planTip && !replan) return reply({ tip: planTip });

  // Claimed before the AI is asked, in one SQL statement: two tabs asking at once get one tip.
  const { slot, cutoff } = coachSlot(kinds, matchId, Date.now());
  if (!(await reserveSlot(userId, slot, cutoff))) return reply({ skipped: true }, 429);

  const { items, facts, heroName, itemName, lane, heroKeys, enemyNames, myAbilities } = await gameContext(userId, snapshot, { position: position ?? null, isGuess: positionIsGuess ?? false });
  const caller = { clerkUserId: userId, matchId };

  if (kinds.includes("plan")) {
    const candidates = await planCandidates(snapshot.heroId, items);
    const query = planQuery(heroName, lane?.opponents?.map((opponent) => opponent.name) ?? []);
    const reference = referenceLines(await searchGameKnowledge({ query, heroKeys, itemKeys: candidates.map((item) => item.key) }, SEARCH_MS));
    const result = await gatedAiCall({ ...caller, kind: "live-plan" }, () => askPlanModel(buildItemPlanPrompt({ snapshot, heroName, facts, candidates, lane, reference, myAbilities })));
    if (!result.ok) return refusal(result, userId, matchId, modelFailure);
    const plan = parseItemPlan(result.text, new Set(candidates.map((item) => item.key)));
    if (plan.length === 0) return modelFailure("failed");
    const tip = await addTip(userId, { matchId, clockSeconds, kind: "plan", text: (await getWords()).live.itemPlan(plan.map(itemName).join(" → ")), plan });
    return tip ? reply({ tip, usage: await getAiUsage(userId, matchId) }) : modelFailure("failed");
  }

  const events = kinds.map((kind, index) => ({ kind, detail: details?.[index] ?? "" }));
  const recent = (await getTips(userId, matchId, RECENT_TIPS + 1)).filter((tip) => tip.kind !== "plan").slice(0, RECENT_TIPS);
  const itemKeys = tipItemKeys(snapshot, events);
  // Both searches share the one budget: they run side by side.
  const [hits, pastGames] = await Promise.all([
    searchGameKnowledge({ query: tipQuery(heroName, events, enemyNames, itemKeys, itemName), heroKeys, itemKeys }, SEARCH_MS),
    searchPastGames(userId, `${heroName} vs ${enemyNames.join(", ") || "unknown enemies"}`, matchId, SEARCH_MS),
  ]);
  const prompt = buildLiveTipPrompt({
    snapshot,
    heroName,
    events,
    facts,
    itemName,
    lane,
    reference: referenceLines(hits),
    pastGames,
    myAbilities,
    plan: planTip?.plan ?? null,
    recentTips: recent.map((tip) => tip.text),
    language: answerLanguage(await getLanguage()),
  });
  const result = await gatedAiCall({ ...caller, kind: "live-tip" }, () => askQuickModel(prompt));
  if (!result.ok) return refusal(result, userId, matchId, modelFailure);
  const text = parseLiveTip(result.text);
  if (!text) return modelFailure("failed");

  // Shown with the tip: the big moment when there is one, since moments held from earlier come first in the list.
  const kind = kinds.find(isBigKind) ?? kinds[0];
  const tip = await addTip(userId, { matchId, clockSeconds, kind, text, plan: null });
  return tip ? reply({ tip, usage: await getAiUsage(userId, matchId) }) : modelFailure("failed");
}
