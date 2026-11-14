# Stats + History (real OpenDota data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock Stats page with the linked player's real OpenDota data and turn "Let's play" into a History page of the last 100 matches with inline, on-demand match details.

**Architecture:** Server components read the Steam cookie, call cached OpenDota fetchers (`'use cache'` + `cacheLife`), and pass plain data to presentational components. All number crunching lives in pure, unit-tested modules (`player-summary.ts`, `match-detail.ts`, `format.ts`) that import only types. Match details load lazily through one route handler that returns only the player's slice.

**Tech Stack:** Next.js 16.4 (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind 4, Clerk, zod (new), Vitest (new, dev).

**Spec:** `docs/superpowers/specs/2026-11-14-stats-history-design.md`

## Global Constraints

- Read `AGENTS.md` first. Next 16 differs from training data: check `node_modules/next/dist/docs/` before using a Next API.
- Caching: never use `fetch(..., { next: { revalidate } })`; it is a no-op with `cacheComponents: true`. Use a `'use cache'` function + `cacheLife`. Cached functions throw on failure so failures are not cached.
- No `any`; no `console.log`; `===` only; files under 200 lines (`max-lines`); one component per file.
- Never show raw errors to users. Copy is fixed by the spec (quoted in tasks).
- Cookie-reading components sit inside `<Suspense>` (Cache Components requirement).
- Pure modules (`player-summary.ts`, `match-detail.ts`, `format.ts`, `match-id.ts`) must not import `next/*` at runtime; use `import type` for types.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` must pass at the end of every task.
- Before a commit, show the user the diff summary; commit only on a feature branch (Task 0).

## Review Focus

1. **New hero not yet in `/heroStats`** (unknown `hero_id`) -> shows "Unknown hero" with no broken image, never crashes. Test: Task 1 `summarize` "unknown hero".
2. **Account where no match is parsed** (normal players) -> Stats hides the lane emblem; History detail says "OpenDota hasn't parsed this match yet." Tests: Task 1 "main lane null", Task 2 "unparsed".
3. **Very short / abandoned match** (`gold_t` empty or 1 point) -> gold chart renders nothing, no `NaN` in the SVG path. Test: Task 2 `goldChartPath` empty + single point.
4. **Odd purchase keys** (`recipe_*`, items missing from `/constants/items`) -> skipped in item timings. Test: Task 2 "skips unknown items".
5. **Tampered URL** (`/api/matches/abc`, `-1`, 25 digits) -> 400 "Invalid match id.", never reaches OpenDota. Test: Task 4 `parseMatchId`.

---

### Task 0: Branch and baseline

**Files:**
- Modify: `.gitignore` (append `graphify-out/`)
- Modify: `tsconfig.json` (remove the stray `"src/middleware.ts."` entry from `include`)

- [ ] **Step 1:** `git checkout -b feature/stats-history`
- [ ] **Step 2:** Apply both file edits above.
- [ ] **Step 3:** Run `npx tsc --noEmit` -> exit 0.
- [ ] **Step 4:** Commit the already-built medal work + docs + these edits:

```bash
git add .gitignore tsconfig.json next.config.ts "src/app/(site)/layout.tsx" src/lib/steam-auth.ts src/lib/opendota.ts src/components/MedalBadge.tsx docs/
git commit -m "feat: medal pill with OpenDota rank + MMR estimate; stats/history spec and plan"
```

(`package-lock.json` has an unrelated pre-existing change: leave it out.)

---

### Task 1: Shared types, Vitest, and `player-summary.ts`

**Files:**
- Create: `src/types/opendota.ts`, `src/lib/player-summary.ts`, `vitest.config.mts`
- Test: `src/lib/player-summary.test.ts`
- Modify: `package.json` (`"test": "vitest run"`; dev dep `vitest`)

**Interfaces — Produces** (in `src/types/opendota.ts`):

```ts
export type LaneRole = 1 | 2 | 3 | 4; // 1 safe, 2 mid, 3 off, 4 jungle
export interface HeroInfo { id: number; name: string; slug: string }   // slug "" when unknown
export interface ItemInfo { id: number; key: string; name: string; image: string; cost: number }
export interface RawMatch {            // one row of /players/{id}/matches with project=
  match_id: number; player_slot: number; radiant_win: boolean; duration: number;
  lobby_type: number; start_time: number; hero_id: number;
  kills: number; deaths: number; assists: number;
  gold_per_min?: number | null; xp_per_min?: number | null; last_hits?: number | null;
  hero_damage?: number | null; lane_role?: number | null; version?: number | null;
  item_0?: number | null; item_1?: number | null; item_2?: number | null;
  item_3?: number | null; item_4?: number | null; item_5?: number | null;
}
export interface MatchSummary {
  id: number; heroId: number; won: boolean; ranked: boolean;
  kills: number; deaths: number; assists: number;
  gpm: number; xpm: number; lastHits: number; heroDamage: number;
  items: number[];                 // always 6 ids, 0 = empty slot
  laneRole: LaneRole | null;       // null when unparsed or unknown value
  parsed: boolean;                 // version !== null
  durationSeconds: number; playedAt: number; // ms since epoch
}
export type RecordLabel = "Most kills" | "Most deaths" | "Most assists" | "Most hero damage";
export interface PlayerSummary {
  mostPlayed: { hero: HeroInfo; matches: number; winRate: number }; // winRate 0-100, unrounded
  wins: number; losses: number;
  last10: ("W" | "L")[];           // most recent first
  records: { label: RecordLabel; value: number; hero: HeroInfo }[]; // in RecordLabel order above
  averages: { kills: number; deaths: number; assists: number; gpm: number; xpm: number; lastHits: number }; // unrounded
  mainLane: { lane: LaneRole; share: number } | null; // share 0-100 rounded int, of parsed matches
}
```

Functions in `src/lib/player-summary.ts`:
- `toMatchSummary(raw: RawMatch): MatchSummary` — `parsed = version != null`; `laneRole = parsed && lane_role in 1..4 ? lane_role : null`; missing numbers -> 0
- `summarize(matches: MatchSummary[], heroes: Map<number, HeroInfo>): PlayerSummary | null` (null for an empty list; input is most recent first)

- [ ] **Step 1: Install and configure Vitest.** `npm i -D vitest`; add `"test": "vitest run"`. `vitest.config.mts`: `resolve.alias` `"@"` -> `<root>/src`, `test.environment: "node"`.

- [ ] **Step 2: Write the failing tests** in `src/lib/player-summary.test.ts`. Build fixtures with a `match(overrides: Partial<MatchSummary>)` helper (defaults: won true, 5/3/7, gpm 500, xpm 600, lastHits 200, heroDamage 20000, heroId 1, laneRole null, parsed false). Heroes map: `1 -> {id:1,name:"Anti-Mage",slug:"antimage"}`, `2 -> {id:2,name:"Axe",slug:"axe"}`.

| Test | Assertion |
|---|---|
| `toMatchSummary` radiant win | `player_slot: 1, radiant_win: true` -> `won === true` |
| `toMatchSummary` dire win | `player_slot: 129, radiant_win: false` -> `won === true`; `player_slot: 129, radiant_win: true` -> `false` |
| `toMatchSummary` fields | `lobby_type: 7` -> `ranked`; `lobby_type: 0` -> not ranked; `duration: 2464` -> `durationSeconds 2464`; `start_time: 1794497398` -> `playedAt 1794497398000`; items `item_0..5 = 249,263,null,0,1,63` -> `[249,263,0,0,1,63]`; `version: null` -> `parsed false`, `lane_role: 7` -> `laneRole null`; missing `gold_per_min` -> `gpm 0` |
| empty list | `summarize([], heroes) === null` |
| most played | hero 2 x3 + hero 1 x2 -> `mostPlayed.hero.name === "Axe"`, `matches 3` |
| tie -> win rate | hero 1: 2 games 2 wins; hero 2: 2 games 1 win -> hero 1, `winRate 100` |
| tie -> most recent | equal games and wins, hero 2 appears first in the list -> hero 2 |
| unknown hero | heroId 999 only -> `mostPlayed.hero` equals `{id:999,name:"Unknown hero",slug:""}` |
| W/L + last 10 | 12 matches, first 3 losses -> `losses` counts all 12; `last10.length === 10`, `last10[0] === "L"` |
| records | kills `[3, 16, 16]` -> `Most kills` value 16 with the hero of the **first** 16 (most recent wins ties); labels in order `Most kills, Most deaths, Most assists, Most hero damage` |
| averages | kills `[3,4]`, gpm `[400,601]` -> `kills 3.5`, `gpm 500.5` |
| main lane | parsed lanes `[1,1,2]` + 2 unparsed -> `{lane:1, share:67}` |
| main lane tie | parsed lanes `[3,1]` -> lane 1 (lowest number wins ties) |
| main lane null | no parsed matches -> `mainLane === null` |

- [ ] **Step 3:** `npm test` -> FAIL (module not found).
- [ ] **Step 4:** Implement `toMatchSummary` and `summarize` in `src/lib/player-summary.ts` (types from `@/types/opendota` via `import type`).
- [ ] **Step 5:** `npm test` -> all PASS; `npm run lint` and `npx tsc --noEmit` -> exit 0.
- [ ] **Step 6:** Commit `feat: player summary math with tests`.

---

### Task 2: `match-detail.ts`, `format.ts` (pure, tested)

**Files:**
- Create: `src/lib/match-detail.ts`, `src/lib/format.ts`
- Modify: `src/types/opendota.ts` (append the types below)
- Test: `src/lib/match-detail.test.ts`, `src/lib/format.test.ts`

**Interfaces — Produces** (append to `src/types/opendota.ts`):

```ts
export interface RawLogEntry { time: number; key: string }
export interface RawDetailPlayer {
  account_id: number | null; player_slot: number; hero_id: number; kills: number; assists: number;
  gold_t?: number[] | null; purchase_log?: RawLogEntry[] | null; kills_log?: RawLogEntry[] | null;
  obs_placed?: number | null; sen_placed?: number | null;
}
export interface RawMatchDetail { version: number | null; radiant_score: number; dire_score: number; players: RawDetailPlayer[] }
export interface ItemTiming { key: string; name: string; image: string; seconds: number; isBkb: boolean }
export type MatchDetail =
  | { parsed: false }
  | { parsed: true; goldEarned: number[]; itemTimings: ItemTiming[]; killParticipation: number | null;
      observers: number; sentries: number; deathMinutes: number[] };
```

Functions:
- `toMatchDetail(raw: RawMatchDetail, accountId: number, items: Map<string, ItemInfo>, heroes: Map<number, HeroInfo>): MatchDetail | null` — null when no player has `account_id === accountId`. Item timings: first purchase of each key whose item `cost >= 2000`, sorted by time; `isBkb` = key `"black_king_bar"`. Kill participation = `(kills + assists) / teamKills * 100` rounded int (team = `player_slot < 128` ? radiant : dire), null when teamKills is 0. Deaths = `Math.floor(time / 60)` of every enemy `kills_log` entry whose key is `npc_dota_hero_${slug}`, ascending.
- `goldChartPath(values: number[], width: number, height: number): string` (in `match-detail.ts`) — SVG area path (`M ... L ... Z`) with x spread evenly and y scaled to the max; `""` for fewer than 2 points or max 0.
- `formatDuration(seconds: number): string` -> `"41:04"` for 2464; `"-1:17"` for -77.
- `timeAgo(playedAt: number, now: number): string` -> `< 1 h: "N min ago"`, `< 24 h: "N h ago"`, `< 30 d: "N d ago"`, else `"N mo ago"` (30-day months), floored; under 1 min -> `"just now"`.

- [ ] **Step 1: Write failing tests.** Fixture: radiant player `account_id 42, slot 1, hero 1 (antimage), kills 5, assists 10`; dire enemy `slot 129` with `kills_log [{time:725,key:"npc_dota_hero_antimage"},{time:100,key:"npc_dota_hero_axe"},{time:200,key:"npc_dota_hero_antimage"}]`; a radiant teammate whose kills_log also contains antimage (must be ignored); `radiant_score 30`; items map has `black_king_bar` (4050), `power_treads` (1400), `blink` (2250).

| Test | Assertion |
|---|---|
| not in match | accountId 7 -> `null` |
| unparsed | `version: null` -> `{ parsed: false }` |
| item timings | purchase_log `[blink@600, power_treads@300, black_king_bar@1122, blink@1500, recipe_x@50]` -> keys `["blink","black_king_bar"]`, seconds `[600,1122]`, only BKB `isBkb` (also covers "skips unknown items") |
| kill participation | -> `50`; with `radiant_score 0` -> `null`; dire player uses `dire_score` |
| deaths to heroes | -> `[3, 12]` (teammate entry ignored) |
| wards | `obs_placed 2, sen_placed null` -> `observers 2, sentries 0` |
| `goldChartPath` | `[]` and `[500]` -> `""`; `[0,0]` -> `""`; `[0,100]` with 100x50 -> starts `"M0,50"`, contains `"L100,0"`, ends `"Z"`, no `"NaN"` |
| `formatDuration` | 2464 -> `"41:04"`; 59 -> `"0:59"`; -77 -> `"-1:17"` |
| `timeAgo` | now - 30 s -> `"just now"`; -5 min -> `"5 min ago"`; -2 h -> `"2 h ago"`; -3 d -> `"3 d ago"`; -65 d -> `"2 mo ago"` |

- [ ] **Step 2:** `npm test` -> new tests FAIL.
- [ ] **Step 3:** Implement the functions.
- [ ] **Step 4:** `npm test`, lint, tsc -> pass.
- [ ] **Step 5:** Commit `feat: match detail + format helpers with tests`.

---

### Task 3: Split OpenDota fetchers; linked account helper

**Files:**
- Modify: `src/lib/opendota.ts` (keep: cache helper, player/rank; remove matches + heroes code)
- Create: `src/lib/opendota-heroes.ts`, `src/lib/opendota-matches.ts`, `src/lib/linked-account.ts`
- Modify: `src/components/MedalBadge.tsx`, `src/components/SteamLogin.tsx` (use `linked-account.ts`)

**Interfaces — Consumes:** types from Task 1/2; `toMatchSummary`, `toMatchDetail`.
**Produces:**
- `opendota.ts`: `export async function fetchJson<T>(path: string): Promise<T>` (uncached, throws on non-OK or timeout 8 s); `export async function getJson<T>(path: string, cacheSeconds: number): Promise<T | null>` (cached via existing `cachedJson`, which now calls `fetchJson`). `getOpenDotaPlayer`, `getPlayerRank`, `PlayerRank`, `OpenDotaPlayer` unchanged.
- `opendota-heroes.ts`: `getTrendingHeroes(medalTier?)` + `HeroTrend` (moved as is); `getHeroIndex(): Promise<Map<number, HeroInfo>>` (from `/heroStats`, 6 h; slug = `name` minus `npc_dota_hero_`); `getItemIndex(): Promise<{ byId: Map<number, ItemInfo>; byKey: Map<string, ItemInfo> }>` (from `/constants/items`, 1 day = 86400; image = `https://cdn.cloudflare.steamstatic.com` + `img`, strip the `?t=...` query). Delete `getHeroNames`.
- `opendota-matches.ts`:
  - `getRecentMatches(accountId: string): Promise<MatchSummary[] | null>` — `null` = OpenDota failed, `[]` = no public matches. Path: `/players/{id}/matches?limit=100&project=hero_id&project=kills&project=deaths&project=assists&project=gold_per_min&project=xp_per_min&project=last_hits&project=hero_damage&project=item_0&project=item_1&project=item_2&project=item_3&project=item_4&project=item_5&project=lane_role&project=version`, cache 300 s, mapped with `toMatchSummary`.
  - `type MatchDetailResult = { kind: "ok"; detail: MatchDetail } | { kind: "not-in-match" } | { kind: "error" }`
  - `getMatchDetail(matchId: number, accountId: string): Promise<MatchDetailResult>` — inner `'use cache'` function `(matchId, accountId)` calls `fetchJson<RawMatchDetail>("/matches/{id}")` (raw JSON is NOT cached on its own), `getItemIndex`, `getHeroIndex`, then `toMatchDetail(raw, Number(accountId), items.byKey, heroes)`; `cacheLife({ revalidate: 604800 })` for parsed results and `cacheLife({ revalidate: 3600 })` for `{ parsed: false }` (call `cacheLife` after the fetch; if Next rejects a late call, use 3600 for all and note it). Outer function catches -> `{ kind: "error" }`; `null` from `toMatchDetail` -> `not-in-match`.
- `linked-account.ts`: `getLinkedSteamId(): Promise<string | null>` (cookie -> `readSession`); `getLinkedAccountId(): Promise<string | null>` (-> `dotaAccountId`).

- [ ] **Step 1:** Make the moves/additions above; update `MedalBadge` (`getLinkedAccountId`) and `SteamLogin` (`getLinkedSteamId`). Check `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md` for calling `cacheLife` after an `await`.
- [ ] **Step 2:** `npx tsc --noEmit`, `npm run lint`, `npm test` -> pass; each new/changed file under 200 lines.
- [ ] **Step 3:** `npm run build` -> exit 0 (validates `'use cache'` usage).
- [ ] **Step 4:** `npm run dev`, signed in with Steam linked: medal pill and Steam pill still show (regression check).
- [ ] **Step 5:** Commit `refactor: split OpenDota fetchers, add match list/detail + item index`.

---

### Task 4: `GET /api/matches/[id]`

**Files:**
- Create: `src/lib/match-id.ts`, `src/app/api/matches/[id]/route.ts`
- Test: `src/lib/match-id.test.ts`
- Modify: `package.json` (dependency `zod`)

**Interfaces — Consumes:** `getLinkedAccountId`, `getMatchDetail`. **Produces:** `parseMatchId(raw: string): number | null` (zod: 1-19 digits, safe positive integer); route returns JSON `MatchDetail` (200) or `{ error: string }`.

- [ ] **Step 1:** `npm i zod`. Check the route handler docs in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` for the Next 16 `params` shape.
- [ ] **Step 2: Failing tests** for `parseMatchId`: `"9086993848"` -> `9086993848`; `"abc"`, `""`, `"-1"`, `"0"`, `"12.5"`, `"1234567890123456789012345"` -> `null`.
- [ ] **Step 3:** `npm test` -> FAIL. Implement `parseMatchId`. `npm test` -> PASS.
- [ ] **Step 4:** Route handler, in this order and with this exact copy:
  1. Clerk `auth()`; no `userId` -> 401 `{ error: "Sign in first." }`
  2. `parseMatchId` null -> 400 `{ error: "Invalid match id." }`
  3. `getLinkedAccountId()` null -> 400 `{ error: "Link Steam first." }`
  4. `getMatchDetail`: `error` -> 502 `{ error: "Could not load this match. Try again." }`; `not-in-match` -> 404 `{ error: "You are not in this match." }`; `ok` -> 200 `detail`.
- [ ] **Step 5:** tsc, lint, test, build -> pass. Manual: signed in, `/api/matches/abc` -> 400 JSON; signed out -> 401.
- [ ] **Step 6:** Commit `feat: match detail API route`.

---

### Task 5: Stats page with real data

**Files:**
- Create: `src/components/StatsView.tsx`, `src/components/PlayerDataNotice.tsx`, `src/components/AuthHeroArt.tsx`
- Modify: `src/app/(site)/page.tsx`, `src/components/PageBackdrop.tsx`, `src/components/HeroHeadline.tsx`, `src/components/PlayerStats.tsx`, `src/lib/hero-images.ts`, `src/components/AuthShell.tsx`
- Delete: `src/lib/player-stats.ts`

**Interfaces — Consumes:** `getLinkedAccountId`, `getRecentMatches`, `getHeroIndex`, `summarize`, `PlayerSummary`, `heroRender`, `heroPortrait`.
**Produces:**
- `PlayerDataNotice({ reason }: { reason: "not-linked" | "no-matches" | "error" })` (reused in Task 6). Copy: not-linked -> "Link Steam to see your stats" + a Link Steam button to `/api/auth/steam`; no-matches -> "No public matches found. In Dota 2: Settings > Options > Social > Expose Public Match Data."; error -> "Could not load your stats. Try again in a minute."
- `PageBackdrop({ heroSlug }: { heroSlug?: string })` — no slug: plain `bg-ink` (as today). With slug: `heroRender(slug)` as a still `next/image` in the existing hero stage position (right half on desktop, bottom on phones), keeping the existing left-to-right dark gradient. No video, no blur layer.
- `HeroHeadline({ summary }: { summary: PlayerSummary })`, `PlayerStats({ summary }: { summary: PlayerSummary })`.

- [ ] **Step 1: Cleanup.** `hero-images.ts`: delete `heroAnimation`, `HeroArt`, `uploadedHeroArt` and the ursa import (keep `heroPortrait`, `heroRender`). `git rm public/heroes/ursa.jpg`. Delete `player-stats.ts`.
- [ ] **Step 1b: Sign-in art.** New async server component `AuthHeroArt` (`src/components/AuthHeroArt.tsx`): `getLinkedAccountId` -> `getRecentMatches` -> `summarize` with `getHeroIndex`; renders `heroRender(slug)` as a still image in the gap between the welcome copy and the Clerk card (desktop) / behind the copy (phones), or `null` when there is no cookie, no matches, or an error. `AuthShell` renders it inside `<Suspense fallback={null}>` where the Ursa image was; the live wallpaper video stays.
- [ ] **Step 2: Headline copy.** Kicker "Your most played hero"; title = `mostPlayed.hero.name`. Lane emblem replaces the position emblem: number badge removed, icon per lane `1 Sword "Safe lane"`, `2 Crosshair "Mid lane"`, `3 Shield "Off lane"`, `4 Trees "Jungle"`, small label "Main lane". Stat strip: "Matches" = `mostPlayed.matches`; "Win rate" = `Math.round(winRate)%`; "Main lane share" = `mainLane.share%`. Emblem and share hidden when `mainLane` is null.
- [ ] **Step 3: Panels.** Keep current visuals, feed from `summary`: Last 100 (`wins`, `losses`, rate bar, `last10`); Records (4 rows, values with `toLocaleString("en-US")`, portrait from `heroPortrait(hero.slug)`; render a neutral box when slug is ""); Averages: Kills/Deaths/Assists 1 decimal, GPM/XPM/Last hits whole numbers.
- [ ] **Step 4: `StatsView` (async server component).** `getLinkedAccountId` -> null: notice `not-linked`; `getRecentMatches` -> null: `error`, `[]`: `no-matches`; else `summarize` with `getHeroIndex()` and render `PageBackdrop heroSlug` + `PlayerStats`. Notices render with plain `<PageBackdrop />`. `page.tsx` wraps `StatsView` in `<Suspense>` with a skeleton of the 3 panels (`glass-panel` blocks, `animate-pulse`).
- [ ] **Step 5:** tsc, lint, test, build -> pass; `grep -rn "player-stats\|uploadedHeroArt\|heroAnimation\|ursa.jpg" src` -> no results.
- [ ] **Step 6: Manual (user):** signed in + Steam linked -> real hero name, render on the right, real numbers; unlink Steam -> "Link Steam to see your stats"; sign out with Steam still linked -> sign-in page shows your most played hero; with no Steam cookie -> only the wallpaper video; phone width (390 px) OK.
- [ ] **Step 7:** Commit `feat: stats page with real OpenDota data`.

---

### Task 6: History page, nav renames, Trending Heroes placeholder

**Files:**
- Move: `src/app/(site)/play` -> `src/app/(site)/history`, `src/app/(site)/reviews` -> `src/app/(site)/heroes` (`git mv`)
- Modify: `src/lib/site-content.ts` (`navItems`), both moved `page.tsx` files
- Create: `src/components/HistoryList.tsx`, `src/components/MatchRow.tsx`, `src/components/MatchDetailPanel.tsx`, `src/components/GoldChart.tsx`

**Interfaces — Consumes:** `getLinkedAccountId`, `getRecentMatches`, `getHeroIndex`, `getItemIndex`, `PlayerDataNotice`, `timeAgo`, `formatDuration`, `goldChartPath`, `MatchDetail`, `/api/matches/[id]`.
**Produces:**
- `MatchRowData` (exported from `MatchRow.tsx`, serializable): `{ id: number; heroName: string; heroSlug: string; won: boolean; ranked: boolean; kills: number; deaths: number; assists: number; gpm: number; durationMinutes: number; ago: string; itemImages: (string | null)[] }` (6 entries, null = empty).
- `MatchRow({ match }: { match: MatchRowData })` ("use client"), `MatchDetailPanel({ detail }: { detail: MatchDetail })`, `GoldChart({ values }: { values: number[] })`.

- [ ] **Step 1: Routes + nav.** `git mv` both folders. `navItems`: replace Reviews with `{ label: "Trending Heroes", href: "/heroes" }` and Let's play with `{ label: "History", href: "/history" }` (same positions). `heroes/page.tsx`: title `Trending Heroes · ${site.gameTitle}`, `<SectionPlaceholder title="Trending Heroes" />`. `history/page.tsx`: title `History · ${site.gameTitle}`, `<PageBackdrop />`, heading "History", `<Suspense>` (skeleton: 8 row-height `glass-panel` bars) around `<HistoryList />`.
- [ ] **Step 2: `HistoryList` (async server).** Same three notices as Stats via `PlayerDataNotice` (after reading the cookie). Compute `now = Date.now()` after `getLinkedAccountId` (Cache Components needs the dynamic read first). Map each `MatchSummary` to `MatchRowData` with hero index + `itemIndex.byId`; render a list of `MatchRow`.
- [ ] **Step 3: `MatchRow`.** Collapsed row: hero portrait + name, "Win"/"Loss" (`text-radiant`/`text-dire`), "Ranked" tag, `K/D/A`, `GPM`, `durationMinutes min`, `ago`, 6 item icons (empty slot = dim box), `ChevronDown` rotating on open. Button with `aria-expanded`. First open: `fetch(\`/api/matches/${id}\`)`; state `idle | loading | ready(detail) | failed(message)`; re-open never refetches. Loading: skeleton; failed: the response's `error` or "Could not load this match. Try again.".
- [ ] **Step 4: `MatchDetailPanel` + `GoldChart`.** Load the `dataviz` skill before writing `GoldChart`. `parsed: false` -> "OpenDota hasn't parsed this match yet." Otherwise: "Gold earned" chart (`goldChartPath`, minute ticks every 10 min, renders nothing for `""`), item timings as icon + `formatDuration(seconds)` with BKB highlighted (accent ring), "Kill participation N%" (hidden when null), "Wards: N observer · N sentry", "Deaths to heroes: 3', 12'" (or "No deaths to heroes").
- [ ] **Step 5:** tsc, lint, test, build -> pass. `grep -rn "/play\|/reviews" src` -> no results.
- [ ] **Step 6: Manual (user):** History shows 100 rows matching Stats' W/L; open a ranked match -> chart, item timings, KP, wards, deaths; reopen -> no second network request (DevTools); phone width OK; nav shows "Trending Heroes" and "History" and both highlight when active.
- [ ] **Step 7:** Commit `feat: history page with inline match details; rename nav`.

---

### Task 7: Final verification

- [ ] **Step 1:** `npm test && npx tsc --noEmit && npm run lint && npm run build` -> all exit 0.
- [ ] **Step 2:** `python -m graphify update .` (keeps the code graph current).
- [ ] **Step 3:** Request code review (superpowers:requesting-code-review) on `feature/stats-history`, then superpowers:finishing-a-development-branch.
