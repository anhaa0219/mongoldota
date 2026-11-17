/** Draft page: saves the locked draft (side, hero, positions) so Live Coach can use it on any device. */

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { saveLockedDraft } from "@/lib/live-tips-store";

const heroId = z.number().int().min(1).max(1000);
const placedHero = z.object({ heroId, position: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) });
const lockedDraftSchema = z.object({
  side: z.enum(["radiant", "dire"]),
  myHeroId: heroId,
  allies: z.array(placedHero).min(1).max(5),
  enemies: z.array(placedHero).min(1).max(5),
});

const reply = (body: object, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return reply({ error: "Sign in first." }, 401);

  const input = lockedDraftSchema.safeParse(await request.json().catch(() => null));
  const valid = input.success && input.data.allies.some((ally) => ally.heroId === input.data.myHeroId);
  if (!input.success || !valid) return reply({ error: "Pick your hero, positions, and at least one enemy." }, 400);

  await saveLockedDraft(userId, input.data);
  return reply({ ok: true });
}
