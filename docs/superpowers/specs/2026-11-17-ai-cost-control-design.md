# AI cost control — design

Date: 2026-11-17 · Status: approved 2026-11-18

## Intent

The owner does not know what the AI features cost, and nothing counts or limits AI calls today. The Live Coach upgrade makes this more urgent: big moments now get a tip every 25 seconds at the fastest.

There are six kinds of AI call:

| Kind | When it runs | Limited today by |
|---|---|---|
| Live tip | during a match, on moments and Ask coach | 25 s / 90 s / 15 s gaps only |
| Live item plan | match start, and when the player buys off-plan | one attempt per minute |
| Draft advice | "Get advice" on the locked draft | nothing |
| Draft screenshot | uploading a draft screenshot | nothing |
| Stats coach | Stats page | once per 12 hours per player (stored answer) |
| Hero picks | Trending Heroes page | once per 12 hours per player (stored answer) |

## Goals

- Every AI call is recorded per player, with its kind, whether it worked, and its token use when the provider reports it.
- A player can see how much of today's allowance they have used.
- At a limit the app stops calling the AI and says so calmly, with the time it frees up.
- The owner can print real usage per day and kind, to work out the cost.

## Non-goals

- Payments, plans, or per-player custom limits.
- An admin page. The owner gets a script that prints the numbers.
- Turning tokens into money. The script prints tokens; the price depends on the provider.
- Changing the AI model or the prompts.

## Anti-goals

- Checking the limit after the AI was already called (the money is spent by then).
- A limit message that looks like something broke.
- The Live page hammering the server once a limit is reached.
- A counting failure taking a page down. If the database cannot be reached, AI calls go ahead uncounted, as today.

## Constraints

- `AGENTS.md` rules; Next.js 16 docs first; files under 200 lines; zod on server input.
- Database: Supabase Postgres via Drizzle. **One new table means one migration**, generated into `src/db/migrations/` and applied by the owner with `npm run db:migrate`.
- Until the migration is applied, counting silently does nothing and nothing is blocked.
- Players are identified by their Clerk user id, which every AI call site already has.

## Approaches considered

1. **One gate that every AI call goes through** — **chosen** (the owner left the how to the builder). A small module checks the player's allowance, runs the call, and records it. All six call sites use it, so no call can be missed and the limits live in one file.
2. **Count inside the Hugging Face client.** The client does not know which player is asking; passing that down mixes two jobs in one file.
3. **Only tighten the time gaps.** Cheap, but it measures nothing, so the owner still would not know the cost.

## Design

### What is recorded

New table `ai_calls`: player (Clerk user id), kind, match id (live calls only), prompt tokens and answer tokens (empty when the provider does not report them), whether the call succeeded, and the time. Row-level security on with no policies: only the server reads and writes it.

A call is recorded when it actually reached the AI provider. A request refused by a limit, by a time gap, or because the key is missing is not recorded.

### Limits (builder's numbers, for the owner to change)

"Today" means the last 24 hours, so there is no midnight cliff.

| Limit | Value | Reasoning |
|---|---|---|
| All AI calls per player, per day | **250** | about five full games of tips plus drafts |
| Live tips per match | **40** | the Live Coach design expects 25–35 |
| Item plans per match | **4** | one at the start, a few re-plans |
| Draft advice per day | **20** | one per game with room to retry |
| Draft screenshots per day | **30** | a few tries per draft |
| Stats coach, hero picks | counted, no limit of their own | already once per 12 hours each |

All values sit in one file as named constants.

### What the player sees

Live page, beside the Coach heading:

```
COACH                         AI today 37 / 250 · this match 12 / 40      [Ask coach now]
```

When a limit is reached, the tip list shows one calm line instead of an error, Ask coach is disabled, and automatic requests stop until the limit frees up:

```
The coach has given its 40 tips for this match.
You've used today's AI allowance (250). It frees up from 21:40.
```

- Draft page: the advice button and the screenshot reader answer with the same kind of line.
- Stats and Trending Heroes: when the daily allowance is used up they show the rule-based suggestions and top picks they already fall back to. No message is needed.

### For the owner

`npx tsx src/db/scripts/ai-usage.ts` prints the last 7 days: calls, failed calls, prompt tokens and answer tokens, per day and kind, plus the five heaviest players. This sits next to the existing database scripts.

## Testing

Pure tests for the allowance decision (each limit, the rolling 24 hours, the time a limit frees up). Route tests: a refused request never calls the AI, returns the limit and the free-up time, and records nothing; a successful one records one row. The Live page hook stops asking after a limit answer and resumes on a new match.

## Left to the builder

- How to read token use from the provider's answer (it follows the OpenAI format; unverified for this provider).
- Exact wording, and where the usage line sits on small screens.
- Whether the six call sites need small changes to pass the player's id (Stats and Trending currently pass the Steam account id).

## Calls made by the builder (for the owner to check)

- Every number in the limits table.
- "Today" is a rolling 24 hours, not a calendar day.
- If counting fails, calls go ahead uncounted rather than being blocked.
- A printed report instead of an admin page.
