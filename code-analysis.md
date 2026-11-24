# Code Analysis: web-daterangepicker

Snapshot from the working tree on `main` at v1.10.1. Same kind of pass we did for `../web-multiselect` (see that repo's `code-analysis.md`): bugs first, then deduplication, then the architectural shape questions, then CSS and docs. Findings are ordered by impact, not by file.

Total source: ~9.4k lines (TS: 7.6k, CSS: 1.8k). The TS is split across 14 files (`date-picker.ts` is the core class at 1812 lines; the rest are extracted modules — `-rendering`, `-navigation`, `-interaction`, `-selection`, `-ui`, `-validation`, `-locales` — plus `web-component.ts` at 874 and a small `modules/` subtree).

---

## Status (Phase 4 — attribute pipeline + `updateOptions`)

**Done:**
- ✅ §3 / §4 — Single `ATTRIBUTE_TABLE` in `web-component.ts` is now the source of truth for 29 picker-affecting attributes. Each entry maps `{ attr, key, parser }`. Drives `observedAttributes`, the initial parse in `initializePicker`, and live updates via `attributeChangedCallback`. Eliminates the hand-coded ~70-line attribute → option block.
- ✅ §3.1 / bug 1.7 — New `picker.updateOptions(partial)` on `DateRangePicker`. Merges into `this.options`, refreshes derived state (locale strings, format info, normalized min/max/disabled/special date sets, debug-logging toggle), and re-renders. Returns `true` on success, `false` for genuinely structural changes (positioningMode, selectionMode, visibleMonthsCount, monthLayout, gridRows, gridColumns, unifiedNavigation, unifiedNavigationAnchorIndex, calendarOpenTrigger). Caller falls back to full reinit on `false`.
- ✅ `attributeChangedCallback` now goes through the table → `updateOptions` instead of always doing `destroy() + initializePicker()`. Toggling `min-date`, `locale`, `disabled-dates-handling`, `show-today-button`, etc. no longer wipes the calendar / popover / drag / focus state.
- ✅ §3.3 / bug 1.7 — All 21 callback / data / member setters (e.g. `getDateMetadataCallback`, `renderDayCallback`, `actionButtons`, `specialDates`, `dateMember`) now route through `updatePicker(partial)` instead of `reinitialize()`. The full destroy + rebuild path is reserved for `customStylesCallback` (which injects a `<style>` tag into shadow DOM during init) and the structural attribute carve-out.
- ✅ Bonus: `initializeDateRestrictions` is now idempotent — clears `normalizedDisabledDates` / `normalizedSpecialDates` before rebuilding so removed entries actually vanish, and recomputes `normalizedMinDate`/`normalizedMaxDate` rather than leaving stale values.
- ✅ Bonus: `examples-javascript-instantiation.html` referenced the never-existed `src/scss/main.scss` in two places. Fixed to `src/css/main.css`. Pre-existing drift from the SCSS→CSS migration; surfaced when Vite tried to pre-transform the example.
- ✅ Build clean. Dev server starts cleanly. No public API surface broken; new public API: `picker.updateOptions(partial)` and `Tooltip` class.

**Verification:**
- A small `verify-phase4.html` page in the repo root exercises the change-and-check pattern: locale change, min-date change, formatSummaryCallback set, disabledDates set, show-today-button toggle (all should preserve selection), plus visible-months-count toggle (structural — selection clears, picker instance is replaced). Open the page in the dev server (`make dev` then `/verify-phase4.html`) and check the inline report.
- Code-path analysis confirms `updateOptions` only mutates `this.options` and the derived normalized state plus calls `renderCalendar()`. The picker instance is the same object before and after, so `selectedDate` / `selectedStartDate` / `selectedEndDate` / `selectedDates` / `selectedRanges` / `pendingSelection` / `focusedDayIndex` / drag state all survive.

**Honest line-count impact for Phase 4:**

This phase **adds** lines net (~+200 LOC across the affected files) — the architectural win is the point, not LOC. What grew:
- `web-component.ts`: ~130 lines added (ATTRIBUTE_TABLE + parsers + `applyOptionUpdate` helper) offset by ~80 lines removed (hand-coded attribute parsing, 21 setters' destroy+init bodies).
- `date-picker.ts`: ~80 lines added (`updateOptions` method) + a more disciplined `initializeDateRestrictions` (clears before rebuild).
- `tooltip.ts`: new file, 110 lines (Phase 3, extracted from date-picker.ts).

Setter boilerplate (20 of the 21 setters) is now 2 lines: assign private field, call `applyOptionUpdate(key, value)`. A Proxy-based meta-pattern could collapse them further but isn't worth the runtime indirection here.

**Cumulative across Phase 1 + 2 + 3 + 4:**
- TS lines: 7,550 → 7,640 net (+90 with new infrastructure layered in; gross deletion was ~250 lines)
- UMD bundle: 173.72 kB → 174.30 kB (essentially flat — Phase 4's additions roughly balance Phase 2's deletions)
- Public API: **unchanged** for existing surface; **added**: `picker.updateOptions(partial)`, `Tooltip` class, `--drp-day-invalid-range-bg`, `--drp-day-invalid-range-color`

**Behavioral changes worth knowing:**
- **Attribute changes no longer destroy the picker.** Reactive frameworks toggling `min-date` or `locale` per render no longer lose user selection. The exception list (carve-out for genuinely structural changes) is documented above.
- **Callback assignment from JS no longer rebuilds.** Setting `el.getDateMetadataCallback = fn` updates in place.
- **`disabled` toggling no longer rebuilds** (Phase 1 fix), and now neither does any other non-structural attribute (Phase 4).
- **`initializeDateRestrictions` clears before rebuilding** — if you call `updateOptions({ disabledDates: undefined })` to remove restrictions, they actually go away.

---

## Status (Phase 3 — Tooltip class)

**Done:**
- ✅ §2.7 — Three methods in `date-picker.ts` (`createActionButtonTooltip`, `positionActionButtonTooltip`, `destroyAllActionButtonTooltips`) plus their two state maps (`actionButtonTooltips`, `actionButtonTooltipCleanups`) collapsed into a single `actionButtonTooltipInstances: Tooltip[]` field. `attachActionButtonTooltips` is now ~25 lines instead of ~75.
- ✅ New `src/tooltip.ts` (110 lines) — self-contained `Tooltip` class. Each instance owns its DOM element, hover-delay timers (clear on enter/leave so a fast leave-then-enter doesn't double-fire), Floating UI autoUpdate cleanup, and event listener bookkeeping. `destroy()` releases everything.
- ✅ Replaced the dynamic `import('@floating-ui/dom')` inside the position function with a static import in `tooltip.ts`. Vite's "dynamic and static import" warning is gone from the build output.
- ✅ The shared day/badge tooltip (in `date-picker-ui.ts`'s `showTooltip`/`hideTooltip` plus `date-picker.ts`'s capture-phase listeners) is **kept as-is** — it was already clean (one shared element, repositioned per show), and its semantics (no hover delay; arrow positioning) differ enough from the action-button case that sharing wouldn't help.

**Note:** The §2.7 framing in the original analysis suggested THREE tooltip implementations to consolidate. Once the code was read closely, the actual landscape was simpler: one shared day/badge system (already clean) + one per-button action-button system (the messy one). Phase 3 addressed only the latter.

---

## Status (Phase 2 — internal dedup + CSS theming hooks)

**Done:**
- ✅ §2.1 — `moveFocusToDate(picker, target)` helper. Two ~40-line "find column → find day → set focused" blocks in `selectDay` collapsed into single calls.
- ✅ §2.2 — `prevMonth` / `nextMonth` collapsed into one `changeMonth(picker, monthIndex, offset)`. The public exports remain (for source compatibility); they're thin arrow-function wrappers around the unified implementation.
- ✅ §2.3 — Rolling-selector list rendering: four near-identical blocks (years/months × per-column/unified) → `renderRollingItems` + `renderRollingLists`. HTML output byte-for-byte identical.
- ✅ §2.4 — `commitInputValue(picker, value)` helper for the `if (picker.input && !picker.requiresApplyButton())` gate. Five sites in selection.ts + one in interaction.ts now one-liners. `formatInputValue(picker)` extracted from `apply()`'s mode-dispatch.
- ✅ §2.5 — `commitSelection(picker)` extracted (three sites). Small but cleanly extensible — single seat for future debounced events / bulk-op callbacks.
- ✅ §6.6-style CSS — wired the four per-component `*-border-color` hooks through their `*-border` shorthands (`nav`, `rolling`, `summary`, `button`). Defaults unchanged; overrides now actually do something.
- ✅ §6.5 — Replaced hardcoded `color: white` for invalid-range with `--drp-day-invalid-range-bg` / `--drp-day-invalid-range-color` variables defaulting to the previous values.
- ✅ Build clean throughout. Type-check clean. Dev server starts cleanly; all five tested example pages return 200 with no transform errors.

**Cumulative across Phase 1 + 2:**
- `date-picker-selection.ts`: 520 → 499 (−21, including +52 new helpers)
- `date-picker-navigation.ts`: 921 → 894 (−27)
- `date-picker-rendering.ts`: 951 → 934 (−17)
- `date-picker-interaction.ts`: 864 → 856 (−8)
- TS net across the four files: **−73 lines** with ~125 lines of gross dedup offset by helpers
- UMD bundle: 173.72 kB → 172.02 kB (**−1.7 kB**, ~1% smaller)

**Behavior:** unchanged. No public API changes. The `prevMonth` / `nextMonth` exports continue to work the same way (now arrow-function delegations to `changeMonth`).

**Not started (deferred to later phases):**
- §2.6 — Mask single-vs-range refactor. Lowest leverage in §2 (~15 lines). Defer to Phase 3 if it lands alongside the Tooltip-class consolidation.
- §2.7 — Tooltip class consolidation. Phase 3.
- §1.7 + §3 + §3.1 — Attribute pipeline rewrite + `picker.updateOptions(partial)`. Phase 4.
- §6.4 — Scrollbar pattern duplicated 2× in `_header-navigation.css`. Cosmetic, defer.
- §8 — Dead-export audit on `types.ts` / `index.ts`. Defer.

---

## Status (Phase 1 — bug fixes, cleanup, doc updates)

**Done:**
- ✅ §1.1 — Action-button tooltip IDs are now stable (`action-{index}` keyed off the render slot, stamped on `data-tooltip-id`). Replaces the `Date.now()-Math.random()` churn.
- ✅ **Bonus** — discovered while fixing §1.1: `attachActionButtonTooltips` queried `.drp-date-picker__action`, which **never matched** the rendered buttons (they use `.drp-date-picker__button`). All action-button tooltips were silently dead. Fixed the selector. Same flavor as multiselect's 1.3 but worse — affected every action button, not just custom ones.
- ✅ §1.2 — Deleted 7 stray `console.log` calls (drag-end ×3, `showMessage` ×2, click handler ×1, web-component `showMessage` ×1). The one diagnostic worth keeping (`messageElement is null/undefined`) is now `uiLogger.warn`.
- ✅ §1.3 — Removed the `setTimeout` + `getComputedStyle` block in `show()`. It forced a layout flush on every open just to log the result.
- ✅ §1.4 — `disabled` added to the attributeChangedCallback exclusion list. The surgical handler immediately below already updates `inputElement.disabled`.
- ✅ §1.5 — Added `SECURITY:` JSDoc notes on `renderDayCallback`, `renderDayContentCallback`, `formatSummaryCallback`, `getUnifiedHeaderCallback` — making the HTML-trusted contract explicit. No code change to the splicing itself; that's a Phase 4 question once we know how strict the API needs to be.
- ✅ §1.6 — Verified the `||` at `selection.ts:147` is correct (consumers fall back per-field via `adjustedStart || originalStart`). Added a comment locking in the intent. Original agent claim was wrong.
- ✅ §7 — Rewrote `CLAUDE.md` Architecture section to describe the actual TS module split. Removed `src/js/`, `src/scss/`, `[data-date-picker]` auto-init, and Sass references. The Component Features / Size System / Build System sections were already accurate and left in place.
- ✅ Build clean throughout. UMD bundle: 173.72 kB (essentially unchanged — Phase 1 is mostly deletions of small inline strings).

**Not started (deferred to later phases):**
- §2 — Internal dedup (focus-update loop, prevMonth/nextMonth, rolling-selector render, input-commit pattern). Phase 2.
- §2.7 + §1.1's deeper fix — single `Tooltip` class consolidating action-button and day/badge tooltips. Phase 3.
- §1.7 + §3 + §3.1 — Attribute pipeline rewrite + `picker.updateOptions(partial)` so changing attributes / callbacks doesn't lose selection. Phase 4 — biggest leverage, biggest risk.
- §6 CSS cleanup — wire the unwired per-component `*-border-color` hooks; consolidate scrollbar duplicate; replace hardcoded `white` at `_calendar-grid.css:220`.
- §8 — Dead-export audit on `types.ts` / `index.ts`.

---

## 1. Bugs (concrete defects, fix first)

### 1.1 Action-button tooltip IDs are unstable across renders — ✅ FIXED + bonus selector bug
`src/date-picker.ts:616`:
```ts
const uniqueId = `action-${action}-${Date.now()}-${Math.random()}`;
this.createActionButtonTooltip(buttonElement, tooltipText, uniqueId);
```

Verified the maps are cleared via `destroyAllActionButtonTooltips()` before each re-attach (line 483), so this isn't an unbounded leak — but the unstable IDs still create race risk if a `hideTooltip` setTimeout fires between renders.

**Resolution:** Switched to `action-{index}` keyed off the render slot, stamped onto `data-tooltip-id` so future re-renders can replace-in-place rather than destroy-rebuild.

**Bonus fix discovered while fixing this:** the selector `.drp-date-picker__action` at line 592 **never matched any rendered button** — buttons render with class `.drp-date-picker__button`. So `attachActionButtonTooltips` was a no-op for everyone. Action-button tooltips never appeared in production at all. Same flavor as multiselect's 1.3 but worse — affected every action button, not just custom ones. Fixed the selector to `.drp-date-picker__button`.

### 1.2 `console.log` left in seven production hot paths — ✅ FIXED
`grep` finds `console.log` (not the namespaced logger) at:
- `src/date-picker-interaction.ts:281, 299, 302` — fires on **every drag-end** with multi-line dumps of preview start/end and validation results
- `src/date-picker-ui.ts:247, 250` — `showMessage()` logs every message and a "messageElement is null/undefined!" diagnostic
- `src/date-picker.ts:1021` — fires on every click in the calendar (dumps tag, class, dataset.action)
- `src/web-component.ts:457` — fires on every `showMessage` call from the host page

These bypass the `loglevel` infrastructure entirely, so they can't be silenced via `setLevel()`. Pure leftover debug noise. **Resolution:** all 7 deleted. The `messageElement is null/undefined` diagnostic was converted to `uiLogger.warn`.

### 1.3 `setTimeout` runs `getComputedStyle` on every `show()` purely to log it — ✅ FIXED
`src/date-picker-ui.ts:54-57`:
```ts
setTimeout(() => {
    const computedStyle = window.getComputedStyle(picker.calendar);
    uiLogger.debug('show() - computed styles - display:', ..., 'position:', ..., 'left:', ..., 'top:', ..., 'z-index:', ...);
}, 100);
```
`getComputedStyle` forces a layout flush. The result is only ever passed to `uiLogger.debug` — when debug is disabled, the work runs anyway because the function call evaluates its arguments before `loglevel` decides to drop the message. Same flavor as the per-frame `getComputedStyle` we removed from multiselect. **Resolution:** deleted.

### 1.4 `disabled` attribute triggers full picker rebuild — ✅ FIXED
`src/web-component.ts:117-120`:
```ts
if (this.picker && name !== 'value' && name !== 'placeholder') {
    this.picker.destroy();
    this.initializePicker();
}
```
`disabled` is **not** in the exclusion list, so changing it tears down the entire picker — and then the surgical handler at line 133-139 sets `inputElement.disabled` on the (still-existing) input. The picker rebuild is wasted work and loses calendar state. **Resolution:** added `name !== 'disabled'` to the exclusion list. The surgical handler below now runs alone.

### 1.5 Unsafe HTML interpolation when `renderDayCallback` / `renderDayContentCallback` returns a string — ✅ DOCUMENTED (escape behavior deferred)
`src/date-picker-rendering.ts:608` and `:627`:
```ts
slot.innerHTML = result;        // renderDayCallback string branch
slot.innerHTML += result;       // renderDayContentCallback string branch
```
Same pattern at `src/date-picker-rendering.ts:818`:
```ts
summary.innerHTML = picker.options.formatSummaryCallback(callbackData);
```
Three callback-string-into-innerHTML sites. The component contract is "callbacks return HTML-trusted strings" — but that contract isn't documented anywhere, and the default rendering paths next to these *do* escape (they use `textContent` or known-safe template strings). **Resolution (Phase 1):** added `SECURITY:` JSDoc notes on `renderDayCallback`, `renderDayContentCallback`, `formatSummaryCallback`, and `getUnifiedHeaderCallback` in `types.ts` so the contract is explicit. The deeper API question (accept `HTMLElement` only? escape by default with an explicit `{ trustedHTML }` opt-in?) is deferred — picking one route is breaking, and Phase 4's `updateOptions` work is a more natural moment to revisit the public-API shape.

### 1.6 `validateRangeAsync` returns a half-adjusted result with `||` — ✅ VERIFIED CORRECT
`src/date-picker-selection.ts:147`:
```ts
if (callbackResult.adjustedStart || callbackResult.adjustedEnd) {
    return {
        isValid: true,
        adjustedStart: callbackResult.adjustedStart,
        adjustedEnd: callbackResult.adjustedEnd,
        message: callbackResult.message
    };
}
```
If a `beforeDateSelectCallback` returns `{ isValid: true, adjustedStart: someDate }` without `adjustedEnd`, this branch fires and returns `adjustedEnd: undefined`. Whether that's a bug depends on what callers do with the partial — needs a quick audit of the consumer in `selectDay`. If consumer treats `undefined` as "no adjustment for that side", `||` is fine; if it treats `undefined` as "invalid", `&&` is what's intended. Worth a deliberate decision and a code comment either way.

**Resolution:** Audited both consumers (`selectDay` at lines 317-318, `onDragEnd` at lines 320-321). Both fall back per-field via `validation.adjustedStart || originalStart`. So `||` at line 147 is **correct** — partial adjustment is meaningful: "adjust just one side, leave the other alone." Added a comment locking in the intent.

### 1.7 `attributeChangedCallback` rebuilds the picker on most attribute changes — selection is lost — ✅ FIXED (Phase 4)
Same architectural issue multiselect had (bug 1.7 in that repo). For everything except `value`, `placeholder`, `enable-transitions`, `input-size`, `disabled` (and `disabled` shouldn't be in the rebuild path either — see 1.4), changing an attribute calls `destroy() + initializePicker()`. The constructor at `src/date-picker.ts:274-278` resets `selectedDate`, `selectedStartDate`, `selectedEndDate`, `selectedRanges`, `selectedDates`, `pendingSelection` to null/empty — so any reactive framework toggling `min-date` / `locale` / `month-layout` / etc. silently wipes the user's selection.

The 10 callback / member setters at lines 612-826 do the same destroy+rebuild **immediately** on assignment (no batching). The 11 callback setters at lines 637-728 use `scheduleReinit()` (microtask-batched), which is better but still loses state.

Fix is the same shape as multiselect's Phase 4: a `picker.updateOptions(partial)` API that surgically applies live changes (re-render the calendar, refresh the format parser, update locale strings, re-bind the validation callback) without nuking selection/scroll/focus. Highest leverage, highest risk.

---

## 2. Duplication — the dedup targets

The TS is already split across modules, which is good — but the splits are by *concern* (rendering / navigation / selection / interaction), not by *operation*, so the same operation is implemented twice in different files. Several worth collapsing:

### 2.1 Focus-update loop after a date change — twice in selection.ts (~60 lines) — ✅ DONE
`src/date-picker-selection.ts:354-395` (single mode) and `:397-430` (range mode). Both blocks: walk `picker.monthDates`, find the column whose year+month matches the target date, query the `data-month-index` slot, find the day element with the matching `data-date`, set `picker.activeMonthIndex` + `picker.focusedDayIndex`, toggle `--focused` class on the right cell. 85% identical; only the target date object differs (`singleModeAdjustedDate` vs `picker.selectedEndDate`).

**Helper:**
```ts
function moveFocusToDate(picker, target: Date): boolean { ... }
```

### 2.2 `prevMonth` / `nextMonth` — mirror image (~50 lines) — ✅ DONE
`src/date-picker-navigation.ts:490-528` and `:530-568`. Same shape: hide rolling selector, compute new date (±1 month), check enabled days, fire `beforeMonthChangedCallback`, update state, run collision-with-neighbor check, render. Differ only in offset direction and which neighbor to compare against.

**Helper:** `changeMonth(picker, monthIndex, offset: -1 | 1)`. Saves ~50 lines and makes the collision logic harder to drift between the two.

### 2.3 Rolling selector list rendering — years vs months (~50 lines) — ✅ DONE
`src/date-picker-rendering.ts:658-672` (years) and `:674-690` (months). Same loop shape: build HTML, mark current item selected, mark items with no enabled days disabled, set innerHTML. Different only in: which iterable, which class names, which "current" reference.

**Helper:** `renderRollingList({ items, current, getLabel, isEnabled, classPrefix })`.

### 2.4 Input-value commit pattern — four sites (~40 lines) — ✅ DONE
`src/date-picker-selection.ts:212-217, 275-278, 329-334, 489-497`. Each of selectDay's three branches (single, range-start, range-end) and `apply()` re-reads `if (picker.input && !picker.requiresApplyButton())` and writes `picker.input.value = picker.formatDate(...)`. Three of them additionally branch on selection mode. **Helper:** `commitInputValue(picker, formatted)` — and pull the format-by-mode logic up so `apply()` shares it.

### 2.5 Render-commit triple — `renderCalendar(); updateSummary();` (low value, ~15 lines) — ✅ DONE
Repeated three times in `selection.ts` (selectDay, selectToday, clearSelection). Small but easy. A `commitSelection(picker)` helper centralizes it and gives a single hook for adding (e.g.) a debounced `change` event later. (This is also the natural seat for the per-item callbacks if those ever need to fire on bulk operations — c.f. multiselect's §2.7.)

### 2.6 Mask application: single vs range (~15 lines)
`src/date-picker-interaction.ts:546-580` and `:582-615`. `computeMaskedRangeValue` calls `computeMaskedValue` twice and concatenates with " to ". Functional but tightly coupled. A single `computeMaskedValue(value, { isRange })` would inline the separator logic. Lowest leverage in this list.

### 2.7 Tooltip implementations — ✅ DONE (Phase 3, scoped down)
The codebase has at least the action-button tooltip path (`createActionButtonTooltip` in `date-picker.ts`) and tooltip rendering tied to `dayTooltipCallback` / `badgeTooltipCallback` (in `date-picker-rendering.ts`). They share the same scaffolding — Floating UI position, hover-delay timers, cleanup map keyed by ID — but are written separately. Same dedup opportunity multiselect had (its §2.5). Worth extracting to a single `Tooltip` class once 1.1 is fixed; the leak fix and the consolidation should land together.

---

**Total addressable from §2:** ~230 lines if everything is collapsed. Lower than multiselect's §2 yield (~600 lines), because this codebase is already split across modules and several would-be duplications don't exist (e.g., no virtual-scroll-vs-normal split; no normal-vs-popover badge render).

---

## 3. `web-component.ts` boilerplate

The file is 874 lines. The first 307 lines do the real work (lifecycle + attribute parsing). Lines 367-869 are getter/setter pairs — about **35 pairs across ~500 lines**. Three groups:

1. **9 attribute setters** (lines 499-602). Each just calls `setAttribute(...)`; the real reaction happens in `attributeChangedCallback`. These are fine — boilerplate but harmless, and TS doesn't have a great way to compress them without runtime `defineProperty`.

2. **11 callback setters** (lines 631-728). Each assigns a private `_field` and calls `scheduleReinit()` — microtask-batched full destroy + rebuild. This is the same problem multiselect had: callback assignment from a reactive framework destroys selection state. **Fix:** route through `picker.updateOptions({ getDateMetadataCallback: fn })` instead. Microtask batching is a partial mitigation — multiselect had no batching at all — but a partial-update path eliminates the rebuild entirely.

3. **10 complex setters** (lines 609-826: `specialDates`, `disabledDates`, 7 member-mapping properties, `actionButtons`). These call `destroy()` + `initializePicker()` **immediately** on assignment, with no batching. Setting `dateMember` and `badgeTextMember` in two consecutive lines triggers two full rebuilds. **Fix:** at minimum, route through `scheduleReinit()` to match group 2; ideally, route through `updateOptions(partial)` for a real surgical update.

### 3.1 Hand-coded attribute → option mapping (~70 lines)
`initializePicker()` at lines 185-276 hand-maps 33 attributes to `DatePickerOptions` fields. Mix of patterns: plain string, typed enum cast, parseInt, boolean from `hasAttribute`, tri-state from `hasAttribute ? getAttribute === 'true' : undefined`, comma-split-and-filter for `disabledWeekdays`. Same anti-pattern as multiselect — replace with a single `ATTRIBUTE_TABLE` of `{ attr, key, parser, default? }` driving both `observedAttributes` and the parse step. Saves ~50 lines and removes the drift risk.

### 3.2 `observedAttributes` vs init drift — clean
Cross-checked: every attribute read in `initializePicker()` is in `observedAttributes`, and vice versa. None silently dead. (Multiselect had three.)

### 3.3 Five attributes use surgical updates already — keep as-is
`enable-transitions`, `input-size`, `value`, `placeholder`, `disabled` (modulo bug 1.4). Good model for what the rest should look like once `updateOptions` exists.

---

## 4. Two parallel attribute parsers — **does not apply here**

Unlike multiselect, the core class (`date-picker.ts` constructor, lines 123-181) does **not** read `element.dataset.*` — it consumes only the `options` argument. There's only one parser layer (`web-component.ts`). Defaults live in two places (the `initializePicker` parse step and the constructor's defaulting block at lines 126-181), but both default *the same options object*, not two independent attribute parsers. Less risk of drift, less to refactor.

The constructor-level defaults block is still ~55 lines of `options.x || default` mostly mechanical work and could be collapsed with a `withDefaults(options)` helper plus a `DEFAULT_OPTIONS` constant — minor cleanup, low priority.

---

## 5. Noisy debug logging

Listed in §1.2 (the seven `console.log` sites) and §1.3 (the `getComputedStyle` log). Beyond those: the `loglevel`-based `drpLogger.debug` / `uiLogger.debug` / `dragLogger.debug` calls are correctly gated and fine to leave — that's the proper logging path, and gating works as long as arguments are cheap to compute (no `getComputedStyle` or JSON.stringify in argument position). Worth one sweep through the `log.debug` calls to confirm none of them computes work in argument position; otherwise they're acting like 1.3 in disguise.

---

## 6. CSS findings

Audit of `src/css/_variables.css` (376 lines, prefix `--drp-*`) and the 10 partials. Much cleaner than multiselect's CSS was.

### 6.1 Unused variables — 16, mostly intentional theming surface
Declared but never `var()`-referenced anywhere:

| Variable | Category | Recommendation |
|---|---|---|
| `--drp-font-size-xl`, `--drp-font-size-2xl` | Typography scale | Keep — design token |
| `--drp-line-height-tight`, `--drp-line-height-relaxed` | Typography scale | Keep — design token |
| `--drp-spacing-xl` | Spacing scale | Keep — design token |
| `--drp-badge-font-size` | Theming hook | Wire into `.drp-date-picker__badge-cell` rules or remove |
| `--drp-button-border-color` | Theming hook | Wire or remove — this should be the override point for button borders |
| `--drp-input-padding-h` | Naming mismatch | Rules use `--drp-input-size-*-padding-h` — likely obsolete after the size-system refactor |
| `--drp-nav-border-color` | Naming mismatch | Wired through `--drp-nav-border` shorthand only — same pattern as multiselect's §6.6, wire it as a sub-component |
| `--drp-rolling-border-color`, `--drp-summary-border-color` | Naming mismatch | Same — sub-component override hooks not wired |
| `--drp-opacity-hover` | Possibly dead | Audit usage; if no `:hover` rule wants it, delete |
| `--drp-font-family` | Used via `:host` only | Confirm fallback chain works as intended |

**Status:** ✅ The four obvious per-component border hooks wired in Phase 2 — `--drp-nav-border`, `--drp-rolling-border`, `--drp-summary-border`, `--drp-button-border` are now built from `var(--drp-border-width-base) solid var(--drp-{section}-border-color)` instead of `var(--drp-border)` directly. Defaults preserved; `--drp-{section}-border-color` overrides now actually work.

**Remaining:** keep typography/spacing tokens. Delete or wire `--drp-input-padding-h` and `--drp-opacity-hover` after deciding case-by-case (deferred).

### 6.2 Duplicate variable declarations — none
Clean — multiselect had 8.

### 6.3 Self-references — none
Clean — multiselect had 1.

### 6.4 Repeated rule blocks
Scrollbar pattern appears **twice** in `_header-navigation.css` (lines 141-156 and 278-292 — base rolling list and unified rolling list). Two near-identical blocks, ~15 lines each. Either consolidate via a shared selector or accept as intentional separation. Lower-priority than multiselect's three-way scrollbar dup.

### 6.5 Hardcoded colors — ✅ FIXED
`_calendar-grid.css:220` had `color: white;` for `.drp-date-picker__day--invalid-range-start/end`. Replaced with two new variables — `--drp-day-invalid-range-bg` (defaulting to `--drp-message-error-border`, the previous background) and `--drp-day-invalid-range-color` (defaulting to `--drp-text-color-on-accent` = `#ffffff`, the previous text color). Defaults visually identical; theming surface added.

### 6.6 Class-name drift — clean
All classes toggled in TS (`classList.add/remove/toggle`) have matching CSS rules. No orphans either direction.

---

## 7. Documentation drift (`CLAUDE.md`) — major

`CLAUDE.md` describes a different codebase. Same problem multiselect had after the SCSS→CSS migration; here the drift is bigger because the JS→TS rewrite happened too.

- **Source structure**: CLAUDE.md says `src/js/date-picker.js (1711 lines)` and `src/scss/_date-picker.scss (476 lines)`. Actual: `src/date-picker.ts` (1812 lines), no `src/js/` directory, no `.scss` files anywhere (`Glob '**/*.scss'` returns nothing).
- **Architecture description**: every line-number reference (e.g., "Initialization (lines 32-107)", "Calendar Rendering (lines 431-593)", "Floating UI Integration (lines 418-429)") is from the old monolithic file. The code is now split across 7 modules (`-rendering`, `-navigation`, `-interaction`, `-selection`, `-ui`, `-validation`, `-locales`), but CLAUDE.md doesn't mention this split at all.
- **Build tools**: lists "Sass - CSS preprocessing". Sass isn't used. `package.json` confirms.
- **Auto-init claim**: "Auto-initializes on DOM load for elements with `[data-date-picker]` attribute" — the constructor doesn't read `dataset` and there's no IIFE auto-init in the TS source. Likely removed during the rewrite.
- **SCSS variables**: "References SCSS variables from pure-admin (e.g., `$spacing-md`, `$accent-color`, `$border-radius`)" — replaced by `--drp-*` CSS custom properties. The "Known Dependencies" section *does* note this correctly later in the same file, contradicting the earlier paragraph.
- **Module split**: not documented at all. The 7-module decomposition is the dominant architectural fact about this codebase and CLAUDE.md is silent on it.

**Fix:** rewrite the "Architecture" section to describe what's actually here. The "Component Features", "Size System", "Build System" sections are still accurate and can stay.

---

## 8. Dead exports & types

Quick audit of `src/types.ts` (532 lines) and `src/index.ts` (92 lines). Need a deeper pass to confirm — the agent didn't dig here. Punt to Phase 2 or 3 unless something jumps out during refactor.

---

## 9. Smaller cleanups & code smells

- **Validation note** at `date-picker.ts` constructor:194 — `console.warn(\`unifiedNavigationAnchorIndex (...) out of bounds. Using 0.\`);`. Should go through `drpLogger.warn` for consistency.
- **HTML escaping**: same as §1.5 but flagged as a smell rather than a bug — every place that interpolates `${userText}` into innerHTML deserves a one-line audit.
- **Three rolling-selector-related boolean arrays** (`showingRollingSelector`, `displayMonths`, `monthDates`) are all sized `visibleMonthsCount` and updated together. A single `ColumnState[]` would centralize the invariant. Not urgent, but the multi-month columns are exactly the place where state desync bugs hide.
- **`isCalendarActive` vs `isOpen`** — both flags exist. Audit whether they always agree; if so, collapse.
- **Reactive setters** (`selectedDate`, `selectedDates`, `selectedRanges`, `isOpen` at web-component.ts:830-868) bypass the destroy+rebuild path correctly. Good model — the rest of the setters should look like this.

---

## 10. Suggested refactor order (lowest-risk first)

Same shape multiselect followed:

1. **Phase 1 — Bugs and noise** (§1.1 - 1.5, §5)
   - Stable IDs for action-button tooltips (1.1)
   - Delete the seven `console.log` sites (1.2)
   - Gate or delete the `getComputedStyle` log (1.3)
   - `disabled` exclusion in attributeChangedCallback (1.4)
   - Document the HTML-trusted callback contract or escape (1.5)
   - Decide on 1.6's `||` vs `&&` and add a comment
   - Update `CLAUDE.md` to match reality (§7)
2. **Phase 2 — Internal dedup, behavior-preserving** (§2)
   - `moveFocusToDate` helper (2.1)
   - `changeMonth(offset)` (2.2)
   - `renderRollingList` (2.3)
   - `commitInputValue` and `commitSelection` (2.4, 2.5)
   - CSS unused-vars decisions, scrollbar consolidation, hardcoded `white` (§6)
3. **Phase 3 — Tooltip class** (§2.7)
   - Single `Tooltip` class consolidating the action-button and day/badge tooltip impls. Drops in alongside the 1.1 fix.
4. **Phase 4 — Attribute pipeline rewrite + `updateOptions`** (§1.7, §3, §3.1)
   - `ATTRIBUTE_TABLE` driving `observedAttributes` and the init parse
   - `picker.updateOptions(partial)` on the core class
   - Setters route through `updateOptions` instead of `destroy() + initializePicker()`
   - Selection / focus / drag state survives attribute changes

The line-count yield is smaller than multiselect's was — the modular split already absorbed a lot of what would have been duplicate code — but Phase 1 + Phase 4 are still the high-leverage moves. Phase 4 in particular: every reactive-framework integration is currently silently wiping selection, and that's the kind of thing nobody reports because it "just works on first render."

---

## Appendix: file inventory

| File | Lines | Notes |
|---|---:|---|
| `src/date-picker.ts` | 1,812 | Core class. Action-button tooltip leak (1.1). |
| `src/date-picker-rendering.ts` | 951 | XSS sites (1.5). Rolling-selector dup (2.3). |
| `src/date-picker-navigation.ts` | 921 | `prevMonth` / `nextMonth` mirror dup (2.2). |
| `src/web-component.ts` | 874 | 35 getter/setter pairs; `disabled` reinit bug (1.4); attribute-table opportunity (3.1). |
| `src/date-picker-interaction.ts` | 864 | 3× `console.log` in drag-end (1.2). Mask single-vs-range (2.6). |
| `src/types.ts` | 532 | Audit deferred. |
| `src/date-picker-selection.ts` | 520 | Focus-update dup (2.1). Input-commit dup (2.4). `||` question (1.6). |
| `src/date-picker-ui.ts` | 308 | `getComputedStyle` log (1.3); 2× `console.log` (1.2). |
| `src/date-picker-validation.ts` | 303 | Clean on first read. |
| `src/modules/click-events/index.ts` | 197 | Not audited yet. |
| `src/date-picker-locales.ts` | 142 | Clean on first read. |
| `src/logger.ts` | 136 | Clean. |
| `src/modules/scroll-events/index.ts` | 103 | Not audited yet. |
| `src/index.ts` | 92 | Public-API surface; audit before any breaking change. |
| `src/css/_variables.css` | 376 | 16 unused vars (mostly intentional); zero dupes; zero self-refs. |
| `src/css/_header-navigation.css` | 357 | Scrollbar pattern 2× (6.4). |
| `src/css/_calendar-grid.css` | 263 | Hardcoded `white` at line 220 (6.5). |
| `src/css/_base.css` | 232 | |
| `src/css/_message.css` | 114 | |
| `src/css/_summary-actions.css` | 102 | |
| `src/css/_badges.css` | 67 | |
| `src/css/_modifiers.css` | 41 | |
| `src/css/_tooltips.css` | 37 | |
| `src/css/_loading.css` | 36 | |
| `src/css/main.css` | 31 | |
