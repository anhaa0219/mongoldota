import { auth } from "@clerk/nextjs/server";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import { parseMatchId } from "@/lib/matches/match-id";
import { getMatchDetail, requestParse } from "@/lib/opendota/opendota-matches";
import { getWords } from "@/lib/i18n/server";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** "Analyse with OpenDota": asks OpenDota to parse one of the linked player's own matches. */
export async function POST(_request: Request, ctx: RouteContext<"/api/matches/[id]/parse">) {
  const say = (await getWords()).errors;
  const { userId } = await auth();
  if (!userId) return error(say.signIn, 401);

  const matchId = parseMatchId((await ctx.params).id);
  if (matchId === null) return error(say.invalidMatch, 400);

  const accountId = await getLinkedAccountId();
  if (!accountId) return error(say.linkSteam, 400);

  // Only the player's own matches (cached lookup), so the button cannot be used to queue arbitrary parses.
  const match = await getMatchDetail(matchId, accountId);
  if (match.kind === "error") return error(say.openDotaUnreachable, 502);
  if (match.kind === "not-in-match") return error(say.notInMatch, 404);
  if (match.detail.parsed) return Response.json({ requested: false, alreadyParsed: true });

  const requested = await requestParse(matchId);
  if (!requested) return error(say.parseFailed, 502);
  return Response.json({ requested: true }, { status: 202 });
}
