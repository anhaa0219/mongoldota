/**
 * Owner tool (and project demo): for a few sample game moments, prints what the coach finds in Pinecone,
 * then the live tip written without and with that REFERENCE block, and once more with a sample past game.
 * Spends 7 calls of Hugging Face credit.
 * Calls the model directly (not through gatedAiCall): it is the owner's check, not a player's request.
 * Run: npx tsx --env-file=.env.local src/db/scripts/rag-samples.ts
 */

import { buildLiveTipPrompt } from "@/app/api/live/coach/_utils/live-coach-prompt";
import { tipItemKeys, tipQuery } from "@/app/api/live/coach/_utils/live-coach-reference";
import { askQuickModel } from "@/lib/ai/hf";
import { referenceLines, searchGameKnowledge } from "@/lib/rag/knowledge-search";
import type { LiveEvent, LiveSnapshot } from "@/types/live";

const out = (line: string) => process.stdout.write(`${line}\n`);

const ITEM_NAMES: Record<string, string> = { power_treads: "Power Treads", bfury: "Battle Fury", magic_wand: "Magic Wand", black_king_bar: "Black King Bar" };
const itemName = (key: string) => ITEM_NAMES[key] ?? key;

const HERO = { name: "Phantom Assassin", key: "phantom_assassin" };
const ENEMIES = [
  { name: "Lion", key: "lion" },
  { name: "Mars", key: "mars" },
];

const snapshot: LiveSnapshot = {
  matchId: "sample",
  clockSeconds: 1325,
  heroId: 44,
  heroKey: HERO.key,
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
};

const moments: LiveEvent[][] = [
  [{ kind: "death", detail: "" }],
  [{ kind: "teamfight", detail: "4:1:2:1:0" }],
  [{ kind: "gold", detail: "black_king_bar" }],
];

/** A made-up memory, so the PAST GAMES part of the prompt can be seen working without finishing a real match. */
const SAMPLE_PAST_GAME =
  'Past match on 2026-11-20: Phantom Assassin (pos 1) vs Lion, Mars, Pudge, lost. Final K/D/A 5/11/4 at 41:02, level 20, GPM 455, XPM 510. Items: Power Treads, Battle Fury, Desolator. Coach moments: death 7, teamfight 3. Coach tips: "Mars has Arena of Blood up; do not jump in before it is used." "Buy Black King Bar before your next big item; Lion keeps catching you."';

async function tip(events: LiveEvent[], reference: string[], pastGames: string[] = []): Promise<string> {
  const prompt = buildLiveTipPrompt({ snapshot, heroName: HERO.name, events, facts: null, itemName, plan: null, recentTips: [], lane: null, language: "en", reference, pastGames, myAbilities: [] });
  const result = await askQuickModel(prompt);
  return result.ok ? result.text : `(no answer: ${result.reason})`;
}

async function main() {
  for (const events of moments) {
    const itemKeys = tipItemKeys(snapshot, events);
    const query = tipQuery(HERO.name, events, ENEMIES.map((enemy) => enemy.name), itemKeys, itemName);
    const hits = await searchGameKnowledge({ query, heroKeys: [HERO.key, ...ENEMIES.map((enemy) => enemy.key)], itemKeys }, 5000);

    out(`\n=== Moment: ${events.map((event) => event.kind).join(", ")}`);
    out(`Query: ${query}`);
    out(`Found in Pinecone (${hits.length}):`);
    for (const hit of hits) out(`  - ${hit.slice(0, 160)}${hit.length > 160 ? "…" : ""}`);
    out(`\nTip WITHOUT RAG:\n${await tip(events, [])}`);
    out(`\nTip WITH RAG:\n${await tip(events, referenceLines(hits))}`);
  }

  const death = moments[0];
  const deathHits = await searchGameKnowledge({ query: tipQuery(HERO.name, death, ENEMIES.map((enemy) => enemy.name), [], itemName), heroKeys: [HERO.key], itemKeys: [] }, 5000);
  out(`\n=== Moment: death, with a past game in memory\nPast game: ${SAMPLE_PAST_GAME}`);
  out(`\nTip WITH RAG and past game:\n${await tip(death, referenceLines(deathHits), [SAMPLE_PAST_GAME])}`);
}

main().catch((error: unknown) => {
  process.stderr.write(`Samples failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
