/**
 * Owner tool: shows what is stored in Pinecone and searches it, so you can see RAG working without a match.
 * Prints the record count per namespace ("game" = knowledge base, "player-…" = match memories), then the
 * best matches for your question with their scores.
 * Run: npx tsx --env-file=.env.local src/db/scripts/rag-check.ts "Viper died to Pudge"
 * Optional hero filter: npx tsx --env-file=.env.local src/db/scripts/rag-check.ts "how to fight Mars" mars
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { GAME_NAMESPACE } from "@/lib/rag/pinecone";

const out = (line: string) => process.stdout.write(`${line}\n`);
const TOP_K = 5;

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  const name = process.env.PINECONE_INDEX;
  if (!apiKey || !name) throw new Error("Set PINECONE_API_KEY and PINECONE_INDEX in .env.local first.");
  const [question = "Black King Bar duration", hero] = process.argv.slice(2);

  const index = new Pinecone({ apiKey }).index({ name, host: process.env.PINECONE_INDEX_HOST || undefined, namespace: GAME_NAMESPACE });
  const stats = await index.describeIndexStats();
  out(`Index "${name}": ${stats.totalRecordCount ?? 0} records, ${stats.dimension ?? "?"} numbers per vector.`);
  for (const [namespace, summary] of Object.entries(stats.namespaces ?? {})) out(`  namespace "${namespace}": ${summary.recordCount} records`);

  const started = Date.now();
  const result = await index.searchRecords({
    query: { topK: TOP_K, inputs: { text: question }, ...(hero ? { filter: { hero: { $eq: hero } } } : {}) },
    fields: ["text", "source", "hero", "item"],
  });
  out(`\nSearch "${question}"${hero ? ` (hero: ${hero})` : ""}: ${result.result.hits.length} hits in ${Date.now() - started} ms`);
  for (const hit of result.result.hits) {
    const fields = hit.fields as Record<string, unknown>;
    out(`\n  [score ${hit._score.toFixed(3)}] ${hit._id} (${String(fields.source)})`);
    out(`  ${String(fields.text).slice(0, 300)}`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Check failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
