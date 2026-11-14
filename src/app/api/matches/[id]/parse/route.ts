import { auth } from "@clerk/nextjs/server";
import { getLinkedAccountId } from "@/lib/linked-account";
import { parseMatchId } from "@/lib/match-id";
import { getMatchDetail, requestParse } from "@/lib/opendota-matches";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** "Analyse with OpenDota": asks OpenDota to parse one of the linked player's own matches. */
export async function POST(_request: Request, ctx: RouteContext<"/api/matches/[id]/parse">) {
  const { userId } = await auth();
  if (!userId) return error("Sign in first.", 401);

  const matchId = parseMatchId((await ctx.params).id);
  if (matchId === null) return error("Invalid match id.", 400);

  const accountId = await getLinkedAccountId();
  if (!accountId) return error("Link Steam first.", 400);

  // Only the player's own matches (cached lookup), so the button cannot be used to queue arbitrary parses.
  const match = await getMatchDetail(matchId, accountId);
  if (match.kind === "error") return error("Could not reach OpenDota. Try again later.", 502);
  if (match.kind === "not-in-match") return error("You are not in this match.", 404);
  if (match.detail.parsed) return Response.json({ requested: false, alreadyParsed: true });

  const requested = await requestParse(matchId);
  if (!requested) return error("OpenDota could not start the analysis. Try again later.", 502);
  return Response.json({ requested: true }, { status: 202 });
}
