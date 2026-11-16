/** Gathers the OpenDota facts the draft coach is grounded in (server only, every request cached by OpenDota helpers). */

import { timedWinRates, topItems } from "@/lib/draft-advice";
import { laneOpponentPositions, lanePartnerPositions } from "@/lib/draft-lanes";
import { getAbilityIndex, getHeroDurations, getHeroMatchups, getItemPopularity, getItemTimings, getPersonalRecords } from "@/lib/opendota-draft";
import { getDraftHeroes, getItemIndex } from "@/lib/opendota-heroes";
import type { AdviceFacts, PersonalRecord, PlacedHero } from "@/types/draft";

/** Thin buckets say little: BKB timings need 20+ games, game lengths 100+. */
const MIN_BKB_GAMES = 20;
const MIN_DURATION_GAMES = 100;

interface AdviceInput {
  myHeroId: number;
  /** The player's team, including the player's own hero. */
  allies: PlacedHero[];
  enemies: PlacedHero[];
  accountId: string | null;
}

/** Null when the hero list is unavailable or the hero is unknown. */
export async function gatherAdviceFacts({ myHeroId, allies, enemies, accountId }: AdviceInput): Promise<AdviceFacts | null> {
  const [heroes, itemIndex, matchups, popularity, bkbRows, durationRows, personal, abilities] = await Promise.all([
    getDraftHeroes(),
    getItemIndex(),
    getHeroMatchups(myHeroId),
    getItemPopularity(myHeroId),
    getItemTimings(myHeroId, "black_king_bar"),
    getHeroDurations(myHeroId),
    accountId ? getPersonalRecords(accountId) : Promise.resolve<Record<number, PersonalRecord>>({}),
    getAbilityIndex(),
  ]);
  const byId = new Map(heroes.map((hero) => [hero.id, hero]));
  const myHero = byId.get(myHeroId);
  const position = allies.find((ally) => ally.heroId === myHeroId)?.position;
  if (!myHero || !position) return null;

  const nameOf = (itemId: number) => itemIndex.byId.get(itemId)?.name;
  const vs = new Map((matchups ?? []).map((row) => [row.heroId, row]));
  const place = (placed: PlacedHero[]) =>
    placed.flatMap(({ heroId, position: heroPosition }) => {
      const hero = byId.get(heroId);
      return hero ? [{ hero, position: heroPosition }] : [];
    });
  const record = (heroId: number) => {
    const row = vs.get(heroId);
    return { myWinRate: row && row.games > 0 ? (row.wins / row.games) * 100 : null, games: row?.games ?? 0 };
  };
  const allyHeroes = place(allies).filter(({ hero }) => hero.id !== myHeroId);
  const enemyHeroes = place(enemies);
  const opponentPositions = laneOpponentPositions(position);
  const partnerPositions = lanePartnerPositions(position);

  return {
    myHero: { name: myHero.name, roles: myHero.roles, winRate: myHero.winRate },
    position,
    allies: allyHeroes.map(({ hero, position: heroPosition }) => ({ name: hero.name, roles: hero.roles, position: heroPosition })),
    enemies: enemyHeroes.map(({ hero, position: heroPosition }) => ({ name: hero.name, roles: hero.roles, position: heroPosition, ...record(hero.id) })),
    lane: {
      partners: allyHeroes.filter((ally) => partnerPositions.includes(ally.position)).map(({ hero, position: heroPosition }) => `${hero.name} (pos ${heroPosition})`),
      opponents: enemyHeroes
        .filter((enemy) => opponentPositions.includes(enemy.position))
        .map(({ hero, position: heroPosition }) => ({ name: hero.name, position: heroPosition, ...record(hero.id) })),
    },
    items: {
      start: topItems(popularity?.start_game_items, nameOf, 6),
      early: topItems(popularity?.early_game_items, nameOf, 6),
      mid: topItems(popularity?.mid_game_items, nameOf, 6),
      late: topItems(popularity?.late_game_items, nameOf, 4),
    },
    bkb: timedWinRates((bkbRows ?? []).map((row) => ({ seconds: row.time, games: row.games, wins: row.wins })), MIN_BKB_GAMES),
    durations: timedWinRates(
      (durationRows ?? []).map((row) => ({ seconds: row.duration_bin, games: row.games_played, wins: row.wins })),
      MIN_DURATION_GAMES,
    ),
    personal: personal[myHeroId] ?? null,
    abilities: [
      ...[myHero, ...allyHeroes.map(({ hero }) => hero)].map((hero) => ({ hero: hero.name, team: "yours" as const, list: abilities?.[hero.slug] ?? [] })),
      ...enemyHeroes.map(({ hero }) => ({ hero: hero.name, team: "enemy" as const, list: abilities?.[hero.slug] ?? [] })),
    ],
  };
}
