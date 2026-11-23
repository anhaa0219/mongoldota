/**
 * Match memory (server only): one Pinecone record per finished match in the player's own namespace,
 * so later tips can draw on how their past games went. Never throws.
 */

import { freshDraft } from "@/lib/live/live-freshness";
import { getLockedDraft, getTips } from "@/lib/live/live-tips-store";
import { getDraftHeroes, getItemIndex } from "@/lib/opendota/opendota-heroes";
import type { Side } from "@/types/game";
import type { LiveSnapshot } from "@/types/live";
import { claimMatchMemory, releaseMatchMemory } from "./match-memory-store";
import { memoryText } from "./match-memory-text";
import { clearNamespace, playerNamespace, searchText, upsertTexts } from "./pinecone";

const PAST_GAMES = 2;

/** The player's own past matches most like this one (never the current match). */
export function searchPastGames(clerkUserId: string, query: string, currentMatchId: string, timeoutMs: number): Promise<string[]> {
  return searchText(playerNamespace(clerkUserId), query, { topK: PAST_GAMES, filter: { matchId: { $ne: currentMatchId } }, timeoutMs });
}

/** Saves the memory of the match `lastSnapshot` belongs to, once per match. */
export async function saveMatchMemory(clerkUserId: string, lastSnapshot: LiveSnapshot, winTeam: Side | null): Promise<void> {
  const { matchId } = lastSnapshot;
  if (!(await claimMatchMemory(clerkUserId, matchId))) return;
  try {
    const [heroes, items, locked, tips] = await Promise.all([getDraftHeroes(), getItemIndex(), getLockedDraft(clerkUserId), getTips(clerkUserId, matchId)]);
    const endedAt = new Date();
    // The draft only counts when it is recent and for the hero the player actually played.
    const draft = freshDraft(locked, endedAt.getTime());
    const thisDraft = draft && draft.myHeroId === lastSnapshot.heroId ? draft : null;
    const enemies = (thisDraft?.enemies ?? []).flatMap(({ heroId }) => heroes.find((hero) => hero.id === heroId) ?? []);
    const text = memoryText({
      snapshot: lastSnapshot,
      heroName: heroes.find((hero) => hero.id === lastSnapshot.heroId)?.name ?? lastSnapshot.heroKey,
      won: winTeam && lastSnapshot.team ? winTeam === lastSnapshot.team : null,
      enemyNames: enemies.map((hero) => hero.name),
      position: thisDraft?.allies.find((ally) => ally.heroId === thisDraft.myHeroId)?.position ?? null,
      tips,
      itemName: (key) => items.byKey.get(key)?.name ?? key,
      endedAt,
    });
    const saved = await upsertTexts(playerNamespace(clerkUserId), [
      {
        id: `memory:${matchId}`,
        text,
        source: "memory",
        hero: lastSnapshot.heroKey,
        ...(enemies.length > 0 ? { enemies: enemies.map((hero) => hero.slug) } : {}),
        matchId,
        endedAt: endedAt.getTime(),
      },
    ]);
    if (!saved) await releaseMatchMemory(clerkUserId, matchId);
  } catch {
    await releaseMatchMemory(clerkUserId, matchId);
  }
}

/** Removes every match memory of the player (when they unlink Steam). */
export async function deletePlayerMemory(clerkUserId: string): Promise<void> {
  await clearNamespace(playerNamespace(clerkUserId));
}
