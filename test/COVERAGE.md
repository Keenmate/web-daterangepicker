# E2E Test Coverage Checklist

Tracks which features of `web-daterangepicker` have end-to-end test coverage in
`e2e/`. Each row is one user-observable feature. Status legend:

- `✗` — no coverage
- `△` — partial coverage (some paths)
- `✓` — covered

When a row is marked `✓`/`△`, the **Spec** column points at the file under
`e2e/` that exercises it, and **Fixture** at the dedicated HTML page under
`test/` (the spec hits no example pages, only fixtures).

---

## 1. Selection modes

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Single-date selection                                         | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Range selection (click start → click end)                     | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Range: drag-to-adjust start                                   | ✓      | `drag-adjust.spec.ts`        | `drag-adjust.html`        |
| Range: drag-to-adjust end                                     | ✓      | `drag-adjust.spec.ts`        | `drag-adjust.html`        |
| Multiple-date selection (toggle individual days)              | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Apply-required: cancel restores `originalInputValue`          | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| `commitMode`: `'selection'` (default) / `'apply'` / `'manual'`  | △      | `selection-modes.spec.ts`    | `selection-modes.html`    |

## 2. Positioning modes

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `floating` mode: opens below input                            | ✓      | `floating-placement.spec.ts` | `floating-placement.html` |
| `floating` mode: flips above when no room below               | △      | _covered indirectly by `anchor-stability.html`_ |         |
| `floating` mode: `calendar-placement` override                | ✓      | `floating-placement.spec.ts` | `floating-placement.html` |
| `floating`: escapes `overflow:auto` ancestor (SPFx fix)       | ✓      | `floating-overflow.spec.ts`  | `floating-overflow.html`  |
| `floating`: anchor stable when calendar content grows         | ✓      | `anchor-stability.spec.ts`   | `anchor-stability.html`   |
| `floating`: closes on viewport resize                         | ✓      | `anchor-stability.spec.ts`   | `anchor-stability.html`   |
| `floating`: `should-close-on-scroll` (default true / false)          | ✓      | `floating-placement.spec.ts` | `floating-placement.html` |
| `inline` mode: renders in-place, never hidden                 | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |
| `modal` mode: centered overlay + backdrop                     | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |
| `modal` mode: backdrop click closes                           | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |
| `modal` mode: body scroll locked while open                   | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |
| `modal` mode: input blurred to suppress mobile keyboard       | ✗      |      |         |
| `modal` mode: container-query inner layout tiers              | ✗      |      |         |
| `mobile-modal-breakpoint` auto-engages modal at small widths  | ✓      | `misc-features.spec.ts`      | `misc-features.html`      |

## 3. Trigger / open-close

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `calendar-open-trigger="focus"` — opens on input focus        | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `calendar-open-trigger="typing"` — opens when user types      | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `calendar-open-trigger="manual"` — only opens via open()      | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| Click outside closes (floating)                               | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| Escape closes                                                 | ✓      | `keyboard-navigation.spec.ts`| `keyboard-navigation.html`|
| Re-click input after scroll-close reopens (#3 regression)     | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `open()` is idempotent (no double-init on focus+mousedown)    | △      | `triggers.spec.ts`           | `triggers.html`           |

## 4. Multi-month layout

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `visible-months-count="2"` shows two adjacent months          | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Horizontal multi-month layout (flex row)                      | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Grid layout (`grid-rows` × `grid-columns`)                    | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Collision prevention: adjacent columns can't show same month  | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Per-column independent navigation                             | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| `is-unified-navigation-enabled`: single header drives all columns        | △      | `multi-month.spec.ts`        | `multi-month.html`        |
| `unified-navigation-anchor-index`                             | ✗      |      |         |
| `is-unified-header-interactive` opens unified rolling selector   | ✓      | `misc-features.spec.ts`      | `misc-features.html`      |
| Always-6-week rendering (stable height in modal)              | ✗      |      |         |

## 5. Navigation

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Prev / next month buttons                                     | ✓      | `navigation-extras.spec.ts`  | `navigation-extras.html`  |
| Rolling year/month selector toggles via month-year header     | ✓      | `navigation-extras.spec.ts`  | `navigation-extras.html`  |
| Rolling list scrolls without chaining to page                 | ✓      | `rolling-selector.spec.ts`   | `rolling-selector.html`   |
| Rolling list border-box (no overflow into elements below)     | ✓      | `rolling-selector.spec.ts`   | `rolling-selector.html`   |
| Keyboard: arrows (day), Ctrl+arrows / PgUp/PgDn (month)       | △      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Home/End (start/end of month)                       | △      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Ctrl+Home/End (year jump, step year-by-year)        | △      | `navigation-extras.spec.ts`  | `navigation-extras.html`  |
| Keyboard: `t` jumps to today                                  | ✓      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Enter selects, Escape closes                        | ✓      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Tab cycles between month columns                    | ✓      | `navigation-extras.spec.ts`  | `navigation-extras.html`  |

## 6. Input behavior

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Input mask: progressive auto-format as user types             | ✓      | `input-behavior.spec.ts`     | `input-behavior.html`     |
| Custom `date-format-mask` (YYYY-MM-DD, DD.MM.YYYY, etc.)      | ✓      | `input-behavior.spec.ts`     | `input-behavior.html`     |
| Progressive parsing: calendar follows valid typed segments    | ✗      |      |         |
| `input-size` variants (xs, sm, md, lg, xl)                    | ✓      | `sizing-theming.spec.ts`     | `sizing-theming.html`     |
| `displayFormatMask` fills placeholder when no explicit one    | ✓      | `api-extras.spec.ts`         | `api-extras.html`         |

## 7. Date restrictions

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `min-date` / `max-date` disable out-of-range days             | ✓      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| `disabled-weekdays` (Sat/Sun, etc.)                           | ✓      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| `disabledDates` (specific dates)                              | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `initial-date` controls opening month                         | ✓      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| `rolling-year-range` / `rolling-month-range`                  | △      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| Rolling selector disables out-of-range entries                | ✗      |      |         |

## 8. Range over disabled dates (`disabledDatesHandling`)

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `'allow'`: range crosses disabled days                        | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `'prevent'`: blocks selection crossing disabled               | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `'block'`: snaps to last enabled before disabled gap          | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `'split'`: yields multiple ranges in event detail             | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `'individual'`: yields flat enabled-dates array               | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `should-highlight-disabled-in-range` toggles styling                 | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |

## 9. Action buttons & summary

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Today button jumps + selects today                            | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Clear button clears selection + input                         | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Apply commits pending selection, closes picker                | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| `is-today-button-shown` / `is-clear-button-shown` / `commit-mode="apply"` (Apply button) | ✓    | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Custom `actionButtons` array (incl. `custom-action` event)    | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| Action-button tooltip on hover                                | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| `is-summary-shown="false"` omits summary block entirely           | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Actions `border-top` only when summary is visible             | ✓      | `summary-actions.spec.ts`    | `summary-actions.html`    |
| Visible summary has `margin-top` (gap from months)            | ✓      | `summary-actions.spec.ts`    | `summary-actions.html`    |
| Range summary text reflects selected days/nights              | △      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| `formatSummaryCallback` overrides summary HTML                | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |

## 10. Custom rendering / callbacks

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `renderDayCallback` (full replacement)                        | ✓      | `callbacks-extra.spec.ts`    | `callbacks-extra.html`    |
| `renderDayContentCallback` (augmentation)                     | ✓      | `callbacks.spec.ts`          | `callbacks.html`          |
| `getMonthHeaderCallback` overrides per-month header           | ✓      | `callbacks.spec.ts`          | `callbacks.html`          |
| `getUnifiedHeaderCallback` overrides unified-mode header text | ✓      | `callbacks-extra.spec.ts`    | `callbacks-extra.html`    |
| `customStylesCallback` injects styles into Shadow DOM         | ✓      | `callbacks-extra.spec.ts`    | `callbacks-extra.html`    |
| `beforeDateSelectCallback`: accept / adjust / restore / clear | △      | `callbacks.spec.ts`          | `callbacks.html`          |
| `beforeMonthChangedCallback`: bulk metadata, block            | △      | `callbacks.spec.ts`          | `callbacks.html`          |
| `specialDates` + `*Member` property mapping                   | ✓      | `callbacks-extra.spec.ts`    | `callbacks-extra.html`    |
| `getDateMetadataCallback` per-date                            | ✓      | `callbacks.spec.ts`          | `callbacks.html`          |

## 11. Tooltips

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Day-cell tooltip on hover                                     | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| Badge tooltip                                                 | ✓      | `misc-features.spec.ts`      | `misc-features.html`      |
| Action-button tooltip                                         | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| Tooltips escape `overflow:auto` ancestor (position: fixed)    | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |

## 12. Locale & i18n

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `locale="auto"` detects from browser                          | ✗      |      |         |
| Explicit `locale="de"` / `"fr"` / etc.                        | ✓      | `locale.spec.ts`             | `locale.html`             |
| `customStrings` overrides individual UI strings               | ✓      | `locale.spec.ts`             | `locale.html`             |
| `monthNames` override (property)                              | ✓      | `locale.spec.ts`             | `locale.html`             |
| `month-names` override (pipe-delimited attribute)             | ✓      | `locale.spec.ts`             | `locale.html`             |
| `weekday-names` override (pipe-delimited, Sunday-indexed)     | ✓      | `locale.spec.ts`             | `locale.html`             |
| `weekday-names` rotates by `week-start-day` (Wednesday-first) | ✓      | `locale.spec.ts`             | `locale.html`             |
| `month-names` / `weekday-names` bad segment count ignored     | ✓      | `locale.spec.ts`             | `locale.html`             |
| `week-start-day="auto"` follows locale                        | ✗      |      |         |
| Explicit `week-start-day` integer                             | ✓      | `locale.spec.ts`             | `locale.html`             |

## 13. Events & API

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `change` event with full detail                               | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `apply` event                                                 | n/a    | _picker dispatches `change` on apply; no separate event_ |         |
| `cancel` event                                                | n/a    | _no event; pending selection restores prior input value_ |         |
| `custom-action` event (per v1.12.0 docs)                      | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `selectedDate` / `selectedRanges` / `selectedDates` setters   | △      | `api-extras.spec.ts`         | `api-extras.html`         |
| `isOpen` setter opens/closes programmatically                 | ✓      | `events-api.spec.ts`, `triggers.spec.ts` | `events-api.html`, `triggers.html` |
| `updateOptions(partial)` survives without losing selection    | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `showMessage` / `hideMessage`                                 | ✓      | `api-extras.spec.ts`         | `api-extras.html`         |
| `toggleMessage`                                               | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `value` setter populates input + selection                    | △      | `events-api.spec.ts`         | `events-api.html`         |
| `disabled` setter disables input + suppresses open            | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `custom-action` detail shape `{ data, picker }` (v2)          | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |

## 16. v2.0.0 symmetric feedback API & context callbacks

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `showSummary(html)` pins custom summary HTML (--visible)      | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| Summary override survives re-render until selection commits   | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `hideSummary()` / `refreshSummary()` re-derive summary        | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `showLoader()` full-calendar overlay + single-instance guard  | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `showLoader('summary')` / `('message')` in-block spinner      | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `hideLoader(target)` / `toggleLoader(target)`                 | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| Summary loader added in `date-select` handler survives commit re-render | ✓ | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `ActionButton` callbacks receive `ActionButtonContext`        | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| `onClick` receives ctx (`ctx.picker`, `ctx.action`)           | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| `getTextCallback` / `getClassCallback` / `getTooltipCallback` via ctx | ✓ | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| `isVisibleCallback` / `isDisabledCallback` via ctx            | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |

## 14. Visual states

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Selected day class                                            | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Range start / middle / end classes                            | ✓      | `visual-states.spec.ts`      | `visual-states.html`      |
| Today highlight                                               | ✓      | `visual-states.spec.ts`      | `visual-states.html`      |
| Disabled day styling                                          | ✓      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| Hover preview during range selection                          | n/a    | _picker has no hover-preview class; mid-pick uses `:hover` only_ |         |
| Drag-preview classes during drag-adjust                       | ✓      | `drag-adjust.spec.ts`        | `drag-adjust.html`        |
| Keyboard-focused day class                                    | ✓      | `keyboard-navigation.spec.ts`| `keyboard-navigation.html`|
| Weekend styling                                               | n/a    | _picker emits no `--weekend` class; weekend cells are unstyled by default_ |         |
| Adjacent-month (faded) days                                   | ✓      | `visual-states.spec.ts`      | `visual-states.html`      |
| Invalid-range error styling (`showInvalidRange`)              | ✓      | `misc-features.spec.ts`      | `misc-features.html`      |

## 15. Sizing & theming

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `input-size` variants (xs, sm, md, lg, xl)                    | ✓      | `sizing-theming.spec.ts`     | `sizing-theming.html`     |
| `spacing` / `font-size` / `cell-size` scale variants          | n/a    | _attributes documented in CLAUDE.md but not implemented (see FINDINGS.md #11)_ |         |
| CSS-variable overrides flow through                           | ✓      | `sizing-theming.spec.ts`     | `sizing-theming.html`     |
