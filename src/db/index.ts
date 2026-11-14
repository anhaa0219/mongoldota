/** The database connection (server only). Null when DATABASE_URL is not set: callers fall back to OpenDota. */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// Supabase's transaction pooler (port 6543) does not support prepared statements.
export const db = url ? drizzle(postgres(url, { prepare: false }), { schema }) : null;

export function hasDatabase(): boolean {
  return db !== null;
}
