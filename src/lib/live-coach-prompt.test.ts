import { describe, expect, it } from "vitest";
import { buildItemPlanPrompt, buildLiveTipPrompt, parseItemPlan, parseLiveTip } from "@/lib/live-coach-prompt";
import type { AdviceFacts } from "@/types/draft";
import type { LiveSnapshot } from "@/types/live";

const SNAPSHOT: LiveSnapshot = {
  matchId: "1",
  clockSeconds: 600,
  heroId: 47,
  heroKey: "viper",
  level: 16,
  alive: true,
  respawnSeconds: 0,
  kills: 7,
  deaths: 3,
  assists: 5,
  lastHits: 80,
  denies: 10,
  gold: 1840,
  gpm: 512,
  xpm: 600,
  inventory: ["dragon_lance", null, null, null, null, null],
  owned: ["dragon_lance"],
  team: "radiant",
  buildings: [{ team: "radiant", kind: "tower", lane: "mid", tier: 2, healthPct: 40 }],
  buildingTeams: ["radiant"],
};

const FACTS: AdviceFacts = {
  myHero: { name: "Viper", roles: ["Carry"], winRate: 51 },
  position: 2,
  allies: [{ name: "Lion", roles: ["Support"], position: 5 }],
  enemies: [{ name: "Phantom Assassin", roles: ["Carry"], position: 1, myWinRate: 54, games: 3000 }],
  lane: { partners: [], opponents: [] },
  items: { start: [], early: [], mid: [], late: [] },
  bkb: [{ minute: 20, winRate: 58, games: 400 }],
  durations: [],
  personal: null,
  abilities: [{ hero: "Phantom Assassin", team: "enemy", list: ["Blur: hides her on the minimap"] }],
};

const itemName = (key: string) => ({ dragon_lance: "Dragon Lance", hurricane_pike: "Hurricane Pike" })[key] ?? key;
const base = { snapshot: SNAPSHOT, heroName: "Viper", facts: null, itemName, plan: null, recentTips: [] };

describe("buildLiveTipPrompt", () => {
  it("describes the live game and each event", () => {
    const prompt = buildLiveTipPrompt({
      ...base,
      events: [
        { kind: "death", detail: "" },
        { kind: "item", detail: "dragon_lance" },
      ],
    });
    expect(prompt).toContain("Viper");
    expect(prompt).toContain("10:00");
    expect(prompt).toContain("K 7 / D 3 / A 5");
    expect(prompt).toContain("died");
    expect(prompt).toContain("bought Dragon Lance");
  });

  it("describes the buildings and a fallen one", () => {
    const prompt = buildLiveTipPrompt({ ...base, events: [{ kind: "building", detail: "dire:melee:bot:0" }] });
    expect(prompt).toContain("damaged: mid T2 tower 40%");
    expect(prompt).toContain("The enemy (Dire) just lost the bot melee barracks.");
  });

  it("names the enemies when the draft is known", () => {
    expect(buildLiveTipPrompt({ ...base, facts: FACTS, events: [{ kind: "lookahead", detail: "" }] })).toContain("Phantom Assassin");
  });

  it("does not mention a draft without one", () => {
    expect(buildLiveTipPrompt({ ...base, events: [{ kind: "asked", detail: "" }] }).toLowerCase()).not.toContain("draft");
  });

  it("lists recent tips so the coach does not repeat them", () => {
    const prompt = buildLiveTipPrompt({ ...base, recentTips: ["Push mid now."], events: [{ kind: "kill", detail: "1" }] });
    expect(prompt).toContain("Do not repeat");
    expect(prompt).toContain("Push mid now.");
  });
});

describe("buildItemPlanPrompt", () => {
  it("offers only the candidate item keys", () => {
    const prompt = buildItemPlanPrompt({ snapshot: SNAPSHOT, heroName: "Viper", facts: null, candidates: [{ key: "hurricane_pike", name: "Hurricane Pike" }] });
    expect(prompt).toContain("hurricane_pike");
    expect(prompt).toContain("JSON");
  });
});

describe("parseLiveTip", () => {
  it("keeps the first paragraph without markdown", () => expect(parseLiveTip("**Push mid now.**\n\nMore")).toBe("Push mid now."));
  it("is null for an empty answer", () => expect(parseLiveTip("  ")).toBeNull());
  it("cuts very long answers", () => expect(parseLiveTip("word ".repeat(200))?.length).toBeLessThanOrEqual(300));
});

describe("parseItemPlan", () => {
  it("keeps known keys once, in order", () => {
    const known = new Set(["dragon_lance", "hurricane_pike"]);
    expect(parseItemPlan('Plan: ["dragon_lance","fake","dragon_lance","hurricane_pike"]', known)).toEqual(["dragon_lance", "hurricane_pike"]);
  });

  it("is empty for an unreadable answer", () => expect(parseItemPlan("no idea", new Set(["dragon_lance"]))).toEqual([]));
});
