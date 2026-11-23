/** What the live coach needs about the player's game: names, draft facts, the lane, and item plan candidates (server only). */

import { gatherAdviceFacts } from "@/app/api/_utils/draft-advice-facts";
import { freshDraft } from "@/lib/live/live-freshness";
import { getGsiSteamId } from "@/lib/live/live-store";
import { getLockedDraft } from "@/lib/live/live-tips-store";
import { getAbilityIndex, getItemPopularity } from "@/lib/opendota/opendota-draft";
import { getDraftHeroes, getItemIndex } from "@/lib/opendota/opendota-heroes";
import { dotaAccountId } from "@/lib/steam/steam-auth";
import type { Position } from "@/types/draft";
import type { LiveSnapshot } from "@/types/live";
import type { ItemIndex } from "@/types/opendota";
import { laneInfo } from "./live-lane";
import type { PlanCandidate } from "./live-plan-prompt";
import { rankPlanCandidates } from "./plan-candidates";

/** The hero's most bought items from OpenDota as plan candidates (see rankPlanCandidates). */
export async function planCandidates(heroId: number, items: ItemIndex): Promise<PlanCandidate[]> {
  return rankPlanCandidates(await getItemPopularity(heroId), items);
}

export async function gameContext(userId: string, snapshot: LiveSnapshot, picked: { position: Position | null; isGuess: boolean }) {
  const [heroes, items, locked, steamId, abilities] = await Promise.all([getDraftHeroes(), getItemIndex(), getLockedDraft(userId), getGsiSteamId(userId), getAbilityIndex()]);
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
  // The player's own abilities, with or without a draft: without them the model guesses (Skewer to farm).
  const myAbilities = abilities?.[snapshot.heroKey] ?? [];
  return { items, facts, heroName, itemName, lane, heroKeys, enemyNames, myAbilities };
}
