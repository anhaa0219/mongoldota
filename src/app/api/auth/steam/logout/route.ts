import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { deletePlayerMemory } from "@/lib/rag/match-memory";
import { SESSION_COOKIE, siteOrigin } from "@/lib/steam/steam-auth";
import { deleteSteamLink } from "@/lib/steam/steam-link-store";

/** Unlinks Steam from the signed-in account (and clears any old per-browser link and the player's match memory). */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (userId) {
    await deletePlayerMemory(userId);
    await deleteSteamLink(userId);
  }

  const response = NextResponse.redirect(`${siteOrigin(request.nextUrl.origin)}/`, 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
