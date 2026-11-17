# Live Coach — design

Date: 2026-11-17 · Status: draft for approval

## Intent

Replace the placeholder **Location** page with **Live Coach**: while the player is in a Dota 2 match, the page shows their game updating live (clock, hero, level, items, gold, K/D/A) and an AI coach gives short tips that fit *this* game. Tips are grounded in the **10 heroes from the player's locked draft** (Draft page) plus the OpenDota facts the draft coach already uses (matchups, item popularity and timings, game-length win rates, abilities).

Why: the app today only helps before a game (Draft) and after it (Stats, History, Match). Live Coach covers the part in between, which is where a player most needs help.

## Goals

- One-time setup that takes about a minute and tells the player when it worked ("✓ Connected").
- Live state on the page within about a second of Dota sending it, on any device the player is signed in on (PC second screen or phone).
- The coach speaks at the moments the player chose:
  - the player **dies**
  - the player **gets a kill**
  - the player **has enough gold** for the next planned item
  - the player **buys an item**
  - a **look-ahead tip every 3–5 minutes** about what is coming next (e.g. "enemy PA usually finishes BKB around 19:30")
- An **Ask coach now** button.
- Tips grounded in real numbers (live state + draft + OpenDota), never invented stats.

## Non-goals

- Enemy items, positions or gold during the player's own game. GSI does not provide them to players, and getting them other ways breaks fair play.
- Reading the draft from Dota. GSI only sends the draft to spectators; the draft comes from the Draft page.
- A desktop connector app (only needed if the HTTPS check below fails; separate project).
- Phone notifications, voice coaching, tips while the page is closed.
- Translations (tips are in English like the rest of the site).

## Anti-goals (would be a failure even if it works)

- Spamming: a teamfight producing 4 tips, or tips that repeat the last one.
- Spending AI credits when nobody is looking at the page.
- Any route that lets one user read or write another user's live game, draft or tips.
- Setup that leaves the player unsure whether it worked.
- Raw errors on screen ("PostgresError…"), per AGENTS.md.

## Constraints

- Next.js 16 (read `node_modules/next/dist/docs/` before writing code), Cache Components on, React Compiler on.
- AGENTS.md rules: zod on every server input, no `any`, files under 200 lines, one component per file, friendly error messages, every new env var in `.env.example`, no `console.log`.
- Database: Supabase Postgres via Drizzle; migrations generated into `src/db/migrations/`. Today every table has RLS on with no policies (server-only). The server keeps using `DATABASE_URL`, which bypasses RLS.
- Sign-in: Clerk. Steam link: signed cookie (`steam-auth.ts`), Dota account id = Steam ID − 76561197960265728.
- AI: Hugging Face router via `src/lib/hf.ts` (default `Qwen/Qwen3.8-27B`); current text calls take 30–60 s.
- Hosting: Vercel (serverless; no long-lived connections from our functions).
- **Unknown until tested at home:** whether Dota's GSI can POST to an `https://` URL (Vercel only serves HTTPS) and whether `-gamestateintegration` is still required. The design works either way; if HTTPS fails, the connector app is added later and posts the same payload to the same route.

## Approaches considered

1. **The page is the coach, polling every 2 s.** Simple, but updates lag up to 2 s and every viewer polls the server.
2. **The server is the coach.** `/api/gsi` detects events and asks the AI in the background. Tips exist even with the page closed, but credits are spent with nobody watching, and overlapping GSI requests (every 0.5–1 s) need database locking to avoid duplicate tips.
3. **The page is the coach, with Supabase Realtime push** — **chosen** (approach 1 plus instant push). Dota → `/api/gsi` → Supabase row → Realtime pushes the change to the open page → the page detects events and asks `/api/live/coach`. Credits are only spent while the page is open; updates are instant. Cost: the browser connects to Supabase directly, so Clerk must be connected to Supabase and the live tables need RLS read policies.

## Design

### Flow

```
Dota client ──POST (GSI JSON + auth.token, ~1/s)──▶ /api/gsi
                                                       │ token → user; validate; throttle
                                                       ▼
                                          live_states (1 row per user)
                                                       │ Supabase Realtime (RLS: own row only)
                                                       ▼
Live Coach page (browser, Clerk session → Supabase client)
  ├─ renders live state + locked draft
  ├─ detects events (pure functions)
  └─ POST /api/live/coach ──▶ OpenDota facts + AI ──▶ live_tips row ──Realtime──▶ page
```

### Data (new tables, Drizzle schema + migration)

| Table | Key | Holds |
|---|---|---|
| `gsi_tokens` | `clerk_user_id` | SHA-256 hash of the player's GSI token, `created_at`. A new token replaces the old one. |
| `live_states` | `clerk_user_id` | Latest GSI payload (`jsonb`, trimmed to the sections we use), `match_id`, `game_time`, `hero_name`, `updated_at`. |
| `locked_drafts` | `clerk_user_id` | The latest locked draft: the 10 hero ids per side, positions, the player's hero id and side, `updated_at`. |
| `live_tips` | id | `clerk_user_id`, `match_id`, `game_time`, `kind` (death, kill, gold, item, lookahead, asked, plan), `text`, `created_at`. |

- RLS stays on for all four. `live_states`, `locked_drafts` and `live_tips` get a **select-only** policy `clerk_user_id = auth.jwt()->>'sub'`. `gsi_tokens` gets no policy (server only). All writes go through our server routes.
- `live_states` and `live_tips` are added to the `supabase_realtime` publication.
- Policies and the publication are written in a custom SQL migration (drizzle-kit can't express all of it).

### Setup (Connect Dota)

The setup section of the Live Coach page, as sketched in the conversation:

1. **Copy** `-gamestateintegration` into Steam → Dota 2 → Properties → Launch Options (copy button + short GIF).
2. **Download setup folder:** a zip containing `gamestate_integration/gamestate_integration_mongoldota.cfg`. Generating it creates a new token, stores its hash, and writes the plain token into the file once. Instructions show the Windows path, the macOS path (`~/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/dota/cfg`) and the "Manage → Browse local files" shortcut.
3. **Start Dota:** the page shows "Waiting for Dota…" and switches to "✓ Connected" when the first payload for this user lands in `live_states`.

Plus **Reset connection**, which issues a new token and invalidates the old file. The `.cfg` sets `throttle` ≈ 1.0 s and `heartbeat` 30 s, and requests the `provider`, `map`, `player`, `hero`, `abilities` and `items` sections.

### `/api/gsi` (POST, public, token-authenticated)

- Reject bodies over a size limit. Validate the fields we use with zod. Look up `sha256(auth.token)` in `gsi_tokens`; unknown token → 401 with no detail.
- Ignore payloads that are not the linked player's own game (e.g. `player.steamid` missing or different from the linked Steam ID — covers spectating and the main menu).
- Upsert `live_states` at most once per second per user, and only when something we show has changed. Heartbeats only refresh `updated_at`.
- Never call the AI here.

### Live Coach page (`/live`, replaces `/location`)

- Nav label "Live Coach"; `/location` and its placeholder are removed (my call: the page is new, so a new URL).
- States:
  - **Steam not linked:** the existing "Link Steam" notice (`PlayerDataNotice`). Live Coach needs the Steam link to recognise the player's own game.
  - **Not set up:** the Connect Dota steps.
  - **Connected, not in a game:** "Start a match", plus the last game's tips.
  - **In a game:** live panel, draft strip and tips.
  - **Draft mismatch:** if the live hero is not the locked draft's hero, show "Your draft says Viper but you're playing Sniper — update the draft?" The coach then uses the live hero only.
  - **No draft locked:** "Lock your draft on the Draft page for better advice." The coach still works with the player's own hero.
- Live panel: game clock, hero and level, K/D/A, gold, GPM, the six item slots (icons from the existing item index), and a connection dot ("Live" / "Last update 2 min ago").
- Tips list, newest first, earlier tips stay visible, with an icon per kind; `aria-live="polite"` for new tips. **Ask coach now** button.
- Browser connects to Supabase with the Clerk session token, subscribes to its own `live_states` and `live_tips` rows, and falls back to polling every 5 s if the Realtime connection drops.

### When the coach speaks (browser-side rules, pure functions in `src/lib/`)

- **Events** come from comparing the previous and new live state: deaths went up, kills went up, a new item appeared in the inventory, gold reached the next planned item's cost.
- **Merge:** after the first event, wait about 10 s and gather any further events into one request (a teamfight gives one tip).
- **Gap:** at least 90 s between automatic tips.
- **Look-ahead:** if nothing has spoken for 4 minutes of game time, ask for a look-ahead tip.
- **Ask coach now** ignores the gap. Requests already in flight disable the button.
- **Item plan:** when a match starts (new `match_id`), the first request asks for a short item plan (validated item keys, in order), stored as a `plan` tip. "Enough gold" means gold ≥ cost of the next unbought item in that plan (costs from `/constants/items`). The plan is updated when the player buys off-plan.
- **Server enforces the same gap** per user and match before calling the AI, so two open tabs or devices don't produce two tips.

### `/api/live/coach` (POST, Clerk sign-in required)

- Input (zod): the event kinds, plus the client's view of the game time. The server reads the authoritative live state and locked draft from the database itself; it does not trust the client's numbers.
- Reuses `gatherAdviceFacts` for the draft and OpenDota facts, adds the live state, and builds a short prompt per kind.
- New quick AI call in `hf.ts` (low effort, small token limit, about 30 s timeout) for live tips; the 12-tip draft advice keeps its current settings.
- Saves the tip to `live_tips` (Realtime then shows it everywhere) and returns it.
- Failures (no key, no credits, timeout) return the friendly messages the draft coach already uses. The page shows them in the tips list without breaking the live panel.

### Draft page change

When a draft is locked and the player's hero and positions are set, also save it to `locked_drafts` through a small server route (zod-validated, Clerk sign-in). Local storage behaviour stays as it is.

## New configuration

- Env: `NEXT_PUBLIC_SUPABASE_URL` (Project URL) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable key, or the legacy anon key on older projects), both added to `.env.example`. No service-role/secret key and no JWT secret: the server keeps writing through `DATABASE_URL`, and Supabase verifies Clerk tokens itself.
- Dependency: `@supabase/supabase-js`.
- Dashboard setup (done by the project owner): enable Clerk's Supabase integration, and add Clerk as a third-party auth provider in Supabase so Supabase accepts Clerk session tokens.

## Testing

- Unit tests (Vitest, alongside the code) for:
  - GSI parsing and validation
  - event detection
  - merge, gap and look-ahead timing
  - the gold target from an item plan
  - prompt building and reply parsing
- Route tests for `/api/gsi`: bad token, oversized body, spectator payload, throttling.
- Manual check at home: real Dota, HTTPS delivery, launch option needed or not, end-to-end tip after a death in a bot match.

## Decisions made while planning

- `gsi_tokens` also stores the player's 64-bit **Steam ID**, saved when the setup folder is downloaded (that request has the Steam cookie). `/api/gsi` has no cookies (Dota sends it), so this is how it recognises the player's own game and how `/api/live/coach` finds their Dota account id.
- `live_states.snapshot` and `match_id` are nullable. A valid-token payload from the main menu (or while spectating) writes a row with no snapshot, so "✓ Connected" lights up before a match starts.
- The stored snapshot is the app's own trimmed shape (`LiveSnapshot`), not raw GSI JSON.
- "Buys an item" counts items costing **1,000 gold or more**, so consumables and small components don't trigger tips. Items bought into the stash count.
- `live_tips.plan` (nullable list of item keys) holds the item plan on `plan` tips.
- Ask coach now: at least 15 s since the last tip. The item plan: once per match.
- The setup zip is built with `fflate`.

## Left to the builder

- Exact prompt wording, tip length, and the icons per tip kind.
- File split within the 200-line limit.
- Payload trimming details.
- Realtime reconnect handling.
- Zip generation method (any small zip library, or a hand-written stored zip).
