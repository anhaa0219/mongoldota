import { after, connection } from "next/server";
import { syncRecentMatches } from "@/lib/matches/match-store";

/**
 * Saves these matches to the database after the response is sent (never slows the page). Renders nothing.
 * `await connection()` must come first: after() reads the clock when its queue starts, and Next reports
 * that as "unstable value Date.now() while prerendering". It also keeps the sync out of prerenders.
 * Render it inside its own <Suspense fallback={null}> so the rest of the parent can still prerender.
 */
export async function MatchSyncScheduler({ matchIds }: { matchIds: number[] }) {
  await connection();
  after(() => syncRecentMatches(matchIds));
  return null;
}
