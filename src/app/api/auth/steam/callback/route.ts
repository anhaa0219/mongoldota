import { NextResponse, type NextRequest } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  siteOrigin,
  verifySteamLogin,
} from "@/lib/steam-auth";

/** Steam sends the user back here after sign-in. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const steamId = await verifySteamLogin(request.nextUrl.searchParams, origin);

  if (!steamId) {
    return NextResponse.redirect(`${origin}/?login=failed`);
  }

  let session: string;
  try {
    session = createSession(steamId);
  } catch {
    // AUTH_SECRET missing in production: send the user back with "login failed", never a raw 500.
    return NextResponse.redirect(`${origin}/?login=failed`);
  }

  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.set(SESSION_COOKIE, session, SESSION_COOKIE_OPTIONS);
  return response;
}
