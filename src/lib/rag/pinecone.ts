/**
 * Pinecone client (server only) for the coaches' knowledge base and match memory.
 * Uses an index with built-in embedding (multilingual-e5-large): the app sends text, Pinecone makes the vectors.
 * Every function except ensureIndex never throws: no key, no index, a timeout or an error reads as "nothing".
 */

import { Pinecone, type RecordMetadata } from "@pinecone-database/pinecone";
import type { RagFilter, RagRecord } from "@/types/rag";

export const GAME_NAMESPACE = "game";
const EMBED_MODEL = "multilingual-e5-large";
/** Pinecone accepts at most 96 records per upsert on an index with built-in embedding. */
const UPSERT_BATCH = 96;

export function playerNamespace(clerkUserId: string): string {
  return `player-${clerkUserId}`;
}

/** Kept for the life of the server: the first search looks up the index host (~2 s), later ones take ~0.3 s. */
let cached: { pinecone: Pinecone; indexName: string } | null = null;

function client(): { pinecone: Pinecone; indexName: string } | null {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey || !indexName) return null;
  if (!cached || cached.indexName !== indexName) cached = { pinecone: new Pinecone({ apiKey }), indexName };
  return cached;
}

function namespaceIndex(namespace: string) {
  const connection = client();
  return connection ? connection.pinecone.index({ name: connection.indexName, namespace }) : null;
}

/** Resolves to `fallback` once `timeoutMs` passes; the slower call is no longer waited for. */
function withTimeout<T>(work: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([work.catch(() => fallback), timeout]).finally(() => clearTimeout(timer));
}

/** The text of the best matches, best first. */
export async function searchText(namespace: string, query: string, options: { topK: number; filter?: RagFilter; timeoutMs: number }): Promise<string[]> {
  const index = namespaceIndex(namespace);
  if (!index || !query.trim()) return [];
  const search = index
    .searchRecords({ query: { topK: options.topK, inputs: { text: query }, filter: options.filter }, fields: ["text"] })
    .then((response) =>
      response.result.hits.flatMap((hit) => {
        const text: unknown = (hit.fields as Record<string, unknown>).text;
        return typeof text === "string" && text.length > 0 ? [text] : [];
      }),
    );
  return withTimeout(search, options.timeoutMs, []);
}

/** Pinecone metadata cannot hold undefined or null, so those fields are dropped. */
function toMetadata(record: RagRecord): RecordMetadata & { id: string } {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined && value !== null);
  return Object.fromEntries(entries) as RecordMetadata & { id: string };
}

export async function upsertTexts(namespace: string, records: RagRecord[]): Promise<boolean> {
  const index = namespaceIndex(namespace);
  if (!index) return false;
  try {
    for (let start = 0; start < records.length; start += UPSERT_BATCH) {
      await index.upsertRecords({ records: records.slice(start, start + UPSERT_BATCH).map(toMetadata) });
    }
    return true;
  } catch {
    return false;
  }
}

/** Deletes every record in the namespace; a namespace that does not exist counts as cleared. */
export async function clearNamespace(namespace: string): Promise<boolean> {
  const index = namespaceIndex(namespace);
  if (!index) return false;
  try {
    await index.deleteNamespace(namespace);
    return true;
  } catch (error) {
    return error instanceof Error && error.name === "PineconeNotFoundError";
  }
}

/** Scripts only: creates the index from PINECONE_INDEX when it is missing. Throws with a plain message. */
export async function ensureIndex(): Promise<void> {
  const connection = client();
  if (!connection) throw new Error("Set PINECONE_API_KEY and PINECONE_INDEX in .env.local first.");
  const { pinecone, indexName } = connection;
  const list = await pinecone.indexes.list();
  if (list.indexes?.some((index) => index.name === indexName)) return;
  await pinecone.indexes.createForModel({
    name: indexName,
    cloud: "aws",
    region: "us-east-1",
    embed: { model: EMBED_MODEL, fieldMap: { text: "text" } },
    waitUntilReady: true,
  });
}
