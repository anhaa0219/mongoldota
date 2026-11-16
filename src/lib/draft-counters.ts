/** Counter-pick scores: how much each hero beats the enemy picks, compared with what its win rate predicts. Pure. */

import type { CounterEntry, CounterSuggestion, DraftHero, Matchup } from "@/types/draft";

/**
 * Small samples are pulled toward "no advantage" as if this many extra games had gone exactly as expected,
 * so a 3-0 record does not top the list.
 */
export const PRIOR_GAMES = 100; // OpenDota matchup samples are small (often 50-350 games), so lean on this

/**
 * The candidate's advantage against one enemy. `enemyRow` comes from the enemy's matchup list,
 * so its wins are the enemy's: the candidate won the rest. Expected = 50% shifted by both heroes' overall win rates.
 */
export function advantageAgainst(candidate: DraftHero, enemy: DraftHero, enemyRow: Matchup | undefined): CounterEntry {
  const games = enemyRow?.games ?? 0;
  const expected = 50 + (candidate.winRate - enemy.winRate);
  if (!enemyRow || games === 0) return { enemyId: enemy.id, advantage: 0, games: 0 };

  const candidateWins = games - enemyRow.wins;
  const smoothed = (candidateWins * 100 + PRIOR_GAMES * expected) / (games + PRIOR_GAMES);
  return { enemyId: enemy.id, advantage: smoothed - expected, games };
}

interface RankInput {
  heroes: DraftHero[];
  /** Enemy hero ids whose matchup lists have loaded. */
  enemyIds: number[];
  matchups: Map<number, Matchup[]>;
  /** Heroes already in the draft: never suggested. */
  picked: Set<number>;
}

/** Every pickable hero, best counter first. Empty when no enemy matchups are loaded. */
export function rankCounters({ heroes, enemyIds, matchups, picked }: RankInput): CounterSuggestion[] {
  const byId = new Map(heroes.map((hero) => [hero.id, hero]));
  const enemies = enemyIds.flatMap((id) => {
    const hero = byId.get(id);
    const rows = matchups.get(id);
    return hero && rows ? [{ hero, rows: new Map(rows.map((row) => [row.heroId, row])) }] : [];
  });
  if (enemies.length === 0) return [];

  return heroes
    .filter((hero) => !picked.has(hero.id))
    .map((candidate) => {
      const perEnemy = enemies.map(({ hero, rows }) => advantageAgainst(candidate, hero, rows.get(candidate.id)));
      return { heroId: candidate.id, score: perEnemy.reduce((sum, entry) => sum + entry.advantage, 0), perEnemy };
    })
    .sort((a, b) => b.score - a.score);
}
