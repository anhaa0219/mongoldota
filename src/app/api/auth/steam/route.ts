import { NextResponse, type NextRequest } from "next/server";
import {
  createSession,
  devSteamId,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  siteOrigin,
  steamLoginUrl,
} from "@/lib/steam-auth";

/** Sends the user to Steam's sign-in page (or, in dev with DEV_STEAM_ID, signs in directly). */
export function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const steamId = devSteamId();
  if (!steamId) return NextResponse.redirect(steamLoginUrl(origin));

  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.set(SESSION_COOKIE, createSession(steamId), SESSION_COOKIE_OPTIONS);
  return response;
}
