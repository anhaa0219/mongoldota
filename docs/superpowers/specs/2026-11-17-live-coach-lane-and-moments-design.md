# Live Coach: lane awareness and key moments — design

Date: 2026-11-17 · Status: draft for approval · Builds on `2026-11-17-live-coach-design.md`

## Intent

Two complaints from the owner about the live coach:

1. **It does not know which lane the player is in.** It should use the same matchup rule as the Draft page: pos 1 and 5 lane against the enemy pos 3 and 4, pos 3 and 4 against the enemy pos 1 and 5, pos 2 against pos 2.
2. **It reacts to too few moments.** Today: death, kill, building falls, item bought, gold ready, quiet-time look-ahead. Wanted as well: assists, kill streaks, teamfights, buyback, Roshan, and praise after good plays.

Why: a coach that ignores the lane gives generic advice in the first 10 minutes, and a coach that stays silent after a teamfight or a buyback misses the moments where advice matters most.

## Goals

- Every tip is written knowing the player's position, lane, lane partner and lane opponents.
- The coach reacts to the new moments listed below.
- **Big moments get a tip straight away; small ones wait** (the owner's choice). Roughly 25–35 tips in a 40-minute game.
- After a good play the tip opens with a few words of praise, then says what to do next.
- Nothing breaks when Dota does not send a field: that moment is simply never detected.

## Non-goals

- Knowing when the **enemy** kills Roshan. Dota reports Roshan only to spectators, not to a player's own client. The coach knows about Roshan only when the player picks up the Aegis.
- Enemy items, gold or positions (unchanged from the first design).
- A cap on tips or AI spend per match. That is the next project (AI cost control); this design only keeps the rate bounded.
- Tips while the page is closed, voice, phone notifications, translations (unchanged).

## Anti-goals

- A teamfight producing several tips. One fight, one tip.
- Praise with no advice ("Nice kill!" and nothing else).
- A tip that names a lane opponent the draft does not contain.
- Old stored game states (written before this change) crashing the page.

## Constraints

- Same as the first design: Next.js 16 (read `node_modules/next/dist/docs/` first), `AGENTS.md` rules, files under 200 lines, zod on server input, no raw errors on screen.
- The page stays the coach: moments are detected in the browser from consecutive game states, and `/api/live/coach` builds the prompt from the database.
- `live_tips.kind` is a text column, so new kinds need **no migration**.
- `live_states.snapshot` is stored JSON read without validation. Every new snapshot field must be optional when read.
- The Dota setup file already asks for the `map`, `player` and `hero` sections, where all the new fields live. **Players do not need to download it again.**

## Approaches considered

1. **Extend the current pipeline** — **chosen** (the owner left the how to the builder). More fields in the game state, more detectors, a big/small level per moment, and the lane block added to the prompt. Smallest change; every piece is a pure function that already has tests beside it.
2. **Canned lines without AI for small moments.** Instant and free, but the owner chose to fold kills and assists into the next tip, so there is nothing for canned lines to say.
3. **Detect moments on the server.** Tips even with the page closed, but the first design rejected this: it spends credits when nobody is watching.

## Design

### 1. Lane awareness

**With a locked draft for the hero being played** (already the case when the draft facts load): the lane is already worked out in `AdviceFacts.lane` by `gatherAdviceFacts`, using the rule above. The live prompt never included it. Add a lane block to every tip prompt and to the item-plan prompt:

```
Lane: bot (safe lane) with Lion (pos 5), against Axe (pos 3) and Earth Spirit (pos 4).
Viper wins 54% vs Axe (1,240 games) and 49% vs Earth Spirit (810 games).
The laning stage is still on.            ← only while the game clock is under 10:00
```

- The map lane comes from side and position: safe lane is **bot for Radiant, top for Dire**; off lane is the reverse; pos 2 is mid.
- When a building falls in the player's own lane, the event line says so ("…the bot tier 1 tower, in their lane").

**Without a usable draft** (none locked, older than the freshness limit, or locked for another hero) — *builder's call, not something the owner asked for*: the Live page shows a small "Your position" picker, pos 1–5, preselected with the best fit for the hero's roles (the same role weights the Draft page uses) and marked as a guess until tapped. The choice is remembered in the browser for that match and sent with each coach request. The prompt then says the position and lane, and that the lane opponents' heroes are unknown ("against the enemy pos 3 and pos 4"). A locked draft always wins over the picker.

### 2. New moments

| Moment | Detected when | Level |
|---|---|---|
| Death (exists) | deaths went up | **big** |
| Teamfight | 3 or more hero deaths, both teams together, inside one moment group | **big** |
| Buyback used | the hero comes back to life while buyback goes on cooldown | **big** |
| Aegis | an Aegis appears among the player's items | **big** |
| Kill (exists) | kills went up | small |
| Assist | assists went up | small |
| Kill streak | the streak reaches 3, 5 or 8 | small |
| Buyback gold lost | after 30:00, gold drops below the buyback cost while buyback is off cooldown | small |
| Building, item, gold ready, look-ahead (exist) | unchanged | small |

New fields in the game state, all optional: kill streak, buyback cost, buyback cooldown, and the two team scores. Field names as documented for Dota's Game State Integration (`player.kill_streak`, `hero.buyback_cost`, `hero.buyback_cooldown`, `map.radiant_score`, `map.dire_score`).

**Teamfights** are counted from the team scores. Whether Dota sends team scores to a playing client is **not confirmed**. When they are missing, fall back to the player's own numbers: 2 or more of their own kills, assists and deaths inside one moment group count as a teamfight. The teamfight line reports what is known: kills for each team when scores exist, otherwise the player's own part in it.

**Buyback status** is also added to the game line of every prompt ("Buyback ready, costs 1,450" / "on cooldown 3:20" / "cannot afford: costs 1,450, has 900"), so a death tip late in the game can say whether to buy back.

### 3. When the coach speaks

- **Moment group:** moments are gathered until nothing new has happened for **6 seconds**, or **20 seconds** at most. (Today: a fixed 10 seconds, which cuts long fights in half.) A whole fight becomes one tip.
- **Big group** (contains at least one big moment): sent if the last tip was **25 seconds** or more ago.
- **Small group:** sent if the last tip was **90 seconds** or more ago, as today. Otherwise it waits and joins the next group that is sent.
- A group that is sent carries every waiting moment, big and small.
- The server applies the same gaps when it claims the tip slot (25 s when the request contains a big kind, 90 s otherwise, 15 s for Ask coach), so several open tabs still produce one tip.
- Look-ahead after 240 quiet game-seconds, Ask coach, and the item plan are unchanged.

A tip appears on the page about 10–20 seconds after the moment: 6 seconds of gathering plus the model's answer time.

### 4. What the coach is told

New event lines in the prompt, one per moment: assists ("They just got 2 assists."), streak ("They are on a 5-kill streak."), teamfight ("A teamfight just ended: their team got 3 kills, the enemy got 1. They got 1 kill and 2 assists and survived."), buyback used, buyback gold lost, Aegis ("They just picked up the Aegis; it expires 5 minutes after pickup.").

One new instruction: when the moments include a kill, a streak or a won teamfight, start with a few words of praise, then give the next move. Still at most two sentences.

### 5. On the page

- The tip list gets an icon and label for each new kind (assist, streak, teamfight, buyback, Aegis).
- The position picker described above, shown only when there is no usable draft.
- Nothing else changes visually.

### 6. Server input

`/api/live/coach` accepts the new kinds, up to 12 kinds per request (today 6), and an optional `position` (1–5, zod-validated). The position is used only when there is no usable locked draft.

## Testing

Extend the existing pure-function tests: game-state parsing (new fields present, missing, and an old stored state), moment detection (each new moment, plus teamfight with and without team scores), timing (big group breaks the 90-second gap, small group does not, a long fight stays one group), prompt (lane block for Radiant and Dire, own-lane building, picker position without a draft, praise instruction), and the coach route (new kinds, position, the 25-second slot).

## Left to the builder

- **First step of the plan:** confirm against one real game (a bot match is enough) which of the new fields Dota actually sends, and adjust names if they differ. The design already degrades cleanly when a field is missing.
- Exact wording of prompt lines, icons, and how the picker looks.
- File split within the 200-line limit (`live-coach-prompt.ts` is at 144 lines and will need splitting).

## Calls made by the builder (for the owner to check)

- Position picker when no draft is locked.
- Big-moment gap of 25 seconds; moment group closes after 6 quiet seconds, 20 at most.
- Streak announced at 3, 5 and 8 kills.
- Buyback: "used" is big; "gold lost" only after 30:00 and small; status shown in every prompt.
- Buildings stay small moments, including barracks.
- "Cheering" read as praise after a good play.
