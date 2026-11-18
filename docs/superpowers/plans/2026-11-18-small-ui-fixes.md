# Small UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the do-nothing theme button, make the header work on phones (language reachable, no overlaps), and add hero / result / queue filters to History.

**Architecture:** Three independent changes. Phone header: on phones the logo and account pills share row 1 (a wrapper that becomes `display: contents` from `md` up, so desktop markup and position are unchanged), a new "⋯" menu holds Language and Log out, and the nav links get row 2. History filters are pure functions over the 100 rows already on the page; a client wrapper holds the filter state and re-mounts the pager (by `key`) so a filter change returns to page 1.

**Tech Stack:** Next.js 16.4 App Router (Cache Components), React 19.3 with React Compiler, Tailwind 4, lucide-react, Clerk, Vitest (node environment, `renderToStaticMarkup`; no DOM library).

**Spec:** `docs/superpowers/specs/2026-11-17-small-ui-fixes-design.md`

## Global Constraints

- `AGENTS.md` rules: no `any`, `===`, no `console.*`, one component per file, files under 200 lines, `npm run lint` passes with no errors.
- Read the relevant guide in `node_modules/next/dist/docs/` before using any Next API not already used in the file you edit.
- Desktop (`md` = 768 px and up) must look exactly as it does today. Phone changes apply under 768 px only.
- Reduced motion respected: any new entrance uses the existing `.pop-in` / `.stagger` classes (already disabled under `prefers-reduced-motion`).
- No new dependencies. No new top-level folders.
- **Do not `git commit`.** The owner commits. Each task ends with checks, not a commit.

## Review Focus

1. **Active section off-screen on a phone** (History or Trending Heroes is active, the nav row is scrolled to the start) → the row scrolls so the active link is visible. Pinned by `navScrollLeft` tests in Task 3.
2. **Matches whose hero is unknown** (`heroName: "Unknown hero"`, `heroSlug: ""`) → they appear in the hero list and can be filtered like any hero. Pinned in Task 4.
3. **Filters that match nothing** → "No matches fit these filters." with a Clear filters button, no "Matches 1–0 of 0", no page buttons. Pinned in Task 5.
4. **Win rate of an empty list** → no `NaN%`. Pinned in Task 4.
5. **Icon-only "Link Steam" pill on phones** → keeps an accessible name. Pinned in Task 3.

---

### Task 1: Remove the theme button

**Files:**
- Delete: `src/components/ThemeToggle.tsx`
- Modify: `src/components/Sidebar.tsx` (drop the import and the `<ThemeToggle>` line)
- Test: `src/components/Sidebar.test.tsx` (new)

**Interfaces:** none produced.

- [ ] **Step 1: Write the failing test** `src/components/Sidebar.test.tsx`

Mock Clerk the way `src/app/api/auth/steam/logout/route.test.ts` mocks it: `vi.mock("@clerk/nextjs", () => ({ SignOutButton: ({ children }: { children: ReactNode }) => children }))`.

```tsx
it("has language and log out, and no theme button", () => {
  const html = renderToStaticMarkup(<Sidebar />);
  expect(html).toContain('aria-label="Language"');
  expect(html).toContain('aria-label="Log out"');
  expect(html).not.toMatch(/light mode|night mode/);
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/Sidebar.test.tsx`. Expected: FAIL on the `not.toMatch` line.
- [ ] **Step 3: Remove** the button from `Sidebar.tsx` and delete `ThemeToggle.tsx`. The saved `theme` value in localStorage is left alone (ignored).
- [ ] **Step 4: Run** the test (PASS) and `grep -rn "ThemeToggle" src` (no output).

---

### Task 2: Shared language pieces (no visible change)

The sidebar switcher and the new phone menu both need the language list, the saved choice and the "close on outside tap / Escape" behaviour. Move them out of `LanguageSwitcher.tsx` so both use one copy. (The Mongolian-language work will later change only `use-language.ts`.)

**Files:**
- Create: `src/lib/use-language.ts`, `src/lib/use-dismiss.ts`, `src/components/LanguageOptions.tsx`
- Modify: `src/components/LanguageSwitcher.tsx` (use the three new pieces; looks and behaves the same)
- Test: `src/components/LanguageOptions.test.tsx`

**Interfaces (produced, used by Task 3):**
- `src/lib/use-language.ts` (`"use client"`):
  - `export const languages = [{ code: "en", label: "English" }, { code: "mn", label: "Монгол" }] as const;`
  - `export type LanguageCode = (typeof languages)[number]["code"];`
  - `export function useLanguage(): readonly [LanguageCode, (code: LanguageCode) => void]` — wraps `usePreference("language", codes, "en")` and sets `document.documentElement.lang` in an effect (moved from `LanguageSwitcher`).
- `src/lib/use-dismiss.ts` (`"use client"`): `export function useDismiss(rootRef: RefObject<HTMLElement | null>, isOpen: boolean, onDismiss: () => void): void` — while open, `pointerdown` outside `rootRef` or the Escape key calls `onDismiss`. Use `pointerdown` (not `mousedown`) so a tap closes it on phones.
- `src/components/LanguageOptions.tsx`: `export function LanguageOptions({ language, onChoose }: { language: LanguageCode; onChoose: (code: LanguageCode) => void })` — returns the `<li role="none"><button role="menuitemradio" aria-checked …>` items exactly as they are in `LanguageSwitcher` today (label, small uppercase code, accent colour on the chosen one). The caller supplies the surrounding `<ul role="menu">`.

- [ ] **Step 1: Write the failing test** `src/components/LanguageOptions.test.tsx`

```tsx
it("lists both languages and checks the chosen one", () => {
  const html = renderToStaticMarkup(<ul><LanguageOptions language="mn" onChoose={() => {}} /></ul>);
  expect(html).toContain("English");
  expect(html).toContain("Монгол");
  expect(html).toMatch(/aria-checked="true"[^>]*>Монгол/);
  expect(html).toMatch(/aria-checked="false"[^>]*>English/);
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/LanguageOptions.test.tsx`. Expected: FAIL (module not found).
- [ ] **Step 3: Create** the three files and rewrite `LanguageSwitcher` on top of them.
- [ ] **Step 4: Run** the new test and `src/components/Sidebar.test.tsx`. Expected: both PASS.

---

### Task 3: Phone header

**Files:**
- Create: `src/components/MoreMenu.tsx`, `src/lib/nav-scroll.ts`
- Modify: `src/app/(site)/layout.tsx`, `src/components/TopNav.tsx`, `src/components/Logo.tsx`, `src/components/SteamLogin.tsx`
- Test: `src/lib/nav-scroll.test.ts`, `src/components/MoreMenu.test.tsx`, `src/components/SteamLogin.test.tsx`

**Interfaces:**
- Consumes: `useLanguage`, `useDismiss`, `LanguageOptions` (Task 2).
- Produces:
  - `Logo({ className = "size-[5.5rem]" }: { className?: string })` — the size class moves into the prop; existing callers unchanged.
  - `navScrollLeft(link: { offsetLeft: number; offsetWidth: number }, nav: { clientWidth: number; scrollWidth: number }): number | null` — `null` when the row does not overflow (`scrollWidth <= clientWidth`); otherwise the `scrollLeft` that centres the link, clamped to `0 … scrollWidth - clientWidth`.
  - `MoreMenu()` — client component, renders nothing visible from `md` up (`md:hidden` on its root).

Target layout under 768 px (from the spec):

```
┌──────────────────────────────────────────┐
│ [logo]              (medal)(steam)(you)(⋯)│   row 1
│ STATS   DRAFT   LIVE COACH   TRENDING  → │   row 2, scrolls sideways
├──────────────────────────────────────────┤
│ HISTORY                                   │
```

- [ ] **Step 1: Write failing tests**

`src/lib/nav-scroll.test.ts`:
```ts
expect(navScrollLeft({ offsetLeft: 300, offsetWidth: 80 }, { clientWidth: 400, scrollWidth: 400 })).toBeNull();
expect(navScrollLeft({ offsetLeft: 20, offsetWidth: 80 }, { clientWidth: 350, scrollWidth: 700 })).toBe(0);
expect(navScrollLeft({ offsetLeft: 620, offsetWidth: 80 }, { clientWidth: 350, scrollWidth: 700 })).toBe(350);
expect(navScrollLeft({ offsetLeft: 300, offsetWidth: 100 }, { clientWidth: 350, scrollWidth: 700 })).toBe(175);
```

`src/components/MoreMenu.test.tsx` (Clerk mocked as in Task 1):
```tsx
const html = renderToStaticMarkup(<MoreMenu />);
expect(html).toContain('aria-label="More"');
expect(html).toContain('aria-expanded="false"');
expect(html).toContain("md:hidden");
expect(html).not.toContain('role="menu"');
```

`src/components/SteamLogin.test.tsx`: `vi.mock("@/lib/linked-account", () => ({ getLinkedSteamId: async () => null }))`, then:
```tsx
const html = renderToStaticMarkup(await SteamLogin());
expect(html).toContain('aria-label="Link Steam"');
expect(html).toContain("hidden md:flex"); // the text hides on phones, the icon stays
```

- [ ] **Step 2: Run** the three tests. Expected: FAIL.
- [ ] **Step 3: Implement**
  - `nav-scroll.ts`: the function above.
  - `Logo.tsx`: the `className` prop.
  - `SteamLogin.tsx`: below `md` the pills are round. "Link Steam": add `aria-label="Link Steam"` and `title="Link Steam"`, give the text block `hidden md:flex`, padding `pr-[0.45rem] md:pr-[1.4rem]`. Linked: the name block gets `hidden md:flex` (avatar and the Unlink button stay). Classes from `md` up are unchanged.
  - `MoreMenu.tsx`: a round 3.8 rem `glass-panel` button (`Ellipsis` icon, `aria-label="More"`, `aria-haspopup="menu"`, `aria-expanded`). When open, a `role="menu"` panel below it, right-aligned (`absolute right-0 top-full mt-[0.6rem] z-40 w-[13rem] glass-panel glass-blur pop-in origin-top-right rounded-[1rem]`), holding a small "Language" label, `<LanguageOptions>` (choosing closes the menu), a divider, then **Log out** inside Clerk's `<SignOutButton>` (dire-coloured on hover, like the sidebar's). Closes through `useDismiss`.
  - `layout.tsx`: wrap the pills in a row-1 container: `<div className="flex items-center justify-between gap-[0.8rem] px-5 pt-5 md:contents">` holding `<div className="shrink-0 md:hidden"><Logo className="size-[3.8rem]" /></div>` and the pills group. The pills group keeps today's classes but its positioning becomes `relative z-30 … md:absolute md:right-4 md:top-5 lg:right-[3rem] lg:top-[3.2rem]` (today it is `absolute right-4 top-5 …` at every width), with `gap-[0.6rem] md:gap-[0.8rem]`, and `<MoreMenu />` added last. The layout stays a Server Component.
  - `TopNav.tsx`: remove the phone `<Logo>` (it now lives in the layout) and its import. Header padding on phones `pt-[1rem]`, `md:pt-6` and everything from `md` up as today. In the existing layout effect, after the underline is placed, scroll the row once per `activeHref` change: `const left = navScrollLeft(link, nav); if (left !== null) nav.scrollTo({ left, behavior: "smooth" })`. Do not call it from the `ResizeObserver` callback (it would fight a finger scrolling the row).
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit`. Expected: all PASS, no type errors.

---

### Task 4: Match filter logic (pure)

**Files:**
- Create: `src/lib/match-filters.ts`
- Test: `src/lib/match-filters.test.ts`

**Interfaces (produced, used by Task 5):**
```ts
export type ResultFilter = "all" | "wins" | "losses";
export type QueueFilter = "all" | "ranked" | "unranked";
export interface MatchFilters { heroName: string | null; result: ResultFilter; queue: QueueFilter }
export interface HeroOption { name: string; games: number }
export const NO_FILTERS: MatchFilters; // { heroName: null, result: "all", queue: "all" }
export function filterMatches(rows: MatchRowData[], filters: MatchFilters): MatchRowData[]; // keeps order
export function heroOptions(rows: MatchRowData[]): HeroOption[]; // most games first, ties by name A→Z
export function winRate(rows: MatchRowData[]): number | null; // whole percent, null for []
export function hasFilters(filters: MatchFilters): boolean;
```
Heroes are keyed by `heroName` (the rows carry no hero id; `heroSlug` is `""` for unknown heroes). `MatchRowData` is a type-only import from `@/components/MatchRow`.

- [ ] **Step 1: Write the failing tests.** Build rows with a small `row(overrides)` helper. Assert:
  - `filterMatches(rows, NO_FILTERS)` returns all rows in the same order.
  - Hero + `wins` + `ranked` together keep only rows matching all three.
  - `heroOptions` on Axe×3, Lina×1, Bane×1, Unknown hero×1 → `[{Axe,3},{Bane,1},{Lina,1},{Unknown hero,1}]`.
  - `filterMatches(rows, { ...NO_FILTERS, heroName: "Unknown hero" })` returns the unknown-hero row.
  - `winRate` of 14 wins in 23 → `61`; `winRate([])` → `null`.
  - `hasFilters(NO_FILTERS)` → `false`; with `result: "losses"` → `true`.
- [ ] **Step 2: Run** `npx vitest run src/lib/match-filters.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/lib/match-filters.ts`.
- [ ] **Step 4: Run** the test. Expected: PASS.

---

### Task 5: Filters on the History page

**Files:**
- Create: `src/components/SegmentedToggle.tsx`, `src/components/HistoryFilters.tsx`, `src/components/FilteredMatchList.tsx`
- Modify: `src/components/PagedMatchList.tsx`, `src/components/HistoryList.tsx` (render `<FilteredMatchList rows={rows} />` instead of `<PagedMatchList>`)
- Test: `src/components/PagedMatchList.test.tsx` (update), `src/components/FilteredMatchList.test.tsx` (new)

**Interfaces:**
- Consumes: everything from Task 4.
- Produces:
  - `SegmentedToggle<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void })` — `role="radiogroup" aria-label={label}`, buttons with `role="radio" aria-checked`. Chosen option styled like the current-page button in `PagedMatchList` (`bg-accent text-ink`).
  - `HistoryFilters({ filters, heroes, onChange }: { filters: MatchFilters; heroes: HeroOption[]; onChange: (filters: MatchFilters) => void })` — a native `<select aria-label="Hero">` (first option "All heroes" with value `""`, then `"{name} · {games}"`), then Result (All · Wins · Losses) and Queue (All · Ranked · Unranked) toggles. Wraps onto several lines on phones.
  - `FilteredMatchList({ rows }: { rows: MatchRowData[] })` — client; holds `MatchFilters` state; renders `HistoryFilters` then `<PagedMatchList key={filterKey} rows={filtered} empty={…} />`, where `filterKey` is built from the three filter values so any change re-mounts the pager on page 1.
  - `PagedMatchList({ rows, empty }: { rows: MatchRowData[]; empty?: ReactNode })` — when `rows` is empty, renders only `empty`. The count line becomes `Matches {first}–{last} of {total} · {winRate}% win rate`.
- Empty state copy (exact): `No matches fit these filters.` and a button `Clear filters` that sets `NO_FILTERS`.

- [ ] **Step 1: Write failing tests**

`PagedMatchList.test.tsx`: in the existing 25-row fixture make the first 15 rows wins, then:
```tsx
expect(html).toContain("Matches 1–10 of 25 · 60% win rate");
// new test:
const empty = renderToStaticMarkup(<PagedMatchList rows={[]} empty={<p>Nothing here</p>} />);
expect(empty).toContain("Nothing here");
expect(empty).not.toContain("Matches");
expect(empty).not.toContain("History pages");
```

`FilteredMatchList.test.tsx` (rows: Axe×3, Lina×1, mixed results):
```tsx
const html = renderToStaticMarkup(<FilteredMatchList rows={rows} />);
expect(html).toContain('aria-label="Hero"');
expect(html.indexOf("Axe · 3")).toBeLessThan(html.indexOf("Lina · 1"));
expect(html).toContain('aria-label="Result"');
expect(html).toContain('aria-label="Queue"');
expect(html).toMatch(/aria-checked="true"[^>]*>All</);
expect(html).toContain("Matches 1–4 of 4");
// the list follows the filters (filter applied through the pure function the component uses):
const winsOnly = renderToStaticMarkup(<PagedMatchList rows={filterMatches(rows, { ...NO_FILTERS, result: "wins" })} />);
expect(winsOnly).toContain("100% win rate");
```

- [ ] **Step 2: Run** `npx vitest run src/components/PagedMatchList.test.tsx src/components/FilteredMatchList.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the three new components and the two modifications.
- [ ] **Step 4: Run** both tests. Expected: PASS.

---

### Task 6: Final checks

- [ ] **Step 1:** `npx vitest run` — all pass. `npx tsc --noEmit` — no output. `npm run lint` — no errors.
- [ ] **Step 2:** `grep -rn "ThemeToggle" src` — no output.
- [ ] **Step 3: Browser check (owner, signed in)** with `npm run dev`, Chrome DevTools device mode at 390 × 844:
  - Row 1: logo left, round pills and ⋯ right, nothing overlaps the section links; no sideways page scroll.
  - ⋯ opens Language + Log out; tapping outside or Escape closes it; choosing Монгол checks it in the menu and in the desktop sidebar after resizing.
  - On History, the nav row has scrolled so HISTORY and its underline are visible; the title is clear of the logo.
  - History filters: picking a hero, Wins and Ranked narrows the list, the count line and win rate update, page returns to 1; a combination with no matches shows the empty message, and Clear filters brings all matches back.
  - At 1440 px wide: header, sidebar and pills look exactly as before (except the theme button is gone).
