import { NextResponse, type NextRequest } from "next/server";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE, siteOrigin, verifySteamLogin } from "@/lib/steam-auth";

/** Steam sends the user back here after sign-in. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const steamId = await verifySteamLogin(request.nextUrl.searchParams, origin);

  if (!steamId) {
    return NextResponse.redirect(`${origin}/?login=failed`);
  }

  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.set(SESSION_COOKIE, createSession(steamId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
