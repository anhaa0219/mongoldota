import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getHeroMatchups } from "@/lib/opendota/opendota-draft";
import { getWords } from "@/lib/i18n/server";

const heroIdSchema = z.coerce.number().int().min(1).max(1000);

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Draft page: one enemy hero's matchups against every other hero (cached a day). */
export async function GET(request: Request) {
  const say = (await getWords()).errors;
  const { userId } = await auth();
  if (!userId) return error(say.signIn, 401);

  const heroId = heroIdSchema.safeParse(new URL(request.url).searchParams.get("hero"));
  if (!heroId.success) return error(say.invalidHero, 400);

  const matchups = await getHeroMatchups(heroId.data);
  if (!matchups) return error(say.matchupsFailed, 502);
  return Response.json({ matchups });
}
