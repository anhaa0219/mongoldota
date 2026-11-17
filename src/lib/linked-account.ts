/**
 * The Steam account linked to the signed-in MongolDota (Clerk) account, saved in the database so it works on
 * every device. Players linked before this was saved per account still have a signed browser cookie: it is moved
 * into the database the first time it is read, if no other account has claimed that Steam ID. Reads auth and cookies: call inside Suspense.
 */

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { cache } from "react";
import { resolveSteamLink } from "@/lib/steam-link";
import { getSteamLink, migrateSteamLink } from "@/lib/steam-link-store";
import { dotaAccountId, readSession, SESSION_COOKIE } from "@/lib/steam-auth";

/** 64-bit Steam ID, or null when signed out or not linked. Looked up once per request. */
export const getLinkedSteamId = cache(async (): Promise<string | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const cookieSteamId = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const { steamId, migrate } = resolveSteamLink(await getSteamLink(userId), cookieSteamId);
  // An old cookie only counts if this account wins the claim (another account may have moved it already).
  if (migrate && steamId) return (await migrateSteamLink(userId, steamId)) ? steamId : null;
  return steamId;
});

/** 32-bit Dota account id, or null when Steam is not linked. */
export async function getLinkedAccountId(): Promise<string | null> {
  const steamId = await getLinkedSteamId();
  return steamId ? dotaAccountId(steamId) : null;
}
