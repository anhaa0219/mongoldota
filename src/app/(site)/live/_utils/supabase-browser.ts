/** Supabase in the browser, signed in with the player's Clerk session (Supabase third-party auth). Read-only by RLS. */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Null when the Supabase env vars are missing: Live Coach then falls back to polling. */
export function createBrowserSupabase(getToken: () => Promise<string | null>): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { accessToken: getToken });
}
