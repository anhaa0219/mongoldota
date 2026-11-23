/** Drizzle tables. All have Row Level Security on with no policies: only the server (DATABASE_URL) can read them. */

import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";
// Relative import: drizzle-kit loads this file without the "@/" alias.
import type { LiveSnapshot, LockedDraft } from "../types/live";
import type { RawFullMatch } from "../types/opendota-match";

/** One row per match: the complete OpenDota /matches/{id} response plus a few searchable columns. */
export const matches = pgTable(
  "matches",
  {
    matchId: bigint("match_id", { mode: "number" }).primaryKey(),
    parsed: boolean("parsed").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    durationS: integer("duration_s").notNull(),
    radiantWin: boolean("radiant_win").notNull(),
    data: jsonb("data").$type<RawFullMatch>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("matches_start_time_idx").on(table.startTime)],
).enableRLS();

/** Who played which hero in which match (every player with a public account id). */
export const playerMatches = pgTable(
  "player_matches",
  {
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    matchId: bigint("match_id", { mode: "number" })
      .notNull()
      .references(() => matches.matchId, { onDelete: "cascade" }),
    heroId: integer("hero_id").notNull(),
    playerSlot: integer("player_slot").notNull(),
    won: boolean("won").notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.matchId] }), index("player_matches_account_idx").on(table.accountId)],
).enableRLS();

/** The latest AI coach answer per player and kind ("stats-coach", "hero-picks"), so it refreshes at most every 12 hours. */
export const aiAdvice = pgTable(
  "ai_advice",
  {
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.kind] })],
).enableRLS();

/** Live Coach: one Game State Integration token per player (only its SHA-256 hash), with the Steam ID it was made for. */
export const gsiTokens = pgTable("gsi_tokens", {
  // Unlinking Steam removes the token made for that account (and, through it, the live data below).
  clerkUserId: text("clerk_user_id")
    .primaryKey()
    .references(() => steamLinks.clerkUserId, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  steamId: text("steam_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

/** Live Coach: the player's latest game state from Dota. A null snapshot means connected but not in a match. */
export const liveStates = pgTable("live_states", {
  clerkUserId: text("clerk_user_id")
    .primaryKey()
    .references(() => gsiTokens.clerkUserId, { onDelete: "cascade" }),
  matchId: text("match_id"),
  snapshot: jsonb("snapshot").$type<LiveSnapshot>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}).enableRLS();

/** Live Coach: the latest locked draft from the Draft page. */
export const lockedDrafts = pgTable("locked_drafts", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  draft: jsonb("draft").$type<LockedDraft>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}).enableRLS();

/** Live Coach: every tip the coach gave, per match. `plan` holds the item plan on "plan" tips. */
export const liveTips = pgTable(
  "live_tips",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id")
      .notNull()
      .references(() => gsiTokens.clerkUserId, { onDelete: "cascade" }),
    matchId: text("match_id").notNull(),
    clockSeconds: integer("clock_seconds").notNull(),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    plan: jsonb("plan").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("live_tips_user_match_idx").on(table.clerkUserId, table.matchId)],
).enableRLS();

/** Live Coach: one row per player and slot ("tip:<match>", "plan:<match>"), claimed atomically so two tabs never both ask the AI. */
export const liveCoachSlots = pgTable(
  "live_coach_slots",
  {
    clerkUserId: text("clerk_user_id")
      .notNull()
      .references(() => gsiTokens.clerkUserId, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.clerkUserId, table.slot] })],
).enableRLS();

/** Live Coach: one row per finished match whose memory went to Pinecone, claimed atomically so Dota's repeated post-game updates write it once. */
export const matchMemories = pgTable(
  "match_memories",
  {
    clerkUserId: text("clerk_user_id")
      .notNull()
      .references(() => gsiTokens.clerkUserId, { onDelete: "cascade" }),
    matchId: text("match_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.clerkUserId, table.matchId] })],
).enableRLS();

/** Every AI call that reached the provider, per player: kind, tokens when reported, and whether it worked. Read by the limits and the usage script. */
export const aiCalls = pgTable(
  "ai_calls",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    kind: text("kind").notNull(),
    /** Live Coach calls only. */
    matchId: text("match_id"),
    promptTokens: integer("prompt_tokens"),
    answerTokens: integer("answer_tokens"),
    ok: boolean("ok").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_calls_user_time_idx").on(table.clerkUserId, table.createdAt)],
).enableRLS();

/** The Steam account linked to each MongolDota (Clerk) account, so the link follows the player across devices. */
export const steamLinks = pgTable("steam_links", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  steamId: text("steam_id").notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
