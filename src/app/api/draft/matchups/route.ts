import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getHeroMatchups } from "@/lib/opendota-draft";

const heroIdSchema = z.coerce.number().int().min(1).max(1000);

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Draft page: one enemy hero's matchups against every other hero (cached a day). */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return error("Sign in first.", 401);

  const heroId = heroIdSchema.safeParse(new URL(request.url).searchParams.get("hero"));
  if (!heroId.success) return error("Invalid hero id.", 400);

  const matchups = await getHeroMatchups(heroId.data);
  if (!matchups) return error("Could not load matchups from OpenDota. Try again.", 502);
  return Response.json({ matchups });
}
