/** The Steam account linked in this browser (signed cookie). Reads cookies: call inside Suspense. */

import { cookies } from "next/headers";
import { dotaAccountId, readSession, SESSION_COOKIE } from "@/lib/steam-auth";

export async function getLinkedSteamId(): Promise<string | null> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** 32-bit Dota account id, or null when Steam is not linked. */
export async function getLinkedAccountId(): Promise<string | null> {
  const steamId = await getLinkedSteamId();
  return steamId ? dotaAccountId(steamId) : null;
}
