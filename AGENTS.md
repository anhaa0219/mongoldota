<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Code rules

| Rule | Bad | Good |
|---|---|---|
| No `any` | `(data: any)` | `(data: Post)` |
| Names say what it is | `d`, `flag`, `handle()` | `posts`, `isLoading`, `savePost()` |
| Return early | 3 nested `if` | `if (!user) return;` then the main code |
| Small files | one 600-line page | one component per file, under 200 lines |
| Check input on the server | trust `req.body` | validate it with zod first |
| Catch errors from outside services | app crashes when Pinecone is slow | try/catch, friendly message to the user |
| Never show raw errors | "PostgresError: relation..." | "Could not save. Try again." |
| No leftover logs | `console.log(user)` in a commit | delete it before commit |

## Lint rules (enforced in eslint.config.mjs)

| Rule | Catches | Why |
|---|---|---|
| `no-explicit-any` | `let x: any` | `any` turns off TypeScript. Bugs hide there. |
| `no-unused-vars` | imports and variables never used | Dead code confuses teammates. |
| `eqeqeq` | `a == b` | `0 == ''` is true. `===` has no surprises. |
| `no-console` | `console.log` | Logs leak user data and clutter the console. |
| `prefer-const` | `let` never reassigned | `const` tells the reader "this never changes". |
| `react-hooks/rules-of-hooks` | hook inside an `if` | Breaks React state. Comes with the Next config. |
| `react-hooks/exhaustive-deps` | missing value in `useEffect` deps | Stale data bugs. Comes with the Next config. |
| `max-lines` | files over 200 lines (blank lines and comments not counted) | Small files are easier to read and review. |

Run `npm run lint` before finishing any task; it must pass with no errors.

## Folder structure

```
src/
  app/              pages and API routes
    api/            server endpoints, one folder per feature
  components/       UI pieces, one per file
  db/
    schema.ts       Drizzle tables
    index.ts        the db connection
  lib/
    hf.ts           Hugging Face client
    pinecone.ts     Pinecone client
    wire.ts         payment helpers
  types/            shared TypeScript types
.env.example        list of keys, no values
```

New code goes in the folder that matches above. Don't create new top-level folders without asking. Never commit real keys; add every new env var name to `.env.example`.
