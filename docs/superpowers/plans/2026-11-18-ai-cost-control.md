# AI Cost Control Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repo has **no tests** (`CLAUDE.md`): each task ends with `npm run lint` and `npx tsc --noEmit`, both with zero errors. **Do not `git commit`.**

**Goal:** Record every AI call per player with its tokens, enforce per-player limits before the AI is called, show players their usage and a calm message at a limit, and give the owner a usage report.

**Architecture:** One gate, `gatedAiCall`, wraps every AI call: it reads the player's usage, refuses with a limit when a limit is reached, otherwise calls the model and records one `ai_calls` row. The limit decision is a pure function; the database part is a small store. All three live in `src/lib/ai/` (both pages and API routes use them). Call sites map a refusal to a limit reply; the Live page stops asking until the limit frees up.

**Tech Stack:** Next.js 16.4 App Router (Cache Components), React 19.3, Drizzle on Supabase Postgres, Hugging Face router (OpenAI chat format), zod.

**Spec:** `docs/superpowers/specs/2026-11-17-ai-cost-control-design.md`

## Global Constraints

- `CLAUDE.md` rules: no `any`, files under 150 lines, zod on server input, friendly messages only, folder rules (shared → `src/lib/<area>/`, page-only → the page's `_` folders).
- Limits (named constants, one file): all AI calls per player per rolling 24 h **250**; live tips per match **40**; item plans per match **4**; draft advice per 24 h **20**; draft screenshots per 24 h **30**; stats coach and hero picks count toward the 250 only.
- "Today" = the last 24 hours (rolling), never a calendar day.
- The limit is checked **before** the AI is called. A call is recorded only when it reached the provider (`no-key` is not recorded; a 402 `no-credits` and any failure after the request was sent are recorded with `ok = false`).
- If the database is not configured, unreachable, or the migration is not applied: calls go ahead uncounted, nothing is blocked, nothing crashes, and the usage line is hidden.
- New table `ai_calls`, RLS on with no policies. One migration, generated with `npm run db:generate`; the owner applies it with `npm run db:migrate`.
- Exact copy:
  - Usage line: `AI today 37 / 250 · this match 12 / 40` (the match part only during a match).
  - `The coach has given its 40 tips for this match.`
  - `The coach has made its 4 item plans for this match.`
  - `You've used today's AI allowance (250). It frees up from 21:40.`
  - `You've used today's 20 draft advice requests. It frees up from 21:40.`
  - `You've used today's 30 screenshot reads. It frees up from 21:40.`
  - The time is the viewer's local time, formatted in the browser (`toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })`), never on the server.

## Review Focus

1. **Database down or migration not applied** → every AI feature behaves exactly as today; no usage line; no error text. (Tasks 2, 4)
2. **Two tabs at 249 calls** → both may go through (a tiny overshoot is accepted), and `freesAt` is still right when the count is above the limit (it uses the call at position `count - limit`, oldest first). (Task 2)
3. **Daily limit frees up mid-match** → the Live page resumes automatic tips after `freesAt` without a reload. (Task 4)
4. **Item-plan retry while limited** → the one-minute plan retry must not fire while any limit applies (no hammering). (Task 4)
5. **A new match after a match limit** → tips and the plan resume for the new match. (Task 4)

---

### Task 1: Token usage and the `ai_calls` table

**Files:**
- Modify: `src/lib/ai/hf.ts`, `src/db/schema.ts`
- Create (generated): `src/db/migrations/0007_*.sql`, `src/db/migrations/meta/0007_snapshot.json`, journal entry

**Interfaces (produced):**
- `src/lib/ai/hf.ts`: `export interface TokenUsage { promptTokens: number | null; answerTokens: number | null }`; `ModelResult` becomes `{ ok: true; text: string; usage: TokenUsage | null } | { ok: false; reason: "no-key" | "no-credits" | "failed"; sent: boolean }`. `sent` is `false` only for `no-key` (nothing reached the provider).
- `src/db/schema.ts`: `export const aiCalls = pgTable("ai_calls", { id: serial("id").primaryKey(), clerkUserId: text("clerk_user_id").notNull(), kind: text("kind").notNull(), matchId: text("match_id"), promptTokens: integer("prompt_tokens"), answerTokens: integer("answer_tokens"), ok: boolean("ok").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("ai_calls_user_time_idx").on(table.clerkUserId, table.createdAt)]).enableRLS();` with a one-line comment like the other tables.

- [ ] **Step 1:** In `hf.ts`, extend `replySchema` with `usage: z.object({ prompt_tokens: z.number().optional(), completion_tokens: z.number().optional() }).optional()` and return it as `TokenUsage` (null when absent). Every failure after `fetch` started returns `sent: true`.
- [ ] **Step 2:** Add `aiCalls` to `schema.ts`. Run `npm run db:generate`. Expected: a new `0007_*.sql` with `CREATE TABLE "ai_calls"`, `ENABLE ROW LEVEL SECURITY` and the index; nothing else changes.
- [ ] **Step 3:** `npm run lint && npx tsc --noEmit` → zero errors (callers of `ModelResult` still compile: they only read `ok`, `text`, `reason`).

---

### Task 2: Limits, store and gate (`src/lib/ai/`)

**Files:**
- Create: `src/types/ai.ts`, `src/lib/ai/ai-limits.ts`, `src/lib/ai/ai-calls-store.ts`, `src/lib/ai/ai-gate.ts`

**Interfaces (produced, used by Tasks 3–6):**
- `src/types/ai.ts`:
  - `export type AiCallKind = "live-tip" | "live-plan" | "draft-advice" | "draft-screenshot" | "stats-coach" | "hero-picks";`
  - `export interface AiLimit { reason: "daily" | "draft-advice" | "draft-screenshot" | "match-tips" | "match-plans"; max: number; /** ms; null for per-match limits */ freesAt: number | null }`
  - `export interface AiUsage { today: number; dailyLimit: number; /** null outside a match */ match: number | null; matchLimit: number }`
- `src/lib/ai/ai-limits.ts` (pure): the five constants (`DAILY_LIMIT = 250`, `LIVE_TIPS_PER_MATCH = 40`, `LIVE_PLANS_PER_MATCH = 4`, `DRAFT_ADVICE_PER_DAY = 20`, `DRAFT_SCREENSHOTS_PER_DAY = 30`, `WINDOW_MS = 24 * 3_600_000`), and
  - `export interface UsageFacts { dayCalls: { kind: AiCallKind; at: number }[]; matchTips: number; matchPlans: number }` (`dayCalls`: this player's calls in the last 24 h, any order).
  - `export function checkAllowance(kind: AiCallKind, facts: UsageFacts): AiLimit | null` — null = allowed. Order: per-match (`live-tip` → match-tips, `live-plan` → match-plans), then per-kind daily (`draft-advice`, `draft-screenshot`), then the 250 total. `freesAt` for a daily limit = the counted calls sorted oldest first, the one at index `count - max`, plus `WINDOW_MS`.
  - `export function toUsage(facts: UsageFacts, inMatch: boolean): AiUsage` — `matchLimit = LIVE_TIPS_PER_MATCH`, `match = inMatch ? facts.matchTips : null`.
  - `export function limitMessage(limit: AiLimit, formatTime: (ms: number) => string): string` — the exact copy from Global Constraints.
- `src/lib/ai/ai-calls-store.ts` (server; every function catches and never throws):
  - `export async function getUsageFacts(clerkUserId: string, matchId: string | null, nowMs: number): Promise<UsageFacts | null>` — null without a database or on error (then nothing is counted or blocked).
  - `export async function recordAiCall(row: { clerkUserId: string; kind: AiCallKind; matchId: string | null; usage: TokenUsage | null; ok: boolean }): Promise<void>`
  - `export async function getAiUsage(clerkUserId: string, matchId: string | null): Promise<AiUsage | null>`
- `src/lib/ai/ai-gate.ts`:
  - `export type GatedResult = ModelResult | { ok: false; reason: "limit"; limit: AiLimit };`
  - `export async function gatedAiCall(who: { clerkUserId: string; kind: AiCallKind; matchId: string | null }, ask: () => Promise<ModelResult>): Promise<GatedResult>` — facts → `checkAllowance` → refuse, or `ask()` then `recordAiCall` when `result.ok || result.sent`.

- [ ] **Step 1:** Write the four files.
- [ ] **Step 2:** `npm run lint && npx tsc --noEmit` → zero errors.

---

### Task 3: Live coach route through the gate

**Files:**
- Create: `src/app/api/live/coach/_utils/coach-context.ts` (move `planCandidates` and `gameContext` out of `route.ts` unchanged, so the route stays under 150 lines)
- Modify: `src/app/api/live/coach/route.ts`, `src/app/(site)/live/page.tsx`, `src/app/(site)/live/_features/LiveCoach.tsx` (new prop only)

**Interfaces:**
- Consumes: `gatedAiCall`, `getAiUsage` (Task 2).
- Produces: coach replies `{ tip, usage }` | `{ skipped: true }` (429, unchanged) | `{ limit: AiLimit, usage: AiUsage | null }` (429) | `{ error }`. `LiveCoach` gets `initialUsage: AiUsage | null`.

- [ ] **Step 1:** Both AI calls in the route go through `gatedAiCall({ clerkUserId: userId, kind: "live-plan" | "live-tip", matchId }, () => askQuickModel(prompt))`. A `"limit"` result replies 429 `{ limit, usage }`; `modelFailure` handles the other reasons as today. Successful replies add `usage: await getAiUsage(userId, matchId)`.
- [ ] **Step 2:** `live/page.tsx` loads `getAiUsage(userId, row?.matchId ?? null)` in its existing `Promise.all` and passes `initialUsage`.
- [ ] **Step 3:** `npm run lint && npx tsc --noEmit` → zero errors.

---

### Task 4: Live page shows usage and stops at a limit

**Files:**
- Create: `src/app/(site)/live/_utils/coach-limit.ts`
- Modify: `src/app/(site)/live/_hooks/use-live-coach.ts`, `src/app/(site)/live/_features/LiveCoach.tsx`, `src/app/(site)/live/_components/TipList.tsx`

**Interfaces:**
- Consumes: Task 2 types and `limitMessage`; Task 3 reply shapes and `initialUsage`.
- Produces:
  - `coach-limit.ts` (pure): `export interface HeldLimit { limit: AiLimit; matchId: string }`; `export function isHeld(held: HeldLimit | null, matchId: string | null, nowMs: number): boolean` — a match limit holds while `matchId` is the same match; a daily limit holds until `nowMs >= freesAt`.
  - `useLiveCoach(...)` also returns `usage: AiUsage | null` and `limitText: string | null`; takes `initialUsage`.
  - `TipList` props add `usage: AiUsage | null` and `limitText: string | null`.

- [ ] **Step 1:** In the hook: keep `usage` state (from `initialUsage`, replaced by any reply's `usage`) and a `held` ref. A `limit` reply sets `held`. While `isHeld(...)` is true: the one-second tick does not fire, the plan request (first ask and the one-minute retry) does not fire, and `ask` does nothing. `limitText = held && isHeld(...) ? limitMessage(held.limit, localTime) : null`, with `localTime` formatting in the browser.
- [ ] **Step 2:** `TipList`: beside the Coach heading, the usage line (exact copy) when `usage` is not null; when `limitText` is set, show it in a calm style (`text-white/70`, not the red error style), hide the error line, and disable **Ask coach now**.
- [ ] **Step 3:** `LiveCoach` passes `initialUsage` to the hook and `usage` / `limitText` to `TipList`.
- [ ] **Step 4:** `npm run lint && npx tsc --noEmit` → zero errors.

---

### Task 5: Draft advice and screenshots through the gate

**Files:**
- Modify: `src/app/api/draft/advice/route.ts`, `src/app/api/draft/recognize/route.ts`, `src/types/draft.ts`, `src/app/(site)/draft/_features/LockScreen.tsx`, `src/app/(site)/draft/_features/ScreenshotReader.tsx`

**Interfaces:**
- `AdviceResponse` and `RecognizeResponse` each gain `| { limit: AiLimit }`.

- [ ] **Step 1:** Routes: `gatedAiCall({ clerkUserId: userId, kind: "draft-advice" | "draft-screenshot", matchId: null }, () => ask…(…))`; a `"limit"` result replies 429 `{ limit }`.
- [ ] **Step 2:** `LockScreen` and `ScreenshotReader`: a `limit` reply shows `limitMessage(limit, localTime)` in the calm style where errors show today; nothing else changes.
- [ ] **Step 3:** `npm run lint && npx tsc --noEmit` → zero errors.

---

### Task 6: Stats coach and hero picks through the gate

**Files:**
- Modify: `src/app/(site)/(stats)/_utils/stats-coach-ai.ts`, `src/app/(site)/(stats)/_features/AiSuggestions.tsx`, `src/app/(site)/(stats)/_features/CoachSection.tsx`, `src/app/(site)/(stats)/_features/StatsView.tsx`, `src/app/(site)/heroes/_utils/hero-picks-ai.ts`, `src/app/(site)/heroes/_features/AiHeroPicks.tsx`, `src/app/(site)/heroes/page.tsx`

**Interfaces:**
- `getAiSuggestions(prompt: string, clerkUserId: string)`, `getAiHeroPicks(candidates, bracket, mainLane, clerkUserId: string)`; `AiSuggestions`, `CoachSection` and `AiHeroPicks` gain a `clerkUserId: string` prop.

- [ ] **Step 1:** Inside each `'use cache'` function (so a cache hit is neither checked nor recorded), call the model through `gatedAiCall({ clerkUserId, kind: "stats-coach" | "hero-picks", matchId: null }, …)`; any non-ok result throws as today (so it is never cached and the page shows its rule-based fallback).
- [ ] **Step 2:** `StatsView` keeps the id from `await requireUserId()` and passes it down. The Trending loader in `heroes/page.tsx` calls `await requireUserId()` first (it does not today) and passes it to `AiHeroPicks`.
- [ ] **Step 3:** `npm run lint && npx tsc --noEmit` → zero errors.

---

### Task 7: Owner usage report and docs

**Files:**
- Create: `src/db/scripts/ai-usage.ts`
- Modify: `CLAUDE.md` (one line under section 5 or a new "AI calls" line in section 4: every AI call goes through `gatedAiCall`)

- [ ] **Step 1:** `ai-usage.ts`, modelled on `src/db/scripts/check-db.ts` (raw `postgres`, `main()`, never prints the connection string): for the last 7 days print one row per day and kind with calls, failed calls, prompt tokens and answer tokens, then the five players with the most calls (Clerk id, calls). Run line in its doc comment: `npx tsx --env-file=.env.local src/db/scripts/ai-usage.ts`.
- [ ] **Step 2:** Add the `CLAUDE.md` line.
- [ ] **Step 3:** `npm run lint && npx tsc --noEmit` → zero errors; `grep -rn "askTextModel\|askQuickModel\|askVisionModel" src/app` shows each call wrapped in `gatedAiCall`.
- [ ] **Step 4 (owner):** apply the migration with `npm run db:migrate`; then on the Live page during a match the usage line appears, and `npx tsx --env-file=.env.local src/db/scripts/ai-usage.ts` prints rows.
