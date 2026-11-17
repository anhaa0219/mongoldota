/** The Steam account linked to each Clerk account (server only). */

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { steamLinks } from "@/db/schema";

/** `ok: false`: the database is not configured or failed, so the caller can fall back instead of unlinking anyone. */
export type StoredLink = { ok: true; steamId: string | null } | { ok: false };

export async function getSteamLink(clerkUserId: string): Promise<StoredLink> {
  if (!db) return { ok: false };
  try {
    const [row] = await db.select({ steamId: steamLinks.steamId }).from(steamLinks).where(eq(steamLinks.clerkUserId, clerkUserId)).limit(1);
    return { ok: true, steamId: row?.steamId ?? null };
  } catch {
    return { ok: false };
  }
}

/** Links (or re-links) the account; false when it could not be saved. */
export async function saveSteamLink(clerkUserId: string, steamId: string): Promise<boolean> {
  if (!db) return false;
  const values = { clerkUserId, steamId, linkedAt: new Date() };
  try {
    await db.insert(steamLinks).values(values).onConflictDoUpdate({ target: steamLinks.clerkUserId, set: values });
    return true;
  } catch {
    return false;
  }
}

/**
 * Moves an old per-browser link into the database, "first claim wins": only when this account has no link yet
 * AND no other account already holds that Steam ID. One statement, so it can never overwrite a real link.
 * Stops a second account on a shared browser from adopting the first player's leftover cookie.
 */
export async function migrateSteamLink(clerkUserId: string, steamId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const rows = await db.execute(sql`
      insert into ${steamLinks} (clerk_user_id, steam_id, linked_at)
      select ${clerkUserId}, ${steamId}, now()
      where not exists (select 1 from ${steamLinks} where steam_id = ${steamId})
      on conflict (clerk_user_id) do nothing
      returning clerk_user_id`);
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function deleteSteamLink(clerkUserId: string): Promise<void> {
  if (!db) return;
  try {
    await db.delete(steamLinks).where(eq(steamLinks.clerkUserId, clerkUserId));
  } catch {
    // Not deleted: unlinking can be tried again.
  }
}
