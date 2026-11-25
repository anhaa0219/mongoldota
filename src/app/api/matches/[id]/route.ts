import { getSignedInUserId } from "@/lib/sentry/sentry-user";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import { parseMatchId } from "@/lib/matches/match-id";
import { getMatchDetail } from "@/lib/opendota/opendota-matches";
import { getWords } from "@/lib/i18n/server";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** The linked player's details for one match (History page, loaded when a row is opened). */
export async function GET(_request: Request, ctx: RouteContext<"/api/matches/[id]">) {
  const say = (await getWords()).errors;
  const userId = await getSignedInUserId();
  if (!userId) return error(say.signIn, 401);

  const matchId = parseMatchId((await ctx.params).id);
  if (matchId === null) return error(say.invalidMatch, 400);

  const accountId = await getLinkedAccountId();
  if (!accountId) return error(say.linkSteam, 400);

  const result = await getMatchDetail(matchId, accountId);
  if (result.kind === "error") return error(say.matchFailed, 502);
  if (result.kind === "not-in-match") return error(say.notInMatch, 404);
  return Response.json(result.detail);
}
