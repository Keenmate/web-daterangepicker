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
| Range: drag-to-adjust with touch pointer events               | ✓      | `drag-adjust-touch.spec.ts`  | `drag-adjust.html`        |
| Multiple-date selection (toggle individual days)              | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| `selectedRanges` (range mode) always returns the selection: plain `[{start,end}]`, `split` pieces, independent ranges; getter/setter round-trip | ✓ | `disabled-handling.spec.ts` | `disabled-handling.html` |
| Apply-required: cancel restores `originalInputValue`          | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| `commitMode`: `'selection'` (default) / `'apply'` / `'manual'`  | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| `commit-mode="manual"`: no close, no Apply; custom button → `controller.commit()` commits | ✓ | `selection-modes.spec.ts` | `selection-modes.html` |
| `commit-mode="manual"`: picks only stage — nothing written / no events before `commit()` (FINDINGS #22, fixed) | ✓ | `selection-modes.spec.ts` | `selection-modes.html` |
| `commit-mode="manual"`: outside click doesn't close by default; Escape / `close()` discard the staged pick | ✓ | `selection-modes.spec.ts` | `selection-modes.html` |
| `close-on-outside-click` (`false` in selection mode; `true` overriding the manual default) | ✓ | `selection-modes.spec.ts` | `selection-modes.html` |
| `close-on-select="false"` — booking.com flow: written on every pick, stays open; runtime toggle | ✓ | `selection-modes.spec.ts` | `selection-modes.html` |

## 2. Positioning modes

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `floating` mode: opens below input                            | ✓      | `floating-placement.spec.ts` | `floating-placement.html` |
| `floating` mode: flips above when no room below               | △      | _covered indirectly by `anchor-stability.html`_ |         |
| `floating` mode: `calendar-placement` override                | ✓      | `floating-placement.spec.ts` | `floating-placement.html` |
| `floating`: escapes `overflow:auto` ancestor (SPFx fix)       | ✓      | `floating-overflow.spec.ts`  | `floating-overflow.html`  |
| `floating`: anchor stable when calendar content grows         | ✓      | `anchor-stability.spec.ts`   | `anchor-stability.html`   |
| `floating`: closes on viewport resize                         | ✓      | `anchor-stability.spec.ts`   | `anchor-stability.html`   |
| `floating`: `close-on-scroll` (default true / false)          | ✓      | `floating-placement.spec.ts` | `floating-placement.html` |
| `inline` mode: renders in-place, never hidden                 | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |
| `modal` mode: centered overlay + backdrop                     | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |
| `modal` mode: backdrop click closes                           | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |
| `modal` mode: body scroll locked while open                   | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |
| `modal` mode: input blurred to suppress mobile keyboard; focus restored on close after a keyboard open (FINDINGS #29, fixed) | ✓ | `positioning-modes.spec.ts` | `positioning-modes.html` |
| `modal` mode: container-query inner layout tiers              | ✗      |      |         |
| `mobile-modal-breakpoint` auto-engages modal at small widths  | ✓      | `misc-features.spec.ts`      | `misc-features.html`      |
| Positioning-mode flip leaves no zombie floating picker / drift warning | ✓ | `mode-flip.spec.ts` | `mode-flip.html` |
| Selection/picker-mode flip: compatible selection carried + reformatted, otherwise input cleared | ✓ | `mode-flip.spec.ts` | `mode-flip.html` |

## 3. Trigger / open-close

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `calendar-open-trigger="focus"` — opens on input focus        | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `calendar-open-trigger="typing"` — opens when user types      | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `calendar-open-trigger="manual"` — only opens via open()      | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| Click outside closes (floating)                               | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| Escape closes                                                 | ✓      | `keyboard-navigation.spec.ts`| `keyboard-navigation.html`|
| Re-click input after scroll-close reopens (#3 regression)     | ✓      | `triggers.spec.ts`           | `triggers.html`           |
| `open()` is idempotent (no double-init on focus+mousedown)    | ✓      | `triggers.spec.ts`, `api-extras.spec.ts` | `triggers.html`, `api-extras.html` |
| `toggle()` opens / closes                                     | ✓      | `api-extras.spec.ts`         | `api-extras.html`         |

## 4. Multi-month layout

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `visible-month-count="2"` shows two adjacent months          | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Horizontal multi-month layout (flex row)                      | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Grid layout (`grid-rows` × `grid-columns`)                    | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Collision prevention: adjacent columns can't show same month  | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| Per-column independent navigation                             | ✓      | `multi-month.spec.ts`        | `multi-month.html`        |
| `enable-unified-navigation`: single header drives all columns        | △      | `multi-month.spec.ts`        | `multi-month.html`        |
| `unified-navigation-anchor-index`: unified month/year pick lands in column N | ✓ | `multi-month.spec.ts` | `multi-month.html` |
| `month-layout` row → grid at runtime renders the grid | ✓ | `multi-month.spec.ts` | `multi-month.html` |
| `month-layout` switch keeps the range (FINDINGS #21, fixed) | ✓ | `multi-month.spec.ts` | `multi-month.html` |
| `unified-header-interactive` opens unified rolling selector   | ✓      | `misc-features.spec.ts`      | `misc-features.html`      |
| Always-6-week rendering (42 cells, stable height in modal)    | ✓      | `positioning-modes.spec.ts`  | `positioning-modes.html`  |

## 5. Navigation

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Prev / next month buttons                                     | ✓      | `navigation-extras.spec.ts`  | `navigation-extras.html`  |
| Rolling year/month selector toggles via month-year header     | ✓      | `navigation-extras.spec.ts`  | `navigation-extras.html`  |
| Rolling list scrolls without chaining to page                 | ✓      | `rolling-selector.spec.ts`   | `rolling-selector.html`   |
| Rolling list border-box (no overflow into elements below)     | ✓      | `rolling-selector.spec.ts`   | `rolling-selector.html`   |
| Keyboard: arrows (day), Ctrl+arrows / PgUp/PgDn (month)       | ✓      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Home/End (start/end of month)                       | ✓      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Ctrl+Home/End (year jump, step year-by-year)        | ✓      | `keyboard-navigation.spec.ts`, `navigation-extras.spec.ts` | `keyboard-navigation.html`, `navigation-extras.html` |
| Keyboard: Ctrl+Home/End leave a single focused day (FINDINGS #26, fixed) | ✓ | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: `t` jumps to today                                  | ✓      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Enter selects, Escape closes                        | ✓      | `keyboard-navigation.spec.ts` | `keyboard-navigation.html` |
| Keyboard: Tab cycles between month columns                    | ✓      | `navigation-extras.spec.ts`  | `navigation-extras.html`  |

## 6. Input behavior

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Input mask: progressive auto-format as user types             | ✓      | `input-behavior.spec.ts`     | `input-behavior.html`     |
| Custom `date-format-mask` (YYYY-MM-DD, DD.MM.YYYY, etc.)      | ✓      | `input-behavior.spec.ts`     | `input-behavior.html`     |
| Progressive parsing: calendar follows valid typed segments    | ✓      | `input-behavior.spec.ts`     | `input-behavior.html`     |
| `input-size` variants (xs, sm, md, lg, xl)                    | ✓      | `sizing-theming.spec.ts`     | `sizing-theming.html`     |
| `placeholder-format-mask` fills placeholder when no explicit one | ✓   | `api-extras.spec.ts`         | `api-extras.html`         |

## 7. Date restrictions

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `min-date` / `max-date` disable out-of-range days             | ✓      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| `disabled-weekdays` (Sat/Sun, etc.)                           | ✓      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| `disabledDates` (specific dates)                              | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `initial-date` controls opening month                         | ✓      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| `rolling-year-range` (absolute; runtime change)               | ✓      | `date-restrictions.spec.ts`, `rolling-selector.spec.ts` | `date-restrictions.html`, `rolling-selector.html` |
| `rolling-year-range` relative `-1:+2` (from today's year), mixed `2023:+1`, single `2026`; invalid → warn + keep (FINDINGS #27, fixed) | ✓ | `rolling-selector.spec.ts` | `rolling-selector.html` |
| `rolling-month-range`                                         | ✗      |      |         |
| Rolling selector: min/max-date bound years, disable months; disabled month inert | ✓ | `rolling-selector.spec.ts` | `rolling-selector.html` |

## 8. Range over disabled dates (`disabledDatesHandling`)

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `'allow'`: range crosses disabled days                        | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `'prevent'`: blocks selection crossing disabled               | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `'block'`: snaps to last enabled before disabled gap          | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `'split'`: yields multiple ranges in event detail             | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `'individual'`: yields flat enabled-dates array               | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |
| `highlight-disabled-in-range` toggles styling                 | ✓      | `disabled-handling.spec.ts`  | `disabled-handling.html`  |

## 9. Action buttons & summary

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Today button jumps + selects today                            | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Clear button clears selection + input                         | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Apply commits pending selection, closes picker                | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Apply fires `change` (once) and refreshes the form value (FINDINGS #17) | ✓ | `selection-modes.spec.ts` | `selection-modes.html` |
| `show-today-button` / `show-clear-button` / `commit-mode="apply"` (Apply button) | ✓    | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Custom `actionButtons` array (incl. `action` event)           | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| Action-button tooltip on hover                                | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| `show-summary="false"` omits summary block entirely           | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Actions `border-top` only when summary is visible             | ✓      | `summary-actions.spec.ts`    | `summary-actions.html`    |
| Visible summary has `margin-top` (gap from months)            | ✓      | `summary-actions.spec.ts`    | `summary-actions.html`    |
| Range summary text reflects selected days/nights              | △      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| `renderSummaryCallback` overrides summary HTML                | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |

## 10. Custom rendering / callbacks

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `renderDayCallback` (full replacement)                        | ✓      | `callbacks-extra.spec.ts`    | `callbacks-extra.html`    |
| `renderDayContentCallback` (augmentation)                     | ✓      | `callbacks.spec.ts`          | `callbacks.html`          |
| `getMonthHeaderCallback` overrides per-month header           | ✓      | `callbacks.spec.ts`          | `callbacks.html`          |
| `getUnifiedHeaderCallback` overrides unified-mode header text | ✓      | `callbacks-extra.spec.ts`    | `callbacks-extra.html`    |
| `getCustomStylesCallback` injects styles into Shadow DOM      | ✓      | `callbacks-extra.spec.ts`    | `callbacks-extra.html`    |
| `beforeSelectCallback`: accept / `false` / `DateRange[]` (adjust to N ranges, replaces the previous selection) | ✓ | `callbacks.spec.ts`  | `callbacks.html`          |
| `beforeSelectCallback` returning `null` clears                | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| `beforeMonthChangeCallback` returning `false` blocks          | ✓      | `callbacks.spec.ts`          | `callbacks.html`          |
| `getMonthDataCallback` bulk metadata (set after upgrade) + `reloadMonthData()` | ✓ | `context-callbacks.spec.ts` | `context-callbacks.html` |
| `specialDates` + `*Member` property mapping                   | ✓      | `callbacks-extra.spec.ts`    | `callbacks-extra.html`    |
| `getDateMetadataCallback` per-date                            | ✓      | `callbacks.spec.ts`          | `callbacks.html`          |

## 11. Tooltips

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Day-cell tooltip on hover                                     | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| Badge tooltip                                                 | ✓      | `misc-features.spec.ts`      | `misc-features.html`      |
| `getBadgeTooltipCallback` text (overrides / supplies)         | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| Action-button tooltip                                         | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| Tooltips escape `overflow:auto` ancestor (position: fixed)    | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |

## 12. Locale & i18n

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `locale="auto"` detects from browser (de-DE / en-US)          | ✓      | `locale.spec.ts`             | `locale.html`             |
| Explicit `locale="de"` / `"fr"` / etc.                        | ✓      | `locale.spec.ts`             | `locale.html`             |
| `labels` overrides individual UI strings (property + JSON attribute, `{count}`, live update); `locale` only changes Intl names | ✓      | `locale.spec.ts`             | `locale.html`             |
| `monthNames` override (property)                              | ✓      | `locale.spec.ts`             | `locale.html`             |
| `month-names` override (pipe-delimited attribute)             | ✓      | `locale.spec.ts`             | `locale.html`             |
| `weekday-names` override (pipe-delimited, Sunday-indexed)     | ✓      | `locale.spec.ts`             | `locale.html`             |
| `weekday-names` rotates by `week-start-day` (Wednesday-first) | ✓      | `locale.spec.ts`             | `locale.html`             |
| `month-names` / `weekday-names` bad segment count ignored     | ✓      | `locale.spec.ts`             | `locale.html`             |
| `week-start-day="auto"` follows locale (Monday / Sunday)      | ✓      | `locale.spec.ts`             | `locale.html`             |
| Explicit `week-start-day` integer                             | ✓      | `locale.spec.ts`             | `locale.html`             |

## 13. Events & API

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `change` event with full detail                               | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `apply` event                                                 | n/a    | _picker dispatches `change` on apply; no separate event_ |         |
| `cancel` event                                                | n/a    | _no event; pending selection restores prior input value_ |         |
| `action` event fires once per custom button click             | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `selectedDate` / `selectedRanges` setters → input + classes   | ✓      | `api-extras.spec.ts`         | `api-extras.html`         |
| `selectedDates` / `selectedRanges` (multiple) setters survive open (FINDINGS #25, fixed) | ✓ | `api-extras.spec.ts`    | `api-extras.html`         |
| Selection setters refresh the form value (FINDINGS #24, fixed) | ✓ | `api-extras.spec.ts`    | `api-extras.html`         |
| `clearSelection()` clears input, classes, form value          | ✓      | `api-extras.spec.ts`         | `api-extras.html`         |
| `setRollingItemAlignment()` sets the variable                 | ✓      | `api-extras.spec.ts`         | `api-extras.html`         |
| `setRollingItemAlignment()` survives a rebuild (FINDINGS #15, fixed) | ✓ | `api-extras.spec.ts`    | `api-extras.html`         |
| `isOpen` setter opens/closes programmatically                 | ✓      | `events-api.spec.ts`, `triggers.spec.ts` | `events-api.html`, `triggers.html` |
| `updateOptions(partial)` survives without losing selection    | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `showMessage` / `hideMessage`                                 | ✓      | `api-extras.spec.ts`         | `api-extras.html`         |
| raw-HTML `showMessage` + the built-in ✕ (`hide-message`)      | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `value` setter populates input + selection + form value       | ✓      | `events-api.spec.ts`, `api-extras.spec.ts` | `events-api.html`, `api-extras.html` |
| `value` getter right after `setAttribute('value')` (FINDINGS #14, fixed) | ✓ | `api-extras.spec.ts` | `api-extras.html`       |
| `disabled` setter disables input + suppresses open            | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| HTML `data-action="custom" data-id` in `showMessage` → `action` (`source: 'message'`, `dataset`) | ✓ | `context-callbacks.spec.ts` | `context-callbacks.html` |
| Internal controls (nav arrows) do not fire `action`           | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| `onChange` twin receives the detail (same object as `change`) | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| `month-change` event after navigation (`visibleMonths`)       | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |

## 14. Visual states

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Selected day class                                            | ✓      | `selection-modes.spec.ts`    | `selection-modes.html`    |
| Range start / middle / end classes                            | ✓      | `visual-states.spec.ts`      | `visual-states.html`      |
| Today highlight                                               | ✓      | `visual-states.spec.ts`      | `visual-states.html`      |
| Disabled day styling                                          | ✓      | `date-restrictions.spec.ts`  | `date-restrictions.html`  |
| Hover preview during range selection (`--hover-preview`, per `disabled-dates-handling`) | ✓ | `hover-preview.spec.ts` | `hover-preview.html` |
| Drag-preview classes during drag-adjust                       | ✓      | `drag-adjust.spec.ts`        | `drag-adjust.html`        |
| Keyboard-focused day class                                    | ✓      | `keyboard-navigation.spec.ts`| `keyboard-navigation.html`|
| Weekend `--weekend` class + `data-weekday` hook               | ✓      | `visual-states.spec.ts`      | `visual-states.html`      |
| Adjacent-month (faded) days                                   | ✓      | `visual-states.spec.ts`      | `visual-states.html`      |
| Invalid-range error styling (`ctx.markRangeInvalid()`)        | ✓      | `misc-features.spec.ts`      | `misc-features.html`      |

## 15. Sizing & theming

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `input-size` variants (xs, sm, md, lg, xl)                    | ✓      | `sizing-theming.spec.ts`     | `sizing-theming.html`     |
| `spacing` / `font-size` / `cell-size` scale variants          | n/a    | _attributes documented in CLAUDE.md but not implemented (see FINDINGS.md #11)_ |         |
| CSS-variable overrides flow through                           | ✓      | `sizing-theming.spec.ts`     | `sizing-theming.html`     |

## 16. v2.0.0 symmetric feedback API & interaction model

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `showSummary(html)` pins custom summary HTML (--visible)      | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| Summary override survives re-render until selection commits   | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `hideSummary()` / `refreshSummary()` re-derive summary        | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `showLoader()` full-calendar overlay + single-instance guard  | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `showLoader('summary')` / `('message')` in-block spinner      | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| `showLoader(target)` / `hideLoader(target)`                   | ✓      | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| Summary loader added in `change` handler survives commit re-render | ✓ | `imperative-feedback.spec.ts`| `imperative-feedback.html`|
| Action-item render callbacks receive the picker context (`controller`, `element`, presentation) | ✓ | `context-callbacks.spec.ts` | `context-callbacks.html` |
| `onClick` receives the action detail (`action`, `id`, `source`) | ✓    | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| Order: `beforeActionCallback` → `onClick` → built-in → `onAction` → `action` event (one detail) | ✓ | `context-callbacks.spec.ts` | `context-callbacks.html` |
| `beforeActionCallback` returning `false` (async) cancels everything | ✓ | `context-callbacks.spec.ts` | `context-callbacks.html` |
| Each custom button gets its own tooltip                       | ✓      | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| `getTextCallback` / `getClassCallback` / `getTooltipCallback` via ctx | ✓ | `context-callbacks.spec.ts`  | `context-callbacks.html`  |
| `getIsVisibleCallback` / `getIsDisabledCallback` / `getIsToggledCallback` via ctx | ✓ | `context-callbacks.spec.ts` | `context-callbacks.html` |
| Custom items render `data-action="custom"` + `data-id`; string shorthand renders a built-in | ✓ | `context-callbacks.spec.ts` | `context-callbacks.html` |

## 17. Form association

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `el.form` resolves the containing form                        | ✓      | `form-association.spec.ts`   | `form-association.html`   |
| Selection submits the ISO value under `name` (single entry)   | ✓      | `form-association.spec.ts`   | `form-association.html`   |
| Programmatic `value` reflected into the submission            | ✓      | `form-association.spec.ts`   | `form-association.html`   |
| `form.reset()` clears selection + submitted value             | ✓      | `form-association.spec.ts`   | `form-association.html`   |
| `form.reset()` restores the selection parsed from the default `value` attribute (FINDINGS #13) | ✓ | `api-extras.spec.ts`, `form-association.spec.ts` | `api-extras.html`, `form-association.html` |
| `value` attribute = initial selection; `el.value` (assigned twice) never writes the attribute; submit sends current state | ✓ | `form-association.spec.ts` | `form-association.html` |
| Invalid `value` attribute → warning, empty selection, attribute untouched | ✓ | `form-association.spec.ts` | `form-association.html` |
| Inline picker submits via hidden field                        | ✓      | `form-association.spec.ts`   | `form-association.html`   |
| Range → ISO interval; split range → each sub-range            | ✓      | `form-association.spec.ts`   | `form-association.html`   |
| `value-format` json / array; `getValueFormatCallback`         | ✓      | `form-association.spec.ts`   | `form-association.html`   |
| `el.value` = submitted value (string / `string[]` for array); `value-format-mask` + `value-separator` (text / json / array / multiple / datetime), parse back, live change | ✓ | `form-association.spec.ts` | `form-association.html` |

## 18. Lock / readonly

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `lock()` / `unlock()` / `toggleLock()`                        | ✓      | `lock.spec.ts`               | `lock.html`               |
| Aspect locks: selection, actions, navigation (incl. rolling), open | ✓ | `lock.spec.ts`               | `lock.html`               |
| `readonly` attribute = full lock, reflects to `lockedAspects` | ✓      | `lock.spec.ts`               | `lock.html`               |
| `isReadonly = false` removes the `readonly` attribute (reflects) | ✓ | `lock.spec.ts` | `lock.html` |
| Full lock does not block the programmatic API                 | ✓      | `lock.spec.ts`               | `lock.html`               |

## 19. Device-adaptive presentation & mobile

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Desktop: `mobile-presentation="auto"` → floating; forced `fullscreen` applies | ✓ | `mobile-presentation-desktop.spec.ts` | `mobile-presentation.html` |
| Phone: auto → full-screen sheet, ✕ close, header merge, `show-fullscreen-input`, keyboard-off, `fullscreen-autofocus` | ✓ | `mobile-presentation-phone.spec.ts` | `mobile-presentation.html` |
| Tablet: auto → modal; tap opens and stays open (ghost click)  | ✓      | `mobile-presentation-tablet.spec.ts` | `mobile-presentation.html` |
| Back gesture closes modal / full-screen without navigating    | ✓      | `back-gesture.spec.ts`       | `mobile-presentation.html` |
| Adaptive action set: rich on desktop, essentials on phone     | ✓      | `adaptive-actions.spec.ts`, `adaptive-actions-phone.spec.ts` | `adaptive-actions.html` |
| Container-width compaction (2 → 1 month, hides Today/Clear) keeps the range | ✓ | `responsive-compact.spec.ts` | `responsive-compact.html` |

## 20. Theme signals, dark mode & icon tokens

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Page dark signals flip a picker; per-instance `data-theme` wins; `theme-source="closest"` | ✓ | `theme-signals.spec.ts` | `dark-mode.html` |
| Hover / selected day readable on dark pages                   | ✓      | `dark-mode.spec.ts`          | `dark-mode.html`          |
| `--drp-rem` / icon / shadow / easing tokens chain to `--base-*` | ✓    | `icon-theming.spec.ts`       | `icon-theming.html`       |

## 21. Overlay coordination

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Opening a second picker closes the first                      | ✓      | `single-active.spec.ts`      | `single-active.html`      |
| External `km-overlay-activate` closes an open picker         | ✓      | `single-active.spec.ts`      | `single-active.html`      |
| `overlay-group`: different groups coexist, same group dismisses, ungrouped independent | ✓ | `single-active.spec.ts` | `single-active.html` |

## 22. Time picker

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `picker-mode="time"`: rolls; pick + Apply commits `selectedTime` + input | ✓ | `time-picker.spec.ts` | `time-picker.html` |
| `picker-mode="datetime"`: grid + rolls, commits `selectedDatetime`; ISO setter splits | ✓ | `time-picker.spec.ts` | `time-picker.html` |
| `selectedTime` setter renders rolls + input                   | ✓      | `time-picker.spec.ts`        | `time-picker.html`        |
| `time-display` clock / wheel / compact each commit            | ✓      | `time-picker.spec.ts`        | `time-picker.html`        |
| Apply fires `change` (FINDINGS #17, fixed)                    | ✓      | `time-picker.spec.ts`   | `time-picker.html`        |
| Runtime `time-display` switch renders the new UI (FINDINGS #18, fixed) | ✓ | `time-picker.spec.ts` | `time-picker.html`        |
| `placeholder-time-format-mask` hint in time mode; fallback to `time-format-mask`; datetime = date + ' ' + time hint; follows runtime changes (FINDINGS #19, fixed) | ✓ | `time-picker.spec.ts` | `time-picker.html` |
| `hour-cycle` h12 (1-12 + AM/PM, formats `hh:mm a`); derived from the mask | ✓ | `time-options.spec.ts` | `time-options.html` |
| Runtime `hour-cycle` switch keeps the time (FINDINGS #21, fixed) | ✓ | `time-options.spec.ts`  | `time-options.html`       |
| `time-step` (declared + runtime)                              | ✓      | `time-options.spec.ts`       | `time-options.html`       |
| `show-seconds` (declared + runtime toggle)                | ✓      | `time-options.spec.ts`       | `time-options.html`       |
| `show-now-button`: Now commits the pinned now; hidden (declared + runtime) | ✓ | `time-options.spec.ts` | `time-options.html` |
| Runtime `time-format-mask` change incl. derived hour cycle (FINDINGS #20, fixed) | ✓ | `time-options.spec.ts`  | `time-options.html`       |
| Phone full-screen sheet: time / datetime / wheel commit via Apply; ✕ discards | ✓ | `mobile-time.spec.ts` | `mobile-time-e2e.html` |

## 23. Lifecycle

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `open` / `close` events + `onOpen` / `onClose` fire once per transition; no `select` event | ✓ | `events-api.spec.ts` | `events-api.html` |
| `<fieldset disabled>` disables the input (core `isEffectivelyDisabled`); the fieldset never writes `isDisabled` | ✓ | `events-api.spec.ts` | `events-api.html` |
| `disabled` attribute → `isDisabled = false` re-enables (reflects); fieldset toggle while own attribute set | ✓ | `events-api.spec.ts` | `events-api.html` |
| `labels.fullscreenTitle` heading + `labels.close` ✕ ARIA label | ✓ | `mobile-presentation-phone.spec.ts` | `mobile-presentation.html` |
| `defer` holds the build; attribute removal / core `release()` builds once; `ready` never re-fires (reinit, reconnect); `ready` attribute / `isReady` / `whenReady()` / `:state(ready)`; `destroy()` tears down + inert | ✓ | `defer-ready.spec.ts` | `defer-ready.html` |
| DOM move keeps input value, form value, a half-picked range; no second `ready` | ✓ | `lifecycle.spec.ts` | `lifecycle.html` |
| DOM move keeps the committed selection state + open state (D1, FINDINGS #16, fixed) | ✓ | `lifecycle.spec.ts` | `lifecycle.html` |
| DOM move / removal pauses document listeners; re-insert re-activates (outside click) | ✓ | `lifecycle.spec.ts` | `lifecycle.html` |

## 24. Misc: transitions, logging, RTL

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `enable-transition`: class on the calendar; runtime toggle reflects | ✓ | `misc-features.spec.ts` | `misc-features.html` |
| `/logging` `DRP:*` loggers at `warn` by default (no debug lines; warnings visible) | ✓ | `logging.spec.ts` | `logging.html` |
| `window.components['web-daterangepicker'].logging` turns debug on / back to `warn` | ✓ | `logging.spec.ts` | `logging.html` |
| `el.enableLogging()` / `disableLogging()` per instance (core) | ✓ | `logging.spec.ts` | `logging.html` |
| Removed `show-debug-info` attribute has no effect | ✓ | `logging.spec.ts` | `logging.html` |
| Building a picker doesn't override `window.components.logging` | ✓ | `logging.spec.ts` | `logging.html` |
| RTL: header + grid mirror (prev on the right)                 | ✓      | `rtl.spec.ts`                | `rtl.html`                |
| RTL: chevrons point outward, ArrowLeft = next day (FINDINGS #28, fixed) | ✓ | `rtl.spec.ts`        | `rtl.html`                |
| RTL: Ctrl+ArrowLeft/Right = next/previous month; runtime `dir` flip on the element | ✓ | `rtl.spec.ts` | `rtl.html` |
| Wheel commit logs via `console.log` (FINDINGS #23, fixed — removed) | ✓ | _no test (console noise)_ |              |

## Not covered (by design)

| Feature                                                       | Status | Note |
| ------------------------------------------------------------- | :----: | ---- |
| Unit layer (parsing / format masks / range math)              | ✗      | optional separate WP (vitest + `test/unit/`) — not started |
