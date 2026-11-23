/**
 * Owner tool: about 10 real coach prompts asked in Mongolian, answers printed, to judge the model's Mongolian
 * before players see it. Spends ~9 calls of Hugging Face credit. If the Mongolian is not good enough,
 * set AI_ANSWERS_FOLLOW_LANGUAGE = false in src/lib/ai/answer-language.ts (pages stay Mongolian).
 * Calls the model directly (not through gatedAiCall): it is the owner's check, not a player's request.
 * Run: npx tsx --env-file=.env.local src/db/scripts/ai-mongolian-samples.ts
 */

import { buildAdvicePrompt } from "@/app/api/_utils/draft-advice";
import { buildLiveTipPrompt } from "@/app/api/live/coach/_utils/live-coach-prompt";
import { buildHeroPicksPrompt, type PickCandidate } from "@/app/(site)/heroes/_utils/hero-picks";
import { askQuickModel, askTextModel, type ModelResult } from "@/lib/ai/hf";
import type { AdviceFacts } from "@/types/draft";
import type { LiveEvent, LiveSnapshot } from "@/types/live";

const out = (line: string) => process.stdout.write(`${line}\n`);

const snapshot: LiveSnapshot = {
  matchId: "sample",
  clockSeconds: 1325,
  heroId: 44,
  heroKey: "phantom_assassin",
  level: 14,
  alive: true,
  respawnSeconds: 0,
  kills: 7,
  deaths: 3,
  assists: 5,
  lastHits: 162,
  denies: 9,
  gold: 2380,
  gpm: 548,
  xpm: 601,
  inventory: ["power_treads", "bfury", "magic_wand", null, null, null],
  owned: ["power_treads", "bfury", "magic_wand"],
  team: "radiant",
  buildings: [],
  buildingTeams: [],
  killStreak: 3,
  buybackCost: 1180,
  buybackCooldown: 0,
  score: { radiant: 21, dire: 17 },
};

const tipEvents: LiveEvent[][] = [
  [{ kind: "death", detail: "" }],
  [{ kind: "kill", detail: "2" }, { kind: "streak", detail: "3" }],
  [{ kind: "teamfight", detail: "4:1:2:1:0" }],
  [{ kind: "building", detail: "dire:tower:bot:2" }],
  [{ kind: "lookahead", detail: "" }],
];

const lionFacts: AdviceFacts = {
  myHero: { name: "Lion", roles: ["Support", "Disabler", "Nuker"], winRate: 49.8 },
  position: 5,
  allies: [{ name: "Juggernaut", roles: ["Carry"], position: 1 }, { name: "Puck", roles: ["Nuker", "Escape"], position: 2 }],
  enemies: [
    { name: "Mars", roles: ["Initiator", "Durable"], position: 3, myWinRate: 51.2, games: 1200 },
    { name: "Shadow Fiend", roles: ["Carry", "Nuker"], position: 2, myWinRate: 47.9, games: 2100 },
  ],
  lane: { partners: ["Juggernaut (pos 1)"], opponents: [{ name: "Mars", position: 3, myWinRate: 51.2, games: 1200 }] },
  items: { start: ["Tango", "Observer Ward", "Clarity"], early: ["Arcane Boots", "Magic Wand"], mid: ["Blink Dagger", "Aether Lens"], late: ["Aghanim's Scepter"] },
  bkb: [],
  durations: [{ minute: 30, winRate: 52.1, games: 4000 }, { minute: 45, winRate: 46.3, games: 2600 }],
  personal: { games: 14, winRate: 57 },
  abilities: [
    { hero: "Lion", team: "yours", list: ["Earth Spike: stuns enemies in a line", "Hex: turns an enemy into a harmless critter", "Finger of Death: deals heavy magic damage"] },
    { hero: "Mars", team: "enemy", list: ["Spear of Mars: pins an enemy to a wall", "Arena of Blood: traps heroes inside a ring"] },
  ],
};

const candidates: PickCandidate[] = [
  { heroId: 8, name: "Juggernaut", slug: "juggernaut", roles: ["Carry", "Pusher"], bracketWinRate: 52.4, personal: { games: 22, winRate: 59 }, fitsLane: true, score: 8 },
  { heroId: 44, name: "Phantom Assassin", slug: "phantom_assassin", roles: ["Carry", "Escape"], bracketWinRate: 51.1, personal: { games: 9, winRate: 55 }, fitsLane: true, score: 6 },
  { heroId: 18, name: "Sven", slug: "sven", roles: ["Carry", "Disabler"], bracketWinRate: 53.0, personal: null, fitsLane: true, score: 5 },
  { heroId: 70, name: "Ursa", slug: "ursa", roles: ["Carry", "Durable"], bracketWinRate: 52.0, personal: { games: 4, winRate: 50 }, fitsLane: true, score: 4 },
  { heroId: 54, name: "Lifestealer", slug: "life_stealer", roles: ["Carry", "Durable"], bracketWinRate: 51.6, personal: null, fitsLane: true, score: 4 },
];

async function sample(title: string, answer: Promise<ModelResult>) {
  const result = await answer;
  out(`\n=== ${title}`);
  out(result.ok ? result.text : `(no answer: ${result.reason})`);
}

async function main() {
  for (const [index, events] of tipEvents.entries()) {
    const prompt = buildLiveTipPrompt({ snapshot, heroName: "Phantom Assassin", events, facts: null, itemName: (key) => key, plan: null, recentTips: [], lane: null, language: "mn", reference: [], pastGames: [], myAbilities: [] });
    await sample(`Live tip ${index + 1} (${events.map((event) => event.kind).join(", ")})`, askQuickModel(prompt));
  }
  await sample("Draft advice: Lion pos 5", askTextModel(buildAdvicePrompt(lionFacts, "mn", [])));
  await sample("Draft advice: Lion pos 5, again", askTextModel(buildAdvicePrompt({ ...lionFacts, personal: null }, "mn", [])));
  await sample("Hero picks: Legend, safe lane", askTextModel(buildHeroPicksPrompt(candidates, "5", 1, "mn")));
  await sample("Hero picks: Archon, no lane", askTextModel(buildHeroPicksPrompt(candidates, "4", null, "mn")));
}

main().catch((error: unknown) => {
  process.stderr.write(`Samples failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
