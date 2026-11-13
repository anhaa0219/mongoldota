import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, siteOrigin } from "@/lib/steam-auth";

export function POST(request: NextRequest) {
  const response = NextResponse.redirect(`${siteOrigin(request.nextUrl.origin)}/`, 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
