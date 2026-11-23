/** RAG shapes: records stored in Pinecone and the filters used to search them. */

/** "general": game-wide patch notes (map, neutral items, hero stats); "mechanic": the owner-checked mechanics list. */
export type RagSource = "ability" | "talent" | "facet" | "aghs" | "item" | "patch" | "general" | "mechanic" | "memory";

/** One Pinecone record. `text` is what Pinecone embeds; every other field is metadata (undefined fields are left out). */
export interface RagRecord {
  id: string;
  text: string;
  source: RagSource;
  /** Hero slug without "npc_dota_hero_" (e.g. "viper"). */
  hero?: string;
  /** Item key without "item_" (e.g. "black_king_bar"). */
  item?: string;
  /** Patch key as OpenDota writes it (e.g. "7_42"). */
  patch?: string;
  /** Match memory only: enemy hero slugs. */
  enemies?: string[];
  /** Match memory only. */
  matchId?: string;
  /** Match memory only: milliseconds since epoch. */
  endedAt?: number;
}

export type RagFilter = Record<string, { $eq: string } | { $ne: string } | { $in: string[] }>;
