# Three small fixes: theme button, phone layout, History filters — design

Date: 2026-11-17 · Status: draft for approval

Three independent small changes, written up together. Each can be built and reviewed on its own.

## 1. Remove the theme button

**Why:** the toggle swaps its icon and changes nothing else. The owner chose to remove it rather than build a light theme (about 80 components are white text on dark glass).

**Change:** delete the button from the sidebar and delete its component. The saved "theme" preference in the browser is simply ignored from now on.

**Not doing:** a light theme.

## 2. Phone layout

**What is wrong today (under 768 px wide):**
- The sidebar is hidden, so the **language switch cannot be reached**. (Log out is still reachable through the account avatar's own menu.)
- The medal, Steam and account pills float over the right end of the section links.
- The logo is tall enough to overlap the page title below it.

**Change, phones only (desktop stays exactly as it is):**

```
┌──────────────────────────────────────────┐
│ [logo]              (medal)(steam)(you)(⋯)│   row 1: smaller logo, round pills, a "more" button
│ STATS   DRAFT   LIVE COACH   TRENDING  → │   row 2: section links, full width, scrolls sideways
├──────────────────────────────────────────┤
│ HISTORY                                   │   page title starts clear of the logo
```

- The "more" button opens a small menu with **Language** (English / Монгол) and **Log out**.
- The pills move into row 1 instead of floating over the links.
- The sliding underline keeps working in the scrolling row.

**Not doing:** a bottom tab bar, or any change to page contents.

## 3. History filters

**Why:** History shows 100 matches, 10 per page, with no way to narrow them.

**Change:** a filter row above the list, working on the 100 matches already loaded (no new requests):

```
[ All heroes ▾ ]   All · Wins · Losses      All · Ranked · Unranked
Matches 1–10 of 23 · 61% win rate
```

- **Hero:** a dropdown of the heroes in these matches, most played first, with the number of games.
- **Result** and **Queue:** three-way toggles.
- The count line shows the filtered total and its win rate.
- Changing a filter goes back to page 1.
- No match fits: "No matches fit these filters." with a **Clear filters** button.

**Builder's calls:** filters reset when the page is reloaded (not saved, not in the address bar); the hero list only contains heroes actually played in these 100 matches.

**Not doing:** date ranges, search by match id, loading more than 100 matches.

## Constraints (all three)

`AGENTS.md` rules, files under 200 lines, Next.js 16 docs before writing code, reduced-motion respected, lint and tests green.

## Approaches

Each of the three has one sensible way, so no alternatives are listed beyond these rejected ones:
- Theme: building a real light theme — rejected by the owner as too large for now.
- Phone: a bottom tab bar — rejected because the five section names do not fit, and it changes navigation on every page for one unreachable control.
- Filters: asking OpenDota again per filter — rejected because the 100 matches are already in the page.

## Testing

- Filters: pure tests for filtering, the hero list with counts, and the win rate; a render test that the list and count line follow the filters.
- Phone layout: checked in a browser at 390 px (no overlap, no sideways page scroll, language reachable).
- Theme: the sidebar renders without the button; nothing else references the component.
