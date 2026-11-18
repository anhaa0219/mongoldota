/** Live Coach polling fallback: the player's latest live state and this match's tips (used when Realtime is not connected). */

import { auth } from "@clerk/nextjs/server";
import { getLiveRow } from "@/lib/live/live-store";
import { getPlanTip, getTips } from "@/lib/live/live-tips-store";
import type { LiveFeed } from "@/types/live";
import { getWords } from "@/lib/i18n/server";

export async function GET() {
  const say = (await getWords()).errors;
  const { userId } = await auth();
  if (!userId) return Response.json({ error: say.signIn }, { status: 401 });

  const row = await getLiveRow(userId);
  const feed: LiveFeed = { snapshot: row?.snapshot ?? null, updatedAt: row ? row.updatedAt.getTime() : null };
  const [tips, planTip] = row?.matchId ? await Promise.all([getTips(userId, row.matchId), getPlanTip(userId, row.matchId)]) : [[], null];
  return Response.json({ feed, tips, plan: planTip?.plan ? { matchId: planTip.matchId, items: planTip.plan } : null }, { headers: { "cache-control": "no-store" } });
}
