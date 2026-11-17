# Live Coach: Lane Awareness and Key Moments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The live coach knows the player's position and lane, reacts to assists, kill streaks, teamfights, buyback and the Aegis, and lets big moments through after 25 seconds instead of 90.

**Architecture:** The page stays the coach. Dota's Game State Integration (GSI) sends a few more fields; the browser turns consecutive game states into *moments*, gathers them into a group, folds a burst of kills into one teamfight, and asks `/api/live/coach`, which builds the prompt from the database plus a lane block. Every new piece is a pure function with a test beside it.

**Tech Stack:** Next.js 16.4 (App Router, Cache Components, React Compiler), React 19, TypeScript, zod 4, Vitest 4, Tailwind 4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-17-live-coach-lane-and-moments-design.md` (builds on `2026-11-17-live-coach-design.md`). Read both before starting.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.
- `AGENTS.md` rules: no `any`, names say what the thing is, return early, **files under 200 lines** (blank lines and comments not counted), zod on every server input, no raw errors on screen, no `console.log`.
- `npm run lint` and `npm test` must pass at the end of every task.
- No database migration: `live_tips.kind` is a text column.
- Every new `LiveSnapshot` field is optional when read. Stored snapshots written before this change have none of them.
- Players must not need a new Dota setup file. Use only the `map`, `player`, `hero` and `items` sections.
- Moments are detected in the browser; the server never detects them.
- Exact numbers from the spec: group closes after **6 s** quiet or **20 s** at most; big gap **25 s**; small gap **90 s**; Ask coach **15 s**; teamfight = **3** hero deaths (or **2** of the player's own kills/assists/deaths when team scores are missing); streak at **3, 5, 8**; buyback-gold warning only from **30:00**; laning stage ends at **10:00**; up to **12** kinds per request.
- Before Task 1: the working tree on `main` holds an uncommitted design pass (43 files). The owner commits or stashes it, then this work happens on a branch named `live-coach-moments`.

## Review Focus

Conditions the spec does not spell out but a player will hit. Each has a test in the task named.

1. **An old stored game state has none of the new fields.** Expected: no moments, no `NaN`, no crash. → Task 4.
2. **Two game states far apart** (connection dropped for two minutes, then scores jumped by nine). Expected: not reported as one giant teamfight. → Task 4.
3. **Dota sends team scores but not the player's team.** Expected: scores are ignored and the teamfight falls back to the player's own numbers. → Task 4.
4. **Kills happen elsewhere on the map, fewer than three, and the player is not involved.** Expected: no tip, and the look-ahead timer and gaps are untouched. → Task 5.
5. **The hero has no roles** (released after the last OpenDota fetch). Expected: the position picker still shows a valid position. → Task 2.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/types/live.ts` (modify) | New snapshot fields, new event kinds, `Moment`, `BIG_EVENT_KINDS` |
| `src/lib/gsi.ts`, `src/lib/gsi-test-fixture.ts` (modify) | Parse the new GSI fields |
| `src/lib/draft-lanes.ts` (modify) | `mapLane`, `laneName`, `guessPosition` |
| `src/lib/live-lane.ts` (create) | `LaneInfo`, `laneInfo`, `laneLines`: the lane block of a prompt |
| `src/lib/live-moments.ts` (create) | Teamfight detail codec, `isBigKind`, `closeGroup` |
| `src/lib/live-coach-lines.ts` (create) | `gameLine`, `eventLine`, `buybackLine`: moved out of the prompt file and extended |
| `src/lib/live-coach-prompt.ts` (modify) | Prompt builders take a lane; praise instruction |
| `src/lib/live-events.ts` (modify) | Detect the new moments |
| `src/lib/live-coach-timing.ts`, `src/lib/live-coach-state.ts` (modify) | Group, big/small gaps, held groups |
| `src/app/api/live/coach/route.ts` (modify) | 12 kinds, `position`, lane into prompts |
| `src/lib/use-live-coach.ts`, `src/components/live/LiveCoach.tsx`, `src/app/(site)/live/page.tsx` (modify) | Send position; wire the picker |
| `src/components/live/PositionPicker.tsx` (create) | Pos 1–5 pills |
| `src/components/live/TipList.tsx` (modify) | Icons and labels for new kinds |

---

### Task 1: Field check against a real game (owner needed, nothing committed)

Confirms which fields Dota really sends. **Not blocking:** if the owner cannot play now, skip to Task 2 and come back; the design degrades cleanly when a field is missing.

**Files:** none in the repo. Work in a temporary folder outside it.

- [ ] **Step 1: Write `listen.mjs` in a temporary folder**

```js
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
const seen = new Map();
const walk = (value, path) => {
  if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
  else seen.set(path, typeof value);
};
createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    try {
      const { map, player, hero } = JSON.parse(body);
      walk({ map, player, hero }, "");
      writeFileSync("fields.txt", [...seen].sort().map(([path, type]) => `${path}: ${type}`).join("\n"));
    } catch {}
    response.end();
  });
}).listen(4000);
```

- [ ] **Step 2: Give the owner a second setup file**, `gamestate_integration_fieldcheck.cfg`, to put next to the existing one in `…\game\dota\cfg\gamestate_integration\`. Same format as `buildGsiConfig` in `src/lib/gsi-config.ts`, with `"uri" "http://localhost:4000/"`, any token, and the sections `map`, `player`, `hero`. The existing MongolDota file is untouched.

- [ ] **Step 3: Owner runs `node listen.mjs`, restarts Dota, plays a few minutes of a bot match** (get a kill, die once, buy back if possible).

- [ ] **Step 4: Read `fields.txt` and check these paths exist:** `.player.kill_streak`, `.hero.buyback_cost`, `.hero.buyback_cooldown`, `.map.radiant_score`, `.map.dire_score`.

- [ ] **Step 5: Record the result** as a "Confirmed fields" section at the end of the spec (which exist, any different names). If a name differs, use the real name in Task 3. If team scores are absent, change nothing: the fallback covers it. Owner deletes the field-check cfg file.

---

### Task 2: Lane helpers

**Files:**
- Modify: `src/lib/draft-lanes.ts`
- Create: `src/lib/live-lane.ts`
- Test: `src/lib/draft-lanes.test.ts` (create if absent), `src/lib/live-lane.test.ts`

**Interfaces:**
- Consumes: `AdviceFacts`, `Position` from `@/types/draft`; `Side` from `@/types/game`; `ROLE_WEIGHTS`, `laneOpponentPositions` already in `draft-lanes.ts`.
- Produces:
  - `type MapLane = "top" | "mid" | "bot"`
  - `mapLane(side: Side, position: Position): MapLane`
  - `laneName(position: Position): "safe lane" | "mid" | "off lane"`
  - `guessPosition(roles: string[]): Position`
  - `interface LaneInfo { position: Position; lane: MapLane | null; partners: string[]; opponents: { name: string; position: Position; myWinRate: number | null; games: number }[] | null }` — `lane` is null when the player's team is unknown; `opponents` is null when the heroes are unknown.
  - `laneInfo(input: { team: Side | null; facts: AdviceFacts | null; position: Position | null }): LaneInfo | null`
  - `laneLines(lane: LaneInfo, heroName: string, clockSeconds: number): string[]`

- [ ] **Step 1: Write the failing tests**

```ts
// draft-lanes.test.ts
it("puts the safe lane bot for Radiant and top for Dire", () => {
  expect(mapLane("radiant", 1)).toBe("bot");
  expect(mapLane("radiant", 5)).toBe("bot");
  expect(mapLane("dire", 1)).toBe("top");
  expect(mapLane("radiant", 3)).toBe("top");
  expect(mapLane("dire", 4)).toBe("bot");
  expect(mapLane("radiant", 2)).toBe("mid");
  expect(mapLane("dire", 2)).toBe("mid");
});
it("guesses a position from roles", () => {
  expect(guessPosition(["Carry", "Escape"])).toBe(1);
  expect(guessPosition(["Support", "Disabler"])).toBe(5);
  expect(guessPosition(["Durable", "Initiator"])).toBe(3);
});
it("still gives a valid position for a hero with no roles", () => {
  expect([1, 2, 3, 4, 5]).toContain(guessPosition([]));
});

// live-lane.test.ts — FACTS: position 1, lane.partners ["Lion (pos 5)"],
// lane.opponents [{ name: "Axe", position: 3, myWinRate: 54, games: 1240 }, { name: "Earth Spirit", position: 4, myWinRate: null, games: 0 }]
it("uses the draft's lane when there are facts", () => {
  expect(laneInfo({ team: "radiant", facts: FACTS, position: 3 })).toMatchObject({ position: 1, lane: "bot", partners: ["Lion (pos 5)"] });
});
it("falls back to the picked position with unknown heroes", () => {
  expect(laneInfo({ team: "dire", facts: null, position: 3 })).toEqual({ position: 3, lane: "bot", partners: [], opponents: null });
});
it("is null without facts or a position", () => expect(laneInfo({ team: "radiant", facts: null, position: null })).toBeNull());
it("writes the lane block", () => {
  const lines = laneLines(laneInfo({ team: "radiant", facts: FACTS, position: null })!, "Viper", 300);
  expect(lines).toEqual([
    "Lane: bot (safe lane) with Lion (pos 5), against Axe (pos 3) and Earth Spirit (pos 4).",
    "Viper wins 54% vs Axe (1,240 games).",
    "The laning stage is still on.",
  ]);
});
it("drops the laning line from 10:00 and names unknown opponents by position", () => {
  expect(laneLines({ position: 3, lane: "top", partners: [], opponents: null }, "Axe", 600)).toEqual([
    "They play Position 3 (off lane).",
    "Lane: top (off lane), against the enemy pos 1 and pos 5 (heroes unknown).",
  ]);
});
it("says just the lane role when the team is unknown, and no doubled 'mid'", () => {
  expect(laneLines({ position: 2, lane: null, partners: [], opponents: null }, "Puck", 900)[1]).toBe("Lane: mid, against the enemy pos 2 (heroes unknown).");
});
```

- [ ] **Step 2: Run `npx vitest run src/lib/draft-lanes.test.ts src/lib/live-lane.test.ts`** — expected: FAIL, functions not exported.

- [ ] **Step 3: Implement.** `guessPosition` scores each position with the existing `ROLE_WEIGHTS` and returns the best; ties go to the lowest position number. `laneInfo` prefers `facts` (position, `facts.lane`) over `position`. `laneLines` rules, in order: a "They play …" line (using `POSITION_NAMES` from `@/lib/draft-advice`) **only when `opponents` is null** (with facts the team block already says it); the `Lane:` line, written `"<lane> (<laneName>)"`, or just `"mid"` for pos 2, or just the lane name when `lane` is null; a win-rate sentence joining every opponent whose `myWinRate` is not null with " and "; `"The laning stage is still on."` while `clockSeconds < 600`.

- [ ] **Step 4: Run the same command** — expected: PASS. Then `npm run lint`.

- [ ] **Step 5: Commit** — `git add src/lib/draft-lanes.ts src/lib/draft-lanes.test.ts src/lib/live-lane.ts src/lib/live-lane.test.ts && git commit -m "feat(live): lane helpers for the live coach"`

---

### Task 3: New game-state fields

**Files:**
- Modify: `src/types/live.ts`, `src/lib/gsi.ts`, `src/lib/gsi-test-fixture.ts`
- Test: `src/lib/gsi.test.ts`

**Interfaces:**
- Produces, on `LiveSnapshot` (all optional): `killStreak?: number`, `buybackCost?: number`, `buybackCooldown?: number` (seconds left; 0 when ready), `score?: { radiant: number; dire: number }`.

- [ ] **Step 1: Write the failing tests** in `gsi.test.ts`

```ts
it("reads kill streak, buyback and team scores when Dota sends them", () => {
  const body = gsiFixture();
  Object.assign(body.player, { kill_streak: 4 });
  Object.assign(body.hero, { buyback_cost: 1450, buyback_cooldown: 0 });
  Object.assign(body.map, { radiant_score: 12, dire_score: 9 });
  expect(snapshotOf(body)).toMatchObject({ killStreak: 4, buybackCost: 1450, buybackCooldown: 0, score: { radiant: 12, dire: 9 } });
});
it("leaves the new fields out when Dota does not send them", () => {
  const snapshot = snapshotOf(gsiFixture());
  expect(snapshot?.killStreak).toBeUndefined();
  expect(snapshot?.buybackCost).toBeUndefined();
  expect(snapshot?.score).toBeUndefined();
});
it("needs both team scores", () => {
  const body = gsiFixture();
  Object.assign(body.map, { radiant_score: 12 });
  expect(snapshotOf(body)?.score).toBeUndefined();
});
```

- [ ] **Step 2: Run `npx vitest run src/lib/gsi.test.ts`** — expected: FAIL on the first test.

- [ ] **Step 3: Implement.** Add the five optional numbers to `gsiSchema` (`map.radiant_score`, `map.dire_score`, `player.kill_streak`, `hero.buyback_cost`, `hero.buyback_cooldown`, or the names Task 1 confirmed) and map them in `toLiveSnapshot`. Leave the fixture without them (it is the "Dota does not send them" case).

- [ ] **Step 4: Run the test file, then `npm test` and `npm run lint`** — expected: all PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(live): read kill streak, buyback and team scores from Dota"`

---

### Task 4: New kinds, their prompt lines, and detection

**Files:**
- Modify: `src/types/live.ts`, `src/lib/live-events.ts`, `src/lib/live-coach-prompt.ts`, `src/lib/live-coach-state.ts` (type of `queued` only), `src/components/live/TipList.tsx`
- Create: `src/lib/live-moments.ts`, `src/lib/live-coach-lines.ts`
- Test: `src/lib/live-events.test.ts`, `src/lib/live-moments.test.ts`, `src/lib/live-coach-prompt.test.ts`

**Interfaces:**
- Consumes: `LaneInfo`, `laneLines` (Task 2); new snapshot fields (Task 3).
- Produces:
  - In `types/live.ts`: `LiveEventKind` gains `"assist" | "streak" | "teamfight" | "buyback" | "nobuyback" | "aegis"` (also added to `LIVE_EVENT_KINDS`); `BIG_EVENT_KINDS: readonly LiveEventKind[] = ["death", "teamfight", "buyback", "aegis"]`; `interface TeamKill { kind: "teamkill"; detail: "ours" | "theirs" }` (a kill scored by the player's team or the enemy; browser-only, never sent); `type Moment = LiveEvent | TeamKill`.
  - In `live-moments.ts`: `isBigKind(kind: LiveEventKind): boolean`; `interface TeamfightSummary { ours: number | null; theirs: number | null; kills: number; assists: number; died: boolean }`; `teamfightDetail(summary: TeamfightSummary): string` → `"3:1:1:2:0"`, with `?` for unknown scores; `parseTeamfightDetail(detail: string): TeamfightSummary | null`.
  - In `live-events.ts`: `detectEvents(...)` keeps its parameters and now returns `Moment[]`. Exported constants `STREAK_MARKS = [3, 5, 8]`, `NO_BUYBACK_FROM_SECONDS = 1800`, `MAX_SNAPSHOT_GAP_SECONDS = 30`.
  - In `live-coach-lines.ts`: `gameLine(snapshot, heroName, itemName): string`, `eventLine(event: LiveEvent, itemName, playerTeam: Side | null, lane: MapLane | null): string`, `buybackLine(snapshot): string | null`.
  - In `live-coach-prompt.ts`: `buildLiveTipPrompt` and `buildItemPlanPrompt` inputs gain `lane: LaneInfo | null`.
- Event `detail` values: `assist` = how many; `streak` = the streak; `teamfight` = `teamfightDetail(...)`; `buyback`, `nobuyback`, `aegis` = `""`.

- [ ] **Step 1: Write the failing detection tests** in `live-events.test.ts` (reuse its `snap`, `COSTS`, `seenOf`)

```ts
const detect = (prev: LiveSnapshot, next: LiveSnapshot) => detectEvents(prev, next, null, COSTS, seenOf(prev));

it("reports assists", () => expect(detect(snap({ assists: 5 }), snap({ assists: 7 }))).toEqual([{ kind: "assist", detail: "2" }]));
it("reports a streak when it reaches 3, 5 or 8", () => {
  expect(detect(snap({ killStreak: 2 }), snap({ killStreak: 3 }))).toContainEqual({ kind: "streak", detail: "3" });
  expect(detect(snap({ killStreak: 3 }), snap({ killStreak: 4 }))).not.toContainEqual(expect.objectContaining({ kind: "streak" }));
  expect(detect(snap({ killStreak: 4 }), snap({ killStreak: 6 }))).toContainEqual({ kind: "streak", detail: "6" });
});
it("reports a buyback when the cooldown starts", () => {
  expect(detect(snap({ buybackCooldown: 0 }), snap({ buybackCooldown: 480 }))).toEqual([{ kind: "buyback", detail: "" }]);
});
it("warns once when buyback gold is lost after 30:00", () => {
  const late = { clockSeconds: 1800, buybackCost: 1500, buybackCooldown: 0 };
  expect(detect(snap({ ...late, gold: 1600 }), snap({ ...late, gold: 900 }))).toEqual([{ kind: "nobuyback", detail: "" }]);
  expect(detect(snap({ ...late, gold: 900 }), snap({ ...late, gold: 800 }))).toEqual([]);
  expect(detect(snap({ ...late, clockSeconds: 1799, gold: 1600 }), snap({ ...late, clockSeconds: 1799, gold: 900 }))).toEqual([]);
  expect(detect(snap({ ...late, gold: 1600 }), snap({ ...late, gold: 900, buybackCooldown: 480 }))).toEqual([{ kind: "buyback", detail: "" }]);
});
it("reports picking up the Aegis", () => expect(detect(snap(), snap({ owned: ["aegis"] }))).toEqual([{ kind: "aegis", detail: "" }]));
it("counts kills for each team from the scores", () => {
  const moments = detect(snap({ score: { radiant: 10, dire: 8 } }), snap({ score: { radiant: 12, dire: 9 } }));
  expect(moments).toEqual([{ kind: "teamkill", detail: "ours" }, { kind: "teamkill", detail: "ours" }, { kind: "teamkill", detail: "theirs" }]);
});
// Review Focus 1
it("reports nothing new for game states stored before these fields existed", () => expect(detect(snap(), snap())).toEqual([]));
it("does not treat the first appearance of a field as a change", () => {
  expect(detect(snap(), snap({ killStreak: 5, buybackCost: 1500, buybackCooldown: 480, score: { radiant: 9, dire: 9 } }))).toEqual([]);
});
// Review Focus 2
it("ignores score jumps across a gap of more than 30 game-seconds", () => {
  expect(detect(snap({ clockSeconds: 600, score: { radiant: 10, dire: 8 } }), snap({ clockSeconds: 720, score: { radiant: 15, dire: 12 } }))).toEqual([]);
});
// Review Focus 3
it("ignores scores when the player's team is unknown", () => {
  expect(detect(snap({ team: null, score: { radiant: 10, dire: 8 } }), snap({ team: null, score: { radiant: 13, dire: 8 } }))).toEqual([]);
});
```

- [ ] **Step 2: Write the failing codec and prompt tests**

```ts
// live-moments.test.ts
it("round-trips a teamfight summary", () => {
  const summary = { ours: 3, theirs: 1, kills: 1, assists: 2, died: false };
  expect(teamfightDetail(summary)).toBe("3:1:1:2:0");
  expect(parseTeamfightDetail("3:1:1:2:0")).toEqual(summary);
  expect(parseTeamfightDetail("?:?:0:2:1")).toEqual({ ours: null, theirs: null, kills: 0, assists: 2, died: true });
});
it("rejects anything else", () => {
  for (const bad of ["", "3:1", "a:b:c:d:e", "3:1:1:2:5", "-1:1:1:2:0"]) expect(parseTeamfightDetail(bad)).toBeNull();
});
it("knows the big kinds", () => {
  expect(["death", "teamfight", "buyback", "aegis"].every((kind) => isBigKind(kind as LiveEventKind))).toBe(true);
  expect(["kill", "assist", "streak", "nobuyback", "building", "item", "gold", "lookahead", "asked", "plan"].some((kind) => isBigKind(kind as LiveEventKind))).toBe(false);
});

// live-coach-prompt.test.ts — add `lane: null` to the file's `base` object
const prompt = (kind: LiveEventKind, detail = "", more = {}) => buildLiveTipPrompt({ ...base, ...more, events: [{ kind, detail }] });
it("writes a line for each new moment", () => {
  expect(prompt("assist", "2")).toContain("- They just got 2 assists.");
  expect(prompt("assist", "1")).toContain("- They just got 1 assist.");
  expect(prompt("streak", "5")).toContain("- They are on a 5-kill streak.");
  expect(prompt("teamfight", "3:1:1:2:0")).toContain("- A teamfight just ended: their team got 3 kills, the enemy got 1. They got 1 kill and 2 assists and survived.");
  expect(prompt("teamfight", "?:?:0:2:1")).toContain("- A teamfight just ended. They got 0 kills and 2 assists and died.");
  expect(prompt("teamfight", "junk")).toContain("- A teamfight just ended.");
  expect(prompt("buyback")).toContain("- They just bought back.");
  expect(prompt("nobuyback")).toContain("- They no longer have gold for buyback.");
  expect(prompt("aegis")).toContain("- They just picked up the Aegis; it expires 5 minutes after pickup.");
});
it("asks for praise before the next move", () => {
  expect(prompt("kill", "1")).toContain("If they just got a kill, are on a kill streak, or their team won a teamfight, start with a few words of praise, then give the next move.");
});
it("states buyback in the game line", () => {
  const withBuyback = (changes: Partial<LiveSnapshot>) => prompt("asked", "", { snapshot: { ...SNAPSHOT, ...changes } });
  expect(withBuyback({ buybackCost: 1450, buybackCooldown: 0, gold: 1840 })).toContain("Buyback ready, costs 1,450.");
  expect(withBuyback({ buybackCost: 1450, buybackCooldown: 200, gold: 1840 })).toContain("Buyback on cooldown 3:20.");
  expect(withBuyback({ buybackCost: 1450, buybackCooldown: 0, gold: 900 })).toContain("Buyback: cannot afford (costs 1,450, has 900).");
  expect(prompt("asked")).not.toContain("Buyback");
});
it("includes the lane block and marks a building in the player's lane", () => {
  const lane = { position: 1 as const, lane: "bot" as const, partners: ["Lion (pos 5)"], opponents: [{ name: "Axe", position: 3 as const, myWinRate: 54, games: 1240 }] };
  const text = prompt("building", "radiant:tower:bot:1", { lane });
  expect(text).toContain("Lane: bot (safe lane) with Lion (pos 5), against Axe (pos 3).");
  expect(text).toContain("just lost the bot T1 tower, in their lane.");
  expect(prompt("building", "radiant:tower:top:1", { lane })).not.toContain("in their lane");
});
it("puts the lane block in the item plan prompt too", () => {
  const lane = { position: 3 as const, lane: "top" as const, partners: [], opponents: null };
  expect(buildItemPlanPrompt({ snapshot: SNAPSHOT, heroName: "Viper", facts: null, candidates: [], lane })).toContain("Lane: top (off lane), against the enemy pos 1 and pos 5 (heroes unknown).");
});
```

- [ ] **Step 3: Run `npx vitest run src/lib/live-events.test.ts src/lib/live-moments.test.ts src/lib/live-coach-prompt.test.ts`** — expected: FAIL.

- [ ] **Step 4: Implement the types, codec and detection.** Detection rules, each needing the field to be defined in **both** snapshots:
  - assist: `next.assists > prev.assists`.
  - streak: the highest mark in `STREAK_MARKS` with `prev.killStreak < mark <= next.killStreak`; detail is `next.killStreak`.
  - buyback: `prev.buybackCooldown === 0 && next.buybackCooldown > 0`.
  - nobuyback: `next.clockSeconds >= 1800`, `next.buybackCooldown === 0`, `prev.gold >= prev.buybackCost`, `next.gold < next.buybackCost`.
  - aegis: `"aegis"` is in `next.owned` and not in `prev.owned`.
  - teamkill: only when `next.team` is known and `next.clockSeconds - prev.clockSeconds <= 30`; one `ours` per point the player's team's score rose, then one `theirs` per point the enemy's rose.
  - Order of the returned array: death, kill, assist, streak, buyback, nobuyback, aegis, buildings, items, gold, teamkills.

- [ ] **Step 5: Move `gameLine`, `buildingLine`, `eventLine` into `live-coach-lines.ts` and extend them.** `eventLine` uses `never` exhaustiveness so a future kind fails to compile. Own-lane rule: a building event gets `", in their lane"` before the full stop when its lane equals the `lane` argument. In `live-coach-prompt.ts`: insert `laneLines(lane, heroName, snapshot.clockSeconds)` after the team block in both builders, pass `lane?.lane ?? null` to `eventLine`, and add the praise sentence as the third line of the tip prompt. Change `CoachMemory.queued` in `live-coach-state.ts` to `Moment[]`.

- [ ] **Step 6: Add icons and labels in `TipList.tsx`** for the six new kinds (lucide-react has all of these): `assist` Handshake "Assist", `streak` Flame "Kill streak", `teamfight` Swords "After a teamfight", `buyback` Undo2 "Bought back", `nobuyback` PiggyBank "No buyback gold", `aegis` Crown "Aegis".

- [ ] **Step 7: Run the three test files, then `npm test` and `npm run lint`** — expected: PASS. Two call sites need a small change to compile now that `queued` is `Moment[]`: widen the `events` parameter of `needsReplan` in `live-coach-state.ts` to `Moment[]`, and in `use-live-coach.ts` filter `teamkill` moments out of what is passed to `stepCoach` (Task 5 removes that filter).

- [ ] **Step 8: Commit** — `git commit -m "feat(live): detect assists, streaks, buyback, Aegis and team kills; lane and praise in prompts"`

---

### Task 5: Moment groups and the big/small gap

**Files:**
- Modify: `src/lib/live-moments.ts`, `src/lib/live-coach-timing.ts`, `src/lib/use-live-coach.ts` (the `stepCoach` call only)
- Test: `src/lib/live-moments.test.ts`, `src/lib/live-coach-timing.test.ts`

**Interfaces:**
- Consumes: `Moment`, `TeamKill`, `isBigKind`, `teamfightDetail` (Task 4).
- Produces:
  - `closeGroup(moments: Moment[]): LiveEvent[]` in `live-moments.ts`, with `TEAMFIGHT_HERO_DEATHS = 3`, `TEAMFIGHT_OWN_ACTIONS = 2`.
  - In `live-coach-timing.ts`: constants `QUIET_MS = 6_000`, `MAX_GROUP_MS = 20_000`, `BIG_GAP_MS = 25_000`, `MIN_GAP_MS = 90_000` (kept); `MERGE_WINDOW_MS` is removed.
  - `interface CoachClock { pending: Moment[]; pendingSince: number | null; lastMomentAt: number | null; held: LiveEvent[]; lastTipAt: number | null; lastTipClock: number | null }`; `IDLE_CLOCK` has `held: []`, `lastMomentAt: null`.
  - `stepCoach(state, { nowMs, clockSeconds, moments }: { nowMs: number; clockSeconds: number; moments: Moment[] }): { state: CoachClock; fire: LiveEvent[] | null }` — the input field is renamed from `events` to `moments`.
  - `coachSlot` unchanged in signature; gap is 15 s with `asked`, else 25 s when any kind is big, else 90 s.

- [ ] **Step 1: Write the failing `closeGroup` tests**

```ts
const ours: Moment = { kind: "teamkill", detail: "ours" };
const theirs: Moment = { kind: "teamkill", detail: "theirs" };
it("folds three hero deaths into one teamfight", () => {
  const group: Moment[] = [{ kind: "kill", detail: "1" }, { kind: "assist", detail: "2" }, ours, ours, ours, theirs];
  expect(closeGroup(group)).toEqual([{ kind: "teamfight", detail: "3:1:1:2:0" }]);
});
it("keeps a lone kill as a kill", () => expect(closeGroup([{ kind: "kill", detail: "1" }, ours])).toEqual([{ kind: "kill", detail: "1" }]));
it("uses the player's own numbers when Dota sends no scores", () => {
  expect(closeGroup([{ kind: "death", detail: "" }, { kind: "assist", detail: "1" }])).toEqual([{ kind: "teamfight", detail: "?:?:0:1:1" }]);
  expect(closeGroup([{ kind: "assist", detail: "1" }])).toEqual([{ kind: "assist", detail: "1" }]);
});
it("keeps moments that are not part of the fight", () => {
  const group: Moment[] = [{ kind: "death", detail: "" }, theirs, theirs, theirs, { kind: "buyback", detail: "" }, { kind: "item", detail: "dragon_lance" }];
  expect(closeGroup(group)).toEqual([{ kind: "teamfight", detail: "0:3:0:0:1" }, { kind: "buyback", detail: "" }, { kind: "item", detail: "dragon_lance" }]);
});
// Review Focus 4
it("says nothing about a couple of kills the player had no part in", () => expect(closeGroup([ours, theirs])).toEqual([]));
```

- [ ] **Step 2: Rewrite the `stepCoach` tests** (keep the file's `run` helper, renaming its `events` to `moments`). Replace "waits for the merge window", "merges events inside the window", "holds events until the gap has passed" and "does not fire again…" with:

```ts
// Items, not kills or assists: five of those in one group would fold into a single teamfight.
const ITEM: Moment = { kind: "item", detail: "dragon_lance" };
it("closes a group after 6 quiet seconds", () => {
  const { fired } = run(READY, [{ nowMs: 0, moments: [KILL] }, { nowMs: 5_999 }, { nowMs: 6_000 }]);
  expect(fired).toEqual([null, null, [KILL]]);
});
it("keeps a group open while moments keep arriving, 20 s at most", () => {
  const steps = [0, 5_000, 10_000, 15_000, 19_999].map((nowMs) => ({ nowMs, moments: [ITEM] }));
  const { fired } = run(READY, [...steps, { nowMs: 20_000 }]);
  expect(fired.slice(0, 5)).toEqual([null, null, null, null, null]);
  expect(fired[5]).toHaveLength(5);
});
it("lets a big group through 25 s after the last tip", () => {
  const spoke = markSpoke(READY, 100_000, 600);
  expect(run(spoke, [{ nowMs: 119_000, moments: [DEATH] }, { nowMs: 125_000 }]).fired).toEqual([null, [DEATH]]);
  expect(run(spoke, [{ nowMs: 110_000, moments: [DEATH] }, { nowMs: 116_000 }, { nowMs: 124_999 }, { nowMs: 125_000 }]).fired).toEqual([null, null, null, [DEATH]]);
});
it("holds a small group for 90 s and sends it with the next group", () => {
  const spoke = markSpoke(READY, 100_000, 600);
  const { fired } = run(spoke, [{ nowMs: 110_000, moments: [KILL] }, { nowMs: 116_000 }, { nowMs: 130_000, moments: [DEATH] }, { nowMs: 136_000 }]);
  expect(fired).toEqual([null, null, null, [KILL, DEATH]]);
});
it("sends a held small group once 90 s have passed", () => {
  const spoke = markSpoke(READY, 100_000, 600);
  const { fired } = run(spoke, [{ nowMs: 110_000, moments: [KILL] }, { nowMs: 116_000 }, { nowMs: 189_999 }, { nowMs: 190_000 }]);
  expect(fired).toEqual([null, null, null, [KILL]]);
});
it("does not fire again while the last tip is being written", () => {
  const { fired } = run(READY, [{ nowMs: 0, moments: [DEATH] }, { nowMs: 6_000 }, { nowMs: 8_000, moments: [KILL] }, { nowMs: 14_000 }]);
  expect(fired).toEqual([null, [DEATH], null, null]);
});
// Review Focus 4
it("drops a group with nothing to say without touching the gaps or the look-ahead", () => {
  const teamkill: Moment = { kind: "teamkill", detail: "ours" };
  const { state, fired } = run(READY, [{ nowMs: 0, moments: [teamkill] }, { nowMs: 6_000 }]);
  expect(fired).toEqual([null, null]);
  expect(state).toMatchObject({ pending: [], held: [], lastTipAt: null, lastTipClock: 600 });
});
```

And for `coachSlot`: change the existing 90 s test to use `["kill"]`, and add `expect(coachSlot(["kill", "death"], "m1", NOW).cutoff).toEqual(new Date(NOW - 25_000))`.

- [ ] **Step 3: Run `npx vitest run src/lib/live-moments.test.ts src/lib/live-coach-timing.test.ts`** — expected: FAIL.

- [ ] **Step 4: Implement `closeGroup`.** Count `ours` and `theirs` team kills; sum the player's kills and assists from the event details; `died` is whether a death is present. It is a teamfight when `ours + theirs >= 3`, or when there are **no** team kills at all and kills + assists + (died ? 1 : 0) `>= 2`. A teamfight replaces every death, kill and assist with one `teamfight` event placed first (scores `null` when there were no team kills); everything else keeps its order. Team kills never appear in the result.

- [ ] **Step 5: Implement `stepCoach`** with these rules, in order:
  1. Append `moments` to `pending`; set `pendingSince` if it was null; set `lastMomentAt = nowMs` when `moments` is non-empty.
  2. The group is closed when `pending` is non-empty and (`nowMs - lastMomentAt >= QUIET_MS` or `nowMs - pendingSince >= MAX_GROUP_MS`). On closing: `held = [...held, ...closeGroup(pending)]`, and `pending`, `pendingSince`, `lastMomentAt` are cleared.
  3. If `held` is non-empty and the gap has passed (`BIG_GAP_MS` when any held kind is big, else `MIN_GAP_MS`; always passed when `lastTipAt` is null): fire `held`, clear it, and mark that the coach spoke (as `markSpoke` does).
  4. Otherwise, if `pending` and `held` are both empty, the small gap has passed and `clockSeconds - lastTipClock >= LOOKAHEAD_GAME_SECONDS`: fire the look-ahead, as today.
  5. `lastTipClock` is set from the first `clockSeconds` seen, as today.
  In `use-live-coach.ts`, pass `moments: memory.current.queued` and remove any `teamkill` filter added in Task 4.

- [ ] **Step 6: Run the two test files, then `npm test` and `npm run lint`** — expected: PASS.

- [ ] **Step 7: Commit** — `git commit -m "feat(live): one tip per fight; big moments break the 90 s gap after 25 s"`

---

### Task 6: Coach route accepts the new kinds and a position

**Files:**
- Modify: `src/app/api/live/coach/route.ts`
- Test: `src/app/api/live/coach/route.test.ts`

**Interfaces:**
- Consumes: `laneInfo` (Task 2), prompt builders with `lane` (Task 4), `coachSlot` (Task 5).
- Produces: request body `{ kinds: LiveEventKind[] (1–12), details?: string[] (≤12), replan?: boolean, position?: 1 | 2 | 3 | 4 | 5 }`.

- [ ] **Step 1: Write the failing tests** (follow the file's `send` helper and `state` object; capture the prompt by making the `askQuickModel` mock store its argument in `state.lastPrompt`)

```ts
it("lets a big moment through 25 s after the last tip", async () => {
  state.reserved.set("tip:m1", NOW - 30_000);
  expect((await send({ kinds: ["kill", "death"] })).status).toBe(200);
});
it("still refuses a small moment inside 90 s", async () => {   // replaces "refuses a second automatic tip inside 90 s"
  state.reserved.set("tip:m1", NOW - 30_000);
  expect((await send({ kinds: ["kill"] })).status).toBe(429);
  expect(state.modelCalls).toBe(0);
});
it("accepts the new kinds, 12 at most", async () => {
  expect((await send({ kinds: ["teamfight", "buyback", "aegis", "assist", "streak", "nobuyback"] })).status).toBe(200);
  expect((await send({ kinds: Array(13).fill("kill") })).status).toBe(400);
});
it("uses the picked position when there is no draft", async () => {
  await send({ kinds: ["asked"], position: 3 });
  expect(state.lastPrompt).toContain("Lane: top (off lane), against the enemy pos 1 and pos 5 (heroes unknown).");
});
it("rejects a position outside 1-5", async () => {
  for (const position of [0, 6, 2.5, "3"]) expect((await send({ kinds: ["asked"], position })).status).toBe(400);
});
```

Add one more test with `getLockedDraft` and `gatherAdviceFacts` mocked to return a pos 1 draft for the live hero: sending `position: 3` must still produce `"Lane: bot (safe lane)"` (a locked draft wins over the picker).

- [ ] **Step 2: Run `npx vitest run src/app/api/live/coach/route.test.ts`** — expected: FAIL.

- [ ] **Step 3: Implement.** Raise both array limits to 12; add `position: z.number().int().min(1).max(5).optional()`; in `gameContext` return `lane = laneInfo({ team: snapshot.team, facts, position: position ?? null })` and pass it to both prompt builders. If the file passes 200 lines, move `planCandidates` to `src/lib/live-plan-candidates.ts`.

- [ ] **Step 4: Run the test file, then `npm test` and `npm run lint`** — expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(live): coach route takes new kinds and a lane position"`

---

### Task 7: Position picker on the Live page

**Files:**
- Create: `src/components/live/PositionPicker.tsx`
- Modify: `src/components/live/LiveCoach.tsx`, `src/lib/use-live-coach.ts`, `src/app/(site)/live/page.tsx`
- Test: `src/components/live/live-coach.test.tsx`

**Interfaces:**
- Consumes: `guessPosition` (Task 2), `POSITIONS` from `@/lib/draft-lanes`, `useStoredState` from `@/lib/use-stored-state`.
- Produces:
  - `PositionPicker({ value, isGuess, onChange }: { value: Position; isGuess: boolean; onChange: (position: Position) => void })`
  - `useLiveCoach` input gains `position: Position | null`; it is sent as `position` in every coach request when not null.
  - `LiveCoachProps.heroes` items gain `roles: string[]`.

- [ ] **Step 1: Write the failing test**

```tsx
describe("PositionPicker", () => {
  it("marks the chosen position and says when it is only a guess", () => {
    const html = renderToStaticMarkup(<PositionPicker value={3} isGuess onChange={() => {}} />);
    expect(html).toMatch(/aria-checked="true"[^>]*>3</);
    expect(html).toContain("Our guess");
    expect(renderToStaticMarkup(<PositionPicker value={3} isGuess={false} onChange={() => {}} />)).not.toContain("Our guess");
  });
});
```

- [ ] **Step 2: Run `npx vitest run src/components/live/live-coach.test.tsx`** — expected: FAIL, component missing.

- [ ] **Step 3: Implement the picker.** A `glass-panel` row: label "Your position", five radio pills (same look as the position pills in `src/components/draft/LineupColumn.tsx`, `role="radiogroup"` / `role="radio"` / `aria-checked`, titles from `POSITION_HINTS` wording: Carry, Mid, Off lane, Soft support, Hard support), and the note "Our guess — tap to change. Lock a draft for lane matchups." while `isGuess`, otherwise "Lock a draft for lane matchups."

- [ ] **Step 4: Wire it in `LiveCoach.tsx`.** The draft is usable when `draft !== null && draft.myHeroId === snapshot.heroId`. When it is not usable: read `{ matchId, position }` with `useStoredState("live-position", schema, NO_CHOICE)`; the position is the stored one when its `matchId` equals `snapshot.matchId`, otherwise `guessPosition(roles of the live hero)` and `isGuess` is true; render the picker above `DraftStrip`; pass the position to `useLiveCoach`. When the draft is usable, render no picker and pass `position: null`. In `page.tsx`, include `roles` in the `heroes` prop.

- [ ] **Step 5: Run the test file, then `npm test` and `npm run lint`** — expected: PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(live): position picker when no draft is locked"`

---

### Task 8: Check it in a real game

**Files:** none.

- [ ] **Step 1: Run `npm run lint`, `npm test` and `npm run build`** — expected: all pass.
- [ ] **Step 2: With the owner, play a bot match with the Live page open and no locked draft.** Check: the picker shows a guess; after tapping a position the next tip mentions the right lane.
- [ ] **Step 3: Lock a draft for the hero, start another bot match.** Check: no picker; a tip in the first 10 minutes names the lane opponents; dying produces a tip within about 20 seconds even if the last tip was under 90 seconds ago; a fight produces one tip, not several; each new kind shows its icon.
- [ ] **Step 4: Note in the spec's "Confirmed fields" section** anything Dota did not send in practice (team scores in particular), so the next project knows.
