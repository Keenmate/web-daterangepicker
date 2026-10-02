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

---

Add new entries below as more specs land.
