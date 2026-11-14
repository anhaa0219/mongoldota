# Stats + History with real OpenDota data

Date: 2026-11-14
Status: approved in chat, awaiting spec review

## Goal

Replace the mock Stats page with the linked player's real data from OpenDota, and turn the
"Let's play" placeholder into a History page listing the last 100 matches, each expandable to
show match details. No database: OpenDota is the source of truth and responses are cached.

## Decisions made in brainstorming

| Topic | Decision |
|---|---|
| MMR | OpenDota's `computed_mmr` estimate, shown as `~3,450 MMR`. No user-entered MMR, no +/-25 tracking. |
| Medal | Separate pill left of the Steam pill (already built: `MedalBadge`). |
| Nav | "Let's play" -> **History** (`/history`). "Reviews" -> **Trending Heroes** (`/heroes`), placeholder for now. |
| Most played hero | Most games in the **last 100 matches**; tie -> higher win rate; still tied -> most recently played. |
| Stats background | Most played hero's official render, **still image, faded on the right**, over the plain `bg-ink` frame. No video, no blur. |
| Match details | **Expand inline** under the History row, loaded on demand. |
| Tests | Add Vitest (dev dependency) for the pure data functions. |

## Out of scope

- Trending Heroes page content (own design later; `getTrendingHeroes` already exists).
- Supabase / any database, user-entered MMR.
- Asking OpenDota to parse unparsed matches (`POST /request/{id}`).
- Redirects from `/play` and `/reviews` (no real users yet).

## Data sources (all verified against the live API)

| Data | Request | Cache |
|---|---|---|
| Name, avatar, medal, MMR estimate | `GET /players/{account}` | 1 hour (built) |
| Last 100 matches incl. GPM, XPM, last hits, hero damage, final items, lane | `GET /players/{account}/matches?limit=100&project=...` (one request) | 5 minutes |
| Hero id -> name, slug, images | `GET /heroStats` | 6 hours (built) |
| Item id -> name, image, cost | `GET /constants/items` | 1 day |
| One match's details | `GET /matches/{id}`, only when a History row is opened | 1 week (finished matches never change) |

`project=` fields: `hero_id, kills, deaths, assists, gold_per_min, xp_per_min, last_hits,
hero_damage, item_0..item_5, lane_role, version` (the base fields `match_id, player_slot,
radiant_win, duration, lobby_type, start_time` are always included).

Facts the design relies on:
- A match is parsed when `version` is not null. `lane_role` and all detail data exist only for parsed matches.
- `lane_role`: 1 safe lane, 2 mid, 3 off lane, 4 jungle. OpenDota does not give position 1-5.
- `gold_t` is cumulative **gold earned** per minute, not net worth. The chart is labelled "Gold earned".
- Team kills for kill participation are `radiant_score` / `dire_score`, only in `/matches/{id}`.
- Hero render URL: `https://cdn.cloudflare.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/{slug}.png`; slug = `heroStats.name` without `npc_dota_hero_`.

## Modules

`src/lib/opendota.ts` is near the 200-line lint limit, so it is split by topic. All fetches go
through one cached helper (`'use cache'` + `cacheLife`; `fetch`'s `next.revalidate` does nothing
with Cache Components). The cached function throws on failure so errors are never cached; the
public functions catch and return `null` / `[]`.

| File | Contents |
|---|---|
| `src/lib/opendota.ts` | `getJson` cached helper, `getOpenDotaPlayer`, `getPlayerRank` (exists) |
| `src/lib/opendota-heroes.ts` | `getTrendingHeroes` (moved), `getHeroIndex()` -> `Map<id, {name, slug}>`, `getItemIndex()` -> `Map<id, {name, image, cost}>` |
| `src/lib/opendota-matches.ts` | `getRecentMatches(account)` (extended with the `project=` fields), `getMatchDetail(matchId, account)` |
| `src/lib/player-summary.ts` | Pure: `summarize(matches)` -> most played hero, last-100 W/L, last 10, records, averages, main lane |
| `src/lib/match-detail.ts` | Pure: `toMatchDetail(rawMatch, account, items)` -> the player's slice (below) |
| `src/lib/linked-account.ts` | `getLinkedAccountId()`: reads the Steam cookie -> Dota account id or `null` (used by pages, pill, API route) |

## Stats page (`/`)

Server component. Reads the linked account; everything data-dependent sits inside `Suspense`
with a skeleton (required by Cache Components because it reads cookies).

- **Background** (`PageBackdrop`, now takes `heroSlug`): the most played hero's render, still,
  on the right half (desktop) / bottom (phone), with the existing left-to-right dark gradient for
  text contrast. Removed: `<video>`, `heroAnimation`, `uploadedHeroArt`, `public/heroes/ursa.jpg`.
- **Sign-in page** (`AuthShell`): the Ursa photo is replaced by the visitor's most played hero render
  when a Steam cookie is still present from an earlier visit (in its own `Suspense`); otherwise
  only the existing live wallpaper video shows.
- **Headline** (`HeroHeadline`, props instead of mock):
  - "Your most played hero" + hero name (big metal title, as now).
  - Lane emblem replaces the position emblem: "Main lane" / "Safe lane" (Mid lane, Off lane,
    Jungle) with an icon per lane. Main lane = most common `lane_role` among parsed matches.
    Hidden when no match in the 100 is parsed.
  - Stat strip: **Matches** (on that hero, last 100), **Win rate** (on that hero),
    **Main lane share** (% of parsed matches in the main lane; hidden with the emblem).
- **Panels** (`PlayerStats`, props instead of mock):
  - Last 100 matches: real W / L, win rate bar, last 10 W/L strip (most recent first).
  - Records: most kills, most deaths, most assists, most hero damage, each with the hero portrait.
  - Averages: Kills, Deaths, Assists, GPM, XPM, Last hits (1 decimal for K/D/A, whole numbers otherwise).
- **Empty states:**
  - Steam not linked -> panel "Link Steam to see your stats" with the Link Steam button; plain background.
  - Linked but 0 matches -> "No public matches found. In Dota 2: Settings > Options > Social > Expose Public Match Data."
  - OpenDota down -> "Could not load your stats. Try again in a minute."

## History page (`/history`)

Server component renders the list from the same 100-match request (cached, so Stats and History
share it).

- **Row:** hero portrait + name, Win/Loss (radiant/dire colours), "Ranked" tag when
  `lobby_type === 7`, K/D/A, GPM, duration (min), relative time ("2 h ago"), 6 final item icons
  (empty slot when 0), expand chevron.
- **Expand** (`MatchRow`, client component): first open calls `GET /api/matches/{id}`; result
  kept in component state so re-opening does not refetch. Shows a skeleton while loading.
- **Detail panel** (`MatchDetail`):
  - Gold earned: small inline SVG area chart of `gold_t`, minutes on the x axis.
  - Item timings: first purchase of each item costing >= 2000 gold, in order, as icon + `mm:ss`; BKB highlighted.
  - Kill participation: `(kills + assists) / team kills`, shown as %; hidden if team kills is 0.
  - Wards: observer / sentry placed.
  - Deaths to heroes: minutes when an enemy hero's `kills_log` contains this hero. Labelled
    "to heroes" because deaths to creeps/towers are not in the data.
  - Unparsed match -> "OpenDota hasn't parsed this match yet."
- **Empty states:** same three as the Stats page.

## API route: `GET /api/matches/[id]`

1. Clerk `auth()`; no user -> 401.
2. Validate `id` with zod (positive integer string) -> 400 on failure.
3. `getLinkedAccountId()`; none -> 400 "Link Steam first".
4. `getMatchDetail(id, account)` (cached per match + account, stores only the trimmed slice):
   - OpenDota failure -> 502 `{ error: "Could not load this match. Try again." }`
   - Player not in the match -> 404.
   - Unparsed -> 200 `{ parsed: false }`.
   - Otherwise 200 with the slice.

Never returns raw OpenDota errors (AGENTS.md rule). Adds `zod` as a dependency.

## Nav and routes

- Move `src/app/(site)/play` -> `src/app/(site)/history`, `src/app/(site)/reviews` -> `src/app/(site)/heroes`.
- `navItems` in `src/lib/site-content.ts`: `{ label: "Trending Heroes", href: "/heroes" }`,
  `{ label: "History", href: "/history" }`. `TopNav` reads `navItems` directly; `Sidebar` has no
  route list, so nothing else changes.
- Page titles: `Trending Heroes · MongolDota`, `History · MongolDota`.

## Testing

- **Vitest** (new dev dependency, `npm test`), unit tests with fixed sample data for:
  - `summarize`: most played + both tie-breaks, W/L from `player_slot` + `radiant_win`, records,
    averages, main lane ignoring unparsed matches, empty list.
  - `toMatchDetail`: item timing filter + order, kill participation (both teams, zero team kills),
    deaths-to-heroes, unparsed match.
- `tsc`, `npm run lint`, `npm run build` pass.
- Manual (user, signed in with Steam linked): Stats shows real numbers + correct hero render;
  History lists 100 rows; expanding a row shows detail; layout OK on a phone width.
