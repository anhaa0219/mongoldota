# RAG for the coaches: game knowledge and match memory in Pinecone

Date: 2026-11-23. Deadline: working live coaching by Friday 2026-11-27.

## Why

The Live Coach keeps stating false things about Dota 2: ability effects, item effects, timings and mechanics.
The model (`Qwen/Qwen3.8-27B` through the Hugging Face router, `src/lib/ai/hf.ts`) only knows the game from its
training data, which is older than the current patch (7.42), and it fills gaps by guessing. The prompts already
give it exact OpenDota numbers (win rates, item popularity, BKB timing, ability text for the draft), but nothing
about items, talents, facets, patch changes or map mechanics.

The project must also include RAG with Pinecone as the vector database. RAG does not retrain the model: it
looks up checked knowledge at question time and puts it in the prompt.

## Goals

1. **Game knowledge base (A).** Pinecone holds checked, current-patch game knowledge. Every Live Coach tip and item
   plan, and the Draft coach, searches it and answers only from what it finds plus the numbers it already gets.
2. **Match memory (B).** After each match the player finishes, a short summary of that match is stored in Pinecone
   under that player. Later tips can draw on the player's own past games ("last two games vs Pudge you died to ganks").
3. **Keep feeding.** Rerunning one script after a patch refreshes the knowledge base. Match memory grows by itself.
4. A demo script that shows, for a sample game moment, what was found in Pinecone and the tip with and without it.

Order of work: A for the Live Coach first, then B, then A for the Draft coach. A on the Live Coach must work by Friday;
B and the Draft coach are next.

## Non-goals

- Moving win rates, matchups or item popularity into Pinecone. Those stay exact OpenDota lookups as they are now.
  Vector search returns similar text, not exact numbers.
- Changing the model, fine-tuning, or training anything.
- RAG for the Stats coach or Hero picks.
- A UI for browsing or editing the knowledge base.
- Tests: this repo has none and must not get any (see `CLAUDE.md`).

## Anti-goals (fail even if it technically works)

- A tip waits on Pinecone. Retrieval has a short timeout; on any failure the coach answers as it does today.
- The knowledge base itself contains false info. Data from OpenDota's game files is fine; anything hand-written is
  checked by the project owner against the current patch before it ships.
- One player's match memory shows up in another player's tips.
- Prompts swell until tips get slow or the AI limits trip. Retrieved text has a hard size cap.

## Constraints

- Next.js 16 (read `node_modules/next/dist/docs/` before using `after()` or other APIs), Drizzle, Clerk, zod.
- Project rules in `AGENTS.md` / `CLAUDE.md` / `.claude/skills/`: no `any`, files under 200 lines, one thing per
  file, validate input with zod, catch errors from outside services, never show raw errors, no `console.log`.
  Done means `npm run lint` and `npx tsc --noEmit` both pass with zero errors.
- Env vars `PINECONE_API_KEY` and `PINECONE_INDEX` are already listed in `.env.example`. Any new ones get added there.
  `.env.local` has the API key but no index name yet: the project owner sets `PINECONE_INDEX=mongoldota-coach`
  (my call for the name), and the ingest script creates that index if it's missing.
- Pinecone free tier (Starter). The Pinecone TypeScript SDK changed its index API in v9: check the current docs for
  integrated-embedding indexes before writing calls, and don't follow older `createIndexForModel` examples blindly.
- The Live Coach answer has a 30 s budget (`askQuickModel`); retrieval must add well under 2 s.

## Approaches considered

- **A. Game knowledge base in Pinecone (chosen).** OpenDota game files, patch notes and a short checked list of
  mechanics go into Pinecone. Each coach request searches it for the heroes, items and events in play. This goes
  after the false info directly.
- **B. Match memory per player (chosen, after A).** Each finished match becomes one record in the player's own space.
  This shows RAG learning from the player, but it doubles the work, so it comes after A works.
- **Everything into Pinecone, numbers included (dropped).** Vector search returns similar text, not exact numbers,
  so it would add new false info.

The project owner picked A with B.

## Design

### Pinecone setup

- One index with Pinecone's built-in embedding (integrated inference), so the app sends text and Pinecone makes the
  vectors. No second embedding service. Model: `multilingual-e5-large` (handles English, and Mongolian if a query
  is ever written in it). Text field: `text`.
- Namespaces: `game` for the shared knowledge base; `player-<clerkUserId>` for each player's match memory.
- The client lives in `src/lib/rag/` (new subfolder of `lib`). Like `hf.ts`, its functions never throw: they return
  an empty result on a missing key, a timeout or an error.

### Knowledge records (namespace `game`)

One record per piece of knowledge, at most ~500 characters of `text`, with metadata `source`, and `hero` and/or
`item` keys where they apply, and `patch`. Record ids are stable (for example `ability:viper_nethertoxin`), so
rerunning overwrites instead of duplicating.

| source | From | One record per |
|---|---|---|
| `ability` | `/constants/abilities` + `/constants/hero_abilities` | hero ability: name, description, key values, cooldown/mana |
| `talent` | same | hero: its talent tree by level |
| `facet` | `/constants/hero_abilities` facets | hero facet |
| `aghs` | `/constants/aghs_desc` | hero: Aghanim's Scepter and Shard effects |
| `item` | `/constants/items` | item: cost, components, effects, cooldown |
| `patch` | `/constants/patchnotes` (current patch and its letter patches) | hero or item: its changes in that patch |
| `mechanic` | hand-written list in `src/lib/rag/` | one fact: runes, Roshan, Tormentors, day/night, lotus pools, wisdom runes, neutral items, buyback, glyph and similar |

The `mechanic` list is drafted by the builder and **checked line by line by the project owner against patch 7.42**
before it is loaded. Any fact that can't be checked is left out.

### Feeding the knowledge base

`src/db/scripts/rag-ingest.ts`, run with `npx tsx`: creates the index if it's missing, fetches the OpenDota constants,
builds the records, clears the `game` namespace (so removed abilities and items disappear), and upserts in batches.
At the end it prints the record count per source. It gets rerun after every patch.

### Searching at tip time (Live Coach)

In `src/app/api/live/coach/route.ts`, after `gameContext` and before the prompt is built, one helper searches the
`game` namespace in parallel:

- the event query: the player's hero, what just happened (death, teamfight, item and so on with its detail) and the
  enemy heroes, filtered to records about the heroes in this game, their items, or mechanics. Top ~6.
- mechanics: the same query filtered to `source = mechanic`. Top ~2.

For the item plan, the query is the hero plus the lane opponents, filtered to the plan's candidate items and the
heroes in the game.

Results are de-duplicated and capped at ~2,500 characters in total. The prompt gets a `REFERENCE` section and one
added rule: *"Only state ability, item, talent, timing or mechanic facts found under REFERENCE or the facts above. If
you are not sure, give the advice without the specific number or effect."* Timeout ~1.5 s for the whole search. On
any failure or empty result the section is left out and the tip works as today.

### Match memory (B)

- **When:** the GSI route already notices when the player leaves a match (the update has no match, or a different
  match). At that moment, if the stored state had a snapshot, write one memory for that match without delaying the
  GSI reply (use Next's `after()`; check the Next 16 docs). Write it only once per match.
- **What** (one record, `text` ≤ ~800 chars): date, hero, position (from the locked draft if it was for this match),
  allies and enemies when known, final K/D/A, level, GPM/XPM, clock at the end, final items, the kinds of moments
  that got tips (for example "died 6 times, 2 lost teamfights"), and the coach's tips from that match (shortened).
  Result (win/loss) when Dota reported it at the end, otherwise "result unknown". Metadata: `hero`, enemy hero keys,
  `matchId`, `endedAt`.
- **Search:** in the Live Coach, a third parallel search in `player-<clerkUserId>`: the current hero and enemies,
  leaving out the current match. Top 2. It goes in the prompt as `PAST GAMES OF THIS PLAYER`, marked as patterns from
  earlier games, never facts about this one.
- **Removal:** when the player unlinks Steam (live data is already removed then), their `player-` namespace is deleted
  too.

### Draft coach (A, last)

`buildAdvicePrompt` gets the same `REFERENCE` section, searched for the player's hero, the lane opponents and the
enemy heroes. Same rule, cap and fallback. The Draft coach has a 2-minute budget, so a ~3 s timeout is fine.

### Cost and limits

Pinecone searches are not model calls: they don't go through `gatedAiCall` and don't count toward the AI limits.
There is at most one set of searches per coach request, and those requests are already limited.

### Demo and checking

`src/db/scripts/rag-samples.ts` (like `ai-mongolian-samples.ts`): for a few sample game moments, it prints the
records found, then the tip with and without `REFERENCE`. This is for the project demo and for checking by eye.
There are no automated tests.

## Builder's calls

- Exact record wording, query wording, top-K values and timeouts within the limits above.
- Whether win/loss comes from GSI's end-of-game state or is left as unknown.
- How the "write once per match" guard is stored (a Postgres row, or a fixed record id in Pinecone that's checked
  before writing).
- File split inside `src/lib/rag/` and `src/db/scripts/`.
