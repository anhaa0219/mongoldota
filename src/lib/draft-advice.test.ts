import { describe, expect, it } from "vitest";
import { buildAdvicePrompt, parseAdvice, timedWinRates, topItems } from "@/lib/draft-advice";
import type { AdviceFacts } from "@/types/draft";

const names = new Map([[1, "Blink Dagger"], [2, "Tango"], [3, "Black King Bar"]]);

describe("advice facts", () => {
  it("lists the most bought items first and skips unknown ids", () => {
    expect(topItems({ "1": 5, "2": 90, "99": 200, "3": 40 }, (itemId) => names.get(itemId), 2)).toEqual(["Tango", "Black King Bar"]);
  });

  it("turns OpenDota timing rows into minutes with win rates, dropping thin buckets", () => {
    const rows = [{ seconds: 1800, games: "141", wins: "72" }, { seconds: 600, games: "2", wins: "2" }, { seconds: 1500, games: "61", wins: "39" }];
    expect(timedWinRates(rows, 20)).toEqual([
      { minute: 25, winRate: (39 / 61) * 100, games: 61 },
      { minute: 30, winRate: (72 / 141) * 100, games: 141 },
    ]);
  });
});

describe("buildAdvicePrompt", () => {
  const facts: AdviceFacts = {
    myHero: { name: "Viper", roles: ["Carry"], winRate: 51 },
    position: 2,
    allies: [{ name: "Lion", roles: ["Support"], position: 5 }],
    enemies: [
      { name: "Ember Spirit", roles: ["Carry"], position: 2, myWinRate: 53.3, games: 122 },
      { name: "Axe", roles: ["Initiator"], position: 3, myWinRate: 41, games: 99 },
    ],
    lane: { partners: [], opponents: [{ name: "Ember Spirit", position: 2, myWinRate: 53.3, games: 122 }] },
    items: { start: ["Tango"], early: ["Power Treads"], mid: ["Dragon Lance"], late: ["Skadi"] },
    bkb: [{ minute: 25, winRate: 64, games: 61 }],
    durations: [],
    personal: { games: 12, winRate: 58.3 },
    abilities: [
      { hero: "Viper", team: "yours", list: ["Poison Attack: slows"] },
      { hero: "Ember Spirit", team: "enemy", list: ["Searing Chains: roots"] },
    ],
  };

  it("grounds the coach in the real numbers", () => {
    const prompt = buildAdvicePrompt(facts);
    expect(prompt).toContain("Viper as Position 2 (mid)");
    expect(prompt).toContain("LANE: Viper (pos 2) vs Ember Spirit (pos 2, Viper wins 53% vs them in 122 games).");
    expect(prompt).toContain("- pos 2 Ember Spirit [Carry]: Viper wins 53% vs them (122 games)");
    expect(prompt).toContain("Allies: pos 5 Lion [Support]");
    expect(prompt).toContain("by 25 min: 64% (61 games)");
    expect(prompt).toContain("58% over 12 games");
    expect(prompt).toContain("Win rate by game length: no data");
    expect(prompt).toMatch(/YOUR TEAM[^\n]*\n- Viper: Poison Attack: slows\nABILITIES — ENEMY TEAM:\n- Ember Spirit: Searing Chains: roots/);
  });
});

describe("parseAdvice", () => {
  it("reads advice from a fenced reply", () => {
    const advice = parseAdvice('Sure!\n```json\n{"advice": [{"category": "Items", "title": "Rush BKB", "detail": "By 20 min."}]}\n```');
    expect(advice).toEqual([{ category: "Items", title: "Rush BKB", detail: "By 20 min." }]);
  });

  it("returns null for unusable replies", () => {
    expect(parseAdvice("I cannot help with that.")).toBeNull();
    expect(parseAdvice('{"advice": []}')).toBeNull();
  });
});
