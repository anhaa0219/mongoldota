# RAG Coach Knowledge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Live Coach (then the Draft coach) answers game-fact questions from checked current-patch knowledge stored in Pinecone, and remembers the player's past matches.

**Architecture:** An ingest script turns OpenDota's game constants (abilities, talents, facets, Aghanim's, items, patch notes) plus an owner-checked mechanics list into short text records in a Pinecone index with built-in embedding. Before each coach prompt, the server runs a few parallel filtered searches, then adds the hits as a capped `REFERENCE` section and a rule to state game facts only from it. When GSI reports a match's post-game, one memory record of that match goes into the player's own namespace, and later tips search it.

**Tech Stack:** Next.js 16 route handlers, `@pinecone-database/pinecone` v9.x (Node 24 is installed; SDK needs ≥ 22), Drizzle/Postgres, zod, tsx scripts.

**Spec:** `docs/superpowers/specs/2026-11-23-rag-coach-knowledge-design.md`

## Global Constraints

- **No tests.** `CLAUDE.md` overrides every test step: no test files, test tools or `test` script. Each task's check is `npx tsc --noEmit` and `npm run lint` (both zero errors), plus the manual run it names.
- Rules from `AGENTS.md`: no `any`, files under 200 lines, one thing per file, zod on input, try/catch around outside services, no raw errors to users, no `console.log` (scripts write with `process.stdout.write`, like `src/db/scripts/ai-mongolian-samples.ts`).
- Use the `api-route-pattern` skill when touching a `route.ts`, `page-folder-structure` when adding files, and `finish-task-checks` before saying a task is done.
- Env: `PINECONE_API_KEY` (already in `.env.local`), `PINECONE_INDEX` (owner sets `mongoldota-coach` in `.env.local`; both names already in `.env.example`).
- Pinecone API: use the **integrated-index records API**, which is documented with `multilingual-e5-large`: `pc.createIndexForModel` / `pc.indexes.createForModel` (whichever v9 exposes; check `node_modules/@pinecone-database/pinecone` types), `index.upsertRecords`, `index.searchRecords`. Model `multilingual-e5-large`, `fieldMap: { text: "text" }`, serverless `aws` / `us-east-1`. Upserts go in batches of at most 96 records. v9 calls this path "legacy", but it's the one documented with this model; the newer documents API is not used.
- Namespaces: `game` (shared knowledge) and `player-<clerkUserId>` (match memory).
- Timeouts: Live Coach retrieval at most 1,500 ms in total; Draft coach 3,000 ms. On timeout or error, return no hits and carry on.
- Size caps: knowledge record `text` about 500 characters (hard cut at 700); memory record at most 800; `REFERENCE` at most 2,500 characters in total; past games at most 2 records.
- Prompt rule, verbatim: `Only state ability, item, talent, timing or mechanic facts found under REFERENCE or the facts above. If you are not sure, give the advice without the specific number or effect.`
- Pinecone calls are not model calls: never wrap them in `gatedAiCall`.
- Next 16 `after` is imported from `next/server` (see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`).

## Review Focus

There are no tests, so the reviewer checks each of these by reading the code and doing the manual run named in the owning task.

1. **Pinecone down, slow or with no key.** The tip still arrives as it does today, with no error shown (Task 5: run with `PINECONE_API_KEY` unset).
2. **Post-game sent every second.** GSI repeats the post-game state about 1 per second, but exactly one memory is written per match (Task 7: the guard is an `INSERT … ON CONFLICT DO NOTHING RETURNING`).
3. **Another player's memory.** It never reaches the prompt: searches only ever use `player-${userId}` for the signed-in user (Task 7/8).
4. **Old facets.** OpenDota facets with `deprecated: "1"`, and hidden or `generic_*` abilities, never become records (Task 2).
5. **No locked draft.** The live search still works with only the player's own hero key and items (Task 5).

---

### Task 1: Pinecone client

**Files:**
- Create: `src/lib/rag/pinecone.ts`, `src/types/rag.ts`
- Modify: `package.json` (dependency)

**Interfaces:**
- Produces (`src/types/rag.ts`):
  - `type RagSource = "ability" | "talent" | "facet" | "aghs" | "item" | "patch" | "mechanic" | "memory"`
  - `interface RagRecord { id: string; text: string; source: RagSource; hero?: string; item?: string; patch?: string; enemies?: string[]; matchId?: string; endedAt?: number }`
  - `type RagFilter = Record<string, { $eq: string } | { $ne: string } | { $in: string[] }>`
- Produces (`src/lib/rag/pinecone.ts`, server only, never throws except in `ensureIndex`):
  - `GAME_NAMESPACE = "game"`, `playerNamespace(clerkUserId: string): string` → `player-${clerkUserId}`
  - `searchText(namespace: string, query: string, options: { topK: number; filter?: RagFilter; timeoutMs: number }): Promise<string[]>` returns the hits' `text` in score order; `[]` on no key, no index, timeout or error.
  - `upsertTexts(namespace: string, records: RagRecord[]): Promise<boolean>` batches by 96.
  - `clearNamespace(namespace: string): Promise<boolean>` (`deleteNamespace`; a missing namespace counts as cleared).
  - `ensureIndex(): Promise<void>` creates the index from `PINECONE_INDEX` if it's missing (for scripts only; throws with a plain message).

- [ ] **Step 1:** `npm install @pinecone-database/pinecone@^9`. Read its `.d.ts` for the exact names of the integrated-index create, `upsertRecords`, `searchRecords` and `deleteNamespace` calls before writing.
- [ ] **Step 2:** Write the types and `pinecone.ts`. Build the timeout with `Promise.race` against a timer. The SDK call isn't cancellable, so just stop waiting. Records leave out undefined fields, because Pinecone metadata can't hold null.
- [ ] **Step 3:** `npx tsc --noEmit` and `npm run lint`. Expected: zero errors.
- [ ] **Step 4:** Branch `feat/rag-coach` if you're not on it yet. Commit the spec, this plan and the task: `feat(rag): Pinecone client`.

### Task 2: Knowledge records from OpenDota constants

**Files:**
- Create: `src/lib/rag/hero-records.ts` (abilities, talents, facets, Aghanim's), `src/lib/rag/item-records.ts` (items and patch notes), `src/lib/rag/rag-text.ts` (shared trim and flatten helpers)

**Interfaces:**
- Consumes: `RagRecord` (Task 1).
- Produces (pure, no fetching):
  - `heroRecords(input: { heroAbilities: RawHeroAbilities; abilities: RawAbilities; aghs: RawAghs[]; heroNames: Map<string, string> }): RagRecord[]`. `heroNames` maps slug (`"viper"`) to name (`"Viper"`).
  - `itemRecords(items: RawItems): RagRecord[]`
  - `patchRecords(patchNotes: RawPatchNotes, patches: string[], heroNames: Map<string, string>, itemNames: Map<string, string>): RagRecord[]`
  - `currentPatches(patchNotes: RawPatchNotes): string[]`: the newest key (for example `7_42`) and every key sharing its number with a letter (`7_42b`…).
  - `clip(text: string, max: number): string` and `flat(text: string): string` in `rag-text.ts`
- Raw shapes are zod schemas or interfaces in the same files, matching what OpenDota sends:
  - `hero_abilities`: `{ [npc_dota_hero_x]: { abilities: string[]; talents: { name; level }[]; facets: { name; title; description; deprecated? }[] } }`
  - `abilities`: `{ [key]: { dname?; desc?; behavior?; dmg_type?; bkbpierce?; attrib?: { header?; value: string | string[] }[]; cd?; mc? } }`
  - `aghs_desc`: `{ hero_name; scepter_desc; shard_desc; has_scepter; has_shard }[]`
  - `items`: `{ [key]: { dname?; cost?; abilities?: { title; description }[]; attrib?: { display?; value }[]; cd?; mc?; components?: string[] | null; notes? } }`
  - `patchnotes`: `{ [patch]: { general?: string[]; items?: { [key]: string[] }; heroes?: { [slug]: { [abilityOrGeneral]: string[] } } } }`

Record rules (ids are stable; `hero` is the slug without `npc_dota_hero_`; text starts with the hero or item name so search hits read on their own):

| source | id | text |
|---|---|---|
| ability | `ability:<key>` | `Viper — Nethertoxin (Magical, pierces BKB: No): <desc> MIN DPS: 15/25/35/45; … Cooldown: … Mana: …` |
| talent | `talent:<hero>` | `Viper talents — level 10: A or B; level 15: …` (talent level 1-4 → hero level 10/15/20/25) |
| facet | `facet:<hero>:<name>` | `Viper facet — Poison Burst: <description>` |
| aghs | `aghs:<hero>` | `Viper — Aghanim's Scepter: … Aghanim's Shard: …` |
| item | `item:<key>` | `Black King Bar (4050 gold): <ability title: description> <attrib displays> Cooldown … Built from: …` |
| patch | `patch:<patch>:<hero or item key>` | `Patch 7.42 — Viper: <changes joined with "; ">` |

Skip: hidden abilities (behavior contains `"Hidden"`), keys starting with `generic`, abilities without `dname`, facets with `deprecated` set, items without `dname`, `recipe_*` items, and empty patch entries. Fill `{value}` in item attrib `display`. Join array values with `/`.

- [ ] **Step 1:** Write the three files. Each stays under 200 lines.
- [ ] **Step 2:** `npx tsc --noEmit` and `npm run lint`. Expected: zero errors.
- [ ] **Step 3:** Commit `feat(rag): knowledge records from OpenDota constants`.

### Task 3: Mechanics list (owner-checked)

**Files:**
- Create: `src/lib/rag/game-mechanics.ts`

**Interfaces:**
- Produces: `MECHANICS_CHECKED_FOR_PATCH: string | null` (starts `null`), and `mechanicRecords(): RagRecord[]` (ids `mechanic:<slug>`, `source: "mechanic"`, one fact per record).

- [ ] **Step 1:** Draft about 15-25 one-line facts: rune spawns (bounty, power, water, wisdom), Roshan (respawn window, drops), Tormentors, day/night length, lotus pools, neutral item tiers and timing, buyback rules, glyph, scan, outposts, courier. Write them as you understand 7.42, with a comment at the top: `UNCHECKED until the project owner verifies each line against the current patch.`
- [ ] **Step 2:** `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 3:** Commit `feat(rag): draft mechanics list (unchecked)`. **Stop and ask the project owner** to check the list. They edit or delete lines, then set `MECHANICS_CHECKED_FOR_PATCH = "7_42"`. Until then, Task 4 leaves mechanics out. Carry on with the other tasks while waiting.

### Task 4: Ingest script

**Files:**
- Create: `src/db/scripts/rag-ingest.ts`

**Interfaces:**
- Consumes: `ensureIndex`, `clearNamespace`, `upsertTexts`, `GAME_NAMESPACE` (Task 1); `heroRecords`, `itemRecords`, `patchRecords`, `currentPatches` (Task 2); `mechanicRecords`, `MECHANICS_CHECKED_FOR_PATCH` (Task 3).

Behavior:
1. `ensureIndex()`.
2. Fetch these from `https://api.opendota.com/api` with plain `fetch`, since `fetchJson` depends on the Next cache: `/constants/hero_abilities`, `/constants/abilities`, `/constants/aghs_desc`, `/constants/items`, `/constants/patchnotes`, `/constants/heroes` (for slug-to-name).
3. Build all records. Add mechanics only when `MECHANICS_CHECKED_FOR_PATCH === currentPatches(...)[0]`; otherwise print `mechanics skipped: not checked for <patch>`.
4. `clearNamespace("game")`, then upsert.
5. Print the count per source and the total. Exit 1 with a plain message on failure.

Header comment: what it does, that it's rerun after every patch, and `Run: npx tsx --env-file=.env.local src/db/scripts/rag-ingest.ts`.

- [ ] **Step 1:** Write the script.
- [ ] **Step 2:** `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 3:** Run it. Expected: a few hundred records each for `ability` and `item`, about 120+ each for `talent` and `aghs`, a non-zero `patch` count, and the mechanics-skipped line.
- [ ] **Step 4:** Commit `feat(rag): ingest script for the game knowledge base`.

### Task 5: Live Coach uses REFERENCE

**Files:**
- Create: `src/lib/rag/knowledge-search.ts`, `src/app/api/live/coach/_utils/live-coach-reference.ts`
- Modify: `src/app/api/live/coach/_utils/coach-context.ts` (also return hero keys), `src/app/api/live/coach/_utils/live-coach-prompt.ts` (new `reference` input in both prompts), `src/app/api/live/coach/route.ts`

**Interfaces:**
- Consumes: `searchText`, `GAME_NAMESPACE` (Task 1).
- Produces:
  - `searchGameKnowledge(input: { query: string; heroKeys: string[]; itemKeys: string[] }, timeoutMs: number): Promise<string[]>`. It runs three searches in parallel: `hero $in heroKeys` with topK 5; `item $in itemKeys` with topK 3 (skipped when empty); `source $eq "mechanic"` with topK 2. It de-duplicates, keeps that order, and caps the total at 2,500 characters by whole records. The search timeout covers the whole call.
  - `referenceLines(hits: string[]): string[]` returns `[]` when there are no hits. Otherwise: `["REFERENCE (checked game facts for the current patch):", ...hits.map((hit) => \`- ${hit}\`), "<the verbatim prompt rule from Global Constraints>"]`.
  - `gameContext(...)` also returns `heroKeys: string[]` (player's `snapshot.heroKey` first, then the fresh draft's allies and enemies as slugs via `getDraftHeroes()`) and `enemyKeys: string[]`.
  - In `live-coach-reference.ts`: `tipQuery(heroName: string, events: LiveEvent[], enemyNames: string[], itemName: ItemName): string` (for example `Viper died. Teamfight lost 1 for 3. Enemies: Pudge, Lina. Items: Dragon Lance`), `tipItemKeys(snapshot: LiveSnapshot, events: LiveEvent[]): string[]` (inventory plus `item`/`gold` event details), and `planQuery(heroName: string, laneOpponents: string[]): string`.
  - `TipInput` and `PlanInput` get `reference: string[]`, placed after the team and lane lines and before "What just happened" or the candidates.
- The route builds the query, runs `searchGameKnowledge(…, 1500)` after `gameContext`, and passes `referenceLines(hits)`. For the plan, `itemKeys` are the candidate keys.

- [ ] **Step 1:** Write the two new files and the three changes. Keep `route.ts` under 200 lines by putting the query building in `live-coach-reference.ts`.
- [ ] **Step 2:** `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 3:** Manual check with `npm run dev` and a live or bot match (Live page):
  - Tips still arrive.
  - The server's prompt includes `REFERENCE` (check temporarily via the Task 6 script instead of logging).
  - With `PINECONE_API_KEY` blanked in `.env.local` and the server restarted, tips still arrive with no error.
- [ ] **Step 4:** Commit `feat(live): coach answers from the Pinecone knowledge base`.

### Task 6: Demo script

**Files:**
- Create: `src/db/scripts/rag-samples.ts`

**Interfaces:**
- Consumes: `buildLiveTipPrompt` (with `reference`), `searchGameKnowledge`, `referenceLines`, `tipQuery`, `tipItemKeys`, `askQuickModel`.

Reuse the sample snapshot style of `ai-mongolian-samples.ts`: Phantom Assassin with 3 events (death, teamfight, item). For each event, print the query, the hits found, the tip without `REFERENCE` and the tip with it. Call the model directly; it's an owner tool. Header with `Run: npx tsx --env-file=.env.local src/db/scripts/rag-samples.ts`.

- [ ] **Step 1:** Write it. **Step 2:** `npx tsc --noEmit` and `npm run lint`. **Step 3:** Run it. Expected: hits about Phantom Assassin and the items for each event, and both tips printed.
- [ ] **Step 4:** Commit `feat(rag): demo script comparing tips with and without RAG`.

### Task 7: Match memory is written at post-game

**Files:**
- Create: `src/lib/rag/match-memory.ts` (text builder plus write, search and delete), `src/lib/rag/match-memory-store.ts` (the Postgres write-once guard), and a migration via `npm run db:generate`
- Modify: `src/db/schema.ts`, `src/app/api/gsi/_utils/gsi.ts`, `src/app/api/gsi/route.ts`, `src/app/api/auth/steam/logout/route.ts`

**Interfaces:**
- Consumes: `upsertTexts`, `clearNamespace`, `playerNamespace` (Task 1); `getTips`, `getLockedDraft`, `freshDraft`, `getDraftHeroes`, `getItemIndex`.
- Produces:
  - Table `match_memories`:
    - `clerkUserId` text, referencing `gsiTokens.clerkUserId` with cascade delete
    - `matchId` text
    - `createdAt` timestamptz, default now
    - primary key on (`clerkUserId`, `matchId`), `.enableRLS()`
  - `claimMatchMemory(clerkUserId: string, matchId: string): Promise<boolean>` returns true only for the first caller (`INSERT … ON CONFLICT DO NOTHING RETURNING`), and false on a database error.
  - In `gsi.ts`: the `map` schema gains `win_team: z.string().optional()`. Add `matchEnd(payload: GsiPayload, steamId: string): { matchId: string; winTeam: Side | null } | null`. It's non-null only when `map.game_state === "DOTA_GAMERULES_STATE_POST_GAME"`, `map.matchid` is set and `player.steamid === steamId`.
  - `memoryText(input: { snapshot: LiveSnapshot; heroName: string; won: boolean | null; enemyNames: string[]; position: Position | null; tips: LiveTip[]; itemName: ItemName; endedAt: Date }): string`. Pure, at most 800 characters. It covers the date, hero, position, enemies, result (`won` / `lost` / `result unknown`), K/D/A, level, GPM/XPM, clock as minutes, final inventory names, counts of tip kinds (for example `deaths 6, teamfights 2`), and the tips shortened to fit.
  - `saveMatchMemory(clerkUserId: string, lastSnapshot: LiveSnapshot, winTeam: Side | null): Promise<void>`. It never throws, and does nothing unless `claimMatchMemory` returns true. The record has id `memory:<matchId>`, `source: "memory"`, `hero`, `enemies` (slugs), `matchId` and `endedAt`.
  - `deletePlayerMemory(clerkUserId: string): Promise<void>` calls `clearNamespace(playerNamespace(id))`.
- In the GSI route: after `getLiveRow`, if `matchEnd(...)` is non-null and `row?.snapshot?.matchId === end.matchId`, call `after(() => saveMatchMemory(owner.clerkUserId, row.snapshot, end.winTeam))`. Capture the snapshot in a const first. The existing write flow is unchanged.
- In the logout route: before `deleteSteamLink`, `await deletePlayerMemory(userId)`.

- [ ] **Step 1:** Add the table, then `npm run db:generate` and `npm run db:migrate`. Expected: one new migration creating `match_memories`.
- [ ] **Step 2:** Write `match-memory-store.ts`, `match-memory.ts`, and the `gsi.ts`, GSI route and logout route changes.
- [ ] **Step 3:** `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 4:** Manual check: finish a bot match with the Live page connected. Expected: exactly one `match_memories` row for that match, even though post-game updates repeat. Check the record with Task 8's search, or by fetching `memory:<matchId>` from the Pinecone console.
- [ ] **Step 5:** Commit `feat(rag): remember each finished match in the player's Pinecone space`.

### Task 8: Live Coach uses past games

**Files:**
- Modify: `src/lib/rag/match-memory.ts` (add search), `src/app/api/live/coach/_utils/live-coach-prompt.ts`, `src/app/api/live/coach/route.ts`

**Interfaces:**
- Produces:
  - `searchPastGames(clerkUserId: string, query: string, currentMatchId: string, timeoutMs: number): Promise<string[]>` searches `playerNamespace(clerkUserId)` with topK 2 and filter `matchId $ne currentMatchId`.
  - `TipInput` gets `pastGames: string[]`. When it's non-empty, the prompt adds: `PAST GAMES OF THIS PLAYER (patterns from earlier matches, not facts about this one):` followed by `- <memory>` lines, after `REFERENCE`.
- The route runs `searchPastGames` in the same `Promise.all` as `searchGameKnowledge`, so the 1,500 ms budget is shared and not added on top. The query is the hero name plus enemy names. Tips only; the item plan doesn't use it.

- [ ] **Step 1:** Implement. **Step 2:** `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 3:** Manual check: after Task 7 has stored a match, start another match on the same hero. Expected: tips still arrive. Add a sample with a fake past game to `rag-samples.ts` so the prompt section can be seen working.
- [ ] **Step 4:** Commit `feat(live): tips draw on the player's past matches`.

### Task 9: Draft coach uses REFERENCE

**Files:**
- Modify: `src/app/api/_utils/draft-advice.ts` (`buildAdvicePrompt` gains `reference: string[]`, placed before the language lines), `src/app/api/draft/advice/route.ts`, `src/db/scripts/ai-mongolian-samples.ts` (pass `[]`)

**Interfaces:**
- Consumes: `searchGameKnowledge`, `referenceLines` (Task 5).
- The route maps `myHeroId` and every ally and enemy `heroId` to slugs with `getDraftHeroes()`. The query is `<hero> as <position name> vs <lane opponents>; enemies: <names>`, with `itemKeys: []` and a timeout of 3,000 ms.

- [ ] **Step 1:** Implement. **Step 2:** `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 3:** Manual check: lock a draft on the Draft page. Expected: the advice still arrives.
- [ ] **Step 4:** Commit `feat(draft): draft coach answers from the Pinecone knowledge base`.
