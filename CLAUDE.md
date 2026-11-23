# Project rules for agents (MongolDota)

Every agent working in this repo follows these rules, subagents included. `AGENTS.md` has the short version; this file is the full set.

Skills for this repo (in `.claude/skills/`):
- `page-folder-structure`: before creating a page, section, component, hook or helper.
- `api-route-pattern`: before writing a route handler or code that calls an outside service.
- `finish-task-checks`: before saying a task is done.

## 1. No tests

- This repo has no tests and no test runner. Do not write tests, test files (`*.test.ts`, `*.test.tsx`), fixtures or test helpers.
- Do not add Vitest, Jest, Testing Library, Playwright or any other test tool, and do not add a `test` script.
- This overrides `superpowers:test-driven-development`, the test steps in `superpowers:writing-plans`, `superpowers:executing-plans` and `superpowers:subagent-driven-development`, and every "write the failing test" step in `docs/superpowers/plans/`. Skip those steps and do the rest of the plan.
- The only checks before saying done: `npm run lint` and `npx tsc --noEmit`, both with zero errors.

## 2. Coding rules

| Rule | Bad | Good |
|---|---|---|
| No `any` | `(data: any)` | `(data: Post)` |
| Names say what it is | `d`, `flag`, `handle()` | `posts`, `isLoading`, `savePost()` |
| Return early | 3 nested `if` | `if (!user) return;` then the main code |
| Small files | one 400-line page | one component per file, **150 lines max** |
| Check input on the server | trust `req.body` | validate it with zod first (`safeParse`) |
| Catch errors from outside services | page crashes when OpenDota is slow | try/catch, friendly message to the user |
| Never show raw errors | "PostgresError: relation..." | "Could not save. Try again." |
| No leftover logs | `console.log(user)` | delete it before finishing |

- One component per file. A small helper component used only inside that same file may stay in it.
- `"use client"` only on files that need state, effects or browser APIs. Pages and data loaders are Server Components.
- `// eslint-disable-next-line` only with a reason: `// eslint-disable-next-line rule-name -- why`.

## 3. Lint rules (enforced in `eslint.config.mjs`)

| Rule | Catches | Why |
|---|---|---|
| `no-explicit-any` | `let x: any` | `any` turns off TypeScript. Bugs hide there. |
| `no-unused-vars` | imports and variables never used | Dead code confuses teammates. |
| `eqeqeq` | `a == b` | `0 == ''` is true. `===` has no surprises. |
| `no-console` | `console.log` | Logs leak user data and clutter the console. |
| `prefer-const` | `let` never reassigned | `const` says "this never changes". |
| `react-hooks/rules-of-hooks` | hook inside an `if` | Breaks React state. |
| `react-hooks/exhaustive-deps` | missing value in `useEffect` deps | Stale data bugs. |
| `max-lines` | `.ts`/`.tsx` files over **150** lines (blank lines and comments not counted) | Small files are easier to read and review. |

Every file is under 150 lines today. Never raise the limit or add a per-file exception: split the file instead (move a part into `_components/`, `_hooks/` or `_utils/`).

## 4. Folder structure

Every file lives in the `_` folders of the **nearest route folder that contains everything that uses it**. Only code shared across areas lives outside `src/app`.

```
src/
  app/
    layout.tsx                 root layout (fonts, Clerk, pointer glow)
    _components/ _utils/       pieces only the root layout uses
    (auth)/
      _components/             shared by sign-in and sign-up (AuthShell)
      sign-in/  sign-up/
    (site)/
      layout.tsx               the signed-in frame
      _components/             the frame's pieces + UI shared by 2+ signed-in pages (Sidebar, TopNav, PageBackdrop, CountUp, …)
      _hooks/  _utils/         hooks and helpers shared by 2+ signed-in pages (use-stored-state, require-user, timed-advice, …)
      (stats)/                 the "/" page, in a route group so its folders don't mix with the frame's
      draft/  live/  heroes/  history/  matches/[matchId]/
        page.tsx               the route: metadata, sign-in check, load data, <Suspense>, render features
        _features/             the page's sections: own state, load or send data, wire pieces together
        _components/           the page's UI pieces: props in, markup out
        _hooks/                the page's client hooks (use-*.ts)
        _utils/                the page's helpers: pure functions, data helpers, and types (*-types.ts)
    api/
      _utils/                  helpers shared by several API routes (draft-advice, draft-advice-facts)
      <feature>/
        route.ts               a server endpoint
        _utils/                helpers only this route uses (e.g. api/live/coach/_utils/live-coach-prompt.ts)
  lib/                         code shared across areas (see below), one subfolder per area:
    ai/                        hf.ts (Hugging Face client)
    draft/                     draft board rules, lanes and positions
    live/                      Live Coach stores, game events and timing used by the page and the API
    matches/                   match database, store and rows
    opendota/                  OpenDota client (opendota.ts: getJson, fetchJson) and its readers
    player/                    player summary, breakdowns, playstyle
    steam/                     Steam sign-in and the Clerk ↔ Steam link
    format.ts  site-content.ts general helpers every area uses
  types/                       types shared across areas or used by src/db
  db/                          schema.ts (Drizzle tables), index.ts (connection), migrations/, scripts/
.env.example                   every env var name, no values
```

Where a file goes, first rule that matches. "Users" means every page, layout and route that reaches the file, directly or through other files:
1. Its users span more than one top-level area (pages **and** API routes, `(auth)` **and** `(site)`), or `src/db` / `src/proxy.ts` use it → `src/lib`, or `src/types` for types, or `src/components` for UI (none today). Everything a shared file imports is shared too.
2. Otherwise, the nearest route folder containing every user:
   - one page → that page's `_features`, `_components`, `_hooks` or `_utils`
   - two or more signed-in pages, or the `(site)` layout → `(site)/_components`, `_hooks` or `_utils`
   - both auth pages → `(auth)/_components`
   - one API route → `api/<feature>/_utils`; several routes → the nearest folder over them (`api/_utils`, `api/auth/steam/_utils`)
   - only the root layout → `app/_components` or `app/_utils`
3. Types follow the same rule; a folder's types go in `_utils/<name>-types.ts` (e.g. `heroes/_utils/meta-types.ts`).
4. When a file gains a user outside its folder, move it up to the nearest folder that contains all its users (or to `src/lib` / `src/types` by rule 1).

Calls to outside services (OpenDota, Hugging Face, the database, Steam, Supabase) live only in data helper files: a `_utils/*.ts` file or a `src/lib` file, inside try/catch, never throwing. Components, hooks, features and route handlers call those helpers; they never `fetch` an outside service or query the database themselves.

Every visible string (text, `aria-label`, `title`, `placeholder`, non-empty `alt`) comes from the word files in `src/lib/i18n/en/` and `src/lib/i18n/mn/`, one file per area; add every new line to both (a missing Mongolian line fails the typecheck). Server components read words with `await getWords()` (from `@/lib/i18n/server`, inside `<Suspense>`), client components with `useWords()`. Sentences with numbers or names are functions in the word files. Translations live together in `src/lib/i18n/` (the one exception to page colocation) so the owner can proofread one folder. Hero, item and ability names, OpenDota data and Dota terms (mid, safe lane, carry, GPM, BKB, Roshan, …) stay English.

Every AI call goes through `gatedAiCall` in `src/lib/ai/ai-gate.ts`, which checks the player's limits first and records the call in `ai_calls`. Never call `askTextModel`, `askQuickModel`, `askPlanModel` or `askVisionModel` on their own. The limits are named constants in `src/lib/ai/ai-limits.ts`; the owner's report is `npx tsx --env-file=.env.local src/db/scripts/ai-usage.ts`.

Imports:
- From your own route folder's `_` folders: relative paths (`./_features/DraftBoard`, `../_utils/draft-storage`).
- From a parent route folder's `_` folders: `@/` paths (`@/app/(site)/_components/PageBackdrop`).
- Never from a sibling's or a child's `_` folders (the draft page never imports `history/_components`).
- `src/lib`, `src/types` and `src/db` never import from `src/app`.
- A new shared file goes in the `src/lib` subfolder of its area (`@/lib/opendota/opendota-heroes`). Add a new area folder only when no existing one fits; only general helpers every area uses sit at the `src/lib` root.
- Server-only data helpers (database, AI, `'use cache'`) may sit in a page's `_utils`; import them only from `page.tsx` and Server Component features, never from a `"use client"` file.
- Inside a folder: `page.tsx` → `_features` → `_components`. A feature may render other features. Features and components may use `_hooks` and `_utils`. `_components` never import `_features`. `_utils` import nothing from React.

Other:
- The `_` prefix is a Next.js private folder: it and everything inside it stay out of routing.
- File names: components `PascalCase.tsx`, hooks `use-thing.ts`, helpers `kebab-case.ts`.
- Don't create new top-level folders without asking.

## 5. Secrets and env vars

- Only `src/lib/`, `src/db/` and `src/app/api/` read secret env vars (`HF_API_KEY` in `lib/ai/hf.ts`, `AUTH_SECRET` in `lib/steam/steam-auth.ts`, `DATABASE_URL` in `db/index.ts`, …). Page folders, components and hooks never do: they call the function that owns the key.
- Anything starting with `NEXT_PUBLIC_` is sent to every visitor. Never put a secret behind that prefix.
- Real values go only in `.env.local` (git-ignored). Every new variable name goes in `.env.example` with an empty value and a one-line comment saying where to get it.
- If a key is pushed or pasted anywhere public, make a new key right away. Deleting the commit is not enough.

## 6. Formatting

Prettier is not installed in this repo yet. Until it is, match the style of the file you are editing (double quotes, semicolons, trailing commas) and don't reformat lines you didn't change.

## 7. Next.js 16 in this repo

- Before using a Next.js API you haven't seen used in this repo, read its guide in `node_modules/next/dist/docs/`.
- Middleware lives in `src/proxy.ts` (Next 16's name for it).
- Cache Components is on: cache with `'use cache'` plus `cacheLife()` (fetch's `next.revalidate` does nothing here). Call `await connection()` before `Date.now()` or `after()` in a Server Component. Anything that reads cookies or auth renders inside `<Suspense>`.
- A Server Component that loads data or writes to the database calls `await requireUserId()` first: the `(site)` layout's sign-in check does not stop page components from running.
- After moving or renaming a `page.tsx`, run `npx next typegen` so `.next/types` stops pointing at the old file (otherwise `tsc` fails).

## 8. Git

- Never `git commit` or push unless the user asks for it in that turn.
- When asked: branches `type/short-name` (`feat/quiz-timer`, `fix/upload-size`); commits `type: what changed` with type `feat`, `fix`, `refactor`, `docs` or `chore`; pull requests under 300 changed lines.
