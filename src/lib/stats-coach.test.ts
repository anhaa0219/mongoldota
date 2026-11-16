import { describe, expect, it } from "vitest";
import { buildStatsCoachPrompt, parseCoachSuggestions } from "@/lib/stats-coach";
import type { PlayerSummary } from "@/types/opendota";

const puck = { id: 13, name: "Puck", slug: "puck" };
const summary: PlayerSummary = {
  mostPlayed: { hero: puck, matches: 20, winRate: 55 },
  wins: 52, losses: 48, last10: [], records: [],
  averages: { kills: 7.2, deaths: 6.4, assists: 11, gpm: 480, xpm: 610, lastHits: 160, heroDamage: 21000, kda: 2.84 },
  mainLane: { lane: 2, share: 70 }, topHeroes: [{ hero: puck, matches: 20, winRate: 55 }],
  lanes: [{ lane: 2, matches: 30, winRate: 57 }], sides: { radiant: { matches: 50, winRate: 54 }, dire: null },
  streaks: { current: { result: "L", length: 2 }, longestWin: 5 }, queues: { ranked: { matches: 80, winRate: 51 }, unranked: null },
  averageDurationSeconds: 2460,
};

describe("buildStatsCoachPrompt", () => {
  it("states the player's real numbers and what the rules found", () => {
    const prompt = buildStatsCoachPrompt({
      summary,
      comparison: [{ metric: "last_hits_per_min", label: "Last hits / min", yours: 4.1, median: 5.6, betterThan: 28 }],
      form: null,
      playstyle: [{ label: "Observers bought", average: 0.4, matches: 90 }],
      abilities: ["Illusory Orb: launches an orb"],
      ruleSuggestions: [{ id: "weak", tone: "fix", title: "Hit more creeps", detail: "" }],
    });
    expect(prompt).toContain("52 wins, 48 losses. Current streak L2.");
    expect(prompt).toContain("Last hits / min 4.1 (typical 5.6, better than 28%)");
    expect(prompt).toContain("mid lane 57% (30)");
    expect(prompt).toContain("Observers bought 0.4");
    expect(prompt).toContain("Puck abilities: Illusory Orb: launches an orb");
    expect(prompt).toContain("Already detected: Hit more creeps");
  });
});

describe("parseCoachSuggestions", () => {
  it("reads suggestions and gives them ids", () => {
    const text = '```json\n{"suggestions": [{"tone": "fix", "title": "Die less", "detail": "6.4 deaths a game."}]}\n```';
    expect(parseCoachSuggestions(text)).toEqual([{ id: "ai-0", tone: "fix", title: "Die less", detail: "6.4 deaths a game." }]);
  });

  it("rejects unknown tones and unusable replies", () => {
    expect(parseCoachSuggestions('{"suggestions": [{"tone": "warning", "title": "x", "detail": "y"}]}')).toBeNull();
    expect(parseCoachSuggestions("no json")).toBeNull();
  });
});
