import { describe, expect, it } from "vitest";
import { buildSuggestions, MAX_SUGGESTIONS } from "@/lib/suggestions";
import type { FormWindow, HeroComparisonRow } from "@/types/coach";
import type { PlayerSummary } from "@/types/opendota";

const puck = { id: 13, name: "Puck", slug: "puck" };
const lion = { id: 26, name: "Lion", slug: "lion" };

function summary(overrides: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    mostPlayed: { hero: puck, matches: 20, winRate: 50 },
    wins: 50, losses: 50, last10: [], records: [],
    averages: { kills: 5, deaths: 5, assists: 10, gpm: 450, xpm: 550, lastHits: 150, heroDamage: 20000, kda: 3 },
    mainLane: null, topHeroes: [{ hero: puck, matches: 20, winRate: 50 }], lanes: [],
    sides: { radiant: null, dire: null }, streaks: { current: { result: "W", length: 1 }, longestWin: 3 },
    queues: { ranked: null, unranked: null }, averageDurationSeconds: 2400,
    ...overrides,
  };
}

const row = (metric: HeroComparisonRow["metric"], betterThan: number): HeroComparisonRow => ({ metric, label: metric, yours: 5, median: 6, betterThan });
const window = (winRate: number, deaths: number): FormWindow => ({ matches: 20, winRate, kda: 3, deaths, gpm: 500 });

describe("buildSuggestions", () => {
  it("leads with the weakest benchmark and names the hero", () => {
    const comparison = [row("gold_per_min", 35), row("last_hits_per_min", 12), row("hero_damage_per_min", 80)];
    const suggestions = buildSuggestions({ heroName: "Puck", comparison, form: null, summary: summary() });
    expect(suggestions.map((entry) => entry.id)).toEqual(["weak-last_hits_per_min", "weak-gold_per_min", "strong-hero_damage_per_min"]);
    expect(suggestions[0].detail).toContain("better than only 12% of Puck players");
  });

  it("words deaths the other way round", () => {
    const [deaths] = buildSuggestions({ heroName: "Puck", comparison: [row("deaths_per_min", 20)], form: null, summary: summary() });
    expect(deaths.detail).toContain("more than 80% of Puck players");
  });

  it("flags a slump and rising deaths", () => {
    const form = { recent: window(35, 7), earlier: window(55, 5) };
    const ids = buildSuggestions({ heroName: "Puck", comparison: [], form, summary: summary() }).map((entry) => entry.id);
    expect(ids).toEqual(["form-down", "form-deaths"]);
  });

  it("suggests a better lane and a better hero", () => {
    const ids = buildSuggestions({
      heroName: "Puck",
      comparison: [],
      form: null,
      summary: summary({
        mainLane: { lane: 1, share: 60 },
        lanes: [{ lane: 1, matches: 30, winRate: 45 }, { lane: 2, matches: 8, winRate: 70 }],
        topHeroes: [{ hero: puck, matches: 20, winRate: 50 }, { hero: lion, matches: 6, winRate: 67 }],
      }),
    }).map((entry) => entry.id);
    expect(ids).toEqual(["lane", "hero"]);
  });

  it("caps the list and is never empty", () => {
    const many = ["gold_per_min", "xp_per_min", "last_hits_per_min"].map((metric, index) => row(metric as HeroComparisonRow["metric"], index * 10));
    const form = { recent: window(30, 9), earlier: window(60, 5) };
    expect(buildSuggestions({ heroName: "Puck", comparison: many, form, summary: summary() }).length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    expect(buildSuggestions({ heroName: "Puck", comparison: [], form: null, summary: summary() })[0].id).toBe("steady");
  });
});
