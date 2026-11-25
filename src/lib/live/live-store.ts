/**
 * Live Coach database access: GSI tokens and the latest live state per player (server only).
 * Every function does nothing without a database, and database errors (or a query over 4 s) read as "nothing stored".
 */

import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, withQueryTimeout } from "@/db";
import { gsiTokens, liveStates } from "@/db/schema";
import type { LiveSnapshot } from "@/types/live";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A new token for the player's setup file; it replaces (and so disables) any older one. */
export async function createGsiToken(clerkUserId: string, steamId: string): Promise<string | null> {
  if (!db) return null;
  const token = randomBytes(32).toString("base64url");
  const values = { clerkUserId, steamId, tokenHash: hashToken(token), createdAt: new Date() };
  try {
    await withQueryTimeout(db.insert(gsiTokens).values(values).onConflictDoUpdate({ target: gsiTokens.clerkUserId, set: values }));
    return token;
  } catch {
    return null;
  }
}

export async function findGsiOwner(token: string): Promise<{ clerkUserId: string; steamId: string } | null> {
  if (!db) return null;
  try {
    const [row] = await withQueryTimeout(
      db
        .select({ clerkUserId: gsiTokens.clerkUserId, steamId: gsiTokens.steamId })
        .from(gsiTokens)
        .where(eq(gsiTokens.tokenHash, hashToken(token)))
        .limit(1),
    );
    return row ?? null;
  } catch {
    return null;
  }
}

/** The Steam ID the player's current setup file was made for. */
export async function getGsiSteamId(clerkUserId: string): Promise<string | null> {
  if (!db) return null;
  try {
    const [row] = await withQueryTimeout(db.select({ steamId: gsiTokens.steamId }).from(gsiTokens).where(eq(gsiTokens.clerkUserId, clerkUserId)).limit(1));
    return row?.steamId ?? null;
  } catch {
    return null;
  }
}

export async function hasGsiToken(clerkUserId: string): Promise<boolean> {
  return (await getGsiSteamId(clerkUserId)) !== null;
}

/** `matchId` is the current match, or the last one while the player is back in the menu. */
export async function getLiveRow(clerkUserId: string): Promise<{ snapshot: LiveSnapshot | null; matchId: string | null; updatedAt: Date } | null> {
  if (!db) return null;
  try {
    const [row] = await withQueryTimeout(
      db
        .select({ snapshot: liveStates.snapshot, matchId: liveStates.matchId, updatedAt: liveStates.updatedAt })
        .from(liveStates)
        .where(eq(liveStates.clerkUserId, clerkUserId))
        .limit(1),
    );
    return row ?? null;
  } catch {
    return null;
  }
}

export async function writeLiveRow(clerkUserId: string, snapshot: LiveSnapshot | null): Promise<void> {
  if (!db) return;
  const values = { clerkUserId, snapshot, matchId: snapshot?.matchId ?? null, updatedAt: new Date() };
  // Back in the menu the last match id is kept, so the page can still show that game's tips.
  const set = snapshot ? values : { snapshot: null, updatedAt: values.updatedAt };
  try {
    await withQueryTimeout(db.insert(liveStates).values(values).onConflictDoUpdate({ target: liveStates.clerkUserId, set }));
  } catch {
    // Not saved: the next update from Dota tries again.
  }
}

/** Marks the state as still current (Dota is connected) without changing it. */
export async function touchLiveRow(clerkUserId: string): Promise<void> {
  if (!db) return;
  try {
    await withQueryTimeout(db.update(liveStates).set({ updatedAt: new Date() }).where(eq(liveStates.clerkUserId, clerkUserId)));
  } catch {
    // Not saved: the next heartbeat tries again.
  }
}
