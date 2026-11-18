---
name: api-route-pattern
description: Use when creating or changing a route handler (route.ts) under src/app/api in this repo, or any server code that reads request input or calls an outside service such as OpenDota, Hugging Face, Supabase, Steam or Clerk.
---

# API route pattern

## Core rule

A route handler does five things in order and nothing else: **check sign-in → validate input with zod → call a data helper → turn failures into a friendly message → reply**. Outside services are called only from data helpers (a `_utils/*.ts` or `src/lib` file), inside try/catch, and those functions never throw.

Helpers that only this route uses (prompt builders, payload parsers, its own store) go in the route's `_utils/` folder, e.g. `src/app/api/live/coach/_utils/live-slots-store.ts`, imported as `./_utils/live-slots-store`. Helpers several routes share go in the nearest folder over them (`src/app/api/_utils/`). Helpers shared with a page go in `src/lib`.

## The handler

```ts
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getHeroMatchups } from "@/lib/opendota/opendota-draft";

const heroIdSchema = z.coerce.number().int().min(1).max(1000);

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Draft page: one enemy hero's matchups against every other hero (cached a day). */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return error("Sign in first.", 401);

  const heroId = heroIdSchema.safeParse(new URL(request.url).searchParams.get("hero"));
  if (!heroId.success) return error("Invalid hero id.", 400);

  const matchups = await getHeroMatchups(heroId.data); // null when OpenDota failed; never throws
  if (!matchups) return error("Could not load matchups from OpenDota. Try again.", 502);
  return Response.json({ matchups });
}
```

JSON body: `const input = schema.safeParse(await request.json().catch(() => null));` — a broken body becomes a 400, not a crash.

## The data helper side

```ts
/** Every function returns null instead of throwing. */
export async function getJson<T>(path: string, cacheSeconds: number): Promise<T | null> {
  try {
    return await cachedJson<T>(path, cacheSeconds);
  } catch {
    // OpenDota down, slow, or rate limited: callers show an empty state.
    return null;
  }
}
```

- Set a timeout on every outside request: `signal: AbortSignal.timeout(8_000)`.
- Return `null`, `[]` or a result type such as `{ ok: false, reason: "no-key" | "no-credits" | "failed" }`. The route maps each reason to a sentence.
- The database is optional (`db` is null without `DATABASE_URL`): every store function checks `if (!db) return …` first and catches database errors.

## Status codes used in this repo

| Code | When |
|---|---|
| 400 | input failed zod, or a rule between fields failed |
| 401 | not signed in (`"Sign in first."`) |
| 404 | the thing exists but not for this player |
| 409 | the request is valid but the state is wrong (e.g. no live match) |
| 413 | body or upload too large |
| 429 | asked too soon (a time gap or slot was not free) |
| 502 | an outside service failed or gave an unreadable answer |
| 503 | a feature is not set up (missing key, no credits) |

## Friendly messages

Messages are short sentences a player understands, with what to do next: `"Could not load this match. Try again."`, `"Link Steam first."`. Keep repeated ones in a constant:

```ts
const FAILURE_MESSAGES = {
  "no-key": "Advice is not set up yet (HF_API_KEY is missing).",
  "no-credits": "Hugging Face has no credits left for advice.",
  failed: "The coach could not answer. Try again.",
} as const;
```

Never put `error.message`, a stack, SQL text or a provider's response body in a reply or on screen.

## Checklist

- [ ] `auth()` first; 401 without a user
- [ ] every query param, body and form field goes through a zod schema with `safeParse`
- [ ] limits on sizes and counts (`.max(...)`, byte limits for uploads)
- [ ] outside calls only through data helpers (`_utils/*.ts` or `src/lib`), with try/catch and a timeout
- [ ] each failure has a friendly message and the status from the table
- [ ] secrets read only in `src/lib`, `src/db` or the route; new env var names added to `.env.example`
- [ ] the file stays under 150 lines; move logic into the route's `_utils/` if it grows
