# Steam link in the database — short design

Date: 2026-11-17 · Status: approved in conversation

## Intent
The Steam link belongs to the player's MongolDota (Clerk) account instead of one browser: link once, and Stats, History, Draft, Trending and Live Coach work on every device the player signs in on. It also stops a second account on a shared browser from seeing the first person's Steam data.

## Goals / non-goals / anti-goals
- Goal: one `steam_links` row per Clerk user; every reader goes through `src/lib/linked-account.ts`.
- Goal: existing players keep their link without re-linking (cookie migrated on first read).
- Non-goal: changing Clerk sign-in, or how Steam OpenID is verified.
- Anti-goals: players seeing "Link Steam" again after the switch; a database query per badge per page; raw errors.

## Approaches
1. **Database is the only source; old cookies migrated once (chosen).** One source of truth, fits `gsi_tokens` and Live Coach.
2. Database plus keep the cookie: two sources that can disagree.
3. Clerk user metadata: extra Clerk API calls or dashboard session-claim setup.

## Design
- Table `steam_links`: `clerk_user_id` text PK, `steam_id` text not null, `linked_at` timestamptz default now. RLS on, no policies (server only). One Steam ID may be linked to several accounts; linking always needs a real Steam login.
- Steam callback (`/api/auth/steam/callback`) and the dev shortcut (`/api/auth/steam` with `DEV_STEAM_ID`): require a Clerk user, then upsert the row and clear the old cookie. Signed out → `/sign-in`. Database failure → `/?login=failed`.
- Unlink (`/api/auth/steam/logout`): delete the row (and the old cookie).
- Reading (`getLinkedSteamId`): Clerk user → row. With no row but a valid old cookie: save it as the row (one-time migration) and return it. Deduplicated per request with React `cache()`. Database unavailable: fall back to the valid cookie, so a database outage doesn't unlink anyone.
- The cookie itself is only cleared on link/unlink (Server Components can't set cookies), so it stays a harmless fallback until then.

## Left to the builder
File split, test doubles, exact redirect helpers.
