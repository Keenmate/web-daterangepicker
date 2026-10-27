# E2E findings — bugs, surprising behaviors, missing classes

Running notes captured while writing the e2e suite. Each entry says **what
the test discovered** and **why it surprised me** so we can decide later
whether to fix the picker, change the docs, or accept the behavior.

## Confirmed odd behavior (worth a look)

1. **~~`custom-action` event is double-dispatched on the web component.~~** ✅ FIXED
   `DateRangePicker.fireCustomActionEvent` dispatches on `this.calendar`
   with `{ bubbles: true, composed: true }`, which already crosses the
   shadow boundary and bubbles up to the host. The manual re-emit in
   `web-component.ts` was redundant and doubled every event for outside
   listeners. Fix: removed the redundant listener; spec now expects
   exactly 1 event per click.

2. **~~`disabled` setter only flags the input element; it doesn't suppress
   open-on-click.~~** ✅ FIXED
   `open()` in `date-picker-ui.ts` now early-returns if `picker.input?.disabled`,
   so programmatic clicks (and any other event path that bypasses the
   browser's pointer-events block) can't open a disabled picker. New spec
   verifies the suppression.

3. **~~Range-typing separator differs from committed-range separator.~~** ✅ FIXED
   `applyRangeMask` now auto-injects `" - "` (matching the committed form)
   instead of `" to "`. The keydown whitelist allows `-` and space in
   range mode; the parser splits on `" - "` first and falls back to a
   position-based split (anything past `maxLength` is the end side, with
   leading dashes/spaces stripped) so a compact `"start-end"` paste also
   normalises to `" - "`. The "to" letters are no longer special-cased
   (they weren't usable in non-English locales anyway). Three specs in
   `e2e/input-behavior.spec.ts` cover the auto-inject, two-sided typing,
   and the compact-dash normalisation.

4. **~~`actionButtons` setter requires waiting for `customElements.whenDefined`.~~** ✅ FIXED
   Properties assigned to a not-yet-upgraded element used to become own-
   properties that shadowed the class accessors forever. Fix: added
   `_liftPreUpgradeProperties()` to `connectedCallback`, which walks the
   prototype chain for `set` descriptors and re-routes any matching own-
   properties through their accessors. The `events-api.html` fixture now
   sets `actionButtons` in a plain inline script (no `whenDefined`) to
   prove the lifting works.

## Things on the original checklist that don't actually exist

5. **~~No `--weekend` class on day cells.~~** ✅ FIXED
   `isWeekend` was always computed for the JS callbacks but never surfaced
   for pure-CSS theming. Now every day cell gets:
   - `drp-date-picker__day--weekend` modifier when `getDay()` is 0 or 6.
   - `data-weekday="0..6"` attribute (general hook — lets CSS target any
     specific weekday, not just Sat/Sun: `[data-weekday="5"]` for Friday,
     etc.).
   No default styling added — consumers theme via the hooks. Three specs
   in `e2e/visual-states.spec.ts` assert the class on Sat/Sun, its absence
   on Mon–Fri, and that `data-weekday` matches `getDay()` across the week.
   (Side note: the original finding claimed CLAUDE.md "mentions weekend
   styling" — re-checked, it doesn't. The feature was just genuinely
   missing as a CSS hook.)

6. **~~No hover-preview class for in-progress range selection.~~** ✅ FIXED
   Range mode now paints the would-be range live as the user moves the
   mouse looking for an end date, mode-aware per disabledDatesHandling:
   - `allow` / `individual`: full range painted with `--hover-preview`
   - `prevent`: `--hover-preview-invalid` when range crosses disabled
     (mirrors the rejection that the click would trigger)
   - `block`: snaps end to last-enabled-before-gap, paints only that far
     (teaches the snap behavior in advance)
   - `split`: paints enabled days only, leaves disabled bare (visual gaps
     communicate the upcoming sub-range split)
   Also: hovering before the start auto-swaps so preview paints
   (hovered)..(start). Cleanup wired on commit, mouseleave, drag-start,
   hide, destroy. Nine specs in `e2e/hover-preview.spec.ts` cover each
   mode + the swap + the two cleanup paths.

7. **~~No separate `apply` / `cancel` events.~~** ✅ RESOLVED (no fix needed)
   Re-checked the claim about CLAUDE.md/changelog referencing "apply event"
   — it's wrong. Those strings only ever appeared in `test/COVERAGE.md`
   (a test-plan checklist row of expected events), never in user-facing
   docs. `git log -S "apply event"` matches only the COVERAGE.md commit.
   Underlying observation stands: Apply dispatches `change` (no separate
   `apply` event); Escape with pending selection silently restores and
   fires nothing. Added a one-line clarifying note to `API.md`'s Events
   section so the next person who looks for `apply`/`cancel` finds the
   explanation. COVERAGE.md already correctly marks both as `n/a`.

## API gaps

8. **~~No declarative or property setter for `customStrings` on the web
   component.~~** ✅ FIXED
   Added `customStrings` and `monthNames` property accessors on the web
   component matching the pattern used by the other ~35 options. Both go
   through `applyOptionUpdate`, which routes into the picker's existing
   `updateOptions` path (which already handled both keys — see line 515
   of `date-picker.ts`). `setMonthNames(arr)` is kept as a deprecated
   alias that forwards to the new setter. No HTML attribute — the values
   are too structured for an attribute string. The `test/locale.html`
   fixture now uses the property setters directly (no `whenDefined`, no
   reach into `el.picker`), proving the pre-upgrade property lift handles
   them too.

9. **~~Range-mode "block" `disabledDatesHandling` snaps end backward rather
   than reporting a range with disabled days excluded.~~** ✅ NOT A BUG
   The showcase (`/features/range-disabled-handling`, section RDH04) is
   explicit: `'block'` means "yes, but shorter" — accept the selection
   and snap end to the last enabled date before the first disabled gap.
   The five modes already cover the spectrum cleanly:
   `allow` keeps full range + reports gaps, `prevent` rejects,
   `block` snaps end backward, `split` returns sub-ranges, `individual`
   returns flat enabled-dates list. My mental model was wrong, not the
   code. Added a clarifying comment above the `block` branch in
   `validateRangeAsync` so the next reader doesn't make the same mistake.

10. **~~`disabledDates` accepts an array but isn't an HTML attribute either.~~** ✅ FIXED
    Added `disabled-dates` to `ATTRIBUTE_TABLE` with a comma-separated
    ISO-date parser (whitespace tolerated, empty/invalid entries dropped).
    Property setter remains and wins when both paths are populated — same
    semantics as the other complex-data options that use `whenDefined`
    setters as their escape hatch. Two specs in `date-restrictions.spec.ts`
    cover the declarative attribute path and the property-wins precedence.

11. **~~CLAUDE.md documents `spacing` / `font-size` / `cell-size` HTML
    attributes that don't actually exist.~~** ✅ FIXED (docs pruned)
    Rewrote the "Size System" section to reflect reality: `input-size`
    is the only sizing attribute; calendar sizing is theming-only via
    `--drp-spacing-*` / `--drp-font-size-*` CSS tokens. Pointed out
    `--drp-rem` (default `10px`) as the global rescale knob since every
    size token is `calc(N * var(--drp-rem))`. Decided against implementing
    the missing attributes — the token-based approach is already the right
    surface for theme authors, and consumers can set tokens on the host
    element directly.

12a. **~~`dateMember` / `badgeTextMember` / `dayClassMember` etc. have
    property setters but no HTML attributes.~~** ✅ FIXED
    Added 7 string-valued entries to `ATTRIBUTE_TABLE`: `date-member`,
    `badge-text-member`, `badge-class-member`, `day-class-member`,
    `badge-tooltip-member`, `day-tooltip-member`, `is-disabled-member`.
    All use `parseStringOrUndefined`. Generalised the "property wins over
    attribute" guard from #10 into a `DUAL_PATH_KEYS` Set that now covers
    `disabledDates` plus the seven `*Member` props. `initializePicker`
    uses `??` fallback for each, and `attributeChangedCallback` ignores
    attribute mutations when the corresponding backing field is set.
    One new spec in `callbacks-extra.spec.ts` exercises the pure-HTML
    path (no JS setters needed for the member names).

12. **~~`displayFormatMask` is documented and accepted but never applied.~~** ✅ FIXED
    The docs describe it as a "localized format hint shown to users"
    (tt.mm.jjjj, dd.mm.rrrr, dd/mm/aaaa) — for languages whose date words
    don't match English Y/M/D tokens. Fix: when `display-format-mask` is
    set and the consumer hasn't set an explicit `placeholder`, the mask
    is now used as the input's placeholder. Explicit `placeholder=` still
    wins. Two specs in `api-extras.spec.ts` cover both paths.

## Open bugs from the e2e coverage plan (2026-10-24)

Tracked in `web-components-core/docs/e2e-coverage-plan.md` (WP-DRP). Each is pinned by a
`test.fail(true, 'FINDINGS.md #N')` spec that asserts the **correct** behaviour; when the
component is fixed the test starts passing and Playwright flags it — drop the `test.fail`.

13. **~~DRP-1 — `formResetCallback()` clears to `''` instead of the default `value`.~~** ✅ FIXED
    Where: `src/web-component.ts` `formResetCallback()` (~l.377). Symptom: a picker declared
    `value="2026-06-10"` inside a `<form>`; pick another date; `form.reset()` → input and
    submitted value are empty instead of `2026-06-10`. It also skips `this.flush()`, so a reset
    right after a `setAttribute('value', …)` sees stale state. Fix: `flush()`, then restore
    `this.getAttribute('value')` (the default) through the normal value path; clear only when
    there is no default.
    **Fixed (2026-10-25):** `formResetCallback()` flushes, restores the `value` attribute
    into the input (selection re-syncs from it on the next open, as for the `value` setter)
    and re-renders the hidden input from it; empty when there is no default.

14. **~~DRP-2 — `getInputValue()` / `value` getter don't `flush()`.~~** ✅ FIXED
    Where: `src/web-component.ts` `getInputValue()` / `get value()` (~l.982, 1004). Symptom:
    `el.setAttribute('value', '2026-06-10'); el.value` returns the old text — the attribute
    write is coalesced to a microtask and the getter reads the input directly. Fix: call
    `this.flush()` first (as the other imperative accessors do).
    **Fixed (2026-10-25):** `getInputValue()` (and so the `value` getter) flushes first.

15. **~~DRP-3 — `setRollingItemAlignment()` is lost on rebuild.~~** ✅ FIXED
    Where: `src/web-component.ts` `setRollingItemAlignment()` (~l.996). It writes
    `--drp-rolling-item-justify-content` on the `.drp__picker` node; any `on:'reinit'` change
    (or a DOM move, DRP-4) rebuilds that node and the alignment silently resets. Fix: set the
    variable on the host (`this.style`) or keep it in config and re-apply in `#buildPicker()`.
    **Fixed (2026-10-25):** the variable is set on the host's inline style.

16. **~~DRP-4 — a DOM move rebuilds the picker (D1).~~** ✅ FIXED
    Where: `src/web-component.ts` `disconnect()` (~l.371) destroys the picker, `connect()`
    rebuilds it. Symptom: re-parenting an open picker closes it and drops a half-picked range;
    decided (D1, 2026-10-24) that a move must keep selection, input value, form value and open
    state. Fix: move to core's build-once + activate/deactivate model — `disconnect()` only
    stops live resources (listeners, `autoUpdate`), `connect()` restarts them; the picker
    instance survives. Pinned by `e2e/lifecycle.spec.ts`: after a move the input text and
    form value survive, but `selectedRanges` reads `[]` and an open picker is closed. (A
    half-picked range happens to survive — reopening re-syncs from the input text.)
    **Fixed (2026-10-25):** build-once + activate/deactivate. New engine `deactivate()` /
    `activate()`: deactivate detaches the document/window listeners (outside click, scroll,
    keyboard, sibling-activation), leaves the overlay group, stops the floating autoUpdate
    and tears down an open sheet's chrome (scroll lock, Back trap parked without popping
    history) while keeping every bit of state incl. the open flag; activate restores them and
    re-stands the chrome of an open picker. `disconnect()` → `deactivate()`, `connect()` →
    `activate()` (builds only on first connect / a released `defer`). Also: the document
    `keydown` listener was never removed in `destroy()` (each rebuild leaked one) — now a
    named field, removed in `destroy()`/`deactivate()`. The lifecycle spec's
    `selectedRanges` check now reads `selectedStartDate`/`EndDate` (see #21's note); two
    new specs prove the re-activation (outside click after a move / while detached).

17. **~~DRP-5 — Apply never fires `select` / `change` (all `commit-mode="apply"` pickers).~~** ✅ FIXED
    Where: `src/date-picker-selection.ts` `apply()` calls `options.onSelect(...)` *before*
    `picker.pendingSelection = null`; the host bridge `#handleDateSelect`
    (`src/web-component.ts` ~l.563) returns early while
    `picker.requiresApplyButton() && picker.hasPendingSelection` — which is still true at
    that moment. Symptom: range-apply, multiple and every time/datetime picker (apply is
    their default) commit the input on Apply but emit no `select`/`change`, and
    `#updateFormValue` (only called from `#emitSelect`) never refreshes the hidden form
    input. Repro: `test/selection-modes.html#range-apply`, pick two days, Apply → no event.
    Fix: clear `pendingSelection` before invoking `onSelect` in `apply()` (or pass a flag so
    the bridge knows it's the Apply call). Pinned by `time-picker.spec.ts`
    "Apply fires select with the committed time".
    **Fixed (2026-10-25):** `apply()` takes and clears `pendingSelection` first, stores the
    committed snapshot, then fires `onSelect` — so the bridge emits `select` + `change` and
    refreshes the form value. New spec `selection-modes.spec.ts` "Apply fires select +
    change once and refreshes the form value" (range-apply).

18. **~~DRP-6 — `time-display` is `on:'update'` but the time DOM is built once.~~** ✅ FIXED
    Where: `src/date-picker.ts` builds the clock / wheel / compact / rolls skeleton in
    `createCalendar()`; `updateOptions()` doesn't list `timeDisplay` in `STRUCTURAL_KEYS`, so a
    runtime switch merges the option, the renderer dispatches on the new display, finds no
    `.drp__clock-picker` (etc.) and renders nothing — the old rolls stay on screen, stale.
    The selection itself survives. Fix: add `'timeDisplay'` to `STRUCTURAL_KEYS` (the host
    already rebuilds when `updateOptions` returns false — ideally preserving the selection,
    see #21). Pinned by `time-picker.spec.ts` (3 tests).
    **Fixed (2026-10-25):** `timeDisplay` is in `STRUCTURAL_KEYS`, and the host's
    `update()` now rebuilds via `#rebuildPreservingSelection()` when the engine refuses a
    partial (the committed time survives).

19. **DRP-7 — `display-time-format-mask` is accepted but never used.**
    Where: `src/web-component.ts` `#applyPlaceholderTo()` only reads `displayFormatMask` /
    `dateFormatMask`; `displayTimeFormatMask` is passed to the engine and stored, nothing
    reads it. Symptom: `<web-daterangepicker picker-mode="time" display-time-format-mask="hh:mm">`
    shows no placeholder hint. Suggested fix: in time mode use it as the hint; in datetime
    mode combine `(displayFormatMask ?? dateFormatMask) + ' ' + displayTimeFormatMask`.
    **Open question for the user:** is that the intended meaning? Pinned by
    `time-picker.spec.ts`.

20. **~~DRP-8 — runtime `time-format-mask` change is ignored.~~** ✅ FIXED
    Where: `src/date-picker.ts` `updateOptions()` re-parses `formatInfo` for
    `dateFormatMask` but never re-parses `timeFormatOptions` for `timeFormatMask` (it's
    `on:'update'`). Symptom: `setAttribute('time-format-mask', 'HH.mm')`, then pick 07:30 →
    input shows `07:30`. Fix: re-parse on `has('timeFormatMask')`; since the mask can flip
    the derived hour cycle / seconds, return `false` (rebuild) when those change, or make
    the input `on:'reinit'`. Pinned by `time-options.spec.ts`.
    **Fixed (2026-10-25):** `timeFormatMask` is in `STRUCTURAL_KEYS` (rebuild, selection
    preserved) so the mask and its derived hour cycle / seconds are re-parsed. New spec: a
    runtime `hh:mm a` mask brings the AM/PM roll.

21. **~~DRP-9 — any `on:'reinit'` change drops the selection state.~~** ✅ FIXED
    Where: `src/web-component.ts` `reinit()` calls `#rebuildPicker()` (destroy + build), not
    `#rebuildPreservingSelection()` (which the compaction path already uses). Symptom:
    commit 20:05 in a time picker, `setAttribute('hour-cycle', 'h12')` → `selectedTime` is
    `null` while the input still shows `20:05` (state and input disagree). Applies to every
    reinit input (`picker-mode`, `is-seconds-shown`, `visible-months-count`, …). Fix: use
    `#rebuildPreservingSelection()` in `reinit()` after the first build. Pinned by
    `time-options.spec.ts` "switching hour-cycle at runtime…".
    **Fixed (2026-10-25):** `reinit()` on a live picker now goes through
    `#rebuildPreservingSelection()` (first build unchanged). Side note: the `multi-month.spec.ts`
    month-layout pin also asserted `selectedRanges.length === 1`, but a plain clicked range
    lives in `selectedStartDate`/`selectedEndDate` (`selectedRanges` is `[]` even without a
    rebuild) — the spec now checks those. A `selection-mode` / `picker-mode` flip still can't
    carry an incompatible selection (open question in the session report).
    **Follow-up (2026-10-27, user decision):** a `selection-mode` / `picker-mode` flip carries
    what the new mode can represent (reformatted for it) and otherwise clears the input too —
    the input always shows what the selection holds. `e2e/mode-flip.spec.ts` (5 tests).

22. **DRP-10 — `commit-mode="manual"` commits on every pick (docs say it never does).**
    `src/types.ts` / CHANGELOG 2.0: "`manual` — never auto-commit or auto-close … the app
    drives commit/close via custom action buttons calling `apply()` / `close()`". Actual:
    `requiresApplyButton()` is true only for `apply`, so in `manual` mode every pick writes
    the input and fires `select`/`change`; only the auto-close is suppressed. The older
    `selection-modes.spec.ts` test "single mode does NOT close after selecting a day" even
    asserts the immediate input write. **Open question for the user:** which is intended —
    stage like `apply` (just without the button), or commit-without-close (then fix the
    docs)? Pinned by `selection-modes.spec.ts` "nothing is committed … until the app calls
    controller.apply()".

23. **~~DRP-11 — stray `console.log('[wheel] commit', …)` in production code.~~** ✅ FIXED
    Where: `src/date-picker-selection.ts` `commitWheelScroll()`. Every wheel commit logs an
    object to the console, bypassing the `/logging` loggers (silent by default). Fix:
    `drpLogger.debug(...)` or delete. No test (console noise only).
    **Fixed (2026-10-25):** deleted, along with a sibling `console.log('[wheel] render-center')`
    in `date-picker-rendering.ts`. Part of the logging alignment with core's `warn` default:
    every remaining direct `console.*` now goes through the `DRP:*` loggers (engine) or
    `this.log` (element), and `showDebugInfo` no longer calls `disableLogging()` (on
    construction or at module load) — it only turns debug on, and back to `warn` when
    removed. New `logging.spec.ts` tests: warnings visible by default, still visible after
    `show-debug-info` is removed, and a picker without it doesn't override
    `window.components.logging.enableLogging()`.
    **Follow-up (2026-10-27, user decision):** `show-debug-info` / `showDebugInfo` is removed
    entirely — core's `el.enableLogging()` / `window.components…logging` are the switches.

24. **~~DRP-12 — the selection setters don't refresh the form value.~~** ✅ FIXED
    Where: `src/web-component.ts` `set selectedDate` / `selectedRanges` / `selectedDates`
    (~l.1017-1027) assign straight to the engine; `#refreshFormValue()` only runs from the
    `inputValue` update path and `#emitSelect`. Symptom: inside a `<form>`,
    `el.selectedDate = new Date(2026, 5, 18)` shows `2026-06-18` in the input but the
    submitted value stays empty (the `value` setter and `clearSelection()` do refresh it).
    Fix: call `this.#refreshFormValue()` after each setter (also `selectedTime` /
    `selectedDatetime`). Pinned by `api-extras.spec.ts` "…setters refresh the form value".
    **Fixed (2026-10-25):** every selection setter (`selectedDate` / `selectedRanges` /
    `selectedDates` / `selectedTime` / `selectedDatetime`) refreshes the hidden form input
    and the inline ✕. Fixing it exposed that `el.clearSelection()` did NOT clear the form
    value either (the old spec only passed because the setter never wrote one) — it now
    does.

25. **~~DRP-13 — `selectedDates` setter (multiple mode) is wiped by the next open.~~** ✅ FIXED
    Where: `src/date-picker.ts` `set selectedDates` renders but never writes the input text;
    `open()` → `updateCalendarFromInput()` (`src/date-picker-ui.ts` ~l.177) then re-syncs the
    selection from the (empty) input and clears it. Symptom: `el.selectedDates = [d1, d2];
    el.open()` → no `--selected` days, `selectedDates` reads `[]`. Fix: write the
    multiple-mode input text in the setter (as a commit does), or skip the input re-sync
    when the input text was never user-edited. Pinned by `api-extras.spec.ts`
    "selectedDates setter (multiple) → --selected on each day".
    **Fixed (2026-10-25):** the engine's `selectedDates` setter (and `selectedRanges` in
    multiple mode, which cleared the input outright) writes the `N selection(s)` text a pick
    writes. New spec covers both setters surviving an open.

26. **~~DRP-14 — Ctrl+Home / Ctrl+End can leave two focused days (timing race, low priority).~~** ✅ FIXED
    Where: `src/date-picker.ts` keydown handler, the Ctrl+Home / Ctrl+End branches
    (~l.1995-2035, ~l.2074-2110): they re-render and then add `--focused` to the new day in
    a `setTimeout`, without the `querySelectorAll('.drp__day--focused').forEach(remove)`
    the plain Home/End branches do. Symptom: ArrowRight immediately followed by Ctrl+Home
    (keys sent back-to-back, as Playwright does) → both Jan 1 and Jan 2 carry
    `drp__day--focused`, persistently. With a pause between the keys only one is focused,
    so it's a race — no pinned test (it would be flaky); seen in a probe on 2026-10-24.
    Fix: clear stale `--focused` classes before adding the new one, as Home/End do.
    **Fixed (2026-10-25):** every keyboard branch that adds `--focused` (Ctrl+arrows,
    Ctrl+Home/End, PageUp/Down, `t`) now clears stale rings first. The back-to-back case
    turned out deterministic, so it is tested: `keyboard-navigation.spec.ts` "ArrowRight
    immediately followed by Control+Home/End leaves exactly one focused day" (fails 5/5
    without the fix, passes 5/5 with it).

27. **DRP-15 — `rolling-year-range` relative form from the docs doesn't parse.**
    The input's description (`src/web-component.ts` ~l.124) says "e.g. `-5:+5` or absolute
    years", but `parseYearRange()` (`src/date-picker-rendering.ts` ~l.20) only knows
    `"2022-2026"` / `"2024"`; `"-1:+2"` splits on `-` into `NaN` bounds → an empty year list.
    Fix: support `±N:±M` relative to the shown year (or fix the description). **Open
    question for the user:** which one? Pinned by `rolling-selector.spec.ts`.

28. **DRP-16 — no RTL handling: chevrons and arrow keys don't mirror.**
    In a `dir="rtl"` context the header and grid mirror through flexbox/grid (prev sits on
    the right), but `.drp__nav--prev::before` still rotates 180° (points left, i.e. inward)
    and ArrowLeft still moves to the previous day (visually rightward). Where:
    `src/css/header-navigation.css` (`--drp-nav-icon-rotate-prev/next`), keydown handler in
    `src/date-picker.ts`. Suggested fix: `:host(:dir(rtl))` swaps the two rotate variables;
    the keydown handler swaps ArrowLeft/Right (and Ctrl+arrows) when
    `getComputedStyle(host).direction === 'rtl'`. **Open question for the user:** is RTL a
    supported target? Pinned by `rtl.spec.ts` (2 tests; the mirrored layout is ✓).

29. **~~DRP-17 — modal mode never blurs the input inside the web component.~~** ✅ FIXED
    Where: `src/date-picker-ui.ts` `enterModal()` checks `document.activeElement ===
    picker.input`; inside the shadow root `document.activeElement` is the *host*, so the
    check is always false — the input keeps focus (mobile keyboard stays up over the
    modal) and `modalRestoreFocus` never restores focus on close. (`enterFullscreen()`
    blurs unconditionally, so full-screen is fine.) Fix: compare against
    `(picker.input.getRootNode() as Document | ShadowRoot).activeElement`. Pinned by
    `positioning-modes.spec.ts` "opening from the input blurs it".
    **Fixed (2026-10-25):** `enterModal()` checks the input's own root's `activeElement`.
    A pointer press opens on `pointerdown`, before the press focuses the input, so a one-shot
    listener also drops that trailing focus. Focus is handed back on close only when the
    input had focus before opening (keyboard / programmatic) — not after a tap, which would
    bring the soft keyboard back. New spec: keyboard-focused open → blurred → Escape
    restores focus without reopening.

---

Add new entries below as more specs land.
