/** The Steam account linked to each Clerk account (server only). */

import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { db, withQueryTimeout } from "@/db";
import { steamLinks } from "@/db/schema";

/** `ok: false`: the database is not configured or failed, so the caller can fall back instead of unlinking anyone. */
export type StoredLink = { ok: true; steamId: string | null } | { ok: false };

/** A found link stays cached this long; linking or unlinking clears it at once. */
const LINK_CACHE_SECONDS = 600;

function steamLinkTag(clerkUserId: string): string {
  return `steam-link:${clerkUserId}`;
}

/** One read of the saved link. Throws when the database fails or takes over 4 s. */
async function readSteamId(clerkUserId: string): Promise<string | null> {
  if (!db) throw new Error("Database not configured");
  const query = db.select({ steamId: steamLinks.steamId }).from(steamLinks).where(eq(steamLinks.clerkUserId, clerkUserId)).limit(1);
  const [row] = await withQueryTimeout(query);
  return row?.steamId ?? null;
}

/**
 * Found links are cached, so most page loads skip the database. "Not linked" throws instead of being cached, so a
 * link moved from the old cookie during a render (where the cache cannot be cleared) shows up on the next load.
 */
async function cachedSteamId(clerkUserId: string): Promise<string> {
  "use cache";
  cacheLife({ revalidate: LINK_CACHE_SECONDS });
  cacheTag(steamLinkTag(clerkUserId));
  const steamId = await readSteamId(clerkUserId);
  if (!steamId) throw new Error("No Steam link");
  return steamId;
}

export async function getSteamLink(clerkUserId: string): Promise<StoredLink> {
  if (!db) return { ok: false };
  try {
    return { ok: true, steamId: await cachedSteamId(clerkUserId) };
  } catch {
    // Not in the cache: no link yet, or the database failed. One direct read tells which.
    try {
      return { ok: true, steamId: await readSteamId(clerkUserId) };
    } catch {
      return { ok: false };
    }
  }
}

/** Links (or re-links) the account; false when it could not be saved. Route handlers only (it clears the cache). */
export async function saveSteamLink(clerkUserId: string, steamId: string): Promise<boolean> {
  if (!db) return false;
  const values = { clerkUserId, steamId, linkedAt: new Date() };
  try {
    await withQueryTimeout(db.insert(steamLinks).values(values).onConflictDoUpdate({ target: steamLinks.clerkUserId, set: values }));
    revalidateTag(steamLinkTag(clerkUserId), { expire: 0 });
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
    const rows = await withQueryTimeout(
      db.execute(sql`
        insert into ${steamLinks} (clerk_user_id, steam_id, linked_at)
        select ${clerkUserId}, ${steamId}, now()
        where not exists (select 1 from ${steamLinks} where steam_id = ${steamId})
        on conflict (clerk_user_id) do nothing
        returning clerk_user_id`),
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Route handlers only (it clears the cache). */
export async function deleteSteamLink(clerkUserId: string): Promise<void> {
  if (!db) return;
  try {
    await withQueryTimeout(db.delete(steamLinks).where(eq(steamLinks.clerkUserId, clerkUserId)));
    revalidateTag(steamLinkTag(clerkUserId), { expire: 0 });
  } catch {
    // Not deleted: unlinking can be tried again.
  }
}
