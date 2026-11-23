/** What the live coach needs about the player's game: names, draft facts, the lane, and item plan candidates (server only). */

import { gatherAdviceFacts } from "@/app/api/_utils/draft-advice-facts";
import { MIN_ITEM_COST } from "@/lib/live/live-events";
import { freshDraft } from "@/lib/live/live-freshness";
import { getGsiSteamId } from "@/lib/live/live-store";
import { getLockedDraft } from "@/lib/live/live-tips-store";
import { getItemPopularity } from "@/lib/opendota/opendota-draft";
import { getDraftHeroes, getItemIndex } from "@/lib/opendota/opendota-heroes";
import { dotaAccountId } from "@/lib/steam/steam-auth";
import type { Position } from "@/types/draft";
import type { LiveSnapshot } from "@/types/live";
import type { ItemIndex } from "@/types/opendota";
import { laneInfo } from "./live-lane";

/** The hero's commonly bought items (1,000+ gold) as plan candidates; every such item when OpenDota has none. */
export async function planCandidates(heroId: number, items: ItemIndex) {
  const popularity = await getItemPopularity(heroId);
  const ids = Object.values(popularity ?? {}).flatMap((counts) => Object.keys(counts ?? {}).map(Number));
  const fromHero = ids.flatMap((id) => items.byId.get(id) ?? []);
  const pool = fromHero.length > 0 ? fromHero : [...items.byKey.values()];
  const unique = new Map(pool.filter((item) => item.cost >= MIN_ITEM_COST).map((item) => [item.key, item]));
  return [...unique.values()].map(({ key, name }) => ({ key, name }));
}

export async function gameContext(userId: string, snapshot: LiveSnapshot, picked: { position: Position | null; isGuess: boolean }) {
  const [heroes, items, locked, steamId] = await Promise.all([getDraftHeroes(), getItemIndex(), getLockedDraft(userId), getGsiSteamId(userId)]);
  const draft = freshDraft(locked, Date.now());
  const accountId = steamId ? dotaAccountId(steamId) : null;
  // The draft only counts when it is recent and for the hero the player is actually playing.
  const facts = draft && draft.myHeroId === snapshot.heroId ? await gatherAdviceFacts({ ...draft, accountId }) : null;
  const heroName = heroes.find((hero) => hero.id === snapshot.heroId)?.name ?? snapshot.heroKey;
  const itemName = (key: string) => items.byKey.get(key)?.name ?? key;
  const lane = laneInfo({ team: snapshot.team, facts, ...picked });
  // Knowledge search: the player's hero first, then the enemies when the draft is this game's. Allies are left
  // out: they would share the enemies' few search hits, and what the enemy can do matters most.
  const slugOf = (heroId: number) => heroes.find((hero) => hero.id === heroId)?.slug ?? [];
  const enemyKeys = facts && draft ? draft.enemies.flatMap(({ heroId }) => slugOf(heroId)) : [];
  const heroKeys = [...new Set([snapshot.heroKey, ...enemyKeys])];
  const enemyNames = facts?.enemies.map((enemy) => enemy.name) ?? [];
  return { items, facts, heroName, itemName, lane, heroKeys, enemyNames };
}
