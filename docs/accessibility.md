# Accessibility — `@keenmate/web-daterangepicker`

What works, what's intentionally minimal, and what's not yet in place.
This file is honest about the current a11y surface — keyboard
navigation is robust; ARIA / screen-reader labels / live-region
announcements are gaps you should know about before shipping to
consumers with accessibility requirements.

## Contents

- [Keyboard shortcuts](#keyboard-shortcuts) — full keyboard control of the calendar
- [Focus management](#focus-management) — what the picker does with focus on open / close / selection
- [ARIA roles & labels](#aria-roles--labels) — current state + known gaps
- [Screen-reader behavior](#screen-reader-behavior) — what NVDA / JAWS / VoiceOver actually announce
- [Color contrast](#color-contrast) — the `light-dark()` palette and override surfaces

## Keyboard shortcuts

Once the calendar is open, every primary action is reachable from the
keyboard. The host page never has to provide its own keyboard handlers.
The keys work in two places:

- **From the input** (a floating calendar keeps focus in the input when it
  opens): the keys move a highlighted day (`.drp__day--focused`); DOM focus
  stays in the input, so typing keeps working.
- **Inside the day grid** (Tab into it, or click a day; an inline calendar is
  always reachable this way): the grid is a WAI-ARIA `grid` with ONE tab stop
  (core `createRovingFocus`) and the keys move REAL focus between the day
  cells. Tab leaves the grid in one step; coming back lands on the same day.

### Day navigation

| Key | Action |
|---|---|
| ↑ / ↓ | Move up / down by one week (past the month edge: the same weekday in the next / previous month) |
| ← / → | Move left / right by one day, across the week and month edges |
| **Ctrl** + ← / → | Previous / next month (preserves day-of-month) |
| **PageUp** / **PageDown** | Previous / next month (preserves day-of-month) |
| **Shift** + **PageUp** / **PageDown** | The same month a year back / forward |
| **Home** | First day of current month — repeat to cycle backwards through months |
| **End** | Last day of current month — repeat to cycle forwards through months |
| **Ctrl** + **Home** | January 1st of current year — repeat for previous year |
| **Ctrl** + **End** | December 31st of current year — repeat for next year |

In a right-to-left (`dir="rtl"`) context ← / → (and **Ctrl** + ← / →) follow the
visual direction, per WAI-ARIA: the grid runs right-to-left, so ← moves to the
next day / month. The nav chevrons mirror too.

Disabled days are skipped by the arrows (they stay announced, with
`aria-disabled="true"`); so are the neighbour-month cells that fill the first
and last week.

### Selection & lifecycle

| Key | Action |
|---|---|
| **Enter** | Select focused day (or commit pending range in range mode) |
| **Space** | Select the focused day (inside the day grid) |
| **Escape** | Close calendar; with an uncommitted Apply-mode selection, silently restores the original input value |
| **Tab** / **Shift+Tab** | Switch between month columns when multiple months are visible |
| **T** | Jump focus to today's date |

In time / datetime modes (`picker-mode="time"` / `"datetime"`), keyboard
navigation inside the time rolls is short-circuited for v1 — use the
mouse / touch to commit time values. This is documented as a v1 scope
limitation in `CHANGELOG.md` v1.14.0.

## Focus management

The picker tries to keep focus in a sensible place across its lifecycle.

**On calendar open (floating mode)** — focus stays on the input.
Arrow keys press into the calendar; pressing Escape closes it without
losing the input focus. (The WAI-ARIA date-picker dialog pattern moves
focus into the grid on open instead; the picker keeps the input focused
so typing a date keeps working. Tab reaches the grid.)

**Into the day grid** — Tab (or a click on a day) puts real focus on one
day: the keyboard position, else the selected day, today, or the first
enabled day. A re-render (month change, a pick) puts focus back on the
day at the same position.

**Closing with focus in the grid (floating mode)** — picking a day that
closes the calendar, or Escape, returns focus to the input.

**On calendar open (modal mode)** — the input is **blurred** so the
mobile soft-keyboard collapses (otherwise the keyboard fights for the
same screen real estate as the modal). On close, focus is restored to
the input if it had focus when the modal opened.

**On day selection (single mode)** — the focused day cell stays
focused. The popover closes (under `commit-mode="selection"`, the
default) and focus returns to the input.

**On day selection (range mode)** — focus stays on the just-clicked
day cell while the user picks the second end. Selecting the second day
keeps focus on that day until the popover closes.

**Between month columns (multi-month mode)** — Tab / Shift+Tab cycles
focus through the visible month columns. Each column tracks its own
focused day position independently. Arrow keys inside one column do
not bleed into the neighbor.

**On Escape with an uncommitted selection (Apply-button mode)** —
focus returns to the input. The picker silently restores the input's
original value so the user isn't left with a half-committed change.

**Sibling pickers on the same page** — clicking input B while picker A
is open closes A's popover at `pointerdown` (via the
`drp-picker-activated` custom event), then picker B opens normally on
`click`. The picker A → picker B transition feels instantaneous with
no overlap window. See `CHANGELOG.md` v1.14.0-rc02 "Fixed" entry for
the implementation note.

## ARIA roles & labels

**The day grid** (per visible month):

| Element | Role / attributes |
|---|---|
| `.drp__calendar-container` | `role="grid"`, `aria-label` = month + year (locale month names) |
| `.drp__weekdays` | `role="row"`; each weekday `role="columnheader"`, `abbr` + `aria-label` = the full weekday name |
| `.drp__days` | `role="rowgroup"` (the roving-focus container) |
| `.drp__date-row` | `role="row"` (one per week) |
| `.drp__badge-row` | `role="presentation"` |
| `.drp__day` | `role="gridcell"`, `tabindex` `0` on the one tab stop / `-1`, `aria-selected` (`true` on the picked day, range ends and the days between), `aria-current="date"` on today, `aria-disabled="true"` on disabled days |

Also: `aria-hidden="true"` on the wheel-picker's center selection band
(decorative).

**The host** (form control): `required` sets `aria-required="true"` on the host's
`ElementInternals` (`internals.ariaRequired`, core SPEC §6.6), so a screen reader
announces the picker as required, and core also sets `aria-required="true"` on the
visible input (the validity anchor — focus sits there; `inline` has none); the `errors.required` label is the
`validationMessage` the browser bubble shows. The host matches `:state(required)`
for styling (the native `:required` does not match a custom element).

**Known gaps to disclose:**

- Day cells have no `aria-label` — a screen reader reads the day number
  (with the grid / column context) rather than a full date.
- The calendar container has no `role="dialog"` for the floating
  popover.
- There's no `aria-live` region announcing month changes, selection
  changes, or validation messages from `beforeSelectCallback`.
- Action buttons (Today / Clear / Apply / Now) have only their visible
  text; no `aria-label` or `aria-describedby` for context.

**If you ship to consumers with strict accessibility requirements**,
audit the component against your own standard and add the roles /
labels your platform needs via `getCustomStylesCallback` / `custom-styles` (for CSS) or a
fork. We track this as a known limitation; full WAI-ARIA conformance
is on the roadmap but isn't claimed for the 1.x line.

## Screen-reader behavior

Observed / expected behavior:

**NVDA / JAWS (Windows):** with focus in the day grid, a day is
announced as its number with its column header (weekday) and its
selected / current-date / unavailable state from the ARIA above. From the
input (focus not in the grid) the highlighted day is not announced.
Range mode does not announce "1 of 5 days selected" or similar — the
summary block (`show-summary="true"`) is announced when the
selection commits, which carries the days/nights count.

**VoiceOver (macOS / iOS):** behavior matches the above on macOS.
On iOS, the popover may be missed entirely by the rotor because there's
no `role="dialog"` — users may need to scrub through the page sequence
to find calendar content.

**Practical recommendation:** until ARIA labels land, the most reliable
a11y story is to keep the date input itself labeled correctly (via
`<label for="…">` in your host markup) and rely on the summary block
text for committed-range feedback. The visual focus ring on day cells
is high-contrast and follows arrow-key navigation, so keyboard-only
users without screen readers have a fully usable experience.

## Color contrast

The picker ships a `light-dark()`-based default palette that meets
WCAG AA contrast on both light and dark backgrounds for the primary
text + chrome surfaces. Specifically:

- Day numbers vs the dropdown background.
- Selected day text vs the accent fill.
- Disabled day text vs the dropdown background.
- Input text + placeholder vs the input background.

A Playwright contrast spec at `e2e/dark-mode.spec.ts` exercises this
under three configurations (fully-themed, minimal-override, OS-inherit
only) — that suite is part of the standard `npm run test:e2e` run.

For custom themes — when you override `--drp-accent-color`,
`--drp-dropdown-bg`, or any of the text tokens — verify contrast
against your specific palette. The component doesn't ship a
contrast-warning runtime check. See [`theming.md`](./theming.md) for
the full variable surface and the `light-dark()` strategy.

## See also

- [`usage.md`](./usage.md) — full API + the keyboard / focus behavior in the context of the wider component lifecycle.
- [`theming.md`](./theming.md) — color tokens you can override + the `light-dark()` strategy.
- [`examples-basic.html`](../examples-basic.html) — exercise the keyboard navigation in a browser.
- [`e2e/dark-mode.spec.ts`](../e2e/dark-mode.spec.ts) — the Playwright contrast specs.
