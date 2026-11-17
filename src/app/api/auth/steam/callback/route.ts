import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin, verifySteamLogin } from "@/lib/steam-auth";
import { linkSteamResponse } from "@/lib/steam-link-response";

/** Steam sends the player back here after sign-in; the verified Steam ID is linked to their MongolDota account. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const steamId = await verifySteamLogin(request.nextUrl.searchParams, origin);
  if (!steamId) return NextResponse.redirect(`${origin}/?login=failed`);

  return linkSteamResponse(origin, steamId);
}
