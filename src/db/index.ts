/** The database connection (server only). Null when DATABASE_URL is not set: callers fall back to OpenDota. */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// Supabase's transaction pooler (port 6543) does not support prepared statements.
// connect_timeout: fail in 5 s (default 30 s) so an unreachable database never stalls a page;
// idle_timeout: close idle connections (also limits leaks from dev hot reloads).
export const db = url ? drizzle(postgres(url, { prepare: false, connect_timeout: 5, idle_timeout: 20 }), { schema }) : null;

export function hasDatabase(): boolean {
  return db !== null;
}
