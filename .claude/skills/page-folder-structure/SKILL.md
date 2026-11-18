---
name: page-folder-structure
description: Use when creating a page, a page section, a component, a hook, a helper or a route helper in this repo, when code starts being used by a second page, when a file passes 150 lines and needs splitting, or when unsure which folder a new file belongs in.
---

# Page folder structure

## Core rule

Every file, types included, lives in the `_` folders of the **nearest route folder that contains everything that uses it**. Only code shared across areas (pages **and** API routes, `(auth)` **and** `(site)`, or `src/db`) lives in `src/lib` / `src/types`. `src/lib` and `src/types` never import from `src/app`.

## Layout

```
src/app/
  layout.tsx                  root layout
  _components/  _utils/       only the root layout uses these (PointerGlow, clerk-appearance)
  (auth)/_components/         shared by sign-in and sign-up (AuthShell)
  (site)/
    layout.tsx                the signed-in frame
    _components/              frame pieces + UI shared by 2+ signed-in pages (Sidebar, PageBackdrop, CountUp)
    _hooks/  _utils/          shared by 2+ signed-in pages (use-stored-state, require-user, timed-advice)
    (stats)/                  the "/" page (route group: its folders don't mix with the frame's)
    draft/
      page.tsx                the route: metadata, sign-in check, load data, <Suspense>, render features
      _features/              sections: DraftBoard, LockScreen, SuggestionPanel
      _components/            UI pieces: TeamSlots, HeroGrid, CounterRow
      _hooks/                 use-enemy-matchups.ts
      _utils/                 draft-counters.ts, draft-storage.ts
    heroes/_utils/            hero-picks-ai.ts, opendota-meta.ts (data helpers), meta-types.ts (types)
  api/
    _utils/                   draft-advice.ts (used by two API routes)
    live/coach/
      route.ts
      _utils/                 live-coach-prompt.ts, live-slots-store.ts (only this route uses them)
src/lib/                      shared across areas, one subfolder per area:
  ai/  draft/  live/  matches/  opendota/  player/  steam/   (format.ts, site-content.ts at the root)
src/types/                    shared across areas or used by src/db: draft.ts, live.ts, opendota*.ts, …
```

The `_` prefix makes a folder private in Next.js: it and its subfolders stay out of routing.

## Where does a new file go (first match wins)

| The new code… | Put it in |
|---|---|
| is used by pages **and** API routes, by `(auth)` **and** `(site)`, or by `src/db` / `proxy.ts` | the area's `src/lib/<area>/` folder (types: `src/types/`) |
| is imported by a file in `src/lib` | `src/lib/` (types: `src/types/`) |
| reads a secret env var | `src/lib/` or `src/app/api/` only |
| is used by one page | that page's `_features/`, `_components/`, `_hooks/` or `_utils/` |
| is used by 2+ signed-in pages or the `(site)` layout | `(site)/_components/`, `_hooks/` or `_utils/` |
| is used by both auth pages | `(auth)/_components/` |
| is used by one API route | `api/<feature>/_utils/` |
| is used by several API routes under one folder | that folder's `_utils/` |
| is used only by the root layout | `app/_components/` or `app/_utils/` |

"Used by" counts every page, layout and route that reaches the file, directly or through other files. Types follow the same table and are named `_utils/<name>-types.ts`.

Calls to outside services (OpenDota, Hugging Face, the database, Steam, Supabase) live only in data helper files: a `_utils/*.ts` or `src/lib` file, with try/catch and a timeout. Components, hooks, features and route handlers call those helpers. A server-only helper in a page's `_utils` is imported only from `page.tsx` or Server Component features, never from a `"use client"` file.

## What each part is

| Part | It is | It may |
|---|---|---|
| `page.tsx` | Server Component, the route | export `metadata`, call `requireUserId()`, load data through `src/lib`, wrap loaders in `<Suspense>`, render features |
| `_features/X.tsx` | one section (a tab, a panel, a loader) | hold state, load data, call `/api/...`, render other features and `_components` |
| `_components/X.tsx` | one UI piece | take props and render; small UI state only (open, hover, sort) |
| `_hooks/use-x.ts` | a client hook (`"use client"`) | use `_utils`, call `/api/...` |
| `_utils/x.ts` | pure functions, data helpers (OpenDota, database, AI) and `*-types.ts` files this folder uses | import other `_utils`, parent folders' `_utils`, `@/lib`, `@/types` and `@/db` |

## Imports

- Own folder's `_` folders: relative paths, `./_features/DraftBoard`, `../_utils/draft-storage`.
- A parent folder's `_` folders: `@/` paths, `@/app/(site)/_components/PageBackdrop`.
- Shared code: `@/lib/opendota/opendota`, `@/lib/steam/linked-account`, `@/types/draft`.
- Never a sibling's or child's `_` folder: the draft page never imports `@/app/(site)/history/_components/...`.
- Inside a folder: `page.tsx` → `_features` → `_components`; `_components` never import `_features`.

## Example `page.tsx`

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBackdrop } from "@/app/(site)/_components/PageBackdrop";
import { requireUserId } from "@/app/(site)/_utils/require-user";
import { getPersonalRecords } from "@/lib/opendota/opendota-draft";
import { getDraftHeroes } from "@/lib/opendota/opendota-heroes";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import { site } from "@/lib/site-content";
import { DraftBoard } from "./_features/DraftBoard";

export const metadata: Metadata = { title: `Draft · ${site.gameTitle}` };

/** Reads auth and cookies, so it renders inside Suspense. */
async function DraftLoader() {
  await requireUserId(); // the (site) layout's check does not stop this from running
  const [heroes, accountId] = await Promise.all([getDraftHeroes(), getLinkedAccountId()]);
  if (heroes.length === 0) return <p>Could not load the hero list from OpenDota. Try again in a minute.</p>;

  const personal = accountId ? await getPersonalRecords(accountId) : {};
  return <DraftBoard heroes={heroes} personal={personal} />;
}

export default function DraftPage() {
  return (
    <>
      <PageBackdrop tone="duel" />
      <Suspense fallback={<div className="glass-panel shimmer h-[12rem] rounded-[1.4rem]" />}>
        <DraftLoader />
      </Suspense>
    </>
  );
}
```

## Moving a file

- A second page now needs something a page owns: move it up to the nearest folder that contains both pages (for two signed-in pages, `(site)/_components`, `_hooks` or `_utils`), then import it with `@/app/...` from both.
- An API route now needs something a page owns (or a page needs something a route owns): move it to `src/lib` (types: `src/types`).
- After moving or renaming a `page.tsx`, run `npx next typegen` (stale `.next/types` makes `tsc` fail).

## When a file passes 150 lines

Split by role, not by line number: move a self-contained piece of markup into `_components/`, calculations into `_utils/`, state and effects into `_hooks/use-*.ts`. Never raise `max-lines` or add a per-file exception in `eslint.config.mjs`.

## Names

Components `PascalCase.tsx` (one component per file), hooks `use-thing.ts`, helpers `kebab-case.ts`.

## Common mistakes

| Mistake | Fix |
|---|---|
| Data fetching inside `_components` | Load in `page.tsx` or a feature; pass data as props |
| `fetch("https://api.opendota.com/...")` in a component, hook, feature or route handler | Put it in a data helper (`_utils/*.ts`) that uses `getJson` from `@/lib/opendota/opendota` |
| `process.env.HF_API_KEY` outside `src/lib` / `src/app/api` | Call the `src/lib` function that owns the key |
| Draft page importing `@/app/(site)/history/_components/X` | Move `X` to `(site)/_components/` and import it from both |
| A `src/lib` file importing from `src/app` | Move the imported file into `src/lib` |
| Folder named `components/` (no underscore) in a route | Rename to `_components/` |
