/**
 * Live Coach: one short tip for what just happened in the player's match (or the match's item plan).
 * Reads the live state and locked draft from the database itself, never the client's numbers, and
 * applies the tip gap per player and match so several open tabs never produce two tips.
 */

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { gatherAdviceFacts } from "@/lib/draft-advice-facts";
import { askQuickModel } from "@/lib/hf";
import { coachSlot } from "@/lib/live-coach-timing";
import { buildItemPlanPrompt, buildLiveTipPrompt, parseItemPlan, parseLiveTip } from "@/lib/live-coach-prompt";
import { MIN_ITEM_COST } from "@/lib/live-events";
import { freshDraft } from "@/lib/live-freshness";
import { laneInfo } from "@/lib/live-lane";
import { reserveSlot } from "@/lib/live-slots-store";
import { getGsiSteamId, getLiveRow } from "@/lib/live-store";
import { addTip, getLockedDraft, getPlanTip, getTips } from "@/lib/live-tips-store";
import { getItemPopularity } from "@/lib/opendota-draft";
import { getDraftHeroes, getItemIndex } from "@/lib/opendota-heroes";
import { dotaAccountId } from "@/lib/steam-auth";
import { LIVE_EVENT_KINDS, type LiveEventKind, type LiveSnapshot } from "@/types/live";
import type { Position } from "@/types/draft";
import type { ItemIndex } from "@/types/opendota";

const STALE_MS = 2 * 60_000;
const RECENT_TIPS = 3;
/** A long fight can gather this many different moments into one request. */
const MAX_KINDS = 12;

const requestSchema = z.object({
  kinds: z.array(z.enum(LIVE_EVENT_KINDS as [LiveEventKind, ...LiveEventKind[]])).min(1).max(MAX_KINDS),
  details: z.array(z.string().max(60)).max(MAX_KINDS).optional(),
  /** Write a new item plan even if this match has one (the player bought off-plan). */
  replan: z.boolean().optional(),
  /** The position the player picked on the Live page; used only when there is no usable locked draft. */
  position: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
});

const FAILURE_MESSAGES = {
  "no-key": "Advice is not set up yet (HF_API_KEY is missing).",
  "no-credits": "Hugging Face has no credits left for advice.",
  failed: "The coach could not answer. Try again.",
} as const;

const reply = (body: object, status = 200) => Response.json(body, { status });
const modelFailure = (reason: keyof typeof FAILURE_MESSAGES) => reply({ error: FAILURE_MESSAGES[reason] }, reason === "failed" ? 502 : 503);

/** The hero's commonly bought items (1,000+ gold) as plan candidates; every such item when OpenDota has none. */
async function planCandidates(heroId: number, items: ItemIndex) {
  const popularity = await getItemPopularity(heroId);
  const ids = Object.values(popularity ?? {}).flatMap((counts) => Object.keys(counts ?? {}).map(Number));
  const fromHero = ids.flatMap((id) => items.byId.get(id) ?? []);
  const pool = fromHero.length > 0 ? fromHero : [...items.byKey.values()];
  const unique = new Map(pool.filter((item) => item.cost >= MIN_ITEM_COST).map((item) => [item.key, item]));
  return [...unique.values()].map(({ key, name }) => ({ key, name }));
}

async function gameContext(userId: string, snapshot: LiveSnapshot, pickedPosition: Position | null) {
  const [heroes, items, locked, steamId] = await Promise.all([getDraftHeroes(), getItemIndex(), getLockedDraft(userId), getGsiSteamId(userId)]);
  const draft = freshDraft(locked, Date.now());
  const accountId = steamId ? dotaAccountId(steamId) : null;
  // The draft only counts when it is recent and for the hero the player is actually playing.
  const facts = draft && draft.myHeroId === snapshot.heroId ? await gatherAdviceFacts({ ...draft, accountId }) : null;
  const heroName = heroes.find((hero) => hero.id === snapshot.heroId)?.name ?? snapshot.heroKey;
  const itemName = (key: string) => items.byKey.get(key)?.name ?? key;
  const lane = laneInfo({ team: snapshot.team, facts, position: pickedPosition });
  return { items, facts, heroName, itemName, lane };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return reply({ error: "Sign in first." }, 401);

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return reply({ error: "Unknown coach request." }, 400);
  const { kinds, details, replan, position } = input.data;

  const row = await getLiveRow(userId);
  const snapshot = row?.snapshot;
  if (!row || !snapshot || Date.now() - row.updatedAt.getTime() > STALE_MS) return reply({ error: "Start a match first." }, 409);
  const { matchId, clockSeconds } = snapshot;

  const planTip = await getPlanTip(userId, matchId);
  if (kinds.includes("plan") && planTip && !replan) return reply({ tip: planTip });

  // Claimed before the AI is asked, in one SQL statement: two tabs asking at once get one tip.
  const { slot, cutoff } = coachSlot(kinds, matchId, Date.now());
  if (!(await reserveSlot(userId, slot, cutoff))) return reply({ skipped: true }, 429);

  const { items, facts, heroName, itemName, lane } = await gameContext(userId, snapshot, position ?? null);

  if (kinds.includes("plan")) {
    const candidates = await planCandidates(snapshot.heroId, items);
    const result = await askQuickModel(buildItemPlanPrompt({ snapshot, heroName, facts, candidates, lane }));
    if (!result.ok) return modelFailure(result.reason);
    const plan = parseItemPlan(result.text, new Set(candidates.map((item) => item.key)));
    if (plan.length === 0) return modelFailure("failed");
    const tip = await addTip(userId, { matchId, clockSeconds, kind: "plan", text: `Item plan: ${plan.map(itemName).join(" → ")}`, plan });
    return tip ? reply({ tip }) : modelFailure("failed");
  }

  const events = kinds.map((kind, index) => ({ kind, detail: details?.[index] ?? "" }));
  const recent = (await getTips(userId, matchId, RECENT_TIPS + 1)).filter((tip) => tip.kind !== "plan").slice(0, RECENT_TIPS);
  const prompt = buildLiveTipPrompt({ snapshot, heroName, events, facts, itemName, plan: planTip?.plan ?? null, recentTips: recent.map((tip) => tip.text), lane });
  const result = await askQuickModel(prompt);
  if (!result.ok) return modelFailure(result.reason);
  const text = parseLiveTip(result.text);
  if (!text) return modelFailure("failed");

  const tip = await addTip(userId, { matchId, clockSeconds, kind: kinds[0], text, plan: null });
  return tip ? reply({ tip }) : modelFailure("failed");
}
