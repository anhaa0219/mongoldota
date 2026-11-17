import { describe, expect, it } from "vitest";
import { buildItemPlanPrompt, buildLiveTipPrompt, parseItemPlan, parseLiveTip } from "@/lib/live-coach-prompt";
import type { AdviceFacts } from "@/types/draft";
import type { LaneInfo } from "@/lib/live-lane";
import type { LiveEventKind, LiveSnapshot } from "@/types/live";

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
const base = { snapshot: SNAPSHOT, heroName: "Viper", facts: null, itemName, plan: null, recentTips: [], lane: null };

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
    const prompt = buildItemPlanPrompt({ snapshot: SNAPSHOT, heroName: "Viper", facts: null, candidates: [{ key: "hurricane_pike", name: "Hurricane Pike" }], lane: null });
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

describe("new moments in the prompt", () => {
  const prompt = (kind: LiveEventKind, detail = "", more: Partial<Parameters<typeof buildLiveTipPrompt>[0]> = {}) =>
    buildLiveTipPrompt({ ...base, ...more, events: [{ kind, detail }] });

  it("writes a line for each new moment", () => {
    expect(prompt("assist", "2")).toContain("- They just got 2 assists.");
    expect(prompt("assist", "1")).toContain("- They just got 1 assist.");
    expect(prompt("streak", "5")).toContain("- They are on a 5-kill streak.");
    expect(prompt("teamfight", "3:1:1:2:0")).toContain(
      "- A teamfight just ended: their team got 3 kills, the enemy got 1. They got 1 kill and 2 assists and survived.",
    );
    expect(prompt("teamfight", "?:?:0:2:1")).toContain("- A teamfight just ended. They got 0 kills and 2 assists and died.");
    expect(prompt("teamfight", "junk")).toContain("- A teamfight just ended.");
    expect(prompt("buyback")).toContain("- They just bought back.");
    expect(prompt("nobuyback")).toContain("- They no longer have gold for buyback.");
    expect(prompt("aegis")).toContain("- They just picked up the Aegis; it expires 5 minutes after pickup.");
  });

  it("asks for praise before the next move", () => {
    expect(prompt("kill", "1")).toContain(
      "If they just got a kill, are on a kill streak, or their team won a teamfight, start with a few words of praise, then give the next move.",
    );
  });

  it("states buyback in the game line", () => {
    const withBuyback = (changes: Partial<LiveSnapshot>) => prompt("asked", "", { snapshot: { ...SNAPSHOT, ...changes } });
    expect(withBuyback({ buybackCost: 1450, buybackCooldown: 0, gold: 1840 })).toContain("Buyback ready, costs 1,450.");
    expect(withBuyback({ buybackCost: 1450, buybackCooldown: 200, gold: 1840 })).toContain("Buyback on cooldown 3:20.");
    expect(withBuyback({ buybackCost: 1450, buybackCooldown: 0, gold: 900 })).toContain("Buyback: cannot afford (costs 1,450, has 900).");
    expect(prompt("asked")).not.toContain("Buyback");
  });

  it("includes the lane block and marks a building in the player's lane", () => {
    const lane: LaneInfo = { position: 1, lane: "bot", partners: ["Lion (pos 5)"], opponents: [{ name: "Axe", position: 3, myWinRate: 54, games: 1240 }] };
    const text = prompt("building", "radiant:tower:bot:1", { lane });
    expect(text).toContain("Lane: bot (safe lane) with Lion (pos 5), against Axe (pos 3).");
    expect(text).toContain("just lost the bot T1 tower, in their lane.");
    expect(prompt("building", "radiant:tower:top:1", { lane })).not.toContain("in their lane");
  });

  it("puts the lane block in the item plan prompt too", () => {
    const lane: LaneInfo = { position: 3, lane: "top", partners: [], opponents: null };
    expect(buildItemPlanPrompt({ snapshot: SNAPSHOT, heroName: "Viper", facts: null, candidates: [], lane })).toContain(
      "Lane: top (off lane), against the enemy pos 1 and pos 5 (heroes unknown).",
    );
  });
});
