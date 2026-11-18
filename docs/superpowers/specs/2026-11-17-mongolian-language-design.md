# Mongolian language — design

Date: 2026-11-17 · Status: approved 2026-11-18

## Intent

The language switcher offers **Монгол**, but it only remembers the choice: no text changes. For an app called MongolDota this is the most visible missing piece.

The owner chose the wider scope: **page text and AI answers** in Mongolian.

## Goals

- With Монгол selected, every screen reads in Mongolian: menus, headings, labels, buttons, messages, empty states, errors, tooltips.
- AI answers (live tips, item plan line, draft advice, stats coach, hero picks) are written in Mongolian.
- No flash of English when a page loads in Mongolian.
- All Mongolian wording lives in **one file**, so the owner can correct it without touching code.
- Adding a third language later means adding one file.

## Non-goals

- Translating hero, item and ability names, or data that comes from OpenDota. They stay in English, as Dota players use them.
- Addresses per language (`/mn/…`) and search-engine concerns. The app is private, behind sign-in.
- A language choice that follows the player across devices. It is remembered per browser, as today.
- Translating tips and advice that were already written. They stay in the language they were written in.

## Anti-goals

- Half-translated screens. A missing Mongolian line must fail the build, not show English.
- Mongolian letters in the wrong font (see Constraints).
- Layouts that break because a Mongolian label is longer than the English one.
- AI answers in poor Mongolian with no way back.

## Constraints

- `AGENTS.md` rules; Next.js 16 with Cache Components (read `node_modules/next/dist/docs/` first, including the internationalization guide); files under 200 lines.
- **Fonts, checked against the font data shipped with Next.js:** the heading font (Germania One) has Latin letters only, and the body font (Jost) has Russian Cyrillic but not the Mongolian letters **Ө ө Ү ү**. Mongolian therefore needs its own pair of fonts.
- About 65 files contain text a player can see (roughly 400–500 lines of text): 49 components and pages, plus helper files (rule-based suggestions, "5 min ago", match event labels, server error messages).
- Stored AI answers for Stats and Trending Heroes are kept per player and kind for 12 hours. The kind column is text, so a language can be part of it with **no migration**.
- Clerk's sign-in and account forms are Clerk's own text.

## Approaches considered

1. **Language in a cookie, read on the server** — **chosen** (the owner left the how to the builder). The switcher saves the choice in a cookie and refreshes the page; the server renders the right language straight away, so there is no flash. Every signed-in page already waits on the sign-in cookie, so reading one more cookie costs nothing. Addresses stay as they are.
2. **Language in the address (`/mn/history`)**, the way the Next.js guide shows. No flash either, but every route moves into a new folder and every link, redirect, Clerk URL and Steam callback changes. A lot of risk for a private app that gains nothing from separate addresses.
3. **Language chosen in the browser only** (as today). Smallest change, but every page would first appear in English and then switch, and text rendered on the server could not be translated at all.

## Design

### Where the words live

Two files with the same shape, `en` and `mn`, grouped by area (navigation, stats, history, match, draft, live, trending, errors, time). The Mongolian file is type-checked against the English one: a missing or extra line is a build error. Components ask for a line by name instead of holding English text.

Sentences with numbers or names in them are small functions, so word order can differ between the languages ("Matches 1–10 of 23", "5 min ago").

### Choosing the language

- The switcher writes a `lang` cookie (one year) and refreshes the current page. It keeps working where it is today, and in the phone menu from the small-fixes design.
- A first visit with no cookie uses English.
- The `lang` attribute on the page is set to match, as today.

### Dota words

Mongolian players say most Dota terms in English, so these stay as they are: hero, item and ability names, lane names used as terms (mid, safe lane, off lane), roles (carry, support), GPM, XPM, KDA, BKB, Roshan, Aegis, buyback. Ordinary words around them are translated. The builder writes the Mongolian; **the owner proofreads the one file** before it is called done.

### Fonts

When Монгол is selected, headings and body text switch to a pair that covers Mongolian Cyrillic. Builder's proposal: **Oswald** for headings (condensed and heavy, closest in feel to the current heading font) and **Montserrat** for body text (geometric, like Jost). English keeps today's fonts. The metal-textured titles keep their texture.

### AI answers

- When Монгол is selected, each prompt gains one instruction: answer in Mongolian (Cyrillic), keeping hero, item and ability names and common Dota terms in English.
- Structured answers keep their machine parts (item keys, hero ids, suggestion types); only the sentences are Mongolian.
- Stats coach and hero picks are stored per language, so switching language does not show the other language's stored answer. Draft advice saved in the browser is tied to the language it was written in.
- The rule-based suggestions and picks that show while the AI is thinking, or when it fails, come from the two word files.
- **Unknown:** how well the model writes Mongolian. The first build step shows the owner about ten sample answers in Mongolian. If the quality is not acceptable, one switch keeps AI answers in English while the pages stay Mongolian.

### Sign-in screen

The welcome text beside the sign-in form is translated. Clerk's own form is translated only if Clerk ships a Mongolian pack (left to the builder to check; it would add one dependency).

## Order of work

The words are moved screen by screen so the app is never broken in between: shell and navigation first, then Stats, History, Match, Draft, Live Coach, Trending Heroes, server messages, and AI prompts last. Until a screen is moved it simply stays English.

## Testing

- The two word files have the same shape (the type check) and no empty lines.
- Render tests for a few screens in both languages.
- Each prompt builder: Mongolian instruction present for `mn`, absent for `en`.
- Stored answers: an English answer is not returned for a Mongolian request.
- In a browser at desktop and phone width: no English flash on load, Ө and Ү in the right font, no overflowing labels on the densest screens (Stats, scoreboard, History rows).

## Left to the builder

- The exact split of the word files if one passes 200 lines (one file per area is fine, as long as the Mongolian text stays easy to find and proofread).
- Final font choice after seeing both in the browser.
- Whether Clerk has a Mongolian pack.

## Calls made by the builder (for the owner to check)

- Language in a cookie rather than in the address.
- English for a first visit with no saved choice (not the browser's language).
- The list of Dota words that stay in English.
- Oswald and Montserrat for Mongolian text.
- Old tips and advice are not re-written when the language changes.
