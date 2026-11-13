import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin, steamLoginUrl } from "@/lib/steam-auth";

/** Sends the user to Steam's sign-in page. */
export function GET(request: NextRequest) {
  return NextResponse.redirect(steamLoginUrl(siteOrigin(request.nextUrl.origin)));
}
