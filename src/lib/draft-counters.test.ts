import { describe, expect, it } from "vitest";
import { advantageAgainst, PRIOR_GAMES, rankCounters } from "@/lib/draft-counters";
import type { DraftHero } from "@/types/draft";

const hero = (id: number, winRate = 50): DraftHero => ({ id, name: `Hero ${id}`, slug: `hero${id}`, winRate, roles: [] });
const viper = hero(47);
const ember = hero(106);

describe("advantageAgainst", () => {
  it("is zero without data", () => {
    expect(advantageAgainst(viper, ember, undefined)).toEqual({ enemyId: 106, advantage: 0, games: 0 });
  });

  it("reads the enemy's list the other way round and shrinks small samples", () => {
    // Ember won 400 of 1000 games against Viper, so Viper won 60%; the prior pulls it a little toward 50%.
    const entry = advantageAgainst(viper, ember, { heroId: 47, games: 1000, wins: 400 });
    expect(entry.advantage).toBeCloseTo((600 * 100 + PRIOR_GAMES * 50) / (1000 + PRIOR_GAMES) - 50);
    expect(entry.advantage).toBeGreaterThan(8);
    expect(entry.advantage).toBeLessThan(10);
  });

  it("expects a strong hero to beat a weak one, so only beating that counts", () => {
    const strong = hero(1, 54);
    const weak = hero(2, 48);
    // Strong hero wins 56%: only 0 points above the 56% expected.
    expect(advantageAgainst(strong, weak, { heroId: 1, games: 100_000, wins: 44_000 }).advantage).toBeCloseTo(0, 1);
  });
});

describe("rankCounters", () => {
  const heroes = [hero(1), hero(2), hero(3), ember];
  const matchups = new Map([[106, [{ heroId: 1, games: 2000, wins: 800 }, { heroId: 2, games: 2000, wins: 1200 }, { heroId: 3, games: 2000, wins: 1000 }]]]);

  it("ranks the best counters first and skips picked heroes", () => {
    const ranked = rankCounters({ heroes, enemyIds: [106], matchups, picked: new Set([106, 3]) });
    expect(ranked.map((entry) => entry.heroId)).toEqual([1, 2]);
    expect(ranked[0].score).toBeGreaterThan(0);
    expect(ranked[1].score).toBeLessThan(0);
  });

  it("is empty until an enemy's matchups have loaded", () => {
    expect(rankCounters({ heroes, enemyIds: [47], matchups, picked: new Set() })).toEqual([]);
  });
});
