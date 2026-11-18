import { NextResponse, type NextRequest } from "next/server";
import { devSteamId, siteOrigin, steamLoginUrl } from "@/lib/steam/steam-auth";
import { linkSteamResponse } from "./_utils/steam-link-response";

/** Sends the player to Steam's sign-in page (or, in dev with DEV_STEAM_ID, links that account directly). */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const steamId = devSteamId();
  if (!steamId) return NextResponse.redirect(steamLoginUrl(origin));

  return linkSteamResponse(origin, steamId);
}
