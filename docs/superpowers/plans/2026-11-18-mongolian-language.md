# Mongolian Language Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repo has **no tests** (`CLAUDE.md`): each task ends with `npm run lint` and `npx tsc --noEmit`, both with zero errors. **Do not `git commit`.**

**Goal:** With Монгол selected, every screen and every new AI answer is in Mongolian, with no English flash, Mongolian-capable fonts, and all wording in word files the owner can proofread.

**Architecture:** The language lives in a `lang` cookie. Server code reads it with `getLanguage()` / `getWords()` (inside `<Suspense>`, as Cache Components requires); client code reads it from a `WordsProvider` that each area's layout renders inside its existing Suspense boundary, through `useWords()`. Words are typed: `Words = typeof en`, and every `mn` file must match it, so a missing line fails the build. Prompts get one extra instruction for Mongolian, behind one switch.

**Tech Stack:** Next.js 16.4 App Router (Cache Components, `cookies()`), React 19.3, `next/font/google` (Oswald, Montserrat), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-17-mongolian-language-design.md`

## Global Constraints

- `CLAUDE.md` rules: no `any`, files under 150 lines, folder rules, no tests, lint + typecheck only.
- Languages: `en` (default when no cookie) and `mn`. Cookie `lang`, one year, `path=/`, `SameSite=Lax`. Unknown values read as `en`.
- Stay in English: hero, item and ability names; OpenDota data; medal names (Herald … Immortal); these Dota terms: mid, safe lane, off lane, jungle, carry, support, GPM, XPM, KDA, BKB, Roshan, Aegis, buyback, Radiant, Dire.
- Old tips and stored advice are never re-written when the language changes.
- Fonts for `mn`: headings **Oswald**, body **Montserrat**, subsets `cyrillic` + `cyrillic-ext` (Ө ө Ү ү). English keeps Germania One + Jost. The metal title texture stays.
- No English flash: every piece of visible text is rendered with the right language on the server (server components inside `<Suspense>`, or client components under `WordsProvider`).
- Tab titles (`metadata.title`) stay English (they would need runtime data in `generateMetadata`; not worth a dynamic metadata path for a private app).
- The owner proofreads `src/lib/i18n/mn/` before this is called done.

## Review Focus

1. **Text outside a Suspense boundary** (page headings in `page.tsx`, skeleton labels) → must not read cookies directly; becomes a small client component using `useWords()`.
2. **Switching language on a page with open state** (History filters, Draft board) → `router.refresh()` keeps client state; only words change.
3. **Stored AI answers** → an English Stats coach answer is never shown for `mn` and the reverse (kind `stats-coach:mn`, `hero-picks:mn`); saved Draft advice is tied to its language.
4. **Long Mongolian labels** on the densest rows (Stats panels, Scoreboard, History rows, nav links) → wrap or truncate, never overflow.
5. **AI switch off** (`AI_ANSWERS_FOLLOW_LANGUAGE = false`) → pages Mongolian, prompts unchanged, stored answers keep the English keys.

---

### Task 1: Foundation (no visible change in English)

**Files:**
- Create: `src/lib/i18n/language.ts`, `src/lib/i18n/words.ts`, `src/lib/i18n/use-words.ts`, `src/lib/i18n/en/common.ts`, `src/lib/i18n/mn/common.ts`, `src/components/WordsProvider.tsx`, `src/app/(auth)/layout.tsx`
- Modify: `src/app/layout.tsx` (two more fonts), `src/app/globals.css` (`[data-lang="mn"]` font rule), `src/app/(site)/layout.tsx` (provider + `data-lang` on the frame), `src/app/(site)/_hooks/use-language.ts` (cookie instead of localStorage), `CLAUDE.md` (i18n rule)

**Interfaces (produced, used by every later task):**
- `language.ts`: `export type Language = "en" | "mn"; export const LANG_COOKIE = "lang"; export function toLanguage(value: string | undefined): Language; export async function getLanguage(): Promise<Language>` (server: `cookies()`; call only inside `<Suspense>` or a route handler).
- `words.ts`: `export type Words = typeof en; export function wordsFor(language: Language): Words; export async function getWords(): Promise<Words>`. `en` and `mn` are each assembled from one file per area: `{ common, shell, stats, history, match, draft, live, trending, errors, ai }`. Each `mn/<area>.ts` is typed `export const <area>: Words["<area>"] = { … }`.
- Sentences with numbers or names are functions in the word files (`count: (first: number, last: number, total: number) => string`), so word order can differ.
- `WordsProvider({ language, children })` (client) and `useWords(): Words`, `useLanguageCode(): Language` (client, in `use-words.ts`).
- `useLanguage()` keeps its signature; it reads the language from the provider, and setting writes the cookie (`document.cookie`) then calls `router.refresh()`. The `"language"` localStorage value is ignored from now on.
- Fonts: `Oswald({ variable: "--font-oswald", subsets: ["latin", "cyrillic", "cyrillic-ext"], preload: false })`, `Montserrat({ variable: "--font-montserrat", subsets: […], preload: false })` on `<html>`. CSS: `[data-lang="mn"] { font-family: var(--font-montserrat); --font-display-face: var(--font-oswald); }`.
- `(site)/layout.tsx`: inside `RequireSignIn`, an async server part reads `getLanguage()` and renders `<WordsProvider language>` around the frame; the frame gets `data-lang={language}`. `(auth)/layout.tsx`: the same, inside `<Suspense>`, around both auth pages.
- `CLAUDE.md`: every visible string comes from the word files; add a line to both `en` and `mn`; translations live together in `src/lib/i18n/` (the one exception to page colocation, so the owner can proofread in one place).

- [ ] **Step 1:** Write the files above with `common` holding the words the switcher and More menu use.
- [ ] **Step 2:** `npm run lint && npx tsc --noEmit` → zero errors. Removing a key from `mn/common.ts` makes `tsc` fail (check once, then restore).

---

### Task 2: AI answers in Mongolian, and the owner's quality check

**Files:**
- Create: `src/lib/ai/answer-language.ts`, `src/db/scripts/ai-mongolian-samples.ts`
- Modify: `src/app/api/_utils/draft-advice.ts`, `src/app/api/live/coach/_utils/live-coach-prompt.ts`, `src/app/(site)/(stats)/_utils/stats-coach.ts`, `src/app/(site)/heroes/_utils/hero-picks.ts` (each prompt builder takes `language: Language` and appends the instruction), their callers, `src/lib/timed-advice` caller kinds, `src/app/(site)/draft/_utils/draft-storage.ts` (`adviceRequestKey` includes the language)

**Interfaces:**
- `answer-language.ts`: `export const AI_ANSWERS_FOLLOW_LANGUAGE = true;` `export function answerLanguage(page: Language): Language` (`en` when the switch is off); `export function languageInstruction(language: Language): string` — `""` for `en`; for `mn`: "Write every sentence in Mongolian (Cyrillic script). Keep hero, item and ability names and these Dota terms in English: mid, safe lane, off lane, jungle, carry, support, GPM, XPM, KDA, BKB, Roshan, Aegis, buyback. JSON keys, item keys and hero names stay exactly as asked."
- Stored answers: `getTimedAdvice` kinds become `"stats-coach"` / `"hero-picks"` for `en` and `"stats-coach:mn"` / `"hero-picks:mn"` for `mn` (text column, no migration).
- Routes read the language with `getLanguage()`; the Stats and Trending loaders already run inside Suspense and pass it down.

- [ ] **Step 1:** Implement the above; the screenshot-reading prompt is not changed (it returns hero names only).
- [ ] **Step 2:** `ai-mongolian-samples.ts` builds ~10 prompts from small fixed inputs (3 live tips, 1 item plan, 2 draft advice, 2 stats coach, 2 hero picks) with `languageInstruction("mn")` and prints each answer. It calls the model directly (owner tooling; it spends ~10 calls of Hugging Face credit). Run line: `npx tsx --env-file=.env.local src/db/scripts/ai-mongolian-samples.ts`.
- [ ] **Step 3:** `npm run lint && npx tsc --noEmit` → zero errors.
- [ ] **Step 4 (owner):** run the samples and judge the Mongolian. If it is not good enough, set `AI_ANSWERS_FOLLOW_LANGUAGE = false`; pages stay Mongolian either way. Later tasks do not depend on this answer.

---

### Tasks 3–10: Move the words screen by screen

Each task: add the area's keys to `en/<area>.ts` (the current English, word for word) and `mn/<area>.ts`, replace every visible string in the listed files (text, `aria-label`, `title`, `placeholder`, `alt` that is not empty), then `npm run lint && npx tsc --noEmit` → zero errors. Server components inside Suspense use `await getWords()`; client components use `useWords()`; server components outside Suspense with text get a small client component. Pure helpers that build sentences take the words they need as a parameter (no React, no cookies in `_utils`).

| Task | Area file | Files (all under `src/app` unless noted) |
|---|---|---|
| 3 Shell, sign-in, shared | `shell` | `(site)/_components/*` (Sidebar, TopNav via `navItems` labels, MoreMenu, LanguageSwitcher, MedalBadge, SteamLogin, AccountBadge, PlayerDataNotice, AnalyseMatch, AdviceTimer + `lib/advice-refresh` labels), `(auth)/_components/AuthShell.tsx`, `src/lib/site-content.ts` (tagline, nav labels move to words) |
| 4 Stats | `stats` | `(site)/(stats)/**` incl. `_utils/suggestions.ts` (rule-based sentences take `words.stats.suggest`) |
| 5 History | `history` | `(site)/history/**`, `src/lib/format.ts` `timeAgo` (takes `words.common.ago`) |
| 6 Match | `match` | `(site)/matches/[matchId]/**` incl. `_utils/match-view-timeline.ts` event labels and `match-tabs.ts` labels, `page.tsx` "Could not load this match" |
| 7 Draft | `draft` | `(site)/draft/**` incl. position and lane names, counter panel copy, lock screen, screenshot reader |
| 8 Live Coach | `live` | `(site)/live/**` incl. ConnectDota steps, TipList labels and icons' `aria-label`s, PositionPicker, DraftStrip, LivePanel; `src/lib/ai/ai-limits.ts` `limitMessage` / `usageLine` take `words.ai`; the item plan line "Item plan:" written by the coach route uses the player's language |
| 9 Trending | `trending` | `(site)/heroes/**` incl. table headers, highlights, `hero-picks.ts` `fallbackReason` (takes words) |
| 10 Server messages | `errors` | every friendly message in `src/app/api/**/route.ts` and the error copy in page loaders (`getWords()` in route handlers) |

Clerk's own sign-in form: in Task 3, check whether `@clerk/localizations` exports `mnMN`. If it does, ask the owner before adding the dependency; if not, leave Clerk's form English and note it.

---

### Task 11: Final checks

- [ ] **Step 1:** `npm run lint && npx tsc --noEmit` → zero errors.
- [ ] **Step 2:** `grep -rnE '>[A-Z][a-z]+( [a-z]+)*<|"[A-Z][a-z]+ [a-z]' src/app --include=*.tsx` reviewed by eye: what is left is hero/item names, Dota terms or code, not UI text.
- [ ] **Step 3 (owner):** in the browser, switch to Монгол on desktop (sidebar) and phone (⋯ menu): no English flash after the refresh; Ө and Ү in the Mongolian fonts; no overflowing labels on Stats, the Scoreboard, History rows and the nav; switch back to English; proofread `src/lib/i18n/mn/`.
