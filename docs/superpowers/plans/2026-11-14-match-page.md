# Match Page + Match Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full match page `/matches/[matchId]` (scoreboard first; Story, Laning, Graphs, Combat, Map, Items & Log tabs; one shared time scrubber) and automatic saving of the player's matches (full OpenDota JSON) in Supabase via Drizzle.

**Architecture:** All raw-match interpretation is pure, unit-tested code (`match-rows.ts`, `match-view-*.ts`) that turns the stored OpenDota JSON into a serializable view model on the server. `match-store.ts` is the only database/OpenDota read path for a single match. One client `MatchExplorer` owns the interactive state (followed player, tab, time, playback) and renders presentational tab components.

**Tech Stack:** Next.js 16.4 (Cache Components), React 19, TypeScript, Tailwind 4, Drizzle ORM + drizzle-kit, postgres (postgres-js), Supabase Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-14-match-page-design.md`

## Global Constraints

- Read `AGENTS.md`; check `node_modules/next/dist/docs/` before using a Next API. `after` is `import { after } from "next/server"`.
- Database code is server-only. `DATABASE_URL` = Supabase transaction pooler URL (port 6543); postgres-js with `prepare: false`.
- Both tables have Row Level Security enabled with no policies.
- Before the first migration, list existing tables (read-only); stop and ask the user if `matches` or `player_matches` already exist.
- Raw match JSON (~270 KB) never reaches the browser; only the view model does.
- No `any`, no `console.log`, `===` only, files under 200 lines, never show raw errors.
- Remote Valve/OpenDota images use `next/image` with `unoptimized`.
- Charts: one y axis, crosshair + tooltip, Radiant `#92c84a` / Dire `#e2492f` only for team identity, accent `#feba87` for the followed player, text in text colours.
- `prefers-reduced-motion`: no playback animation, no fade-ins.
- `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` pass at the end of every task.
- Branch: `feature/stats-history` (continue on it).
- No new top-level folders (AGENTS.md): migrations live in `src/db/migrations/`, one-off DB scripts in `src/db/scripts/`.

## Review Focus

1. **Player not in the match / anonymous accounts** (`account_id` null for several players) -> page renders; follows the first player; scoreboard shows "Anonymous". Test: Task 2 "follows first player when linked player absent", "anonymous name".
2. **Unparsed match** (no `version`, no logs/series) -> banner + scoreboard render, every tab shows the Analyse card, no crash on missing arrays. Test: Task 3 "unparsed match has no series/events", Task 4 "unparsed map/combat/log are null".
3. **Ward never removed** (no matching `*_left_log`) -> alive until match end. Test: Task 4 "ward without left log stays alive".
4. **Database down or `DATABASE_URL` missing** -> page still loads from OpenDota, sync silently skipped. Test: Task 1 `pickMatchesToSync` handles empty stored list; Task 6 manual check with `DATABASE_URL` unset.
5. **Scrubber time outside the match** (negative pre-horn times, cursor at end) -> events with negative time are shown at 0:00; cursor clamps to [0, duration]. Test: Task 3 "eventsNear clamps negative times".

---

### Task 1: Raw match types, row mapping and sync picking (pure)

**Files:**
- Create: `src/types/opendota-match.ts`, `src/lib/match-rows.ts`
- Test: `src/lib/match-rows.test.ts`

**Interfaces — Produces** (`src/types/opendota-match.ts`): `RawFullMatch` = `RawMatchDetail` (from `@/types/opendota`) plus optional `match_id`, `start_time`, `duration`, `radiant_win`, `lobby_type`, `radiant_gold_adv: number[]`, `radiant_xp_adv: number[]`, `objectives: RawObjective[]`, `teamfights: RawTeamfight[]`, `chat: RawChat[]`, and `players: RawFullPlayer[]`. `RawFullPlayer` = `RawDetailPlayer` plus optional `personaname`, `lane_role`, `position_est`, `networth_t`, `lh_t`, `dn_t`, `xp_t`, `deaths_log: {time:number; key:string}[]`, `obs_log`/`sen_log`/`obs_left_log`/`sen_left_log: {time:number; x:number; y:number; ehandle?:number}[]`, `lane_pos: Record<string, Record<string, number>>`, `damage_targets: Record<string, Record<string, number>>`, `item_0..item_5`. `RawObjective {time; type; key?; team?}`, `RawTeamfight {start; end; deaths; players: {deaths_pos: Record<string, Record<string, number>>; gold_delta: number}[]}`, `RawChat {time; type; key; player_slot?}`. Mark every new field optional (`?: T | null`).

`src/lib/match-rows.ts`:
- `interface MatchRow { matchId: number; parsed: boolean; startTime: Date; durationS: number; radiantWin: boolean; data: RawFullMatch }`
- `interface PlayerMatchRow { accountId: number; matchId: number; heroId: number; playerSlot: number; won: boolean }`
- `toMatchRows(raw: RawFullMatch): { match: MatchRow; players: PlayerMatchRow[] }` — players only with non-null `account_id`; `parsed` = `version` not null/undefined.
- `interface StoredMatchInfo { matchId: number; parsed: boolean; fetchedAt: Date }`
- `pickMatchesToSync(recentIds: number[], stored: StoredMatchInfo[], now: Date, limit: number): number[]` — ids not stored first (in `recentIds` order), then stored unparsed with `fetchedAt` older than 1 hour; at most `limit`.

- [ ] **Step 1: Failing tests** (`match-rows.test.ts`):

| Test | Assertion |
|---|---|
| maps match row | raw `{match_id: 9, start_time: 1794497398, duration: 2464, radiant_win: true, version: 22}` -> `startTime` = `new Date(1794497398000)`, `durationS 2464`, `parsed true`, `data` is the same object |
| unparsed | no `version` key -> `parsed false` |
| player rows | players with account ids 42 (slot 1) and null (slot 2) and 7 (slot 129), radiant wins -> 2 rows; 42 `won true`, 7 `won false` |
| pick missing first | recent `[1,2,3]`, stored `[{2, parsed}]` -> `[1,3]` |
| pick stale unparsed | stored `{1, unparsed, fetched 2 h ago}`, `{2, unparsed, 10 min ago}` -> `[1]` |
| pick limit | 8 missing ids, limit 5 -> first 5 |
| empty stored | recent `[1,2]`, stored `[]` -> `[1,2]` (Review Focus 4) |

- [ ] **Step 2:** `npm test` -> new suite FAILS (module not found).
- [ ] **Step 3:** Implement the types and both functions.
- [ ] **Step 4:** `npm test`, tsc, lint -> pass.
- [ ] **Step 5:** Commit `feat: raw match types, match row mapping and sync picking`.

---

### Task 2: Scoreboard, followed player, lane opponents (pure)

**Files:**
- Create: `src/types/match-view.ts`, `src/lib/match-view-players.ts`
- Test: `src/lib/match-view-players.test.ts`

**Interfaces — Produces** (`src/types/match-view.ts`):
```ts
export type Team = "radiant" | "dire";
export interface ScoreboardPlayer {
  slot: number; accountId: number | null; isLinked: boolean; team: Team; name: string; hero: HeroInfo;
  lane: LaneRole | null; position: number | null; kills: number; deaths: number; assists: number;
  netWorth: number; gpm: number; xpm: number; lastHits: number; denies: number; level: number;
  heroDamage: number; towerDamage: number; healing: number;
  items: (ItemInfo | null)[]; neutral: ItemInfo | null; scepter: boolean; shard: boolean;
}
```
`src/lib/match-view-players.ts`:
- `toScoreboard(raw: RawFullMatch, heroes: Map<number, HeroInfo>, items: ItemIndex, linkedAccountId: number | null): ScoreboardPlayer[]` — Radiant first, each team by slot; `name` = `personaname` or `"Anonymous"`; `lane` from `lane_role` (1-4 else null); unknown hero -> `heroOf` fallback (from `@/lib/player-breakdowns`).
- `defaultFollowedSlot(players: ScoreboardPlayer[]): number` — linked player's slot, else first player's slot.
- `laneOpponents(players: ScoreboardPlayer[], lastHitsAt10: Record<number, number>): Record<number, number | null>` — facing lane: same team-relative rule as spec (Radiant 1<->Dire 3, Radiant 3<->Dire 1, 2<->2, 4 -> null); ties -> most last hits at 10.

- [ ] **Step 1: Failing tests:** order radiant-then-dire; `isLinked` only for 42; "Anonymous" for missing personaname; follows linked slot; **follows first player when linked player absent**; mid opponent is enemy mid; Radiant safe (1) faces Dire off (3); two Dire off-laners -> one with more last hits at 10; jungle -> null; items map 0 -> null and 116 -> BKB `ItemInfo`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** pass + tsc + lint. **Step 5:** commit `feat: match scoreboard, followed player and lane opponents`.

---

### Task 3: Series, events, time helpers (pure)

**Files:**
- Create: `src/lib/match-view-timeline.ts`
- Modify: `src/types/match-view.ts`
- Test: `src/lib/match-view-timeline.test.ts`

**Interfaces — Produces:**
```ts
export interface MatchSeries { radiantGoldAdv: number[]; radiantXpAdv: number[]; netWorth: Record<number, number[]>; lastHits: Record<number, number[]>; xp: Record<number, number[]> }
export type MatchEventKind = "kill" | "death" | "item" | "roshan" | "aegis" | "tower" | "teamfight";
export interface MatchEvent { time: number; kind: MatchEventKind; slot: number | null; team: Team | null; label: string; image: string | null }
```
- `toSeries(raw: RawFullMatch): MatchSeries | null` — null when unparsed; per-slot arrays from `networth_t`, `lh_t`, `xp_t` (missing -> `[]`).
- `toEvents(raw: RawFullMatch, players: ScoreboardPlayer[], items: ItemIndex): MatchEvent[]` — sorted by time, empty when unparsed. Kills from `kills_log` (`label` "Killed <hero>"), deaths from `deaths_log` ("Died to <hero>"), items: first purchase of cost >= 2000 ("Bought <item>", `image` = icon), Roshan/Aegis from objectives (team from `team` 2 radiant / 3 dire), towers from `building_kill` keys containing `tower` ("Dire tier 1 top destroyed"), teamfights ("Teamfight: N deaths", `time` = start). Hero names via the scoreboard's `npc_dota_hero_<slug>` matching; unknown key -> "unknown hero".
- `eventsNear(events: MatchEvent[], time: number, windowSeconds: number): MatchEvent[]` — events within the window, times below 0 treated as 0.
- `clampTime(time: number, durationSeconds: number): number` — [0, duration].

- [ ] **Step 1: Failing tests:** **unparsed match has no series/events** (`toSeries` null, `toEvents` []); events sorted and labelled for one kill, one death, one BKB at 1122 s, one Roshan (team 2), one `npc_dota_badguys_tower1_top` -> "Dire tier 1 top destroyed"; **eventsNear clamps negative times** (purchase at -77 is "near" 0 with window 30); `clampTime(-5, 100) === 0`, `clampTime(150, 100) === 100`.
- [ ] **Step 2-5:** RED, implement, GREEN, commit `feat: match series, events and time helpers`.

---

### Task 4: Map, combat, log (pure)

**Files:**
- Create: `src/lib/match-view-map.ts`, `src/lib/match-view-combat.ts`
- Modify: `src/types/match-view.ts`
- Test: `src/lib/match-view-map.test.ts`, `src/lib/match-view-combat.test.ts`

**Interfaces — Produces:**
```ts
export interface MapPoint { x: number; y: number }           // 0-100, y grows downward (SVG)
export interface WardMark extends MapPoint { kind: "observer" | "sentry"; team: Team; placedAt: number; removedAt: number | null }
export interface DeathMark extends MapPoint { time: number; team: Team }   // team of the hero who died
export interface TowerMark extends MapPoint { key: string; team: Team; destroyedAt: number | null }
export interface HeatCell extends MapPoint { weight: number }              // 0-1
export interface MatchMap { wards: WardMark[]; deaths: DeathMark[]; towers: TowerMark[]; laneHeat: Record<number, HeatCell[]> }
export interface MatchCombat { damage: Record<number, Record<number, number>>; teamfights: { start: number; end: number; deaths: number; radiantGoldSwing: number }[] }
export interface MatchLog { chat: { time: number; slot: number | null; text: string }[]; purchases: Record<number, { time: number; item: ItemInfo }[]> }
```
`match-view-map.ts`:
- `toMapPoint(cellX: number, cellY: number): MapPoint` — cells 64..192 -> 0..100, `y = 100 - ...`, clamped to [0, 100].
- `TOWER_CELLS: Record<string, [number, number]>` — approximate cells for all 22 towers keyed by building key suffix (`goodguys_tower1_top` ...), values from this table (Radiant `goodguys`, Dire `badguys`):
  top t1 (70,150)/(106,186), t2 (70,120)/(136,186), t3 (72,96)/(160,184); mid t1 (110,108)/(146,148), t2 (98,96)/(158,160), t3 (86,86)/(170,170); bot t1 (150,70)/(186,106), t2 (120,70)/(186,136), t3 (96,72)/(184,160); t4 (78,80),(80,78)/(176,178),(178,176) (`tower4` twice per team: keys `tower4_a`, `tower4_b`, matched in kill order). The Map tab labels positions "approximate".
- `toMatchMap(raw: RawFullMatch, players: ScoreboardPlayer[]): MatchMap | null` — null when unparsed. Wards: each `obs_log`/`sen_log` entry paired with the first later `*_left_log` entry at the same `ehandle` (else same x/y) -> `removedAt`, unmatched -> null. Deaths: every `teamfights[].players[i].deaths_pos` cell (player index = `players` order of `raw.players`), `time` = fight start. Towers: `TOWER_CELLS` with `destroyedAt` from `building_kill`. Lane heat: `lane_pos` counts normalised to the player's max.
- `wardsAliveAt(wards: WardMark[], time: number): WardMark[]`, `towersStandingAt(towers: TowerMark[], time: number): TowerMark[]`.

`match-view-combat.ts`:
- `toCombat(raw: RawFullMatch, players: ScoreboardPlayer[]): MatchCombat | null` — damage summed over all abilities in `damage_targets` per enemy hero slot; teamfight `radiantGoldSwing` = sum of Radiant players' `gold_delta` minus Dire's.
- `toLog(raw: RawFullMatch, items: ItemIndex): MatchLog | null` — chat `type === "chat"` -> `key` as text, chat wheel -> `"(chat wheel)"`; purchases per slot from `purchase_log` with known items.

- [ ] **Step 1: Failing tests:** `toMapPoint(64,64)` -> `{x:0,y:100}`, `(192,192)` -> `{x:100,y:0}`, out of range clamps; ward placed at 333 with matching left log at 600 -> `removedAt 600`; **ward without left log stays alive** (`wardsAliveAt(w, 99999)` includes it); `towersStandingAt` drops a tower destroyed at 822 when time is 900; damage matrix sums `null` + ability rows for the same target; teamfight swing sign; chat text vs chat wheel; **unparsed map/combat/log are null**.
- [ ] **Step 2-5:** RED, implement, GREEN, commit `feat: match map, combat and log view data`.

---

### Task 5: Database setup (needs the user's `DATABASE_URL`)

**Files:**
- Create: `src/db/schema.ts` (replace placeholder), `src/db/index.ts` (replace placeholder), `drizzle.config.ts` (`out: "./src/db/migrations"`), `src/db/migrations/` (generated), `src/db/scripts/check-db.ts`
- Modify: `package.json` (deps + `"db:generate"`, `"db:migrate"` scripts), `.env.example` (comment on `DATABASE_URL`)

- [ ] **Step 1:** `npm i drizzle-orm postgres` and `npm i -D drizzle-kit tsx`. Read drizzle's docs in `node_modules/drizzle-orm` README or https://orm.drizzle.team for `pgTable(...).enableRLS()` support in the installed version.
- [ ] **Step 2:** Schema exactly as the spec tables (`matches`, `player_matches` with composite PK and cascade FK, indexes `player_matches_account_idx`, `matches_start_time_idx`), both `.enableRLS()`. `src/db/index.ts`: `export const db` = `drizzle(postgres(process.env.DATABASE_URL, { prepare: false }), { schema })`, plus `export function hasDatabase(): boolean` (URL set).
- [ ] **Step 3:** **Stop and ask the user** to put the Supabase transaction-pooler URL in `.env.local` as `DATABASE_URL` (Supabase dashboard > Connect > Transaction pooler). Never ask for the password in chat.
- [ ] **Step 4:** `src/db/scripts/check-db.ts` lists tables in `public` (read-only). Run with `npx tsx --env-file=.env.local src/db/scripts/check-db.ts`. If `matches` or `player_matches` exist -> stop and ask.
- [ ] **Step 5:** `npm run db:generate`; read the SQL (must contain both `CREATE TABLE`s and `ENABLE ROW LEVEL SECURITY`); `npm run db:migrate`; rerun check script -> both tables listed.
- [ ] **Step 6:** tsc, lint, test, build; commit `feat: drizzle schema and migration for matches`.

---

### Task 6: Match store, background sync, detail API on the store

**Files:**
- Create: `src/lib/match-store.ts`, `src/db/scripts/roundtrip-match.ts`
- Modify: `src/lib/opendota-matches.ts` (`getMatchDetail` uses `loadMatch`), `src/components/StatsView.tsx`, `src/components/HistoryList.tsx` (`after`)

**Interfaces — Consumes:** `db`, `hasDatabase`, schema; `toMatchRows`, `pickMatchesToSync`; `fetchJson`. **Produces:**
- `getMatch(matchId: number): Promise<{ data: RawFullMatch; parsed: boolean; fetchedAt: Date } | null>`
- `saveMatch(raw: RawFullMatch): Promise<void>` (one transaction: upsert match, delete + insert player rows)
- `loadMatch(matchId: number): Promise<RawFullMatch | null>` (spec rules; every DB error caught -> behave as "not stored"; no DB -> OpenDota only)
- `syncRecentMatches(accountId: string, recentMatchIds: number[]): Promise<void>` (limit 5, ~1000 ms between OpenDota fetches)

- [ ] **Step 1:** Implement the store. `getMatchDetail(matchId, accountId)` keeps its `MatchDetailResult` contract but reads `loadMatch` (drop its `'use cache'` OpenDota fetch; `toMatchDetail` unchanged).
- [ ] **Step 2:** In `StatsView` and `HistoryList`, after the match list is known: `after(() => syncRecentMatches(accountId, matches.map((m) => m.id)))`.
- [ ] **Step 3:** `src/db/scripts/roundtrip-match.ts`: `saveMatch` on one real match from the user's history, `getMatch` it back, print `parsed`, player row count, JSON size. Run with tsx + `--env-file`. Expected: row found, 10 players' worth of `player_matches` rows for named players.
- [ ] **Step 4:** Manual: unset `DATABASE_URL` in a shell, `npm run build && npx next start`, History detail still loads (Review Focus 4).
- [ ] **Step 5:** tsc, lint, test, build; commit `feat: match store with background sync; match detail reads the store`.

---

### Task 7: Match page shell — route, banner, scoreboard, tabs, scrubber, Story; entry links

**Files:**
- Create: `src/lib/match-view.ts` (`toMatchView`), `src/app/(site)/matches/[matchId]/page.tsx`, `src/components/match/MatchExplorer.tsx` ("use client"), `MatchBanner.tsx`, `Scoreboard.tsx`, `MatchTabs.tsx`, `TimeScrubber.tsx`, `StoryTab.tsx`, `NotParsedCard.tsx`
- Modify: `src/types/match-view.ts` (`MatchView`), `src/types/opendota.ts` + `src/lib/player-summary.ts` (records gain `matchId: number`), `src/components/PlayerStats.tsx` (record rows link to `/matches/{matchId}`), `src/components/MatchRow.tsx` + `MatchDetailPanel.tsx` ("Full match" link)
- Test: `src/lib/match-view.test.ts`, extend `src/lib/player-summary.test.ts`

**Interfaces — Produces:**
```ts
export interface MatchView {
  matchId: number; parsed: boolean;
  header: { radiantWin: boolean; radiantScore: number; direScore: number; durationSeconds: number; startTime: number; ranked: boolean };
  players: ScoreboardPlayer[]; defaultFollowedSlot: number; laneOpponent: Record<number, number | null>;
  series: MatchSeries | null; events: MatchEvent[]; map: MatchMap | null; combat: MatchCombat | null; log: MatchLog | null;
}
export function toMatchView(raw: RawFullMatch, heroes: Map<number, HeroInfo>, items: ItemIndex, linkedAccountId: number | null): MatchView
```
- `MatchExplorer({ view }: { view: MatchView })`: state `followedSlot`, `tab` (synced to `?tab=`; values `story|laning|graphs|combat|map|log`), `time` (seconds), `playing`, `speed` (4 | 8). Playback with `requestAnimationFrame`, off under reduced motion.
- `TimeScrubber`: range input (keyboard accessible) + SVG markers from `view.events` for the followed player and objectives; clicking a marker sets time.
- Page: `parseMatchId` -> `notFound()` if null; `loadMatch` + `getHeroIndex` + `getItemIndex` + `getLinkedAccountId`; null -> on-theme "Could not load this match. Try again." with a link to `/history`. Wrap the async part in `<Suspense>` with a skeleton. Title `Match {id} · MongolDota`.
- Unparsed: tabs render `NotParsedCard` (reuses `AnalyseMatch`, "Check again" = `router.refresh()`).

- [ ] **Step 1: Failing tests:** `toMatchView` on a fixture: header scores and `ranked`; `defaultFollowedSlot`; unparsed fixture -> `series/map/combat/log` null and `events` []; `summarize` records carry the `matchId` of the record match.
- [ ] **Step 2-3:** RED, implement view + page + components (Story tab per spec: opponent card, CS@10 and net-worth lines vs opponent via `goldChartPath`-style paths, "at this moment" card from `eventsNear(events, time, 30)`).
- [ ] **Step 4:** tsc, lint, test, build. Manual (user): History -> open match -> "Full match" -> page renders; click a Stats record -> its match.
- [ ] **Step 5:** Commit `feat: match page with scoreboard, story tab and shared time scrubber`.

---

### Task 8: Laning and Graphs tabs

**Files:** Create `src/components/match/LaningTab.tsx`, `GraphsTab.tsx`, `LineChart.tsx` (client; one axis, crosshair + tooltip, cursor line at `time`). Load the `dataviz` skill first.

- Laning: per lane, both sides' CS / denies / XP / net worth at 5 and 10 min from `series` (index 5 and 10, missing -> "—"); lane winner = higher net worth sum at 10.
- Graphs: team gold advantage and XP advantage (one chart each; above zero = Radiant colour, below = Dire colour), followed player's net worth vs lane opponent (accent vs neutral). Hover tooltip shows minute + value; the scrubber cursor is drawn on every chart and clicking a chart sets time.
- [ ] Steps: implement, tsc/lint/test/build, manual check, commit `feat: laning and graphs tabs`.

---

### Task 9: Combat, Map, Items & Log tabs

**Files:** Create `src/components/match/CombatTab.tsx`, `MapTab.tsx`, `MiniMap.tsx` (SVG: lanes, river, bases drawn in-app), `LogTab.tsx`.

- Combat: damage matrix (followed player's team rows x enemy hero columns, cell shade by share of row max, value on hover), teamfight list (time, deaths, gold swing coloured by team).
- Map: `MiniMap` with layer toggles Wards / Deaths / Towers / Lane heat (0-10 min, followed player); state at `time` via `wardsAliveAt`, `towersStandingAt`, deaths with `time <= current` fading in; caption "Positions of towers are approximate. OpenDota does not record hero movement."
- Items & Log: followed player's purchases (icon + `formatDuration`), then chat and objectives in time order.
- [ ] Steps: implement, tsc/lint/test/build, manual check (parsed and unparsed match), commit `feat: combat, map and log tabs`.

---

### Task 10: Final verification

- [ ] `npm test && npx tsc --noEmit && npm run lint && npm run build` -> all pass.
- [ ] `python -m graphify update .`
- [ ] Whole-branch review (superpowers:requesting-code-review), fix Critical/Important, then superpowers:finishing-a-development-branch.
