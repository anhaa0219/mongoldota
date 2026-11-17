# Live Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Location placeholder with a Live Coach page that shows the player's own Dota game live (via Valve's Game State Integration) and gives AI tips at deaths, kills, gold-ready moments, item buys and every few game-minutes, grounded in the locked draft and OpenDota facts.

**Architecture:**
- Dota POSTs GSI JSON to `/api/gsi`. The route authenticates by a per-user token, maps the payload to a small `LiveSnapshot`, and upserts one `live_states` row per Clerk user.
- The browser subscribes to its own rows through Supabase Realtime (Clerk session token, RLS select-only), and falls back to polling `/api/live/state`.
- The page detects events with pure functions and asks `/api/live/coach`. That route reads the authoritative state and locked draft from the database, enforces the tip gap, calls Hugging Face, and saves the tip.

**Tech Stack:** Next.js 16 (App Router, Cache Components), React 19, Clerk, Supabase Postgres + Drizzle, `@supabase/supabase-js` (Realtime), `fflate` (zip), zod, Vitest, Hugging Face router (`src/lib/hf.ts`).

**Spec:** `docs/superpowers/specs/2026-11-17-live-coach-design.md`

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/01-app/` (route handlers, `after`, `connection`, Suspense / Cache Components) before writing route or page code. This Next.js differs from older versions.
- AGENTS.md rules apply to every file:
  - no `any`; zod-validate every server input
  - files under 200 lines (blank lines and comments not counted); one component per file
  - friendly error text only, never raw errors; no `console.*`
  - `===` only; `const` unless reassigned
  - every new env var name goes in `.env.example`
- **Do not `git commit`.** The project owner commits. Every task ends with lint + tests, not a commit.
- Server writes go through Drizzle and `DATABASE_URL` only. The browser never writes to Supabase.
- RLS stays on for every table. Browser read access is select-only, `clerk_user_id = auth.jwt()->>'sub'`.
- Env names (exact): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Timing values (exact):
  - merge window 10 s
  - automatic tip gap 90 s (wall time)
  - look-ahead after 240 game-seconds without a tip
  - Ask coach now needs 15 s since the last tip
  - the item plan comes once per match
  - "item bought" counts items costing ≥ 1,000 gold
  - GSI writes at most once per second; unchanged state touches `updated_at` every 20 s
- GSI config values (exact): `throttle "1.0"`, `buffer "0.1"`, `heartbeat "30.0"`, `timeout "5.0"`; data sections `provider`, `map`, `player`, `hero`, `abilities`, `items`. File path inside the zip: `gamestate_integration/gamestate_integration_mongoldota.cfg`.
- Live tips use a new quick model call: effort `"low"`, `maxTokens` 1500, timeout 30 s. The draft page's 12-tip advice is unchanged.
- Copy is English. Error strings reuse the draft coach's wording where it applies (`"The coach could not answer. Try again."`, `"Advice is not set up yet (HF_API_KEY is missing)."`, `"Hugging Face has no credits left for advice."`).

## Review Focus

1. **A purchase made away from the shop goes to the stash.** It must still count as "item bought" (`owned` includes `stash0-5`). Test: Task 2, `counts an item bought into the stash`.
2. **Two open tabs or devices, or a double click, must not create two tips.** The server applies the gap per user and match. Test: Task 8, `refuses a second automatic tip inside 90 s`.
3. **Spectating a friend or watching a replay must not write their hero as "your game".** Payloads whose `player.steamid` is absent or differs give no snapshot. Test: Task 5, `stores no snapshot for a spectator payload`.
4. **Starting a new match with the page still open must not fire false death or kill events.** The match id changes, so there are no events and the plan is asked again. Test: Task 2, `returns no events when the match changes`.
5. **A paused game must not produce look-ahead spam.** Look-ahead uses the game clock, which stops while paused. Test: Task 3, `does not look ahead while the game clock is frozen`.

---

### Task 1: Live types and GSI → `LiveSnapshot` mapping

**Files:**
- Create: `src/types/live.ts`
- Create: `src/lib/gsi.ts`
- Test: `src/lib/gsi.test.ts`

**Interfaces:**
- Produces (`src/types/live.ts`):
```ts
export interface LiveSnapshot {
  matchId: string;
  clockSeconds: number;            // map.clock_time (negative before the horn)
  heroId: number;
  heroKey: string;                 // "viper" (npc_dota_hero_ prefix removed)
  level: number; alive: boolean; respawnSeconds: number;
  kills: number; deaths: number; assists: number;
  lastHits: number; denies: number;
  gold: number; gpm: number; xpm: number;
  inventory: (string | null)[];    // slot0..slot5 item keys without "item_", null = empty; always length 6
  owned: string[];                 // every item key in slot0..slot8, stash0..stash5, neutral0
}
export type LiveEventKind = "death" | "kill" | "gold" | "item" | "lookahead" | "asked" | "plan";
export interface LiveEvent { kind: LiveEventKind; detail: string }   // detail: item key, kill count, or ""
export interface LiveTip { id: number; matchId: string; clockSeconds: number; kind: LiveEventKind; text: string; plan: string[] | null; createdAt: number }
export interface LockedDraft { side: Side; myHeroId: number; allies: PlacedHero[]; enemies: PlacedHero[] }
export interface LiveFeed { snapshot: LiveSnapshot | null; updatedAt: number | null }
```
- Produces (`src/lib/gsi.ts`):
  - `parseGsiPayload(body: unknown): GsiPayload | null`. A zod schema where every section is optional and has `.passthrough()`. `auth.token` is a required string.
  - `toLiveSnapshot(payload: GsiPayload, steamId: string): LiveSnapshot | null`
  - `shouldWrite(lastUpdatedAt: number | null, nowMs: number, changed: boolean): "write" | "touch" | "skip"`

- [ ] **Step 1: Write the failing tests** in `src/lib/gsi.test.ts`, with a fixture payload in the test file:
  - Viper: `hero.id` 47, `hero.name` "npc_dota_hero_viper", level 16
  - `map.matchid` "7400000001", `map.clock_time` 600, `map.game_state` "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS"
  - `player.steamid` "76561198000000001", kills 7, deaths 3, assists 5, gold 1840, gpm 512
  - `items.slot0.name` "item_dragon_lance", `slot1` "empty", `stash0.name` "item_ultimate_orb"
  - `auth.token` "t0k"
  - `parses a valid payload` and `rejects a payload without auth.token` → `null`.
  - `maps the player's own game`: `toLiveSnapshot(fixture, "76561198000000001")` → `heroKey` "viper", `clockSeconds` 600, `inventory[0]` "dragon_lance", `inventory[1]` null, `inventory.length` 6, `owned` contains "ultimate_orb".
  - `returns null for another player's steamid`, `returns null without player.steamid`, `returns null in HERO_SELECTION`, `returns null in POST_GAME`.
  - `keeps a negative clock before the horn` (`PRE_GAME`, clock_time −45 → −45).
  - `shouldWrite`:
    - `(null, 0, true)` → "write"
    - `(0, 500, true)` → "skip"
    - `(0, 1200, true)` → "write"
    - `(0, 5000, false)` → "skip"
    - `(0, 21000, false)` → "touch"
- [ ] **Step 2: Run** `npx vitest run src/lib/gsi.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/types/live.ts` and `src/lib/gsi.ts`. A snapshot is produced only in `DOTA_GAMERULES_STATE_PRE_GAME` and `DOTA_GAMERULES_STATE_GAME_IN_PROGRESS`, with `hero.id > 0`, `map.matchid` present, and `player.steamid === steamId`. Item `"empty"` becomes `null`.
- [ ] **Step 4: Run** `npx vitest run src/lib/gsi.test.ts`. Expected: PASS.

### Task 2: Event detection and the item plan target

**Files:**
- Create: `src/lib/live-events.ts`
- Test: `src/lib/live-events.test.ts`

**Interfaces:**
- Consumes: `LiveSnapshot`, `LiveEvent` (Task 1).
- Produces:
  - `MIN_ITEM_COST = 1000`
  - `boughtItems(before: string[], after: string[]): string[]`: multiset difference (two Wraith Bands → one new one counts).
  - `nextPlannedItem(plan: string[], owned: string[]): string | null`
  - `detectEvents(prev: LiveSnapshot | null, next: LiveSnapshot, plan: string[] | null, costs: Map<string, number>): LiveEvent[]`

- [ ] **Step 1: Write the failing tests.** Costs map: `dragon_lance` 1900, `tango` 90, `hurricane_pike` 4450, `ultimate_orb` 2800.
  - `reports a death`: deaths 3→4 → `[{ kind: "death", detail: "" }]`.
  - `reports kills once with the count`: kills 7→9 → one `{ kind: "kill", detail: "2" }`.
  - `reports a bought item`: owned gains `dragon_lance` → `{ kind: "item", detail: "dragon_lance" }`.
  - `counts an item bought into the stash`: `ultimate_orb` appears only in `owned` (stash) → item event.
  - `ignores cheap items`: `tango` gained → no event.
  - `reports gold ready when crossing the next item's cost`: plan `["dragon_lance","hurricane_pike"]`, owned has `dragon_lance`, gold 4300→4500 → `{ kind: "gold", detail: "hurricane_pike" }`.
  - `stays quiet when gold was already enough`: gold 4500→4600 → no gold event.
  - `returns no events when the match changes` (different `matchId`) and `returns no events without a previous snapshot`.
- [ ] **Step 2: Run** `npx vitest run src/lib/live-events.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the four exports. Item events skip keys whose cost is unknown or below `MIN_ITEM_COST`. Gold fires only when `prev.gold < cost <= next.gold`.
- [ ] **Step 4: Run** the test file. Expected: PASS.

### Task 3: Coach timing (client and server rules)

**Files:**
- Create: `src/lib/live-coach-timing.ts`
- Test: `src/lib/live-coach-timing.test.ts`

**Interfaces:**
- Consumes: `LiveEvent`, `LiveEventKind` (Task 1).
- Produces:
```ts
export const MERGE_WINDOW_MS = 10_000; export const MIN_GAP_MS = 90_000;
export const LOOKAHEAD_GAME_SECONDS = 240; export const ASK_GAP_MS = 15_000;
export interface CoachClock { pending: LiveEvent[]; pendingSince: number | null; lastTipAt: number | null; lastTipClock: number | null }
export const IDLE_CLOCK: CoachClock;
export function stepCoach(state: CoachClock, input: { nowMs: number; clockSeconds: number; events: LiveEvent[] }): { state: CoachClock; fire: LiveEvent[] | null };
export function markSpoke(state: CoachClock, nowMs: number, clockSeconds: number): CoachClock;
export function canSpeak(kinds: LiveEventKind[], lastTipAt: number | null, nowMs: number): boolean;
```

- [ ] **Step 1: Write the failing tests.**
  - `waits for the merge window`: event at 0 → `fire` null at 9 999 ms, and fires `[event]` at 10 000 ms.
  - `merges events inside the window`: death at 0 and kill at 4 000 → one fire with both.
  - `holds events until the gap has passed`: after `markSpoke` at t, an event at t+30 000 fires at t+90 000, not before.
  - `sets the look-ahead baseline on the first clock`: `lastTipClock` null and clock 300 → no fire, and `state.lastTipClock` becomes 300.
  - `looks ahead after 240 quiet game-seconds`: baseline 300, clock 540, nothing pending, gap passed → `fire` `[{ kind: "lookahead", detail: "" }]`.
  - `does not look ahead while the game clock is frozen`: clock stays at 400 for 10 wall-minutes → no fire.
  - `canSpeak`:
    - `(["death"], now-60 000, now)` → false
    - `(["death"], now-91 000, now)` → true
    - `(["asked"], now-10 000, now)` → false
    - `(["asked"], now-16 000, now)` → true
    - `(["plan"], now-1, now)` → true
    - `(["death"], null, now)` → true
- [ ] **Step 2: Run** `npx vitest run src/lib/live-coach-timing.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the exports. `stepCoach` appends events to `pending` and sets `pendingSince` on the first one. It fires when the merge window has elapsed **and** the gap has elapsed (or there has been no tip yet). Look-ahead is only considered when `pending` is empty.
- [ ] **Step 4: Run** the test file. Expected: PASS.

### Task 4: Database tables, RLS and Realtime publication, and store functions

**Files:**
- Modify: `src/db/schema.ts` (append four tables)
- Create: `src/db/migrations/<generated>_live_coach.sql` (via `npm run db:generate`)
- Create: `src/db/migrations/<generated>_live_coach_rls.sql` (via `npx drizzle-kit generate --custom --name live_coach_rls`)
- Create: `src/lib/live-store.ts` (tokens + live state)
- Create: `src/lib/live-tips-store.ts` (tips + locked drafts)
- Test: `src/lib/live-store.test.ts`

**Interfaces:**
- Consumes: `LiveSnapshot`, `LiveTip`, `LockedDraft`, `LiveEventKind` (Task 1).
- Produces (tables; Drizzle names are camelCase, SQL names snake_case):
  - `gsiTokens`: `clerk_user_id` text PK, `token_hash` text not null unique, `steam_id` text not null, `created_at` timestamptz default now.
  - `liveStates`: `clerk_user_id` text PK, `match_id` text null, `snapshot` jsonb `$type<LiveSnapshot>()` null, `updated_at` timestamptz not null.
  - `lockedDrafts`: `clerk_user_id` text PK, `draft` jsonb `$type<LockedDraft>()` not null, `updated_at` timestamptz not null.
  - `liveTips`: `id` serial PK, `clerk_user_id` text not null, `match_id` text not null, `clock_seconds` integer not null, `kind` text not null, `text` text not null, `plan` jsonb `$type<string[]>()` null, `created_at` timestamptz default now; index on (`clerk_user_id`, `match_id`).
  - All four tables call `.enableRLS()`.
- Produces (store functions; each returns null, `[]` or `false` and does nothing when `db` is null; database errors are caught and treated the same way):
  - `live-store.ts`:
    - `hashToken(token: string): string` (sha256 hex)
    - `createGsiToken(clerkUserId: string, steamId: string): Promise<string | null>`: 32 random bytes, base64url; upsert replaces the old token.
    - `findGsiOwner(token: string): Promise<{ clerkUserId: string; steamId: string } | null>`
    - `getGsiSteamId(clerkUserId: string): Promise<string | null>`
    - `hasGsiToken(clerkUserId: string): Promise<boolean>`
    - `getLiveRow(clerkUserId: string): Promise<{ snapshot: LiveSnapshot | null; updatedAt: Date } | null>`
    - `writeLiveRow(clerkUserId: string, snapshot: LiveSnapshot | null): Promise<void>`
    - `touchLiveRow(clerkUserId: string): Promise<void>`
  - `live-tips-store.ts`:
    - `saveLockedDraft(clerkUserId: string, draft: LockedDraft): Promise<void>`
    - `getLockedDraft(clerkUserId: string): Promise<LockedDraft | null>`
    - `addTip(clerkUserId: string, tip: Omit<LiveTip, "id" | "createdAt">): Promise<LiveTip | null>`
    - `getTips(clerkUserId: string, matchId: string, limit?: number): Promise<LiveTip[]>` (newest first, default 30)
    - `lastTipAt(clerkUserId: string, matchId: string): Promise<number | null>`
    - `getPlan(clerkUserId: string, matchId: string): Promise<string[] | null>`

- [ ] **Step 1: Write the failing test** `src/lib/live-store.test.ts`:
  - `hashes tokens with sha256`: `hashToken("abc")` equals `"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"`.
  - `returns null without a database`: mock `@/db` as `{ db: null }`, then `findGsiOwner("x")` → null and `createGsiToken("u","s")` → null.
- [ ] **Step 2: Run** `npx vitest run src/lib/live-store.test.ts`. Expected: FAIL.
- [ ] **Step 3: Add the tables** to `src/db/schema.ts`, run `npm run db:generate`, and check that the generated SQL creates the four tables.
- [ ] **Step 4: Write the custom migration.** Run `npx drizzle-kit generate --custom --name live_coach_rls` and fill it with:
```sql
create policy "own live state" on live_states for select to authenticated using (clerk_user_id = (auth.jwt() ->> 'sub'));
create policy "own locked draft" on locked_drafts for select to authenticated using (clerk_user_id = (auth.jwt() ->> 'sub'));
create policy "own live tips" on live_tips for select to authenticated using (clerk_user_id = (auth.jwt() ->> 'sub'));
alter publication supabase_realtime add table live_states, live_tips;
```
- [ ] **Step 5: Implement** `live-store.ts` and `live-tips-store.ts` with the signatures above, following the try/catch style of `src/lib/timed-advice.ts`.
- [ ] **Step 6: Run** `npx vitest run src/lib/live-store.test.ts` (PASS) and `npm run lint` (no errors). Do **not** run `db:migrate`; Task 9 does that together with the dashboard setup.

### Task 5: `/api/gsi` receiver

**Files:**
- Create: `src/app/api/gsi/route.ts`
- Test: `src/app/api/gsi/route.test.ts`

**Interfaces:**
- Consumes: `parseGsiPayload`, `toLiveSnapshot`, `shouldWrite` (Task 1); `findGsiOwner`, `getLiveRow`, `writeLiveRow`, `touchLiveRow` (Task 4).
- Produces: `POST(request: Request): Promise<Response>`. Status codes: 200 `{ ok: true }`; 401 (unknown token); 400 (invalid); 413 (too big). Bodies over **64 KB** are rejected; check the `content-length` header first, then the text length.

- [ ] **Step 1: Write the failing tests.** Mock `@/lib/live-store` with an in-memory owner and row, using the Task 1 fixture as JSON.
  - `rejects an unknown token with 401` and writes nothing.
  - `rejects a body over 64 KB with 413`.
  - `rejects invalid JSON with 400`.
  - `stores the player's snapshot`: owner steamId "76561198000000001" → `writeLiveRow` called with a snapshot whose `heroKey` is "viper".
  - `stores no snapshot for a spectator payload`: payload without `player.steamid` → `writeLiveRow(user, null)`.
  - `throttles writes inside one second`: the row was updated 300 ms ago and the snapshot changed → no write, 200.
- [ ] **Step 2: Run** `npx vitest run src/app/api/gsi/route.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the route.** "Changed" means `JSON.stringify` of the old and new snapshot differ. It never calls the AI, never reads cookies, and gives no detail on 401.
- [ ] **Step 4: Run** the test file. Expected: PASS.

### Task 6: Setup folder download (`/api/live/setup`)

**Files:**
- Create: `src/lib/gsi-config.ts`
- Create: `src/app/api/live/setup/route.ts`
- Modify: `package.json` (add `fflate` ^0.8)
- Test: `src/lib/gsi-config.test.ts`

**Interfaces:**
- Consumes: `createGsiToken` (Task 4); `getLinkedSteamId` (`src/lib/linked-account.ts`); `siteOrigin` (`src/lib/steam-auth.ts`).
- Produces:
  - `buildGsiConfig(siteUrl: string, token: string): string`: the Valve KeyValues text with `"uri" "<siteUrl>/api/gsi"`, the exact Global Constraints values, an `"auth" { "token" "<token>" }` block, and the six data sections set to `"1"`.
  - `setupZip(configText: string): Uint8Array`: uses `fflate.zipSync` with the single path from Global Constraints.
  - `POST(request: Request)`: Clerk `auth()` required (401 `"Sign in first."`). Linked Steam required (400 `"Link Steam first."`). No database (503 `"Live Coach is not set up yet."`). Success: 200 `application/zip` with `content-disposition: attachment; filename="mongoldota-dota-setup.zip"`.

- [ ] **Step 1: Write the failing tests.**
  - `writes the uri, token and throttle`: `buildGsiConfig("https://mongoldota.example", "abc")` contains `"uri"` + `"https://mongoldota.example/api/gsi"`, `"token"` + `"abc"`, `"throttle"` + `"1.0"`, and `"items"` + `"1"`.
  - `zips the config into the gamestate_integration folder`: `unzipSync(setupZip("x"))` has exactly the key `gamestate_integration/gamestate_integration_mongoldota.cfg` with content `"x"`.
- [ ] **Step 2: Run** `npm install fflate@^0.8`, then `npx vitest run src/lib/gsi-config.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `gsi-config.ts` and the route. The site URL is `siteOrigin(new URL(request.url).origin)`.
- [ ] **Step 4: Run** the test file. Expected: PASS.

### Task 7: Save the locked draft to Supabase

**Files:**
- Create: `src/app/api/draft/lock/route.ts`
- Create: `src/lib/use-locked-draft-sync.ts`
- Modify: `src/components/draft/LockScreen.tsx` (one hook call)
- Test: `src/app/api/draft/lock/route.test.ts`

**Interfaces:**
- Consumes: `saveLockedDraft` (Task 4); `LockedDraft` (Task 1); the `placedHero` zod shape (copy it from `src/app/api/draft/advice/route.ts`).
- Produces:
  - `POST(request)`: body `{ side: "radiant" | "dire", myHeroId, allies (1–5 PlacedHero), enemies (1–5 PlacedHero) }`. Returns 401 when signed out. Returns 400 (`"Pick your hero, positions, and at least one enemy."`) when invalid or when `myHeroId` is not in `allies`. Otherwise 200 `{ ok: true }`.
  - `useLockedDraftSync(draft: LockedDraft | null): void`: POSTs 800 ms after the draft last changed (keyed by `JSON.stringify(draft)`), ignores failures, and skips null.
- In `LockScreen`: call it with `{ side: mySide, myHeroId, allies: placed(myTeam, positions[mySide]), enemies: placed(enemyTeam, positions[enemySide]) }` when `myHeroId !== null`, else `null`.

- [ ] **Step 1: Write the failing tests:** `rejects signed-out requests with 401`; `rejects a hero that is not on the player's team with 400`; `saves a valid draft` (`saveLockedDraft` called with the user id and body).
- [ ] **Step 2: Run** `npx vitest run src/app/api/draft/lock/route.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the route, the hook, and the `LockScreen` call. `LockScreen` must stay under 200 lines.
- [ ] **Step 4: Run** the test file (PASS) and `npm run lint`.

### Task 8: Coach prompts, quick model, `/api/live/coach`

**Files:**
- Create: `src/lib/live-coach-prompt.ts`
- Modify: `src/lib/hf.ts` (add `askQuickModel`)
- Create: `src/app/api/live/coach/route.ts`
- Test: `src/lib/live-coach-prompt.test.ts`, `src/app/api/live/coach/route.test.ts`

**Interfaces:**
- Consumes:
  - `LiveSnapshot`, `LiveEvent`, `LiveEventKind`, `LiveTip` (Task 1)
  - `canSpeak` (Task 3)
  - `getLiveRow`, `getGsiSteamId` (Task 4; the Steam ID gives the Dota account id for personal records)
  - `getLockedDraft`, `addTip`, `getTips`, `lastTipAt`, `getPlan` (Task 4)
  - `gatherAdviceFacts` (`src/lib/draft-advice-facts.ts`), `getItemIndex`, `getDraftHeroes`, `dotaAccountId`
- Produces:
  - `askQuickModel(prompt: string): Promise<ModelResult>`, using the Global Constraints settings.
  - `buildLiveTipPrompt(input: { snapshot: LiveSnapshot; heroName: string; events: LiveEvent[]; facts: AdviceFacts | null; itemName: (key: string) => string; plan: string[] | null; recentTips: string[] }): string`
  - `parseLiveTip(text: string): string | null`: first non-empty paragraph, markdown stripped, at most 300 characters; null if empty.
  - `buildItemPlanPrompt(input: { snapshot: LiveSnapshot; heroName: string; facts: AdviceFacts | null; itemName: (key: string) => string }): string`. It asks for a JSON array of 4–6 item keys.
  - `parseItemPlan(text: string, known: Set<string>): string[]`: takes the outermost `[...]`, keeps known keys, dedupes, at most 6.
  - `POST(request)`:
    - Body `{ kinds: LiveEventKind[] (1–6), details?: string[] }`. Events are `kinds.map((kind, i) => ({ kind, detail: details?.[i] ?? "" }))`; `useLiveCoach` sends them in that shape.
    - 401 when signed out.
    - 409 `"Start a match first."` when there's no snapshot or `updatedAt` is older than 2 minutes.
    - 429 `{ skipped: true }` when `canSpeak` is false.
    - On AI failure, the draft coach's messages with 502/503.
    - 200 `{ tip: LiveTip }`.
    - `facts` is only gathered when the locked draft's `myHeroId === snapshot.heroId` (otherwise null).
    - `"plan"` returns the existing plan tip if this match already has one.

- [ ] **Step 1: Write the failing prompt tests.**
  - The prompt includes `"Viper"`, `"10:00"`, `"K 7 / D 3 / A 5"` and a line per event (`"died"`, `"bought Dragon Lance"`).
  - With facts, it includes enemy hero names; without facts, it doesn't mention "draft".
  - It includes the recent tips under "Do not repeat".
  - `parseLiveTip("**Push mid now.**\n\nMore")` → `"Push mid now."`; `parseLiveTip("  ")` → null.
  - `parseItemPlan('Plan: ["dragon_lance","fake","dragon_lance","hurricane_pike"]', known)` → `["dragon_lance","hurricane_pike"]`.
- [ ] **Step 2: Write the failing route tests** (mock the stores, `askQuickModel` and `gatherAdviceFacts`):
  - `rejects signed-out requests with 401`
  - `answers 409 when no match is live`
  - `refuses a second automatic tip inside 90 s` (`lastTipAt` = now−30 000 → 429, model not called)
  - `saves and returns a tip` (`addTip` called with kind "death" and the parsed text)
  - `returns the existing plan for this match`
- [ ] **Step 3: Run** `npx vitest run src/lib/live-coach-prompt.test.ts src/app/api/live/coach/route.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement** `askQuickModel`, the prompt module and the route. The tip's `kind` is the first entry of `kinds`, `matchId` comes from the snapshot, and `clockSeconds` comes from the snapshot.
- [ ] **Step 5: Run** the same command. Expected: PASS. Then run `npm run lint`.

### Task 9: Realtime feed (browser client, fallback route, dashboard setup)

**Files:**
- Modify: `package.json` (add `@supabase/supabase-js` ^2)
- Modify: `.env.example` (two names, with a comment on where to find them)
- Create: `src/lib/live-rows.ts` (pure mappers)
- Create: `src/lib/supabase-browser.ts`
- Create: `src/lib/use-live-feed.ts`
- Create: `src/app/api/live/state/route.ts`
- Test: `src/lib/live-rows.test.ts`

**Interfaces:**
- Consumes: `getLiveRow`, `getTips` (Task 4); `LiveFeed`, `LiveTip` (Task 1).
- Produces:
  - `rowToFeed(row: { snapshot: LiveSnapshot | null; updated_at: string }): LiveFeed` and `rowToTip(row: { id: number; match_id: string; clock_seconds: number; kind: string; text: string; plan: string[] | null; created_at: string }): LiveTip | null` (null for an unknown kind).
  - `createBrowserSupabase(getToken: () => Promise<string | null>): SupabaseClient | null`: uses the `accessToken` option, and returns null when either env var is missing.
  - `useLiveFeed(initial: { feed: LiveFeed; tips: LiveTip[] }, clerkUserId: string): { feed: LiveFeed; tips: LiveTip[]; realtime: boolean }`.
    - It subscribes to `postgres_changes` on `live_states` and `live_tips` with filter `clerk_user_id=eq.<id>`.
    - Tips from another match are ignored, and a new `matchId` clears the list.
    - When the channel isn't `SUBSCRIBED`, or the client is null, it polls `GET /api/live/state` every 5 s.
  - `GET /api/live/state`: 401 when signed out; 200 `{ feed: LiveFeed, tips: LiveTip[] }` (tips for the snapshot's match, or `[]`).

- [ ] **Step 1: Write the failing tests:** `maps a live_states row` (`updatedAt` = ms of `updated_at`); `maps a live_tips row`; `drops a tip with an unknown kind`.
- [ ] **Step 2: Run** `npm install @supabase/supabase-js@^2`, then `npx vitest run src/lib/live-rows.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the mappers, the client factory, the hook and the route. The hook gets the token from Clerk's `useSession().session?.getToken()`.
- [ ] **Step 4: Run** the test file (PASS) and `npm run lint`.
- [ ] **Step 5: Owner setup.** Give the owner these steps, and wait for confirmation before Task 11's manual check. Menu names may differ slightly.
  1. Clerk Dashboard → **Integrations → Supabase → Activate**, and copy the Clerk domain it shows.
  2. Supabase Dashboard → **Authentication → Sign In / Providers → Third-Party Auth → Add provider → Clerk**, and paste that domain.
  3. Add `NEXT_PUBLIC_SUPABASE_URL` (no `/rest/v1/`) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local` and to Vercel (Production + Preview).
  4. Run `npm run db:migrate` (applies Task 4's two migrations).

### Task 10: Live Coach page and navigation

**Files:**
- Create: `src/app/(site)/live/page.tsx`
- Create: `src/components/live/LiveCoach.tsx` (client; composes everything)
- Create: `src/components/live/ConnectDota.tsx` (client)
- Create: `src/components/live/LivePanel.tsx`
- Create: `src/components/live/DraftStrip.tsx`
- Create: `src/components/live/TipList.tsx`
- Create: `src/lib/use-live-coach.ts`
- Modify: `src/lib/site-content.ts` (nav: `{ label: "Live Coach", href: "/live" }` replaces Location)
- Delete: `src/app/(site)/location/page.tsx`, `src/components/SectionPlaceholder.tsx`
- Test: `src/components/live/live-coach.test.tsx`

**Interfaces:**
- Consumes:
  - `useLiveFeed` (Task 9); `detectEvents`, `nextPlannedItem` (Task 2); `stepCoach`, `markSpoke`, `IDLE_CLOCK` (Task 3)
  - `hasGsiToken`, `getLiveRow`, `getLockedDraft`, `getTips` (Task 4)
  - `requireUserId`, `getLinkedSteamId`, `getItemIndex`, `getDraftHeroes`, `PlayerDataNotice`, `PageBackdrop`, `heroPortrait`, `formatDuration`
- Produces:
  - `useLiveCoach(input: { feed: LiveFeed; tips: LiveTip[]; costs: Map<string, number> }): { asking: boolean; error: string | null; ask: () => void }`.
    - It keeps the previous snapshot in a ref, runs `detectEvents` and then `stepCoach` on every feed change and on a 1 s interval, and POSTs `/api/live/coach`.
    - It requests `["plan"]` once per new `matchId` when there's no plan tip.
    - On 200 or 429 it calls `markSpoke`. Error text goes into `error`.
    - `ask()` sends `["asked"]`.
  - Page states, in this order:
    - Steam not linked → `PlayerDataNotice reason="not-linked"`
    - no token → `ConnectDota` only
    - token but no live row → `ConnectDota` showing "Waiting for Dota…"
    - row without snapshot → "✓ Connected — start a match" plus the last tips
    - snapshot → `LivePanel` + `DraftStrip` + `TipList`
  - `DraftStrip` shows "Lock your draft on the Draft page for better advice." when there's no draft. When `draft.myHeroId !== snapshot.heroId` it shows "Your draft says {draftHero} but you're playing {liveHero} — update the draft?".
  - `TipList`: newest first, `aria-live="polite"`, an icon per kind, and the **Ask coach now** button (disabled while `asking`).
  - `ConnectDota`, matching the approved sketch:
    - a copy button for `-gamestateintegration`
    - a **Download setup folder** button: POST `/api/live/setup`, then save the blob through an object URL
    - Windows and macOS path text, plus the "Manage → Browse local files" hint
    - "Waiting for Dota…" / "✓ Connected"
    - a **Reset connection** link that downloads again
  - `LivePanel`: clock (`formatDuration(clockSeconds)`), hero portrait, name and level, K/D/A, gold, GPM, six item slots (icons from the item index), and a status dot: "Live" when updated < 60 s ago, else "Last update N min ago".

- [ ] **Step 1: Write the failing render tests** (server-render to HTML like `src/components/coach-panels.test.tsx`):
  - `DraftStrip warns when the live hero differs from the draft` (text contains "Your draft says Viper but you're playing Sniper")
  - `DraftStrip asks to lock a draft when there is none`
  - `TipList shows newest first`
  - `LivePanel shows clock, KDA and gold` (`"10:00"`, `"7 / 3 / 5"`, `"1,840"`)
- [ ] **Step 2: Run** `npx vitest run src/components/live/live-coach.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the page, the components and the hook. Item costs and names come from `getItemIndex().byKey` and are passed as plain arrays (`[key, cost][]`) from server to client. Each component file stays under 200 lines.
- [ ] **Step 4: Run** the test file (PASS), `npm run lint`, and `npx tsc --noEmit`. Expected: no errors.

### Task 11: Full verification

**Files:** none new.

- [ ] **Step 1:** `npm test` → all test files pass (the 39 existing ones plus the new ones).
- [ ] **Step 2:** `npm run lint` → no errors; `npx tsc --noEmit` → no output.
- [ ] **Step 3:** `npm run build` → completes without prerender errors (`/live` reads cookies inside Suspense).
- [ ] **Step 4: Dev check without Dota.** `npm run dev`, sign in, link Steam, and open `/live`. Expect the Connect Dota steps; the download gives a zip containing the cfg. Then `curl -X POST localhost:3000/api/gsi -d @fixture.json` with the downloaded token and the Task 1 fixture (steamid = your linked ID). The page should switch to the live panel within a second if Realtime is set up, or within 5 s via polling.
- [ ] **Step 5: Report** to the owner what passed and the at-home checklist:
  - deploy
  - put the cfg in Dota (Windows or macOS path)
  - try without `-gamestateintegration`, then with it
  - start a bot match
  - expect "✓ Connected", then the live panel, then a tip after dying

  If nothing arrives over HTTPS, the connector app is the follow-up project. No commit.
