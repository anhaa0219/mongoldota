---
name: finish-task-checks
description: Use when about to say a coding task in this repo is done, fixed, working or ready, before handing work back to the user, or when asked to review changes against the project rules.
---

# Finish-task checks

## Core rule

Before saying a task is done, run the two checks and walk the checklist over every file you changed. Report what you ran and what it printed. There are no tests in this workflow: do not write them and do not run them.

## 1. Run the checks

```bash
npm run lint        # must end with 0 errors
npx tsc --noEmit    # must print nothing
```

- A lint **error** anywhere is a failure: fix it.
- A `react-hooks/exhaustive-deps` **warning** in a file you changed: fix it.
- Do not run `npm test`, `vitest` or any test command.

## 2. Walk the checklist

List what you changed with `git status --short` and `git diff --stat`, then check each changed file:

| Check | Pass when |
|---|---|
| Folder | the file sits where `page-folder-structure` says |
| Size | under 150 lines; `max-lines` in `eslint.config.mjs` not raised and no per-file exception added |
| One component | one component per file (a small private helper may stay) |
| Server input | every route input goes through zod `safeParse` |
| Outside services | called only from data helpers (`_utils/*.ts` or `src/lib`), inside try/catch, with a timeout |
| Errors | users see friendly sentences, never `error.message` or raw provider text |
| Secrets | env secrets read only in `src/lib`, `src/db` or `src/app/api`; nothing secret behind `NEXT_PUBLIC_` |
| Env vars | every new variable name is in `.env.example` with a comment |
| Names | variables and functions say what they hold or do; booleans read `isX`, `hasX` |
| Early return | no pyramid of nested `if`s |
| Leftovers | no `console.log`, commented-out code or unused files |
| Tests | no `*.test.ts(x)` files, fixtures, test helpers, test tools or `test` script added |
| Formatting | only lines you meant to change are in the diff |

## 3. Report

Tell the user, in this order:
1. What changed, in a few lines, with `file_path:line` references.
2. The checks: `npm run lint` → result, `npx tsc --noEmit` → result. If either failed and you could not fix it, say so plainly with the error.
3. Anything you skipped or left for them.

Do not `git commit` or push unless the user asked for it in this turn.
