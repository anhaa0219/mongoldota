# Match page + match database

Date: 2026-11-14
Status: design approved in chat (data section + visual layout), awaiting spec review

## Goal

Clicking a match (History row, or a Stats record) opens a full match page: every player, lanes,
enemies, items, timelines, combat and a time-scrubbable map. Every match of the linked player is
also saved, complete, in Supabase so a future AI coach can read the exact full data.

## Decisions made in brainstorming

| Topic | Decision |
|---|---|
| What is saved | All of the player's last 100 matches, automatically (and new ones as they appear) |
| Storage | Approach A: full OpenDota `/matches/{id}` JSON in a `jsonb` column + a few indexed columns; `player_matches` index for every named player |
| Database | User's existing Supabase project, Postgres via Drizzle, server-only |
| Page structure | Scoreboard (A) first; tabs below hold "Story" (B) and "Map" (C); one shared time scrubber |
| Map honesty | Map shows only what OpenDota records with positions: wards, teamfight deaths, towers, laning heatmap. No live hero movement |

## Out of scope (own projects, already agreed order)

- Parse-all queue (asking OpenDota to parse all unparsed matches) — next project.
- History pagination, visual redesign of the rest of the site — later projects.
- The AI coach itself. Clerk user <-> Steam link table.

## Part 1 — Database

### Tables (`src/db/schema.ts`, Drizzle)

`matches`
| column | type | notes |
|---|---|---|
| `match_id` | bigint PK | |
| `parsed` | boolean not null | `version` present and not null |
| `start_time` | timestamptz not null | |
| `duration_s` | integer not null | |
| `radiant_win` | boolean not null | |
| `data` | jsonb not null | full `/matches/{id}` response, unmodified |
| `fetched_at` | timestamptz not null default now() | |

`player_matches` — one row per player with a non-null `account_id`
| column | type | notes |
|---|---|---|
| `account_id` | bigint | PK part 1 |
| `match_id` | bigint -> `matches.match_id` on delete cascade | PK part 2 |
| `hero_id` | integer not null | |
| `player_slot` | integer not null | |
| `won` | boolean not null | |

Indexes: `player_matches(account_id)`, `matches(start_time)`.

- Connection: `drizzle-orm` + `postgres` (postgres-js) with `DATABASE_URL` = Supabase **transaction pooler** URL
  (port 6543), `prepare: false`. Created once in `src/db/index.ts`, imported only by server code.
- Migrations: `drizzle-kit generate` into `drizzle/`, applied with `drizzle-kit migrate`; migration files committed.
  The first migration also enables Row Level Security on both tables with no policies, so Supabase's public
  API (anon key) cannot read them. The server connects as the database owner from `DATABASE_URL`.
- `.env.example` already lists `DATABASE_URL`; add a comment saying it must be the pooler URL.

### Store (`src/lib/match-store.ts`)

- `getMatch(matchId): Promise<StoredMatch | null>` — read one row.
- `saveMatch(raw: RawFullMatch): Promise<void>` — upsert `matches` (by `match_id`) and replace that match's
  `player_matches` rows, in one transaction.
- `loadMatch(matchId): Promise<RawFullMatch | null>` — the one read path for the page and the History panel:
  return the stored match when it is parsed, or unparsed but fetched < 1 hour ago; otherwise fetch from
  OpenDota, save, return it. If OpenDota fails, return the stored copy if any, else null.
- Pure, unit-tested helpers: `toMatchRows(raw)` (row + player rows from raw JSON) and
  `pickMatchesToSync(recentIds, stored, now, limit)` (missing ids first, then unparsed rows fetched > 1 hour
  ago; at most `limit`).

### Background sync

- `syncRecentMatches(accountId, recentMatchIds)`: picks up to **5** ids (`pickMatchesToSync`), fetches them
  from OpenDota **one at a time, ~1 s apart**, saves each. Every error is swallowed (retried next visit).
- Called with Next's `after()` from the Stats and History pages once their data has rendered, so syncing
  never delays a page. (Check `after` in `node_modules/next/dist/docs` before use.)
- The History detail panel (`/api/matches/[id]`) switches from its own OpenDota fetch to `loadMatch`.

## Part 2 — Match page `/matches/[matchId]`

Inside the `(site)` group (sign-in required). Server page: validates the id (`parseMatchId`), `loadMatch`,
maps the raw match to a **view model** on the server (the ~270 KB raw JSON never goes to the browser), and
renders. Not found / OpenDota down -> on-theme message with a link back to History.

Entry points:
- History row: a "Full match" link in the expanded panel and on the row (keyboard reachable).
- Stats Records panel: each record links to its match (records gain `matchId`).

### View model (`src/lib/match-view.ts`, pure, unit-tested)

`toMatchView(raw, heroes, items, followedAccountId)` returns everything the page shows:
- header: result, scores, duration, mode/lobby, start time, parsed flag;
- 10 players: hero, name, team, lane, estimated position (`position_est`), K/D/A, net worth, GPM/XPM,
  LH/DN, hero/tower damage, healing, level, 6 items + neutral, Aghanim's;
- per-minute series (parsed only): team gold/xp advantage, each player's `networth_t`, `lh_t`, `xp_t`;
- events (parsed only): kills/deaths (`kills_log`, `deaths_log`), big-item purchases (cost >= 2000),
  objectives (towers, barracks, Roshan, Aegis), teamfights (start/end, deaths, gold swing);
- combat: per player damage dealt to each enemy hero (`damage_targets`), kills per hero (`killed`);
- map: ward placements with time placed / removed (`obs_log`, `sen_log`, `*_left_log`), teamfight death
  positions, laning heatmap (`lane_pos`), tower kill times;
- log: chat, buybacks, purchase log per player.

### Page layout (approved mockup)

1. **Banner** — "Radiant Victory / Dire Victory", score, mode, lobby, duration, "2 h ago".
2. **Scoreboard** — Radiant then Dire; columns hero, name, lane, K/D/A, net worth, GPM, items. The linked
   player's row is highlighted. Clicking a row **follows** that player in every tab (default: linked player,
   or the first player if they are not in the match).
3. **Tabs** — Story, Laning, Graphs, Combat, Map, Items & Log. Tab choice in the URL (`?tab=`) so a link
   reopens the same tab.
4. **Shared time scrubber** under the tabs (Story, Graphs, Map): key-moment markers (kill, death, big item,
   Roshan), drag, click a marker, or play at 4x / 8x. One time value shared by those tabs.

Tabs:
- **Story (B)**: followed player's lane opponent (enemy in the facing lane: Radiant safe/off faces Dire off/safe,
  mid faces mid; if several, the one with the most last hits at 10 min; none -> card hidden), CS@10
  and net worth lines vs that opponent, and an "at this moment" card describing events near the cursor.
- **Laning**: first 10 minutes for both teams: CS, denies, XP, net worth at 5 and 10 min, lane winner per lane.
- **Graphs**: team net worth advantage and XP advantage; followed player's net worth vs the enemy laner;
  cursor synced with the scrubber; hover tooltips.
- **Combat**: damage matrix (rows: your team, columns: enemy heroes), kills per enemy hero, teamfight list.
- **Map (C)**: square minimap; layers (wards, deaths, towers, lane heatmap) toggled; state at the cursor time.
- **Items & Log**: followed player's item build with timings; chat and objectives in time order.

Unparsed match: banner and scoreboard render from basic stats; every tab shows the existing
"Analyse with OpenDota" card instead.

### Interactivity and feel

- Client components only where interaction lives (scoreboard selection, tabs, scrubber, charts, map);
  shared state in one client `MatchExplorer` (followed player, time, playing).
- Motion: scrubber playback animates the cursor; markers and map points fade in as time passes;
  `prefers-reduced-motion` disables playback animation.
- Charts follow the dataviz rules: one axis, recessive grid, crosshair + tooltip, Radiant/Dire colours only
  for team identity, text in text colours.

## Errors

- Never show raw errors (AGENTS.md). Database down: page still works from OpenDota (no save); sync skipped.
- Invalid match id -> 404 page. OpenDota down and match not stored -> "Could not load this match. Try again."

## Testing

- Unit (Vitest): `toMatchRows`, `pickMatchesToSync`, `toMatchView` (lane opponent pick, followed-player
  default, unparsed path, event ordering, ward alive-at-time, tower state at time), scrubber time helpers.
- Database: run the migration against the user's Supabase, save a real match, read it back
  (one-off script, not in the unit suite).
- `tsc`, lint, build; manual check of the page on a real match from the user's last 100 (user's session).
