/**
 * Searches the coaches' knowledge base (Pinecone namespace "game") for what a prompt is about, and turns the
 * hits into the prompt's REFERENCE block (server only). Never throws; no hits means the prompt goes without it.
 */

import { GAME_NAMESPACE, searchText } from "./pinecone";

const MAX_REFERENCE_CHARS = 2500;
/** Split so the other heroes (who killed the player, say) are not crowded out by the player's own hero. */
const OWN_HERO_HITS = 3;
const OTHER_HERO_HITS = 3;
const ITEM_HITS = 3;
const RULE_HITS = 2;

export const REFERENCE_RULE =
  "Only state ability, item, talent, timing or mechanic facts found under REFERENCE or the facts above. If you are not sure, give the advice without the specific number or effect.";

interface KnowledgeQuery {
  query: string;
  /** Hero slugs in this game, the player's own first. */
  heroKeys: string[];
  /** Item keys the moment is about; none skips the item search. */
  itemKeys: string[];
}

/** Hits about the player's hero, the other heroes, these items, then game-wide rules; whole records up to the size cap. */
export async function searchGameKnowledge({ query, heroKeys, itemKeys }: KnowledgeQuery, timeoutMs: number): Promise<string[]> {
  const search = (topK: number, filter: Parameters<typeof searchText>[2]["filter"]) => searchText(GAME_NAMESPACE, query, { timeoutMs, topK, filter });
  const [ownHero, ...otherHeroes] = heroKeys;
  const results = await Promise.all([
    ownHero ? search(OWN_HERO_HITS, { hero: { $eq: ownHero } }) : [],
    otherHeroes.length > 0 ? search(OTHER_HERO_HITS, { hero: { $in: otherHeroes } }) : [],
    itemKeys.length > 0 ? search(ITEM_HITS, { item: { $in: itemKeys } }) : [],
    search(RULE_HITS, { source: { $in: ["mechanic", "general"] } }),
  ]);

  const kept: string[] = [];
  let size = 0;
  for (const hit of new Set(results.flat())) {
    if (size + hit.length > MAX_REFERENCE_CHARS) continue;
    kept.push(hit);
    size += hit.length;
  }
  return kept;
}

/** The REFERENCE block of a prompt; empty when nothing was found. */
export function referenceLines(hits: string[]): string[] {
  if (hits.length === 0) return [];
  return ["REFERENCE (checked game facts for the current patch):", ...hits.map((hit) => `- ${hit}`), REFERENCE_RULE];
}
