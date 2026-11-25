/** Saves a verified Steam ID to the signed-in Clerk account and sends the player home (server only). */

import { getSignedInUserId } from "@/lib/sentry/sentry-user";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/steam/steam-auth";
import { saveSteamLink } from "@/lib/steam/steam-link-store";

export async function linkSteamResponse(origin: string, steamId: string): Promise<NextResponse> {
  const userId = await getSignedInUserId();
  if (!userId) return NextResponse.redirect(`${origin}/sign-in`);
  if (!(await saveSteamLink(userId, steamId))) return NextResponse.redirect(`${origin}/?login=failed`);

  const response = NextResponse.redirect(`${origin}/`);
  // The old per-browser link is no longer needed once the account has its own.
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
