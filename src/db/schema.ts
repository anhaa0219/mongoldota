/** Drizzle tables. Both have Row Level Security on with no policies: only the server (DATABASE_URL) can read them. */

import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
// Relative import: drizzle-kit loads this file without the "@/" alias.
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
