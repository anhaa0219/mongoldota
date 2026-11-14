import { auth } from "@clerk/nextjs/server";
import { getLinkedAccountId } from "@/lib/linked-account";
import { parseMatchId } from "@/lib/match-id";
import { getMatchDetail } from "@/lib/opendota-matches";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** The linked player's details for one match (History page, loaded when a row is opened). */
export async function GET(_request: Request, ctx: RouteContext<"/api/matches/[id]">) {
  const { userId } = await auth();
  if (!userId) return error("Sign in first.", 401);

  const matchId = parseMatchId((await ctx.params).id);
  if (matchId === null) return error("Invalid match id.", 400);

  const accountId = await getLinkedAccountId();
  if (!accountId) return error("Link Steam first.", 400);

  const result = await getMatchDetail(matchId, accountId);
  if (result.kind === "error") return error("Could not load this match. Try again.", 502);
  if (result.kind === "not-in-match") return error("You are not in this match.", 404);
  return Response.json(result.detail);
}
