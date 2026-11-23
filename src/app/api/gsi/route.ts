/**
 * Dota 2 Game State Integration: the player's Dota client POSTs its game state here (~1/s).
 * Authenticated by the token in the player's setup file. Never calls the AI; the Live Coach page does that.
 */

import { after } from "next/server";
import { matchEnd, parseGsiPayload, shouldWrite, toLiveSnapshot } from "./_utils/gsi";
import { findGsiOwner, getLiveRow, touchLiveRow, writeLiveRow } from "@/lib/live/live-store";
import { saveMatchMemory } from "@/lib/rag/match-memory";

const MAX_BODY_BYTES = 64 * 1024;

const ok = () => Response.json({ ok: true });
const fail = (status: number) => new Response(null, { status });

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(413);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail(413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(400);
  }
  const payload = parseGsiPayload(body);
  if (!payload) return fail(400);

  const owner = await findGsiOwner(payload.auth.token);
  if (!owner) return fail(401);

  // Menus, spectating and other players' games give no snapshot: the row still shows Dota is connected.
  const snapshot = toLiveSnapshot(payload, owner.steamId);
  const row = await getLiveRow(owner.clerkUserId);

  // The first post-game update still finds the match's last in-game state stored: remember that match
  // after replying, so Dota is never kept waiting. Later post-game updates find no snapshot (or the guard stops them).
  const end = matchEnd(payload, owner.steamId);
  const lastSnapshot = row?.snapshot;
  if (end && lastSnapshot && lastSnapshot.matchId === end.matchId) {
    after(() => saveMatchMemory(owner.clerkUserId, lastSnapshot, end.winTeam));
  }

  const changed = JSON.stringify(row?.snapshot ?? null) !== JSON.stringify(snapshot);
  const action = shouldWrite(row ? row.updatedAt.getTime() : null, Date.now(), changed);

  if (action === "write") await writeLiveRow(owner.clerkUserId, snapshot);
  if (action === "touch") await touchLiveRow(owner.clerkUserId);
  return ok();
}
