/** Live page, demo buttons: plays the demo match into the player's live row (play, step, hold, stop, reset). */

import { getSignedInUserId } from "@/lib/sentry/sentry-user";
import { z } from "zod";
import { getWords } from "@/lib/i18n/server";
import { DEMO_ACTIONS, runDemoAction } from "@/lib/live/demo-replay";
import { getLinkedAccountId } from "@/lib/steam/linked-account";

const requestSchema = z.object({
  action: z.enum(DEMO_ACTIONS),
  /** Game seconds per step: 1 is real time, 2 is double speed. */
  seconds: z.number().int().min(1).max(10).optional(),
});

const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  const say = (await getWords()).errors;
  const userId = await getSignedInUserId();
  if (!userId) return reply({ error: say.signIn }, 401);

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return reply({ error: say.demoFailed }, 400);

  const accountId = await getLinkedAccountId();
  if (!accountId) return reply({ error: say.linkSteam }, 400);

  const state = await runDemoAction(userId, Number(accountId), input.data.action, input.data.seconds ?? 1);
  if (!state) return reply({ error: say.demoFailed }, 502);
  return reply(state);
}
