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

Once the calendar is open and a day cell has focus, every primary action
is reachable from the keyboard. The host page never has to provide its
own keyboard handlers.

### Day navigation

| Key | Action |
|---|---|
| ↑ / ↓ | Move up / down by one week |
| ← / → | Move left / right by one day |
| **Ctrl** + ← / → | Previous / next month (preserves day-of-month) |
| **PageUp** / **PageDown** | Previous / next month (preserves day-of-month) |
| **Home** | First day of current month — repeat to cycle backwards through months |
| **End** | Last day of current month — repeat to cycle forwards through months |
| **Ctrl** + **Home** | January 1st of current year — repeat for previous year |
| **Ctrl** + **End** | December 31st of current year — repeat for next year |

### Selection & lifecycle

| Key | Action |
|---|---|
| **Enter** | Select focused day (or commit pending range in range mode) |
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
losing the input focus.

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

**Current state — minimal.** The component ships almost no explicit
ARIA at the time of writing. Only one declaration exists:

- `aria-hidden="true"` on the wheel-picker's center selection band
  (decorative — hides the band from assistive tech so it doesn't get
  announced as "image").

**Known gaps to disclose:**

- The day cells have no `role="gridcell"`, no `aria-selected`, no
  `aria-current="date"`, no `aria-label`. Screen readers traverse them
  as plain `<div>` elements.
- The calendar container has no `role="dialog"` (for floating /modal
  modes) or `role="grid"` (for the day matrix). Modal mode also lacks
  `aria-modal="true"`.
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

Because the ARIA surface is minimal (see above), screen readers fall
back to announcing the raw DOM. Observed behavior:

**NVDA / JAWS (Windows):** day cells are announced as their text
content (the day number). Selected days have no "selected" status
announcement — visual `.drp__day--selected` styling is the only signal.
Range mode does not announce "1 of 5 days selected" or similar — the
summary block (`is-summary-shown="true"`) is announced when the
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
