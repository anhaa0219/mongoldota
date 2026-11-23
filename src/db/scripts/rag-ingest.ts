/**
 * Owner tool: fills the coaches' Pinecone knowledge base (namespace "game") from OpenDota's game constants:
 * hero abilities, talents, facets, Aghanim's, items and the current patch's notes, plus the mechanics list
 * once it is checked. Creates the index when it is missing, clears the namespace, then writes every record.
 * Rerun after every Dota patch. Player match memory (namespaces "player-…") is left alone.
 * Run: npx tsx --env-file=.env.local src/db/scripts/rag-ingest.ts
 */

import { z } from "zod";
import { MECHANICS_CHECKED_FOR_PATCH, mechanicRecords } from "@/lib/rag/game-mechanics";
import { abilitiesSchema, aghsSchema, heroAbilitiesSchema, heroRecords } from "@/lib/rag/hero-records";
import { currentPatches, itemNamesOf, itemRecords, itemsSchema, patchNotesSchema, patchRecords } from "@/lib/rag/item-records";
import { clearNamespace, ensureIndex, GAME_NAMESPACE, namespaceCount, upsertTexts } from "@/lib/rag/pinecone";
import type { RagRecord } from "@/types/rag";

const OPENDOTA = "https://api.opendota.com/api";
const POLL_MS = 3000;
const POLL_ATTEMPTS = 20;
const heroesSchema = z.record(z.string(), z.object({ name: z.string(), localized_name: z.string() }));

const out = (line: string) => process.stdout.write(`${line}\n`);

async function constants<T>(name: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${OPENDOTA}/constants/${name}`, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`OpenDota /constants/${name} answered ${response.status}.`);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`OpenDota /constants/${name} has an unexpected shape.`);
  return parsed.data;
}

async function main() {
  const host = await ensureIndex();
  out("Index ready. Fetching OpenDota constants…");

  const [heroAbilities, abilities, aghs, items, patchNotes, heroes] = await Promise.all([
    constants("hero_abilities", heroAbilitiesSchema),
    constants("abilities", abilitiesSchema),
    constants("aghs_desc", aghsSchema),
    constants("items", itemsSchema),
    constants("patchnotes", patchNotesSchema),
    constants("heroes", heroesSchema),
  ]);

  const heroNames = new Map(Object.values(heroes).map((hero) => [hero.name.replace("npc_dota_hero_", ""), hero.localized_name]));
  const patches = currentPatches(patchNotes);
  const newest = patches[0] ?? "unknown";
  const records: RagRecord[] = [
    ...heroRecords({ heroAbilities, abilities, aghs, heroNames }),
    ...itemRecords(items),
    ...patchRecords(patchNotes, patches, heroNames, itemNamesOf(items)),
  ];
  if (MECHANICS_CHECKED_FOR_PATCH === newest) records.push(...mechanicRecords());
  else out(`Mechanics skipped: not checked for ${newest}.`);

  // Pinecone may delete a namespace in the background: writing before it is gone could lose the new records.
  if (!(await clearNamespace(GAME_NAMESPACE))) throw new Error("Could not clear the old knowledge base.");
  if (!(await waitForCount((count) => count === 0))) throw new Error("The old knowledge base was not cleared in time; run the script again.");
  if (!(await upsertTexts(GAME_NAMESPACE, records))) throw new Error("Could not write the records to Pinecone.");

  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.source, (counts.get(record.source) ?? 0) + 1);
  out(`Patches: ${patches.join(", ")}`);
  for (const [source, count] of counts) out(`${source}: ${count}`);
  out(`Total: ${records.length} records written to namespace "${GAME_NAMESPACE}".`);

  const stored = await waitForCount((count) => count === records.length);
  out(stored ? `Pinecone confirms ${records.length} records.` : "Pinecone does not show every record yet; check the count in the Pinecone console.");
  out(`Index host (set PINECONE_INDEX_HOST to this so the first search skips the lookup): ${host}`);
}

/** Polls the namespace's record count (Pinecone updates it with a short delay) until `done` or about a minute passes. */
async function waitForCount(done: (count: number) => boolean): Promise<boolean> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const count = await namespaceCount(GAME_NAMESPACE);
    if (count !== null && done(count)) return true;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return false;
}

main().catch((error: unknown) => {
  process.stderr.write(`Ingest failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
