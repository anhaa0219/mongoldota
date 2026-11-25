/** The database connection (server only). Null when DATABASE_URL is not set: callers fall back to OpenDota. */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// Supabase's transaction pooler (port 6543) does not support prepared statements.
// connect_timeout: fail in 5 s (default 30 s) so an unreachable database never stalls a page;
// idle_timeout: close idle connections (also limits leaks from dev hot reloads).
export const db = url ? drizzle(postgres(url, { prepare: false, connect_timeout: 5, idle_timeout: 20 }), { schema }) : null;

/** How long one query may take before the caller gives up and falls back. */
const QUERY_TIMEOUT_MS = 4_000;

/**
 * Rejects when a query takes longer than 4 s. The driver has no query time limit, and on Vercel a pooled connection
 * can go dead while the server sleeps: a query sent on it then waits forever, and so does every page waiting on it.
 */
export function withQueryTimeout<T>(query: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Database query took over ${QUERY_TIMEOUT_MS} ms`)), QUERY_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve(query), timeout]).finally(() => clearTimeout(timer));
}
