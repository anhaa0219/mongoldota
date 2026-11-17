# Steam Link in the Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store the Steam link per Clerk user in Postgres so it follows the account across devices, migrating existing cookie links without re-linking.

**Architecture:** A `steam_links` table (server only). `getLinkedSteamId()` in `src/lib/linked-account.ts` stays the single read path for every page and route: it reads the row for the signed-in Clerk user, migrates a valid old cookie once, and falls back to the cookie only when the database is unavailable. The Steam callback, dev shortcut and unlink route write or delete the row.

**Tech Stack:** Next.js 16 route handlers and Server Components, Clerk `auth()`, Drizzle + Supabase Postgres, React `cache()`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-steam-link-in-db-design.md`

## Global Constraints

- AGENTS.md rules: no `any`, zod/validation on server input, files < 200 lines, friendly errors only, no console.
- **Do not `git commit`** (owner's rule).
- RLS on for `steam_links`, no policies (server only).
- Redirects: signed-out at the Steam callback → `/sign-in`; database save failure → `/?login=failed` (same as today's Steam failure).
- Cookie name and options unchanged (`SESSION_COOKIE`, `SESSION_COOKIE_OPTIONS`); link and unlink delete it.

## Review Focus

1. A player who linked Steam before this change (cookie only) must still be linked after it, with no re-link. Test: Task 2, `migrates a valid old cookie into the database`.
2. A database outage must not unlink anyone: fall back to the valid cookie. Test: Task 2, `falls back to the cookie when the database is unavailable`.
3. A second Clerk account on the same browser must not inherit the first account's cookie link once the first account has a row. A cookie is only migrated for an account with no row of its own. Test: Task 2, `keeps the account's own link over a cookie from someone else`.
4. Steam returning to the callback while signed out of Clerk must not save anything. Test: Task 3, `sends a signed-out player to sign-in and saves nothing`.
5. Unlink must remove the row, not just the cookie, or the link comes back on the next page. Test: Task 3, `unlink deletes the saved link`.

---

### Task 1: `steam_links` table and store

**Files:**
- Modify: `src/db/schema.ts` (append the table); generate the migration with `npx drizzle-kit generate --name steam_links`
- Create: `src/lib/steam-link-store.ts`
- Test: `src/lib/steam-link-store.test.ts`

**Interfaces:**
- Produces:
  - Table `steamLinks`: `clerk_user_id` text PK, `steam_id` text not null, `linked_at` timestamptz not null default now; `.enableRLS()`.
  - `type StoredLink = { ok: true; steamId: string | null } | { ok: false }`. Here `ok: false` means the database is unavailable or errored.
  - `getSteamLink(clerkUserId: string): Promise<StoredLink>`. No database configured → `{ ok: false }`.
  - `saveSteamLink(clerkUserId: string, steamId: string): Promise<boolean>`: upsert, true when saved.
  - `deleteSteamLink(clerkUserId: string): Promise<void>`: errors are swallowed.

- [ ] **Step 1: Failing test.** Mock `@/db` as `{ db: null }`. Tests:
  - `reports the database as unavailable without one`: `getSteamLink("u")` → `{ ok: false }`.
  - `does not save without a database`: `saveSteamLink("u","7656…")` → false.
- [ ] **Step 2: Run** `npx vitest run src/lib/steam-link-store.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the table, run `npx drizzle-kit generate --name steam_links`, check that the SQL creates `steam_links` with RLS, and implement the store in the style of `src/lib/live-store.ts`.
- [ ] **Step 4: Run** the test file. Expected: PASS.

### Task 2: Read path in `linked-account.ts`

**Files:**
- Create: `src/lib/steam-link.ts` (pure decision)
- Modify: `src/lib/linked-account.ts`
- Test: `src/lib/steam-link.test.ts`, `src/lib/linked-account.test.ts`

**Interfaces:**
- Consumes: `getSteamLink`, `saveSteamLink`, `StoredLink` (Task 1); `readSession`, `SESSION_COOKIE` (`steam-auth`).
- Produces:
  - `resolveSteamLink(stored: StoredLink, cookieSteamId: string | null): { steamId: string | null; migrate: boolean }`:
    - stored row → it, no migrate
    - `ok` with no row and a cookie → the cookie, migrate
    - `ok` with no row and no cookie → null
    - `ok: false` → the cookie, no migrate
  - `getLinkedSteamId(): Promise<string | null>`: wrapped in React `cache()`. Signed out of Clerk → null. Migrates by calling `saveSteamLink`. `getLinkedAccountId()` is unchanged on top of it. Update the file's header comment: "per Clerk account (database)".

- [ ] **Step 1: Failing tests** (`steam-link.test.ts`):
  - `uses the saved link`: `({ ok: true, steamId: "A" }, "B")` → `{ steamId: "A", migrate: false }`
  - `migrates a valid old cookie into the database`: `({ ok: true, steamId: null }, "B")` → `{ steamId: "B", migrate: true }`
  - `is not linked without a row or cookie` → `{ steamId: null, migrate: false }`
  - `falls back to the cookie when the database is unavailable`: `({ ok: false }, "B")` → `{ steamId: "B", migrate: false }`
  - `keeps the account's own link over a cookie from someone else`: `({ ok: true, steamId: "A" }, "B")` → `"A"`
- [ ] **Step 2: Failing test** (`linked-account.test.ts`). Mock `@clerk/nextjs/server` `auth`, `next/headers` `cookies`, and `@/lib/steam-link-store`. Tests:
  - `saves the old cookie for an account without a link`: `saveSteamLink` is called with `("user_1", cookie steamId)`.
  - `is not linked when signed out` → null, and the store is not called.
- [ ] **Step 3: Run** `npx vitest run src/lib/steam-link.test.ts src/lib/linked-account.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement** both files.
- [ ] **Step 5: Run** the same command. Expected: PASS.

### Task 3: Link and unlink routes

**Files:**
- Modify: `src/app/api/auth/steam/callback/route.ts`, `src/app/api/auth/steam/route.ts` (dev shortcut), `src/app/api/auth/steam/logout/route.ts`
- Test: `src/app/api/auth/steam/callback/route.test.ts` (update), `src/app/api/auth/steam/logout/route.test.ts` (new)

**Interfaces:**
- Consumes: `saveSteamLink`, `deleteSteamLink` (Task 1); Clerk `auth()`.
- Behaviour:
  - **Callback**:
    1. Verify with Steam (unchanged); on failure → `/?login=failed`.
    2. `auth()`: no user → `${origin}/sign-in`.
    3. `saveSteamLink`: false → `/?login=failed`.
    4. Otherwise → `${origin}/`, with the old cookie deleted.
  - **Dev shortcut:** same save and cookie delete for `DEV_STEAM_ID`; without a Clerk user, redirect to `/sign-in`.
  - **Logout:** `auth()`; delete the row if signed in; delete the cookie; 303 → `/`, as today.

- [ ] **Step 1: Update the callback test.** Mock `@clerk/nextjs/server` and `@/lib/steam-link-store`. Replace the cookie-value assertions:
  - `links Steam to the signed-in account and goes home`: location `https://mongoldota.example/`, and `saveSteamLink` called with `("user_1", "76561197960265729")`.
  - `sends a failed Steam check back with login=failed` (kept).
  - `sends a signed-out player to sign-in and saves nothing`: location `https://mongoldota.example/sign-in`, `saveSteamLink` not called.
  - `reports login=failed when the link cannot be saved`: `saveSteamLink` → false.

  Remove the AUTH_SECRET test: the callback no longer signs a cookie.
- [ ] **Step 2: New logout test:** `unlink deletes the saved link`: `deleteSteamLink` called with `"user_1"`, status 303.
- [ ] **Step 3: Run** `npx vitest run src/app/api/auth/steam`. Expected: FAIL.
- [ ] **Step 4: Implement** the three routes.
- [ ] **Step 5: Verify.**
  - `npx vitest run src/app/api/auth/steam` → PASS.
  - `npm test` → all pass.
  - `npm run lint` and `npx tsc --noEmit` → clean.
  - `npm run build` → succeeds.
- [ ] **Step 6: Owner step.** Run `npm run db:migrate` to apply `steam_links`. Report it in the final message; do not run it.
