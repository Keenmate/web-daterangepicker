# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Environment signal re-exported for device-adaptive configuration.**
  `getEnvironment`, `observeEnvironment`, `observeViewport`, `classifyDevice`,
  `configureBreakpoints`, and `TABLET_MIN_SHORT_SIDE` (plus the `EnvironmentSnapshot`
  / `DeviceClass` / `Orientation` / `PointerType` / `OS` / `BreakpointMap` types) are
  now re-exported from `@keenmate/web-daterangepicker`, tunneled from
  `@keenmate/web-components-core`. Consumers get the *same* "what device am I on"
  signal the picker's own presentation ladder reacts to, from one import surface and
  with no direct core dependency — e.g. a rich `actionButtons` set on desktop and a
  subset on phones, keyed off `classifyDevice(env)` (capability-first, so a landscape
  phone still reads `mobile`). See the new **AB16** demo in the action-buttons page.
  Mirrors web-multiselect's export surface.
- **Container-responsive compaction — `compact-below` (via core rc09 `resized`
  hook).** A new opt-in attribute `compact-below="<px>"` (property `compactBelow`)
  collapses the calendar to a single month and hides the Today/Clear buttons when the
  element's **own border box** drops below the threshold. Unlike the modal width tiers
  (which key off the viewport) and CSS `@container` queries (presentational only), this
  reacts to the element's box via `@keenmate/web-components-core`'s shared per-page
  `ResizeObserver` — so an **inline** picker in a narrow sidebar/column compacts even
  on a wide monitor. The month-column count is a structural engine option, so a
  threshold cross rebuilds the picker; the committed selection is snapshotted and
  restored so a resize never drops the user's dates. Unset or `0` disables it — no
  existing picker changes layout without opting in. Bumps the core dependency to
  `@keenmate/web-components-core@^1.0.0-rc09`. See the Responsive Behavior demo (§7).

- **Presentation-aware render callbacks (via core rc08 `presentationContext`).** Every
  render-facing callback context — `DayContext` (`renderDayCallback`,
  `renderDayContentCallback`, `getDateMetadataCallback`, `dayTooltipCallback`,
  `badgeTooltipCallback`), `SummaryContext` (`formatSummaryCallback`),
  `MonthHeaderContext` (`getMonthHeaderCallback`), and `UnifiedHeaderContext`
  (`getUnifiedHeaderCallback`) — now carries `presentation` (`'floating' | 'modal' |
  'fullscreen'`), `isFullscreen`, and `isModal`. A single callback can render richer
  content in the desktop popover and a leaner variant in the phone full-screen sheet
  without the host page reaching for `matchMedia`, e.g.
  `renderDayCallback: ({ isFullscreen }) => …`. The flags reflect the open chrome and
  update when the device presentation flips. Mirrors web-multiselect's
  render-context model. `PresentationContext` is re-exported for typing.

### Changed

- **BREAKING — renamed the imperative `show()`/`hide()` methods to
  `open()`/`close()`.** On both the `<web-daterangepicker>` element and the
  `DateRangePicker` class, `show()` is now `open()` and `hide()` is now `close()`
  (`toggle()` and the `isOpen` property are unchanged). This aligns the calendar
  open/close API with the vocabulary used across the KM components (e.g.
  web-multiselect). Migration: replace `picker.show()` → `picker.open()` and
  `picker.hide()` → `picker.close()`. No aliases are kept.

- **BREAKING — merged `auto-close` + `is-apply-button-shown` into a single
  `commit-mode`.** The old two attributes were an orthogonal pair that could be set to
  contradictory or redundant combinations (e.g. a range picker that closed on selection
  yet still rendered an Apply button). They are replaced by one attribute
  `commit-mode` (property `commitMode`) with three values:
  - `selection` — commit and close as soon as a selection completes (no Apply button).
    Default for date mode.
  - `apply` — render an Apply button; the selection is staged until it's clicked, which
    commits and closes. Default for time/datetime and for `multiple` selection mode.
  - `manual` — never auto-commit/auto-close and render no built-in Apply button; the app
    drives commit/close via custom action buttons (`ActionButton.onClick`). Replaces the
    old `auto-close="never"`.

  Migration: `auto-close="never"` → `commit-mode="manual"`; `auto-close="selection"` →
  `commit-mode="selection"`; `auto-close="apply"` → `commit-mode="apply"`;
  `is-apply-button-shown="true"` → `commit-mode="apply"`; `is-apply-button-shown="false"`
  → drop it (the `selection`/`manual` modes have no Apply button). No deprecated aliases
  are kept — both old attributes/properties are removed.
- **Bumped `@keenmate/web-components-core` to `^1.0.0-rc08`** (adds
  `presentationContext` / `PresentationContext`).
- **Border default raised for contrast** — `--drp-border-color` now defaults to
  `light-dark(#cbd5e1, #52525b)` (was `light-dark(#e5e7eb, #3a3a3a)`, near-invisible on
  both schemes). Matches web-multiselect's rc07 contrast fix.
- **All icons are now font-independent CSS masks from one icon set (Lucide), wired to
  the shared `--base-icon-*` contract.** The prev/next month arrows (`‹` / `›`), the
  full-screen close (`×`), and the input's calendar affordance (the `📅` emoji) were
  rendered as characters, so their shape, weight, and — for the emoji — color changed
  with the page font / OS. Each is now a `background-color: currentColor` pseudo-element
  masked by a `--drp-icon-*` SVG, pixel-identical everywhere and tinting with the
  element's `color`. Each glyph token now **chains to `--base-icon-*`** with the Lucide
  SVG as fallback (`--drp-icon-close: var(--base-icon-close, …)`, etc.), so setting a
  base icon at `:root` re-skins the picker *and* the rest of the KeenMate component
  family at once, while a standalone picker still renders the Lucide default. Token
  sub-names now mirror the base contract 1:1: `--drp-icon-close`, `--drp-icon-clear`
  (was `--drp-icon-input-clear`), `--drp-icon-chevron`, `--drp-icon-calendar`
  (forward-references `--base-icon-calendar`, which the base layer doesn't define yet).
  The prev/next nav now shares **one directional chevron** rotated per direction
  (`--drp-nav-icon-rotate-prev`/`-next`, default `180deg`/`0deg`) instead of separate
  `chevron-left`/`chevron-right` glyphs — one chevron to skin, matching the
  web-multiselect toggle/pager handling. Plus `--drp-nav-icon-size`.
- **`--drp-rem` now chains to `--base-rem`** (`var(--base-rem, 10px)`), so a family-wide
  scale set once at `:root` reaches the picker too; the `10px` fallback keeps standalone
  output byte-identical. Aligns with web-multiselect's `--ms-rem` and web-treeview's
  `--wtv-rem`.
- **Two more tokens wired to the shared `--base-*` contract for dark-mode fidelity.**
  `--drp-shadow-xl` (the picker popup elevation) now prefers `--base-dropdown-box-shadow`,
  a `light-dark()`-aware shadow that deepens on dark themes, with the flat two-layer
  shadow kept as the standalone fallback; and `--drp-easing-snappy` now flows from
  `--base-ease-standard` (an exact curve match). Durations stay local — the `150ms`
  scale doesn't map cleanly onto `--base-duration-*`. Mirrors web-multiselect's rc12
  base-token pass. Also manifests the pre-existing `--drp-input-clear-*` base chains.

### Fixed

- **Example pages — removed rogue (undefined) CSS classes so every page draws from the
  shared design system.** `examples-basic.html`'s 📅 calendar-toggle buttons used an
  undefined `.calendar-btn` (rendered as a plain browser-default button) — now the shared
  `.btn-outline`. `examples-data-api.html` carried dead structural leftovers from the old
  `api-methods` page: `.card-header` / `.card-content` (unclassed wrapper divs now),
  `.card-title` (→ plain `<h2>`, already styled by `.card h2`), `.card-description`
  (→ shared `.description`), and an orphan `<ul class="features">` (→ plain `<ul>`).
  Purely markup class renames — no visual change to the design-system pattern, no JS
  touched. The remaining page-local `<style>` blocks are all genuinely page-specific
  (theme `--drp-*` overrides, shadow-DOM-injected day-cell styles, log-token colors).
- **Full-screen calendar now actually scales up for touch (was rendering at the base
  desktop scale).** The sheet set `--drp-rem: var(--drp-fullscreen-rem)` on itself, but
  the size tokens (`--drp-nav-size`, `--drp-spacing-*`, `--drp-font-size-*`, …) are
  declared on `:host` and resolve `var(--drp-rem)` there — so a rem override on the
  sheet (a shadow descendant) inherited already-resolved base-scale values and did
  nothing. Result: cramped padding and small text in full-screen, plus a close (✕)
  that looked oversized because it alone used `--drp-fullscreen-rem` directly. The rem
  override now lives on the host (`:host([data-drp-fullscreen])`, toggled in
  enter/exitFullscreen), so the **whole** calendar scales together (~1.2×) as intended.
- **Full-screen close (✕) is vertically centred on the month-nav row again.** With the
  merged (no-title) header, the ✕ floats into the nav row; its downward nudge was tuned
  to the old (unscaled) layout and left it ~12px too low once scaling was fixed. It now
  centres via a rem-relative offset that also respects a themed `--drp-fullscreen-close-size`.
- **`Home` / `End` now move the text caret in a typed input before navigating the
  calendar.** Previously plain `Home`/`End` while the calendar was open always jumped
  the month view to the first/last day, stealing the keystroke from the input — most
  visible with `fullscreen-input`, where the header field is meant for typing a date.
  They now move the caret first and only navigate the calendar once the caret sits at
  the boundary (empty field still navigates immediately; `Ctrl`/`Cmd`+`Home`/`End`
  stays the year-jump). Mirrors web-multiselect's caret-aware fix.
- **Full-screen calendar clipped under the landscape system bars / display cutout.**
  The full-screen sheet is `width: 100vw` (the full *physical* width) with no
  safe-area handling, so on a landscape phone its header, day grid, and summary could
  run **under the side navigation bar and camera cutout**. The sheet now sets
  `box-sizing: border-box` and insets its content box by
  `env(safe-area-inset-{top,right,bottom,left})` — background stays edge-to-edge while
  the flex column is pulled into the visible region. `env()` is `0` unless the page
  sets `<meta name="viewport" content="… viewport-fit=cover">` (the mobile
  examples/tests now do), so it's a no-op on non-cutout pages. Aligns with
  BlissFramework `responsive-overlay.md` constraint #4 / anti-pattern #7.

### Added

- **Device-adaptive presentation — `mobile-presentation` (SPEC §12.9).** A
  `floating` picker now adapts to the device via core's `resolvePresentation` /
  `classifyDevice` (capability-based and orientation-robust — it uses the
  *shorter* viewport side, so a landscape phone still reads as a phone):
  - **phone** (touch-primary, shorter side < 600px) → **full-screen** overlay,
  - **tablet** (touch-primary, shorter side ≥ 600px) → **modal** centered dialog,
  - **desktop** (fine pointer, any width) → **floating** popover.

  The new `mobile-presentation` attribute (`auto` | `floating` | `modal` |
  `fullscreen`, default `auto`) selects or forces this; a forced value applies on
  any device (handy for previewing the phone overlay on a desktop). Only a
  `floating`-configured picker adapts — `inline` and an explicit `positioning-mode`
  of `modal` are left as authored.
- **Phone full-screen overlay.** An edge-to-edge sheet (`position: fixed;
  100vw/100dvh`) with a close (✕) header, page-scroll lock (core `lockBodyScroll`),
  soft-keyboard tracking so the calendar sits above the keyboard (core
  `observeKeyboardInset`), and a **Back-gesture trap** shared with modal (a history
  entry so the phone Back gesture / browser Back button dismisses the sheet instead
  of navigating away — see Fixed). The whole calendar
  scales up for touch via `--drp-fullscreen-rem`. New `fullscreen-title` (optional
  header heading) and `fullscreen-autofocus` (keyboard-off by default; opt in to
  focus the input on open) attributes; theming via `--drp-fullscreen-*` tokens.
- **Full-screen: typeable header input — `fullscreen-input`.** In the full-screen
  sheet the trigger field sits *behind* the fixed overlay, so there's nothing to
  type into. `fullscreen-input` relocates the live input node into the sheet header
  (same node → the mask and form value carry over) where it's visible above the
  calendar, and gives it `inputmode="numeric"` so phones show a digits-only keypad —
  the input mask supplies the separators, so no `/` or `.` key is needed. It takes
  over the header row (shown instead of `fullscreen-title`) and pairs with
  `fullscreen-autofocus` for a type-first flow; the input is restored to its original
  DOM spot and attributes on close. Sizing via `--drp-fullscreen-input-font-size`.
- **`setPresentation('floating' | 'modal' | 'fullscreen')`** on the core picker —
  swaps the runtime presentation **in place** (no rebuild, selection preserved),
  so an orientation flip / resize re-resolves live.
- **Themeable full-screen close (✕) chip** (matches web-multiselect): the bare round
  glyph can become a bordered, command-palette-style button via
  `--drp-fullscreen-close-bg`, `--drp-fullscreen-close-border`, and
  `--drp-fullscreen-close-border-radius` (defaults `transparent` / `none` / `50%` keep
  the current look). `box-sizing: border-box` keeps a border from growing the chip.

### Changed

- **Bumped `@keenmate/web-components-core` to `^1.0.0-rc07`** (from `rc02`).
- **Presentation now switches in place instead of rebuilding.** The environment
  hook drives `setPresentation()` on the live picker rather than flipping the
  `positioning-mode` attribute (which rebuilt the picker and lost live selection).
  Replaces the interim `mobile-modal-breakpoint` / `mobile-modal-min-height`
  attributes and the environment→`modal` attribute-flip (both unreleased).
- **Calendar popover gains a `maxWidth` cap** (core `anchor({ maxWidth })`, rc03):
  a wide multi-month calendar near the viewport edge caps its `max-width` and
  wraps internally instead of overflowing horizontally off-screen.

### Fixed

- **Full-screen ✕ corner is now tappable (matches web-multiselect).** The close
  button was a small centered chip with dead padding around it, so taps in the
  top-trailing corner — the natural place to reach — did nothing. A bounded
  transparent `::after` now extends its tap target up past the button and out to the
  sheet's trailing edge (reclaiming the header padding), so the corner dismisses the
  sheet — without covering the month-nav `›` or the first day row. A small negative
  margin (`--drp-fullscreen-close-edge-nudge`) also slides the glyph toward the edge.
  The visible chip size is unchanged.
- **Full-screen: the ✕ no longer wastes an empty row.** With no `fullscreen-title`,
  the close button used to sit alone in its own header row. It now merges into the
  month-navigation row — `‹ August 2026 › ✕` — floated top-trailing with the month
  header reserving space so the › nav clears it (raised above the sticky header /
  rolling selector so it stays clickable). When a `fullscreen-title` is set, the
  header keeps its own full-width row (title + ✕).
- **The Back gesture now dismisses a modal too, not just full-screen.** Only the
  full-screen sheet trapped the phone Back gesture / browser Back button; an open
  `modal` let Back navigate away (history −1). Modal now pushes the same same-URL
  history entry on open and consumes it on close, so Back closes the sheet and stays
  on the page (closing via ✕ / backdrop / Escape / selection leaves history clean).
- **Range drag-to-adjust now works with touch.** The drag handlers were mouse-only
  (`mousedown`/`mousemove`/`mouseup`), so a range couldn't be adjusted with a finger.
  They're converted to Pointer Events (mouse + touch + pen). On touch, dragging an
  existing range endpoint (which carries `touch-action: none`) adjusts the range,
  while swiping any other day still scrolls the month list and tap-tap still creates
  ranges. A drag takes explicit pointer capture on the calendar so the move stream
  survives the endpoint cell's class churn. Also fixed a latent flaky hit-test: a
  shadow `<slot>` can paint above the day cells, so drag detection now scans the full
  `elementsFromPoint` stack instead of only the topmost element (this intermittently
  broke mouse drags too).
- **Single-month modal no longer stretches to the multi-month width.** A modal with
  one visible month was pinned to the wide per-tier width (e.g. 900px), blowing the
  day cells up huge; it now sizes to a natural single-month width
  (`--drp-modal-width-single`, 360px) via a `:has()` override, with multi-month
  modals unchanged.
- **Tapping the input no longer instantly re-closes a modal / full-screen sheet.**
  On touch, tapping the input opens the sheet on `pointerdown`; the tap's
  synthesized `click` then landed inside the freshly-shown overlay — on a day cell
  (→ select → single-mode auto-close) or the backdrop (→ dismiss) — so it opened and
  closed in one gesture. A one-shot capture-phase guard now swallows exactly that
  trailing "ghost" click when the open was pointer-triggered, and the modal backdrop
  dismisses on a press that *starts* on the scrim rather than any bubbled click. A
  genuine later tap is unaffected.
- **`destroy()` no longer leaks input listeners or the floating anchor across a
  rebuild.** The input element is reused when a `positioning-mode` change rebuilds
  the picker, but `destroy()` never removed the input's `focus`/`pointerdown`/
  `click`/mask listeners nor tore down the floating `autoUpdate` anchor. The result
  was a *zombie* floating picker: after a rebuild the next tap on the input
  reopened the destroyed floating picker and emitted a spurious "Calendar rendered
  … away from where the library positioned it" drift warning (measuring its
  detached, zero-rect calendar). All input listeners now register with an
  `AbortController` signal that `destroy()` aborts, and `destroy()` runs the full
  presentation teardown (`cleanupPositioning()` plus modal/full-screen exit) so an
  open sheet can't leak its anchor, scroll-lock, or Back-trap.

### Removed

- The temporary `[drp modal-debug]` `console.warn` sizing report from modal
  `show()` (the width-collapse diagnostic it was added for is resolved).

## [2.0.0-rc06] - 2026-08-04

### Added

- **Form association.** `<web-daterangepicker>` now participates in forms and,
  via core's `BlissElement`, exposes `el.form` / `event.target.form` — the hook
  host frameworks that route form changes by reading `target.form` (e.g. Phoenix
  LiveView's `phx-change` delegation) depend on. Requires
  `@keenmate/web-components-core` with the `el.form` getter.
- **Submission via a light-DOM hidden `<input>`** (web-multiselect's model).
  When `name` is set, the control renders a hidden `<input>` inside the `<form>`
  carrying its selection, and clears with `form.reset()` (`formResetCallback`).
  This works uniformly across `inline` / `floating` / `modal` — including inline
  pickers, which have no visible input and previously submitted nothing.
- **Stable, mask-independent ISO submission value.** The submitted value is
  ISO-8601, not the display-formatted string, so `display-format-mask` /
  `date-format-mask` never leak into form data (a single date → `2026-06-15`; a
  range → `2026-06-15/2026-06-20`).
- **`value-format` attribute** (`iso` | `json` | `array`, default `iso`) and the
  **`getValueFormatCallback`** property choose the serialization, mirroring
  web-multiselect: `json` emits `JSON.stringify` of the selection; `array` emits
  multiple `name[]` inputs (a range flattens to `start`, `end`); the callback
  receives the normalized ISO selection snapshot and returns the field value.
- The submitted value reflects the **real** selection under
  `disabled-dates-handling`, not the drawn envelope: `"split"` submits each
  sub-range, `"individual"` / `"block"` submit the enabled days — so disabled days
  in a range's gap are never submitted. Covered by `e2e/form-association.spec.ts`.

### Changed

- **Inline mode now renders a hidden `<input>`** so the picker can format its
  selection into it (populating `date-select`'s `formattedValue` and enabling
  programmatic `value` / `getInputValue()` for inline). Its e2e assertion changed
  from "inline renders no input" to "no *visible* input + one hidden field".
- **Form submission no longer uses `ElementInternals.setFormValue`.** The host
  is still form-associated (for `el.form` + `form.reset()` delegation) but never
  sets a form value itself, so it adds no second entry under `name`; the light-DOM
  hidden input is the single submitted entry.

## [2.0.0-rc05] - 2026-08-02 [PUBLISHED]

### Changed — migrated onto `@keenmate/web-components-core` (`BlissElement`)

- **The custom-element plumbing is now core-owned.** The hand-rolled
  `ATTRIBUTE_TABLE`, `observedAttributes`, `attributeChangedCallback`, the
  `AttrParser` helpers, `DUAL_PATH_KEYS`, the microtask reinit batcher, and the
  ~35 property/callback getter/setter pairs in `web-component.ts` are replaced by
  one core `static inputs` table + a `static events` table on `BlissElement`.
  Core owns attribute parsing, property validation, reactivity coalescing,
  reflection, pre-upgrade property lifting, and the managed `on<Name>` handler
  properties. The `DateRangePicker` engine and all CSS are unchanged — only the
  plumbing was swapped. Reactivity is declared per input (`on: 'reinit'` for the
  engine's structural keys, `on: 'update'` for everything it patches in place)
  and bridged via `reinit()` / `update()` / `connect()` / `disconnect()`.
- **New: managed event-handler properties** `onDateSelect`, `onChange`,
  `onCustomAction` — assigning one behaves exactly like `addEventListener` (the
  handler receives the `CustomEvent`). The `date-select` / `change` /
  `custom-action` events themselves are unchanged.
- **New: `el.picker`** getter exposes the live `DateRangePicker` instance (an
  escape hatch; the engine is already a public export).
- **Logging** is now a thin shim over core `createLoggers('DRP', …)`; the
  vendored `loglevel` + `loglevel-plugin-prefix` dependencies are dropped.
  Category loggers keep their names (`renderingLogger`, `uiLogger`, …); the old
  bare `DRP` logger is now `DRP:GENERAL` (`drpLogger`).
- **Global registration** (`window.components['web-daterangepicker']`) now comes
  from core `registerComponent()` instead of a hand-rolled block; `getInstances()`
  is backed by core's live-instance registry.
- **CEM**: `custom-elements-manifest.config.mjs` uses core's `blissAnalyzerConfig()`
  (reads the `static inputs`/`static events` tables); the homegrown
  `cem/attribute-table-plugin.mjs` is removed. Manifest: 56 attributes / 134
  members / 3 events.

### Added

- **IDE autocomplete for the `--drp-*` theming variables.** The 293 component CSS
  variables from `component-variables.manifest.json` now flow into the editor
  outputs — `vscode.css-custom-data.json` (previously an empty stub) and
  `web-types.json` — so consumers get name + description completion for every
  `--drp-*` variable in `.css` files (VS Code via `css.customData`, JetBrains via
  web-types). Wired via core's `cssVariablesFromManifestPlugin()`
  (`@keenmate/web-components-core/cem`), which reads the manifest as the single
  source of truth.

### Fixed

- **The selection summary is now text-selectable.** The calendar root sets
  `user-select: none` so drag-selecting a range never grabs page text — but that
  also blocked copying the summary, which carries informational text (day counts,
  prices, and booking reference codes written via `showSummary()`). `.drp__summary`
  now opts back in with `user-select: text`; the day grid stays unselectable.
- **Month/year rolling selector no longer bleeds onto the sticky header.** On a
  panel short enough to scroll, the selector's `inset: 0` overlay slides up under
  the sticky month/year header. Two issues let the roller items paint over the
  title: the per-month `.drp__rolling-selector` had no background (its border-only
  lists were transparent), and the sticky header's `z-index` (2) sat below the
  selector's (10). Gave the selector an opaque background (parity with the
  already-fixed unified selector) and lifted the header to `z-index: 11`.
- **Badge tooltips no longer render off-screen.** A hovered badge cell gets
  `transform: scale(1.05)`, making it a fixed-positioning containing block; the
  bespoke offset-parent logic returned the badge as its own offset parent (and
  measured the offset parent from the reference instead of the floating element),
  so Floating UI produced negative coordinates. Fixed both, plus upstream in core.
- **`disabledDates` (and other dual-path inputs) property now wins over the
  attribute** when both are set before upgrade — fixed upstream in
  `@keenmate/web-components-core` (pre-upgrade property vs. initial attribute
  ordering) rather than with a component-local guard.

### Positioning — fully routed through `@keenmate/web-components-core/positioning`

**All positioning now goes through core; `@floating-ui/dom` is no longer a direct
dependency.**

- The generic containing-block / drift logic moved to core: the local
  `getFixedPositionOffsetParent` + drift-culprit helpers are gone, and the
  hand-built narrowed-CB platform + drift wiring are replaced by `anchor()`'s
  first-class `fixedContainingBlock: true` + `onDrift(report)` options (one shared,
  tested implementation; the off-screen bug above is fixed there too). `warnDrift`
  keeps only the daterangepicker-branded, once-per-instance message.
- **Action-button tooltips** use core `createTooltip()` — the local
  `src/tooltip.ts` `Tooltip` class is deleted.
- **The calendar popover** uses core `anchor()` (with `maxHeight`, `flipPadding`,
  `autoUpdateOptions: { elementResize: false }`, `fixedContainingBlock` + `onDrift`
  drift check). The former module-level autoUpdate cleanup is now a per-instance
  anchor handle (fixes a latent multi-instance leak).
- **Day/badge tooltips** use core `anchor()` with the `arrow` +
  `fixedContainingBlock` options; the component keeps only what's genuinely its
  own — the hover event-delegation over one shared tooltip element and the per-cell
  HTML content.
- These required additive core enhancements to `anchor()` (arrow / maxHeight /
  flipPadding / autoUpdateOptions / onComputed / fixedContainingBlock / onDrift) so
  nothing is hand-rolled here.

### Dependencies

- Added `@keenmate/web-components-core`. Removed `loglevel`,
  `loglevel-plugin-prefix`, **and `@floating-ui/dom`** — all positioning now goes
  through core (which owns the single pinned `@floating-ui/dom`). The component
  has no direct runtime dependency other than core.

### Docs

- **Audited every example page + `API.md` against the real API** and fixed the
  accumulated drift: removed dead `calendar-open`/`calendar-close`/`input-change`
  event listeners and table rows (the component only emits `date-select` /
  `change` / `custom-action`); corrected the logging docs (no more `picker.logger`
  or `loglevel` — logging is core-provided, `DRP:*` categories); fixed the
  `PureDatePicker` → `DateRangePicker` class name and `mode` → `selectionMode`;
  removed the fictional SCSS story (the package is plain `--drp-*` CSS);
  fixed ActionButton callback signatures (`(picker)` → `(ctx)`/`({ picker })`),
  enum/default errors (`range-disabled-handling` → `disabled-dates-handling`,
  removed non-existent `spacing`/`font-size`/`cell-size` attributes), and
  documented the new `onDateSelect`/`onChange`/`onCustomAction` handler
  properties and the `el.picker` getter.
- **`API.md` reference tables are now generated** from `custom-elements.json`
  (itself generated from the `static inputs`/`static events` tables) via
  `scripts/gen-api-docs.mjs` (`npm run docs:api`, run by `build` after
  `analyze`). The Attributes (56), Properties (84), and Methods (21) tables live
  between `<!-- GEN:… -->` markers and can no longer drift; JSDoc on the public
  methods/getters now feeds both those tables and IDE IntelliSense.

## [2.0.0-rc04] - 2026-07-29 [PUBLISHED]

### Added — Custom-Elements-Manifest + editor autocomplete

- **Custom-Elements-Manifest (CEM) toolchain wired up** — the package now generates and ships `custom-elements.json`, `web-types.json`, and `vscode.html-custom-data.json` (+ `vscode.css-custom-data.json`), giving `<web-daterangepicker>` full tag / attribute / enum-value autocomplete and hover docs in VS Code (via `html.customData`) and JetBrains IDEs (auto-discovered via the `web-types` field). A new `analyze` script runs as part of `npm run build` so the manifest can't drift; artifacts are gitignored (build output) but published via the `files` field.
- **Custom analyzer plugin (`cem/attribute-table-plugin.mjs`)** — the element's ~56 attributes live in the runtime `ATTRIBUTE_TABLE`, reached through a `.map()` spread the analyzer can't statically read, so a stock `cem analyze` emitted zero attributes. The plugin reads `ATTRIBUTE_TABLE` + `NON_PICKER_ATTRIBUTES` from the AST, resolves enum union types from the sibling `as const` arrays, harvests attribute descriptions from the `DatePickerOptions` JSDoc, and curates the three public events (`date-select`, `change`, `custom-action`). Single source of truth — the manifest can't drift from the table.

### Changed

- **`DatePickerOptions` JSDoc overhaul** — inline `//` comments and bare members converted to proper `/** */` JSDoc so every attribute carries an editor hover. Enum options use a consistent house style (a summary line ending `` Default: `x`. ``, then a `` - `value` — description `` bullet list) that renders as a formatted markdown list in the IDE hover. Benefits TypeScript consumers of `DatePickerOptions` too.

### Internal

- Added devDependencies: `@custom-elements-manifest/analyzer`, `custom-element-vs-code-integration`, `custom-element-jet-brains-integration`.
- `package.json`: `customElements` + `web-types` pointer fields, `analyze` script (run first by `build`), manifest artifacts added to `files`, plural `web-components` / `custom-elements` keywords.

## [2.0.0-rc03] - 2026-07-24 [PUBLISHED]

### Added — custom weekday names + declarative name overrides

- **New `weekdayNames` option** (property / `DatePickerOptions`) to override the weekday header labels, closing the asymmetry with the existing `monthNames` override (issue #5). Falls back to locale-based `Intl` short names when unset. The array is **indexed by day-of-week — `[0]`=Sunday … `[6]`=Saturday (matches `Date.getDay()`)** — and `weekStartDay` only rotates the *display*, never this mapping, so labels stay aligned to the real days at any start day.
- **Declarative pipe-delimited attributes `month-names` and `weekday-names`** — both name overrides are now settable in plain HTML, not just via JS properties:
  ```html
  <web-daterangepicker
    week-start-day="3"
    month-names="Leden|Únor|Březen|Duben|Květen|Červen|Červenec|Srpen|Září|Říjen|Listopad|Prosinec"
    weekday-names="Ne|Po|Út|St|Čt|Pá|So"></web-daterangepicker>
  ```
  `month-names` is indexed `[0]`=January … `[11]`=December (matches `Date.getMonth()`); `weekday-names` is Sunday-first as above. Both are dual-path (`ATTRIBUTE_TABLE` + property) — the explicitly-set property wins when both are present — and route through the surgical `updateOptions` path, so changing them re-renders without a full rebuild.
- **Validation with feedback**: a pipe list without exactly 12 / 7 non-empty segments is ignored (locale names used) and emits a `console.warn` naming the attribute and the offending count — no silent failure, no bad-index crash.

## [2.0.0-rc02] - 2026-07-08 [PUBLISHED]

### Added — scoped read-only lock

- **New `lock()` / `unlock()` / `toggleLock()` imperative API with four independent lock aspects** — freeze user interaction while keeping the value readable (unlike `disabled`, which greys the input out and only touches the `<input>`). The motivating case: a user selects a range, a custom confirm button calls the server, and on success the picker is locked so the confirmed range can't be changed. `lock()` with no argument locks everything; `lock(aspect | aspect[])` locks a subset. Aspects (new exported `LockAspect` type):
  - `'selection'` — day clicks, drag-to-adjust endpoints, typed input (input becomes `readOnly`), Today / Now / Clear, and all time-picker interactions.
  - `'navigation'` — month nav (`<` / `>`), PageUp/Down, Ctrl+arrows, `t`/Ctrl+Home/End, and the rolling year/month selector. Guarded at the navigation module choke points, so keyboard-focus month crossings and drag-over-nav auto-advance are blocked too.
  - `'actions'` — the Apply button and custom / preset action buttons.
  - `'open'` — (re)opening the popover in floating & modal modes. Closing (hide / Escape / backdrop) stays allowed so a locked picker is never a keyboard trap.
- **Partial locks compose**: `lock(['selection', 'actions'])` freezes the range and the buttons while leaving `<` / `>` month navigation live — e.g. let a user browse other months after confirming without being able to alter the confirmed range.
- **The lock gates the end user only — the programmatic API is never blocked.** Selection setters (`selectedRanges = …`, `clearSelection()`, etc.) keep working while locked, mirroring how a `readOnly` `<input>` is still settable from JS.
- **Declarative full lock** via the reflected `readonly` boolean attribute / property: `<web-daterangepicker readonly>` or `picker.readonly = true`. Survives the attribute-driven picker rebuild. `readonly` reads back `true` only when every aspect is locked.
- Read helpers: `isAspectLocked(aspect)` and the `lockedAspects` getter (array snapshot). Available on both the web component and the `DateRangePicker` core class.
- CSS: per-aspect root modifiers `.drp__picker--locked-{selection,navigation,actions,open}` (plus a `.drp__picker--locked` marker) supply the affordance — the locked region greys out like a disabled control and stops responding to the pointer, while any unlocked aspect on the same calendar stays live and full-opacity. New `--drp-opacity-locked` token (default `0.6`, inherited from `--drp-opacity-disabled`) controls the greying; set it to `1` to disable it.

## [2.0.0-rc01] - 2026-07-06 [PUBLISHED]

Public-API **signature + naming alignment** sweep — the date-picker equivalent of the `@keenmate/svelte-treeview` rc13 pass. Every callback and every consumer event now takes ONE typed context object drawn from a shared, exported vocabulary (no more positional args, raw `picker: any`, or anonymous inline context types), and the three "feedback" blocks (message / summary / loader) get one symmetric, HTML-accepting imperative API instead of message-only. The loader also becomes a scoped `showLoader(target?)` that can render an in-block spinner in the message or summary block. **Breaking** — no back-compat shims; see the migration table.

### Changed (BREAKING) — one context object per callback

- **Every callback now receives a single context object that extends the new exported `PickerContext` (`{ picker }`)**, so a handler can always reach the instance without re-resolving it. The positional and `picker: any` holdouts are gone:
  - `getDateMetadataCallback(date)` → `getDateMetadataCallback(ctx: DayContext)` — the bare `Date` becomes a full day context (`ctx.date`, `ctx.dateString`, `ctx.picker`, …).
  - All six **`ActionButton`** callbacks (`onClick`, `isVisibleCallback`, `isDisabledCallback`, `getTextCallback`, `getClassCallback`, `getTooltipCallback`) took a raw `(picker)` → now `(ctx: ActionButtonContext)` = `{ picker, action, button, data? }`. `data` carries the button's `data-*` attributes for custom actions (same map the `custom-action` event now exposes), so an `onClick` and the event share one shape.
  - `getMonthHeaderCallback` / `getUnifiedHeaderCallback` took **anonymous inline object types** → promoted to exported `MonthHeaderContext` / `UnifiedHeaderContext` (each `extends PickerContext`).
  - `beforeDateSelectCallback(selection: Date | DateRange)` → `beforeDateSelectCallback(ctx: SelectionContext)` = `{ mode, date?, range?, picker }`. Read `ctx.date` (single) / `ctx.range` (range) instead of narrowing a union.
  - `formatSummaryCallback` argument type renamed `SummaryDetail` → `SummaryContext` (now `extends PickerContext`; still **synchronous** — its return feeds `innerHTML`).
  - `beforeMonthChangedCallback` context type renamed `BeforeMonthChangeContext` → `MonthChangeContext` (now `extends PickerContext`).
  - `DayRenderContext` (used by `renderDayCallback` / `renderDayContentCallback` / `badgeTooltipCallback` / `dayTooltipCallback`) renamed → **`DayContext`**, and reused by `getDateMetadataCallback`. `element` and the selection-state flags (`isSelected`/`isStartDate`/`isEndDate`/`isInRange`) plus `monthIndex` are now optional (the metadata + string-render paths don't populate them).
  - Intentional exception: `customStylesCallback()` stays no-arg — there is nothing meaningful to pass.

### Changed (BREAKING) — events

- **`custom-action` detail is now `{ data: Record<string,string>, picker }`** (was the flat `Record<string,string>`). Read `e.detail.data.myKey` instead of `e.detail.myKey`. Still `bubbles` + `composed`.
- `date-select` / `change` details are now typed as `SelectEventDetail` (formerly an untyped `any`). No runtime shape change; `dateRange` may be `null` in `individual` mode (previously untyped).

### Added — symmetric imperative surface

- **Summary block gets a direct writer, mirroring `showMessage`:** `showSummary(content)` pins custom HTML that survives re-renders (including hover preview) until the next selection change; `hideSummary()` drops the override and re-derives; `refreshSummary()` re-runs derivation now (for async data that arrives after open). Enables the "loader in the summary while a price loads, then show the price" pattern.
- **Scoped loader API:** `showLoader(target?)`, `hideLoader(target?)`, `toggleLoader(target?)` where `target: 'calendar' | 'message' | 'summary'` (default `'calendar'`). `'message'`/`'summary'` render an in-block `.drp__inline-spinner`; `'calendar'` is the existing full overlay (also used automatically around async gates, single-instance so a manual call can't stack a second overlay).
- **`toggleMessage(content?, type?, autoHide?)`** for verb-family completeness alongside `showMessage`/`hideMessage`.
- New exported types from the package entry: `PickerContext`, `DayContext`, `MonthHeaderContext`, `UnifiedHeaderContext`, `SelectionContext`, `MonthChangeContext`, `SummaryContext`, `ActionButtonContext`, `SelectEventDetail`, `CustomActionEventDetail`, `LoaderTarget`.
- **`beforeDateSelectCallback` sees the split pieces:** in range mode with `disabledDatesHandling: 'split' | 'individual'`, the `SelectionContext` now carries `subRanges?: DateRange[]` (split mode — the contiguous envelope carved into enabled-only segments, same as `splitRangeByDisabled()`) and `enabledDates?: Date[]` (split + individual — the flat enabled-day list). Read-only; the callback can validate the pieces without re-deriving them.
- **`beforeDateSelectCallback` can return N ranges:** `BeforeSelectResult.adjustedRanges?: DateRange[]` (range mode, with action `'accept'` or `'adjust'`) replaces the single proposed range with N independent ranges. `selectedRanges` reflects them, the grid highlights each range's start/end/in-range cells, the summary lists them, and `onSelect` receives the `DateRange[]`. The envelope accessors (`selectedStartDate`/`selectedEndDate`) span first-start..last-end. Takes precedence over `adjustedStartDate`/`adjustedEndDate`. Assigning `selectedRanges = [...]` in range mode renders the same way. New core helpers `isRangeStart` / `isRangeEnd` / `isInCommittedRange` back the multi-range-aware decoration. Applies consistently across all three range-commit paths — click, drag-to-select, and typed input.
- **`beforeDateSelectCallback` now runs on typed range completion.** Previously, typing a full `start - end` range into the input committed it directly and bypassed the validation gate; now completing the second date runs the same async callback (and honors `adjustedRanges` / `adjust` / `restore` / `clear`) as clicking or dragging. Single-date typing is unchanged. The three commit paths were unified onto one shared applier (`applyValidatedRangeSelection`) so they can no longer drift.
- CSS: `.drp__inline-loader` + `.drp__message--loading` / `.drp__summary--loading` (hide the block's content and center the loader over it while active), plus the `--drp-loader-inline-size` token. The internal loader classes are `--drp-loader-*`-themed: `.drp__loader-overlay` (backdrop) and `.drp__loader` (the loader element, generically named since it needn't be a spinner).

### Changed (BREAKING) — state accessor alignment

Second alignment pass, this time on the **state surface**. The instance carried two names for the same concept (a raw public field *and* a `*Reactive` getter/setter), read-only display state under `showing*` / `*Internal` names, and dead/stale mirror arrays. The rule now: **the clean name is the accessor; raw storage is private.** Settable state exposes a proper get/set; read-only state exposes a get; constraint helpers drop the `*Internal` suffix.

- **Selection** — the `*Reactive` suffix is gone; the plain name is now the reactive get/set, so `picker.selectedDate` (and `el.selectedDate`) is the property a programmer expects — assigning re-renders and syncs the input; the old raw fields are private.
  - `selectedDateReactive` → **`selectedDate`** (get/set); raw `selectedDate` field → private `_selectedDate`.
  - `selectedDatesReactive` → **`selectedDates`**; `selectedRangesReactive` → **`selectedRanges`** (same treatment).
  - New read-only `selectedStartDate` / `selectedEndDate` getters (set a range via `selectedRanges`); raw fields privatized.
  - New `selectedTime` get/set. **`selectedDatetime` is now settable** — the setter accepts a `Date` *or ISO string* and splits it into the date + time parts (so you can round-trip a datetime straight from an API/DB without splitting it yourself).
- **Displayed state** — `monthDates` (a public `Date[]`) is replaced by the derived, always-in-sync **`visibleMonths: MonthDisplay[]`** (now carrying `firstDate` / `lastDate` / `gridStart` / `gridEnd` per column), plus **`visibleMonthDates`** (the `Date[]` mirror) and **`visibleDateRange`** (`{ start, end }` grid envelope). The dead `displayMonths` mirror array is removed. `showingRollingSelector` → **`rollingSelectorOpenByColumn`**; `showingUnifiedRollingSelector` → **`isUnifiedRollingSelectorOpen`**. Dead `currentDate` field → **`today`** getter (fresh, normalized to 00:00).
- **Constraints** — `*Internal` suffixes dropped and names aligned to the "available" vocabulary: `getEffectiveYearRange` → **`getAvailableYearRange`**, `getEffectiveMonthRange` → **`getAvailableMonthRange`**, `isDateDisabledInternal` → **`isDateDisabled`**, `getDayMetadataInternal` → **`getDayMetadata`**.
- `MonthDisplay` gains `firstDate`, `lastDate`, `gridStart`, `gridEnd` (all `Date`).

### Migration

| Old | New |
|---|---|
| `getDateMetadataCallback(date)` | `getDateMetadataCallback(ctx)` → `ctx.date` |
| `onClick(picker)` / `isVisibleCallback(picker)` / `getTextCallback(picker)` / … | `(ctx)` → `ctx.picker`, `ctx.action`, `ctx.button`, `ctx.data` |
| `beforeDateSelectCallback((dateOrRange) => …)` | `beforeDateSelectCallback((ctx) => …)` → `ctx.date` / `ctx.range` |
| `getMonthHeaderCallback(({month, monthName, year}) => …)` | same fields, now typed `MonthHeaderContext` (+ `ctx.picker`) |
| `getUnifiedHeaderCallback(({firstMonth, …}) => …)` | typed `UnifiedHeaderContext` (+ `ctx.picker`) |
| type `DayRenderContext` | type `DayContext` |
| type `SummaryDetail` | type `SummaryContext` |
| type `BeforeMonthChangeContext` | type `MonthChangeContext` |
| `e.detail.myKey` (custom-action) | `e.detail.data.myKey` |
| *(summary was callback-only)* | `showSummary(html)` / `hideSummary()` / `refreshSummary()` |
| *(loader was internal)* | `showLoader(target?)` / `hideLoader(target?)` / `toggleLoader(target?)` |
| CSS `--drp-loading-overlay-bg` | `--drp-loader-overlay-bg` |
| CSS `--drp-loading-spinner-size` | `--drp-loader-size` |
| CSS `--drp-loading-spinner-border-width` | `--drp-loader-border-width` |
| CSS `--drp-loading-spinner-color` | `--drp-loader-color` |
| CSS `--drp-loading-spinner-accent` | `--drp-loader-accent` |
| `picker.selectedDateReactive` | `picker.selectedDate` (get/set) |
| `picker.selectedDatesReactive` | `picker.selectedDates` (get/set) |
| `picker.selectedRangesReactive` | `picker.selectedRanges` (get/set) |
| `picker.selectedStartDate = d` / `selectedEndDate = d` (raw write) | `picker.selectedRanges = [{ start, end }]` (start/end are now read-only) |
| *(selectedDatetime was read-only)* | `picker.selectedDatetime = date \| isoString` (splits into date + time) |
| `picker.monthDates` | `picker.visibleMonthDates` (or `visibleMonths[i].firstDate`) |
| `picker.displayMonths` | `picker.visibleMonths` (`{ month, year, firstDate, lastDate, gridStart, gridEnd }`) |
| *(no visible-grid range accessor)* | `picker.visibleDateRange` → `{ start, end }` |
| `picker.showingRollingSelector` | `picker.rollingSelectorOpenByColumn` |
| `picker.showingUnifiedRollingSelector` | `picker.isUnifiedRollingSelectorOpen` |
| `picker.getEffectiveYearRange()` / `getEffectiveMonthRange()` | `getAvailableYearRange()` / `getAvailableMonthRange()` |
| `picker.isDateDisabledInternal(d)` | `picker.isDateDisabled(d)` |
| `picker.getDayMetadataInternal(d)` | `picker.getDayMetadata(d)` |

## [1.14.0-rc02] - 2026-06-16 [PUBLISHED]

Naming-alignment pass against the BlissFramework web-component guidelines plus one behavior fix and a handful of structural polish items. Closes five auto-script flags by renaming TS types, boolean public attributes, two internal handler methods, one internal type alias, and a CSS modifier class; adds three CSS-level structural fixes (FOUC, `:host` display, `--drp-font-family` declaration) and a discovery aid for the consumer-data classifier convention. **Breaking change** for any consumer that depends on the old names — see migration table below.

### Added — structural CSS fixes

- **FOUC prevention** — `src/css/base.css` now declares `web-daterangepicker:not(:defined)` reserving the input footprint (`inline-block`, min-height matching the default 35px input) while the custom element is undefined. Eliminates the flash + layout shift between page parse and `customElements.define(...)` upgrade. Ships in light DOM via `dist/style.css`.
- **`:host { display: block }`** in `src/css/variables.css`. Custom elements default to `display: inline`; the explicit declaration prevents the picker from collapsing to inline-level layout and breaking input width / popover offset math.
- **`--drp-font-family` declared on `:host`** with the `var(--base-font-family, inherit)` chain. Consumers can now override `--drp-font-family` on the host element and have it actually take effect — previously the variable was read but never declared, so overrides were ignored.

### Added — classifier convention discovery examples

- **`examples-badges-tooltips.html`** gained a "Consumer-Data Classifier Classes" section with three demos: built-in `dayClass: 'event' | 'holiday'` tints (consume `--drp-event-color` / `--drp-holiday-color`); built-in `badgeClass: 'badge-number' | 'badge-count' | 'badge-text'` styles (consume `--drp-badge-*-bg` / `--drp-badge-*-color`); a custom-classifier demo (`'salsa' | 'rumba' | 'pilates'`) showing how to ship classifier CSS into the shadow DOM via `customStylesCallback`.
- **`examples-theming.html`** Test 9 panel — three pickers with identical data, only `--drp-*` overrides differ. Shows that recoloring the built-in classifier conventions doesn't require a CSS rewrite.

### Renamed — TS types (closed-set suffix compliance)

| Old name | New name | Used at |
|---|---|---|
| `FormatInfo` | `FormatOptions` | `import { FormatOptions } from '@keenmate/web-daterangepicker'` |
| `TimeFormatInfo` | `TimeFormatOptions` | Internal; surfaced via time-mode callbacks |
| `DateInfo` | `DayMetadata` | Return type of `getDateMetadataCallback` |
| `SummaryCallbackData` | `SummaryDetail` | Argument to `formatSummaryCallback` |
| `DayRenderData` | `DayRenderContext` | Argument to `renderDayCallback` / `renderDayContentCallback` |
| `ClickEventType` | `ClickEventName` | Internal-only; not exported from package barrel |

### Renamed — boolean public attributes (is/should/has/can prefix per C-NC-3)

| Old HTML attribute | New HTML attribute | Old JS key | New JS key |
|---|---|---|---|
| `show-seconds` | `is-seconds-shown` | `showSeconds` | `isSecondsShown` |
| `show-now-button` | `is-now-button-shown` | `showNowButton` | `isNowButtonShown` |
| `close-on-scroll` | `should-close-on-scroll` | `closeOnScroll` | `shouldCloseOnScroll` |
| `unified-navigation` | `is-unified-navigation-enabled` | `unifiedNavigation` | `isUnifiedNavigationEnabled` |
| `unified-header-interactive` | `is-unified-header-interactive` | `unifiedHeaderInteractive` | `isUnifiedHeaderInteractive` |
| `highlight-disabled-in-range` | `should-highlight-disabled-in-range` | `highlightDisabledInRange` | `shouldHighlightDisabledInRange` |
| `show-today-button` | `is-today-button-shown` | `showTodayButton` | `isTodayButtonShown` |
| `show-clear-button` | `is-clear-button-shown` | `showClearButton` | `isClearButtonShown` |
| `show-apply-button` | `is-apply-button-shown` | `showApplyButton` | `isApplyButtonShown` |
| `show-summary` | `is-summary-shown` | `showSummary` | `isSummaryShown` |

`unified-navigation-anchor-index` / `unifiedNavigationAnchorIndex` was NOT renamed — it's a numeric index, not a boolean, and the prefix rule doesn't apply.

### Renamed — internal handler methods (C-NC-9)

| Old | New |
|---|---|
| `DateRangePicker.startDrag(...)` | `DateRangePicker.handleStartDrag(...)` |
| `DateRangePicker.onDragMove(...)` | `DateRangePicker.handleDragMove(...)` |

The pure-function namespace (`Interaction.startDrag`, `Interaction.onDragMove`) keeps its original names — those are Service-layer collaborators, not handler methods.

### Renamed — CSS modifier class (BEM compliance)

| Old | New |
|---|---|
| `.drp-transitions-enabled` (single hyphen) | `.drp__picker--transitions-enabled` (full BEM block-modifier) |

The `enable-transitions` HTML attribute name is unchanged; only the internal class flipped. This was part of the v1.14.0-rc01 → rc02 BEM cleanup.

### Removed — no backwards-compat aliases

This release ships **no `@deprecated` aliases**. Old names will produce TypeScript compile errors and HTML attribute reads will return `null`. Consumers must update their integration code at upgrade time. If you need a transitional window, pin to `1.14.0-rc01`.

### Migration recipe

Find-and-replace (case-sensitive) for each row above. The `unified-navigation` rename has a substring collision with `unified-navigation-anchor-index` — rename the longer name first (or use word-boundary regex) so it survives the rename pass.

### Fixed — sibling-picker overlap on focus switch

Clicking from input A to input B while picker A's popover was open showed both popovers stacked for ~150–300ms before A closed. The `outsideClick`-driven hide on A only fires at the document `click` event, which is several event-loop ticks after picker B's `pointerdown` listener fires `show()`. The visible gap was the natural mousedown → click delay, not a CSS transition.

The existing `drp-picker-activated` custom event (dispatched by `setCalendarActive()` on every `show()`) already broadcasts to sibling pickers — previously they only used it to flip `isCalendarActive = false` for keyboard-focus tracking. The handler at `src/date-picker.ts:111-119` now also calls `hide()` when the receiving picker's popover is currently visible, collapsing the overlap window to a single paint frame. `hide()` is a no-op for inline-mode pickers, so they're untouched.

### Validator status after this release

Closes C-CST-8, C-NC-3, C-NC-6 (documented), C-NC-9, C-NC-11. C-CSS-7 / C-NC-8 remain ⚠️ Exception (consumer-data discriminator classes — see `README.md → ## Known Limitations`). README migration (8 C-RS-* checks) is the next outstanding work item.

---

## [1.14.0-rc01] - 2026-06-11 [PUBLISHED]

Release candidate consolidating three waves of work since v1.13.0: foundational time/datetime picker (originally drafted as v1.14.0), three new time-display UIs — clock + wheel + compact (v1.15.0), and the dark-mode + positioning + cross-component theming alignment work (v1.16.0). Mirrors web-multiselect v1.11.0 so KeenMate components stay coherent. Published under the `rc` dist-tag; `latest` stays at v1.13.0 until the rc is promoted.

### Added — Time picker and datetime mode

- **New `picker-mode` attribute** with three values: `date` (default, unchanged), `time` (rolls-only popover for picking hours/minutes), and `datetime` (calendar grid and time rolls side-by-side in one popover). Orthogonal to the existing `selection-mode` — date mode keeps the full single/range/multiple matrix. Time and datetime modes are single-only in this rc; range/multiple silently falls back with a console warning (range datetime will land later).
- **Rolling-list time rolls** reuse the existing year/month rolling-selector UI pattern (`.drp__rolling-list` + `.drp__rolling-item`) so they inherit theming hooks for free. Two-to-four columns: hours, minutes, optional seconds, optional AM/PM. Click an item to commit; the highlighted item snaps to the current selection.
- **Time configuration attributes:**
  - `time-format-mask` — tokens `HH`/`H`/`hh`/`h`/`mm`/`m`/`ss`/`s`/`a`. Default `HH:mm`. AM/PM column appears when the `a` token is present.
  - `display-time-format-mask` — parallel to `display-format-mask` for localized placeholder.
  - `time-step` — minute/second increment shown in the rolls (e.g., `time-step="15"`). Default `1`.
  - `hour-cycle` — `h12` or `h24`. Auto-derived from the mask (`a` token → h12); explicit attribute wins.
  - `show-seconds` — adds the seconds roll. Auto-derived from `s` token in the mask; explicit attribute wins.
  - `show-now-button` — adds a "Now" button next to Today/Clear/Apply. Default true in time/datetime, ignored in date mode.
- **`autoClose` default flips to `'apply'`** in time/datetime modes so each roll-click doesn't slam the popover shut between hour and minute. User-supplied `auto-close` still wins.
- **`normalizeDate()` gained a `preserveTime` flag** (default `false` — existing callers unchanged). `initialDate` parsing flips it on in time/datetime modes, so `initial-date="2026-05-23T14:30"` survives both the parse and ISO string handling. Other call sites (`minDate`, `maxDate`, `disabledDates`, day-iteration helpers) stay midnight by design.
- **Locale strings:** added `time`, `now`, `am`, `pm` to `LocaleStrings`. Hardcoded for the four bundled locales (en/de/fr/es). `customStrings` override still works.
- **CSS surface:** new `time-picker.css` partial. New variables `--drp-time-picker-gap`, `--drp-time-picker-padding`, `--drp-time-picker-roll-min-width`, `--drp-time-picker-roll-min-height` (180px default, intrinsic floor for the rolls in time-only mode), `--drp-time-picker-separator-color`, `--drp-time-picker-label-color`, `--drp-time-picker-main-gap`, `--drp-datetime-min-width` (560px default, popover comfort floor in datetime mode). New BEM classes `.drp__main` (datetime row wrapper), `.drp__time-picker`, `.drp__time-rolls`, `.drp__time-column`, `.drp__time-column-header`, `.drp__time-roll`, `.drp__time-separator`, `.drp__time-label`, plus root modifiers `.drp__picker--time` and `.drp__picker--datetime`. `@media (max-width: 600px)` collapses datetime to a vertical stack on narrow viewports / modal mode.
- **New `examples-time-picker.html`** with 8 scenarios covering the format mask permutations, time-step, seconds, datetime, the range fallback, and ISO-datetime `initial-date`.

### Added — Three new time-display UIs (clock + wheel + compact)

`time-display` now accepts **four** values: `rolls` (default, unchanged behavior), `clock`, `wheel`, and `compact`. Rolls stays the default — no migration required. All three new modes work in `picker-mode="time"` and `picker-mode="datetime"` and reuse the existing `selectHour` / `selectMinute` / `selectSecond` / `selectAmpm` / `commitTimeSelection` pipeline, so theming tokens (`--drp-accent-color` etc.) cascade automatically and Apply/Cancel/Now buttons work unchanged.

#### Clock-face time picker (`time-display="clock"`)

- **Two-step Material flow.** Header shows the current selection as big `HH:MM` digit buttons. The dial starts on hours; clicking an hour auto-advances to the minutes face. Clicking either digit in the header jumps back to that step. The face re-opens on the hours step every time the popover opens.
- **h24 dual ring.** Outer ring 1-12, inner ring 13-24 with 24 sitting at the 12-o'clock position (so the dual ring reads as "top = midnight + noon"). The hand length shortens to point at the inner ring when an h24 inner-ring value is selected. h12 mode uses the outer ring only plus the AM/PM toggle.
- **`60 % time-step === 0` enforced in clock mode.** Non-divisor steps (e.g., `time-step="7"`) log a console warning and fall back to `time-step=1`. The rolls mode is unaffected — it still handles arbitrary steps. Valid clock steps: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30. For steps ≥ 5, only valid values get labels; for steps in {1,2,3,4}, labels stay at the 12 standard 5-minute marks and clicks snap to the nearest valid value.
- **Seconds dropped in clock mode.** A third clock step would clutter past usefulness; if `show-seconds=true` is set alongside `time-display=clock`, a warning fires and the seconds value stays at 0 (the format mask is still honored, e.g. `HH:mm:ss` produces `14:30:00`). Set `time-display=rolls` to pick seconds.
- **Header AM/PM indicator (h12 only).** After the `HH : MM` digits, a small `AM`/`PM` label surfaces the current half so it's legible without scanning down to the toggle buttons. Falls back to the focus-hour-derived half before the user commits, and the toggle buttons honor the same fallback so the indicator and the buttons never disagree.
- **Hover preview + rim selection (Material-style).** Hovering a number now paints a semi-transparent accent circle (same `color-mix` recipe and 18% opacity as the range-mode day hover-preview, so the two interactions feel coherent). Click commits and the value gets a rim (inset box-shadow) instead of a solid fill — the value text stays readable, the rim frames it. The marker tracks the focused value (committed if any, otherwise the open-time snapshot) so the hand and the rim always agree, including on first render.
- **No separate hand tip.** Original Material-style translucent tip ball was removed in favor of the rim above. The hand is just a clean line, shortened by half a button-size so it terminates at the rim's near edge instead of running through the value's center.
- **CSS surface:** new `clock-picker.css` partial. New variables `--drp-clock-size`, `--drp-clock-face-bg`, `--drp-clock-radius-outer` / `--drp-clock-radius-inner` / `--drp-clock-radius-minute`, `--drp-clock-number-size` / `--drp-clock-number-size-inner`, `--drp-clock-number-font-size`, `--drp-clock-number-color`, `--drp-clock-number-bg-hover` (resolves to the semi-transparent accent preview), `--drp-clock-number-rim-color` / `--drp-clock-number-rim-width`, `--drp-clock-hand-color` / `--drp-clock-hand-width` / `--drp-clock-hand-pivot-size`, `--drp-clock-header-digit-font-size` / `--drp-clock-header-digit-color` / `--drp-clock-header-digit-color-active`, `--drp-clock-header-sep-color`, `--drp-clock-ampm-*`. New BEM classes `.drp__clock-picker`, `__clock-header`, `__clock-header-digit` (+ `--active`), `__clock-header-sep`, `__clock-header-ampm`, `__clock-face`, `__clock-number` (+ `--inner`, `--selected`), `__clock-hand` (+ `--outer` / `--inner` / `--minute` ring modifiers), `__clock-ampm`, `__clock-ampm-button` (+ `--selected`).
- **5 new clock demos in `examples-time-picker.html`:** h12-with-AMPM, h24-dual-ring, 15-minute-step, non-divisor-step (warning fires), and datetime side-by-side. Sizing demo (`examples-sizes.html`) and theming demo (`examples-theming.html`) also gained clock variants exercising scale and theme overrides.

#### Wheel barrel time picker (`time-display="wheel"`)

iOS UIPickerView aesthetic: snap-scrolling columns for hours, minutes, optional seconds, and optional AM/PM, with a center selection band that frames the active value and top/bottom fade gradients that produce the curved-barrel look.

- **Scroll-to-commit.** Each column commits its centered value automatically once scrolling settles (120 ms debounce on `scroll`). Clicking any visible row smoothly scrolls it to the center band and commits at the end of the animation. No per-item selected highlight — the band IS the selection indicator.
- **Supports every `time-step`.** Unlike the clock face, the wheel works with any step (1, 7, 13, anything) because rows are linear, not angular. The minutes/seconds columns just enumerate `0, step, 2·step, …` and snap clicks to the nearest valid value.
- **Seconds supported.** Three- or four-column layout when `time-format-mask` contains `s` / `ss`.
- **h12 mode** appends a narrow AM/PM column with the same band + snap behavior; toggling the AM/PM half shifts the hour-of-day accordingly (matches the rolls' `selectAmpm` semantics).
- **Coherent scaling.** All metrics (band height, item height, fade height, column min-width) derive from `--drp-rem` and `--drp-wheel-item-height`, so the whole barrel scales together when the host element resizes.
- **CSS surface:** new `wheel-picker.css` partial. New variables `--drp-wheel-bg`, `--drp-wheel-band-bg`, `--drp-wheel-item-height` (drives band + fade), `--drp-wheel-item-font-size`, `--drp-wheel-item-color`, `--drp-wheel-item-color-hover`, `--drp-wheel-item-color-selected`, `--drp-wheel-column-gap`, `--drp-wheel-column-min-width`, `--drp-wheel-ampm-min-width`, `--drp-wheel-min-height`, `--drp-wheel-fade-height`. New BEM classes `.drp__wheel-picker`, `__wheel-rolls`, `__wheel-band`, `__wheel-column-wrapper`, `__wheel-column-header`, `__wheel-column` (+ `--ampm`), `__wheel-item` (+ `--selected`).

#### Compact pills time picker (`time-display="compact"`)

iOS 14+ aesthetic: tappable HH : MM (and optional SS) pills with optional AM/PM toggle. The calmest of the four UIs — basically inline numeric inputs styled as accent-colored pills. Fits naturally into form layouts.

- **Tap to type.** Clicking a pill enters edit mode (`contentEditable`) and selects the current text so the first keystroke replaces it. Enter or blur commits; Escape reverts to the previous value.
- **Keyboard increments.** While editing, Arrow Up/Down nudge by one (for hours) or by `time-step` (for minutes/seconds), keeping the pill in edit mode for further bumps.
- **Clamp + snap on commit.** Hours clamp to `[1..12]` (h12) or `[0..23]` (h24); minutes/seconds clamp to `[0..59]` and snap to the nearest multiple of `time-step` (so `time-step="15"` + typing `:22` commits as `:15`).
- **Renderer preserves edit state.** A sibling field's commit triggers a re-render, but the in-edit pill is skipped (`isContentEditable` guard) so typing isn't blown away mid-flight.
- **Uncommitted state visually distinct.** Pills show the open-time snapshot in a quieter weight/color until the user actually types — same focus-value pattern used by the rolls/clock/wheel.
- **CSS surface:** new `compact-picker.css` partial. New variables `--drp-compact-pill-bg` (defaults to accent @ 12%), `--drp-compact-pill-bg-hover` (accent @ 20%), `--drp-compact-pill-color`, `--drp-compact-pill-color-uncommitted`, `--drp-compact-pill-font-size`, `--drp-compact-pill-padding-v` / `-h`, `--drp-compact-pill-focus-ring`, `--drp-compact-sep-color`, `--drp-compact-ampm-bg` / `-bg-selected`, `--drp-compact-ampm-color` / `-color-selected`. New BEM classes `.drp__compact-picker`, `__compact-row`, `__compact-pill` (+ `--committed`), `__compact-sep`, `__compact-ampm`, `__compact-ampm-button` (+ `--selected`).

#### Demos (all three new pickers)

`examples-time-picker.html` gained 10 new cards: 5 wheel variants (h24 default, h12 with AM/PM, with seconds, 5-minute step, datetime side-by-side) and 5 compact variants (h24 default, h12, with seconds, 15-minute step, datetime). `examples-sizes.html` and `examples-theming.html` both gained wheel + compact sections exercising scale (small/medium/large) and theme overrides (green/red/purple/dark).

### Added — Dark mode, layout cascade, and positioning

- **`light-dark()` defaults across the color palette** — Every `--base-*` fallback that previously held a hardcoded light color now resolves via `light-dark(<light>, <dark>)`. When the consumer's page declares `color-scheme: dark` anywhere in the ancestor chain (`:root`, `body`, etc.), the picker picks up readable dark defaults automatically — no need to enumerate ~15 variable overrides. Affected variables: `--drp-text-primary`, `--drp-text-secondary`, `--drp-border-color`, `--drp-input-bg`, `--drp-dropdown-bg`, `--drp-tooltip-bg`, `--drp-tooltip-text-color`, `--drp-loading-overlay-bg`, and the full `--drp-message-{error,warning,info,success}-{bg,color,border}` palette.
- **Drift-detection warning for calendar positioning edge cases** — Every position pass verifies the calendar landed where the library told the browser to put it. If it drifts (e.g. an ancestor establishes a fixed-positioning containing block via a CSS property the library's heuristic doesn't recognize), a `console.warn` fires once per picker instance naming the likely culprit element and its responsible CSS, plus an actionable fix: replace `contain:` / `container-type:` on the ancestor with `transform: translateZ(0)`, or move the trigger out of that subtree.
- **`test/dark-mode.html` + `e2e/dark-mode.spec.ts`** — fixture and 4-spec contrast suite. Verifies day hover and selected states maintain WCAG-AA contrast (≥ 3:1) on a dark page across three configurations: fully-themed, minimal-override, and pure OS-color-scheme inheritance with zero overrides.
- **Framework-class and per-instance dark/light mode selectors** in a new `src/css/dark-mode.css` partial. `:host-context([data-theme="dark"])`, `:host-context([data-bs-theme="dark"])` (Bootstrap 5.3+), and `:host-context(.dark)` (Tailwind) now flip the picker to dark when a framework class is set on any ancestor — previously only the page-level `color-scheme: dark` signal worked. Per-instance `<web-daterangepicker data-theme="dark">` on the host element gives the picker its own theme regardless of the surrounding page. Symmetric `light` selectors restore the light palette so a single widget can be forced back to light on an otherwise-dark page.
- **CSS cascade layers** in `src/css/main.css`. The stylesheet now declares `@layer variables, component, overrides;` and every `@import` lands in its layer. Consumers get a clean override contract: any unlayered `web-daterangepicker { … }` rule wins without `!important`; any `:root { --base-X: … }` declaration beats the variables layer; the dark-mode blocks (in `overrides`) can be overridden via consumer `@layer overrides { … }` or unlayered rules.
- **Canonical Tier-2 file set** in `src/css/` — every component in the KeenMate suite now ships with the same fixed set of stylesheets, so a developer learning the second one already knows the file layout. New files: `controls.css` (input field + wrapper), `floating.css` (tooltips; the popover root chrome stays in `base.css`), `states.css` (cross-feature state modifiers — opt-in transitions, inline-mode root modifier), `animations.css` (the `drp-spin` `@keyframes`). The old `tooltips.css` and `modifiers.css` partials were merged into the new files and removed.

### Changed

- **BEM short-prefix class names.** Every shadow-DOM class was renamed to follow the canonical `.<prefix>__<element>` pattern documented in the cross-component guidelines. The root container `.drp-date-picker` becomes `.drp__picker`; every element class drops the `-date-picker` segment; the legacy `.drp-date-picker-input*` aliases and the standalone `.drp-input*` are unified under `.drp__input*`. Migration table for the most common selectors:

  | pre-rc | 1.14.0-rc01 |
  |--------|-------------|
  | `.drp-date-picker` | `.drp__picker` |
  | `.drp-date-picker--inline` | `.drp__picker--inline` |
  | `.drp-date-picker--modal` | `.drp__picker--modal` |
  | `.drp-date-picker__day` | `.drp__day` |
  | `.drp-date-picker__day--selected` | `.drp__day--selected` |
  | `.drp-date-picker__month` | `.drp__month` |
  | `.drp-date-picker__rolling-item` | `.drp__rolling-item` |
  | `.drp-date-picker__action-btn` | `.drp__action-btn` |
  | `.drp-date-picker__tooltip` | `.drp__tooltip` |
  | `.drp-input`, `.drp-date-picker-input` | `.drp__input` |
  | `.drp-input--xs`, `.drp-date-picker-input--xs` | `.drp__input--xs` |

  Public API impact: **none for variable-only theming**. Internal class names live in the shadow DOM and aren't reachable from light-DOM CSS, so consumers using `:root { --drp-X: ... }` or `web-daterangepicker { --drp-X: ... }` see no change. Anyone using `customStylesCallback` to inject CSS into the shadow root must update their selectors to the new names. Bundled built CSS shrunk ~7% as a side benefit of the shorter class names.

- **`--base-*` theming taxonomy aligned with cross-component naming.** The picker now reads the more specific hover/active/elevated/inverse vars. Consumer-side migration table:

  | Read pre-rc | Now (1.14.0-rc01) |
  |---|---|
  | `--base-main-bg` (for hover surfaces) | `--base-hover-bg` |
  | `--base-hover-bg` (for active surfaces) | `--base-active-bg` |
  | `--base-dropdown-bg` | `--base-dropdown-bg` → `--base-elevated-bg` (chain) |
  | `--base-tooltip-bg` | `--base-tooltip-bg` → `--base-inverse-bg` (chain) |

  Consumers driving the picker's hover color via `--base-main-bg` should set `--base-hover-bg` explicitly going forward (the picker now picks up cross-component hover semantics from there). `--base-dropdown-bg` and `--base-tooltip-bg` continue to work as primary overrides; the new chain only adds a second-tier fallback. Aligns with web-multiselect 1.11.0's taxonomy so apps mixing KeenMate components can theme both via one shared base layer.
- **`--drp-primary-bg` hover color now stays visible on dark themes without extra overrides.** It used to fall back to a flat `var(--base-main-bg, #f3f4f6)`, which made the hover state collapse onto the panel background on dark themes (illegible). Now mixes 8% of `--drp-text-primary` into `--base-main-bg`, so the hover is always a visible step toward the text — darker on light themes, lighter on dark. `--drp-primary-bg-hover` uses the same pattern with 14%.
- **Message colors (`--drp-message-{error,warning,info,success}-*`) gained dark-mode companions.** Previously hardcoded bright light-mode pastels (`#fef2f2`, `#fffbeb`, …) that read poorly on dark surfaces. Now resolve via `light-dark()` to muted, accent-tinted dark substrates with their lighter hue companions for text — visually distinct on either page background without consumer overrides.
- **Range-fill / hover-preview / drag-preview / drag-invalid backgrounds now adapt opacity per color-scheme.** The mix recipe `color-mix(accent X%, transparent)` was calibrated against white panels where the accent is darker than bg; the same X produces a barely-perceptible step on dark themes where the accent is typically *lighter* than bg (tokyo-night, dracula, etc.). Each of the seven day-state opacity tokens (`--drp-day-in-range-bg-opacity`, `--drp-day-in-range-hover-bg-opacity`, `--drp-day-hover-preview-bg-opacity`, `--drp-day-hover-preview-invalid-bg-opacity`, `--drp-day-drag-preview-bg-opacity`, `--drp-day-drag-preview-edge-bg-opacity`, `--drp-day-drag-invalid-bg-opacity`) gained a `-dark` companion (~1.6× the light value) and the partials now consume newly-composed `--drp-day-{in-range,in-range-bg-hover-color,hover-preview,hover-preview-invalid,drag-preview,drag-preview-edge,drag-invalid-bg-mix}-bg` color tokens that pick the right opacity via `light-dark()`. Light themes render verbatim; dark themes get a visibly tinted cell at the same recipe ratio. Consumers can override either side of the pair, or replace the composed color outright. Same treatment applied to `--drp-clock-number-bg-hover` (clock face hover preview reuses the day token).

### Fixed — Time picker / datetime dogfooding

- **Time selection split into three separate fields.** `selectedDate` stays date-only (date/datetime modes), `selectedTime: SelectedTime | null` holds nullable `{hour, minute, second, ampm}` parts, and a `selectedDatetime` derived getter composes the two when needed. Replaces the earlier "Y/M/D pinned to today + flags array" shape — single source of truth per field, no double-bookkeeping between the picker's internal `Date` and the committed values.
- **`showApplyButton` now flips alongside `autoClose`** in time/datetime modes. Previously only `autoClose='apply'` was set by default, so the Apply button was required to commit but never rendered — every time selection silently vanished on close. Both options now flip together; explicit user overrides still win.
- **`formatInputValue` recognized time-only mode**. The previous gate on `selectedDate` made the input stay empty in time mode even after Apply (no date is set in time mode by design). New `pickerMode === 'time'` branch formats from `selectedTime`.
- **Rolls re-center on every open with a pre-existing selection.** `show()` now sets a one-shot `forceTimePickerScroll` flag and re-renders the time picker on each open in time/datetime modes. The "already visible" early-return in `scrollFocusIntoView` is bypassed when the flag is set, so a `selectedTime` from `initial-date` (or from a prior committed value) always lands centered.
- **h12 hour click was a no-op (rolls).** The roll items emitted `data-hour-12` but the click router read `el.dataset.hour12` — per the DOMStringMap rule, a hyphen followed by a digit is not consumed, so `hour-12` stays `hour-12` in the dataset. Renamed to `data-hour12` so it camelCases cleanly. h24 mode was unaffected (already `data-hour`).
- **Datetime layout: calendar + time picker now actually render side-by-side.**
  - Removed `container-type: inline-size` on `.drp__picker--datetime`. Inline-size containment by spec makes the element's width independent of its contents, which pinned the popover at the `min-width` floor and squeezed the calendar below its 280px intrinsic minimum. The `@container` query was replaced with a `@media (max-width: 600px)` viewport breakpoint, which is the appropriate scoping for a `position: fixed` popover.
  - Set a 560px `min-width` floor on the popover via `--drp-datetime-min-width` so the row layout has room before the breakpoint kicks in.
  - Dropped `min-width: 0` on the inner `__main > __months` and `__time-picker` rules so each panel's intrinsic min-content propagates and the popover grows naturally to fit calendar (~280px) + time picker (~280-320px depending on `show-seconds` / `hour-cycle`) + gap.
- **Time-only mode skips the `__main` wrapper** entirely and mounts the time picker as the direct flex-column child of the popover. Avoids an unnecessary scroll container and matches the date-only path's "single primary child" shape.
- **`__main` scrollbar artifacts**. Originally had `overflow-y: auto`, which per CSS spec coerces `overflow-x: visible` to `auto` (the one-axis rule), producing a spurious horizontal scrollbar at the bottom of the popover. Now `overflow: hidden`, with the inner `__main > __months` carrying its own `overflow-y: auto; overflow-x: hidden` for tall multi-month layouts.
- **Focused-day outline no longer clipped at the calendar's left edge in datetime mode.** The `padding-inline: 4px` allowance from `base.css` only matches `.drp__picker > __months` (direct child) and didn't apply once `__main` sat in between. Mirrored the padding onto the `__main > __months` rule.
- **Time rolls fill the available height to match the calendar.** Previously a fixed `max-height: 280px` cap left a gap below the rolls; the obvious fix (drop the cap, let the rolls flex-grow) made the rolls' 24-hour intrinsic content push the popover to ~960px. Final shape: `flex: 1 1 0` on the roll — basis 0 contributes no intrinsic height, so `__main` is driven by the calendar, `__time-picker` stretches to match via `align-items: stretch`, and the roll grows to fill whatever vertical space the time picker has left.
- **Time-only rolls render at any scale.** With `flex: 1 1 0` and `min-height: 0`, the whole column chain collapsed to zero when nothing in the row provided an intrinsic height — i.e. time-only mode without an AM/PM column (whose own `min-height` was previously the only thing pushing the row open). Added `--drp-time-picker-roll-min-height` (`calc(18 * var(--drp-rem))`, ~5-6 items visible at every scale); in datetime mode the calendar is still taller so the floor stays invisible. Demoed in the new "Time Picker — Scaling" and "Datetime Picker — Scaling" cards on `examples-sizes.html`.
- **Roll item digits center horizontally.** The cell already had `justify-content: center`, but the `.__rolling-item-text` wrapper is `width: 100%` (for month-name ellipsis), so the short digit labels fell back to left-aligned text. Time-roll text now gets `text-align: center` (scoped to time rolls only, so month names keep their ellipsis layout).

### Fixed — Clock face dogfooding

- **Number ring positioning broken at non-default `--drp-rem`.** The renderer was reading `--drp-clock-radius-*` via `getComputedStyle.getPropertyValue`, which returns the literal `calc(...)` token sequence for unregistered custom properties — `parseFloat` then returned `NaN` and the code fell through to a hard-coded fallback (110/75) that only happened to match the actual radius at the default scale. Switched to a temp-ruler measurement, then to `sizePx × known-ratio` when the ruler returns `0` (initial render before layout has run, which is most of the time for inline pickers).
- **Hand length wrong at non-default `--drp-rem`.** Hand height was driven by an inline `--drp-clock-hand-length: var(--drp-clock-radius-X)` (var inside var via inline style), which turned out to be unreliable across browsers — the fallback to `--drp-clock-radius-outer` was leaking through at scaled sizes, making the hand too long for the inner ring. Replaced with three modifier classes (`__clock-hand--outer` / `--inner` / `--minute`) so each ring's radius resolves once in CSS with no JS indirection.
- **`hour-cycle="h12"` clicks were a no-op (clock).** The renderer emitted `data-hour-12` but the click router read `el.dataset.hour12` — per the DOMStringMap rule, a hyphen-before-digit isn't consumed, so `hour-12` stays `hour-12` in the dataset. Renamed to `data-hour12` (and the clock equivalent `data-clock-hour12`) so they camelCase cleanly.
- **Clock face overflowed narrow containers.** Face was `width: var(--drp-clock-size)` (fixed 280px) and would clip outside the popover on mobile-width viewports or stacked datetime mode. Capped via `width: min(var(--drp-clock-size), 100%)` + `aspect-ratio: 1`, and refactored all internal dial dimensions (`--drp-clock-radius-*`, `--drp-clock-number-size*`) from rem multipliers to percentages of the face. Whole dial now shrinks coherently — radii, numbers, hand, hover preview, rim — when the container forces a smaller width.

### Fixed — Responsive layout (calendar + actions)

Surfaced while dogfooding the new datetime+clock combos on narrow viewports; the fixes apply to every mode (date / time / datetime).

- **Calendar columns now shrink to fit narrow containers.** The weekdays grid and the day-cells grid both used `grid-template-columns: repeat(7, 1fr)`, which respects min-content per column — at scale-lg or in a tight popover the weekday labels' min-content (e.g. "WED" at the active font + padding) pushed the grid past the container and the rightmost columns got clipped or shoved off-screen. Switched both to `repeat(7, minmax(0, 1fr))` and added `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` on the weekday labels so they truncate when columns are narrower than the label.
- **Action button row now wraps.** `.drp__actions` was a non-wrapping flex row; with 4 buttons (Today, Now, Clear, Apply) at scale-lg or on a narrow popover the row overflowed past the picker edge. Added `flex-wrap: wrap` so buttons spill to a second row when they can't fit.

### Fixed — Positioning, hover-preview, base-* reads

- **Other-month days were barely visible during hover-preview / invalid-range highlight.** The `--other-month` cells get `opacity: 0.5` so the previous/next month tail of the grid reads as visually subordinate. The introduction of `--hover-preview` / `--hover-preview-invalid` (and the older `--invalid-range*` classes) added range-style highlights at low alpha (e.g. 18% hover-preview), but those classes weren't in the opacity-reset selector list — so the 50% dim multiplied the 18% bg down to ~9% effective alpha and the highlighted tail vanished, especially on softer themes (light pink, muted accent). The reset selector now covers all five preview / invalid-range modifier classes alongside the committed `--in-range` / `--range-start` / `--range-end` / `--drag-preview` it already handled. Other-month text stays muted (separate color rule) so the "next/prev month" signal is preserved.
- **Calendar positioned to the side of its input when an ancestor used `container-type` (or `contain:`).** Floating UI's default `getOffsetParent` walks up to a `container-type: inline-size` ancestor (per spec it establishes a containing block for fixed-positioned descendants), but in some shadow-DOM layouts the browser does *not* actually anchor the fixed calendar there, leaving Floating UI's coordinates offset by the wrapper's viewport-x. The library now installs a custom `getOffsetParent` (via Floating UI's `platform` override) that only walks up through properties the browser reliably honors for fixed positioning (`transform`, `perspective`, `filter`, `backdrop-filter`, qualifying `will-change`), ignoring `container-type` and `contain`. Most visible in apps built on pure-admin's `.pa-layout__main` wrapper. Same fix applied to day-cell tooltips.
- **Stray `var(--base-font-family)` read in `src/css/base.css`** removed from two `font-family:` rules. The component-local `--drp-font-family` is already defined on `:host` in `variables.css` with the same `--base-font-family` chain in its fallback, so reading it again at the use site was redundant and violated the "no `--base-*` outside `:host`" rule from the cross-component guidelines.

### Internal

- **Custom `getOffsetParent` helper + drift detector** in `src/date-picker-ui.ts` — `getFixedPositionOffsetParent`, `findDriftCulprit`, `listContainingBlockProps`, `verifyPanelLanded`. The drift detector measures `calendarRect.x - input.x` (and y) after every position pass and warns once per picker when |drift| ≥ 1px.
- **Manifest updated** — `component-variables.manifest.json` now lists `--base-active-bg`, `--base-elevated-bg`, `--base-inverse-bg` as consumed base variables, with updated descriptions for `--base-hover-bg`, `--base-dropdown-bg`, and `--base-tooltip-bg` to reflect the new cascade roles.
- **Manifest backfill — 81 component variables added.** `component-variables.manifest.json` was 81 entries behind `variables.css` — every `--drp-*` token added during the rc cycle (time picker, clock, wheel, compact, modal, message families) was declared on `:host` but never registered. Backfilled into seven new categories (`modal`, `time-picker`, `datetime`, `clock`, `wheel`, `compact`, `message`) plus extensions to existing `day` and `z-index` groups. The manifest now matches `:host` exactly: 292 entries on both sides, zero drift in either direction. Closes the C-BV-6 ("manifest matches code") check from the cross-component guidelines.
- **CSS file naming normalized** — every partial under `src/css/` dropped its leading underscore (`_variables.css` → `variables.css`, `_base.css` → `base.css`, etc.). The underscore signaled a SASS partial, which these files aren't; the new naming matches the cross-component guidelines. The two consumer-facing `package.json` exports (`./css/variables`, `./css/base`) preserve their public names and point at the renamed files. No public API change; consumers who imported the files by the underscore-prefixed path directly via `./src/css/*` need to update their import paths.
- **Build-script ordering fixed so type declarations actually ship.** The `build` script was `clean:dist && tsc && vite build` — tsc emitted `dist/**/*.d.ts` first, then vite's `emptyOutDir: true` (lib-mode default) wiped them. Reversed to `clean:dist && vite build && tsc` so the `dist/*.d.ts` declarations (the `package.json` `types` target) survive the build. This is the first version that actually ships its declared `types: "./dist/index.d.ts"` entry — earlier published tarballs went out without it.
- **Playwright e2e: clock fixture** — new `e2e/fixtures.ts` re-exports `test` with `page.clock.setFixedTime(new Date('2026-05-22T10:00:00'))` baked into every spec's `page` fixture, so date-dependent assertions (today-marker, `t`-key jump-to-today, Today button, `--today` class) pass on any host clock. All 27 spec files updated to import from `./fixtures` instead of `@playwright/test`.

### Notes

- **`var(--drp-X)` reads in feature files intentionally have no fallback.** The cross-component guideline's check (C-BV-2) says every `var()` should have a fallback, but the same guideline's canonical example shows `background: var(--wp-control-bg)` with no fallback at the use site. The reason: every `--drp-X` is declared on `:host` in `variables.css` with its own `--base-*` chain and `light-dark()` fallback — so the failure mode the check protects against ("loading the component without theme-designer") can't apply at the feature-file read. Adding ~600 literal fallbacks to mirror the `:host` defaults would make the code more verbose than the canonical example, and would create a duplicate source of truth. We follow the canonical example here. Other KeenMate libraries are expected to follow the same pattern.
- **No `:host { color-scheme }` declaration.** The picker deliberately does NOT declare `color-scheme` on `:host`. That declaration would override whatever the consumer's app declared on `<html>` / `<body>`, breaking dark-themed apps that signal their intent via `body { color-scheme: dark }`. `color-scheme` now inherits naturally from the consumer's page. (See the comment block at the top of `src/css/variables.css` for the full rationale.)

### Out of scope for the rc (warnings or documented limitations)

- Time/datetime + `selection-mode="range"` or `"multiple"` — falls back to single, warning logged once.
- `picker-mode="datetime"` + `month-layout="grid"` — forces horizontal, warning logged once (the grid wants 100% width and the time roll can't share the row).
- Input mask for time tokens — typing into the input field still triggers the date mask only. On reopen, the committed H/M/S survive because `updateCalendarFromInput` no-ops in time/datetime modes (the picker's `selectedDate` is authoritative).
- Per-hour disabling — `disabledDates` still disables whole days only.
- Keyboard navigation in time mode — arrow keys are short-circuited; selecting from the rolls is click-only. Escape closes.
- `min-time` / `max-time` constraint attributes — deferred.
- **Drag-the-hand interaction (clock).** Click-only at the rc. Reusing the existing range-mode drag machinery cleanly is a follow-up.
- **Seconds on the clock face.** Hard limitation — set `time-display="rolls"`, `"wheel"`, or `"compact"` to pick seconds.
- **Keyboard navigation on the clock face.** Arrow keys are not wired; Material's own picker also skips this. Tab between input and Apply still works.
- **Animation between hours and minutes steps (clock).** Instant swap at the rc.
- **Touch/pointer momentum on the wheel.** Native scroll-snap handles touch fine on iOS / Android browsers; desktop mouse-wheel works too. No custom inertia layer.
- **Keyboard navigation on the wheel.** Page/Up/Down would be a natural fit; deferred so the wheel ships small.
- **Numeric keypad on mobile for the compact pill.** Web platform doesn't expose a way to ask for the numeric keypad on a contentEditable; using `<input type="number">` would lose the styling parity. Compact remains text-input at the rc.

## [1.13.0] - 2026-05-22

### Added — Hover preview for half-selected range mode

- After the first click sets a start date in range mode, hovering over candidate end dates now paints the would-be range live with `--hover-preview` (or `--hover-preview-invalid` when the click would be rejected). Behavior is mode-aware per `disabled-dates-handling` so the preview is *honest* about what a commit would produce:
  - `allow` / `individual` — full range painted; disabled days keep their disabled overlay layered on top.
  - `prevent` — `--hover-preview-invalid` when the range would cross a disabled gap (telegraphs the rejection).
  - `block` — preview snaps backward to the last enabled day before the gap (teaches the snap behavior in advance).
  - `split` — disabled days stay bare so the visual gaps communicate the upcoming sub-range split.
  - Auto-swap when hovering before the committed start: preview paints (hovered)..(start) so the user can grow the range in either direction.
- Cleanup wired on commit, mouseleave, drag-start, hide, and destroy. The committed start day keeps its `--range-start` solid styling — `updateHoverPreview()` skips it so the cascade doesn't override the solid accent background with a translucent one (which would leave the on-accent text visually mismatched).
- New CSS hooks: `--drp-day-hover-preview-bg-opacity: 0.18` and `--drp-day-hover-preview-invalid-bg-opacity: 0.18`. The classes themselves derive their colors from `--drp-day-range-bg` and `--drp-day-drag-invalid-bg` via `color-mix`. 10 specs in `e2e/hover-preview.spec.ts`.

### Added — Other features

- **Weekend CSS hooks on day cells**: `.drp-date-picker__day--weekend` modifier on Saturday/Sunday, plus `data-weekday="0..6"` (matching `Date.prototype.getDay()`) on every cell. No default styling shipped — pure theming surface. `[data-weekday="5"]` for Friday-only treatment, `--weekend` for the standard Sat/Sun pair.
- **HTML attribute `disabled-dates`** — comma-separated ISO dates as a declarative alternative to the `disabledDates` property (e.g., `disabled-dates="2026-06-13, 2026-06-14, 2026-12-25"`). Whitespace tolerated; invalid entries silently dropped. The property still wins if both paths are populated (consistent with the other complex-data options' escape-hatch semantics).
- **HTML attributes for the `specialDates` member-mapping family**: `date-member`, `badge-text-member`, `badge-class-member`, `day-class-member`, `badge-tooltip-member`, `day-tooltip-member`, `is-disabled-member`. Brings the seven `*Member` props to attribute parity. Same property-wins precedence as `disabled-dates`.
- **Property setters for `customStrings` and `monthNames`** on the web component. Previously only reachable via `picker.updateOptions(...)` (which leaked the internal `picker` instance) or the dedicated `setMonthNames()` method. Both now work like the other ~35 property setters: `el.customStrings = { today: 'Jump' }` or `el.monthNames = ['01','02',...]`. `setMonthNames()` kept as a deprecated alias that forwards to the new setter.
- **`displayFormatMask` is now also used as the input placeholder** when no explicit `placeholder` is set. Explicit `placeholder=` still wins. Closes the loop on the option's documented purpose: localized format hint (`tt.mm.jjjj`, `dd.mm.rrrr`, `dd/mm/aaaa`) that consumers want shown to users in their language.
- **Compact `-` accepted in range typing mode** — `2026-06-10-2026-06-15` normalizes to `2026-06-10 - 2026-06-15`. Position-based fallback (anything past `maxLength` is the end side, with leading dashes/spaces stripped) so paste-style compact dashes Just Work alongside the new spaced separator.
- **Playwright e2e harness** with 172 specs covering selection, triggers, multi-month, keyboard, input behavior, date restrictions, disabled-handling, visual states, positioning, locale, theming, callbacks, tooltips, and the hover preview. Run with `npm run test:e2e` or `make test-e2e`.

### Changed

- **Range typing separator: `" to "` → `" - "`**. The auto-injected separator after a complete start date now matches the committed range format (`"YYYY-MM-DD - YYYY-MM-DD"`), and the keydown whitelist allows `-` and space instead of the English-only letters `t`/`o`. The old `" to "` was unusable in non-English locales anyway. Migration: anyone relying on literal `to` typing needs to switch to `-`.
- **`setMonthNames(arr)` deprecated** — use the `monthNames` property setter. The method now forwards to the setter; behavior is unchanged.
- **CLAUDE.md "Size System" section pruned** to reflect reality. The `spacing` / `font-size` / `cell-size` attributes and `.drp-spacing-*` / `.drp-font-*` / `.drp-cell-*` classes documented previously never existed in the code. Only `input-size` is an attribute; calendar sizing is theming-only via the `--drp-spacing-*` and `--drp-font-size-*` CSS tokens, with `--drp-rem` (default `10px`) as the global rescale knob (every size token is `calc(N * var(--drp-rem))`).
- **API.md events section** got a clarifying note: there are no separate `apply` or `cancel` events. The Apply button commits and dispatches `change`; Escape with an uncommitted selection silently restores the previous input value and fires nothing.

### Fixed

- **`custom-action` event was double-dispatched** on the web component. The picker's internal dispatcher already crosses the shadow boundary via `{ bubbles: true, composed: true }`; the manual re-emit in `web-component.ts` was redundant and outside listeners saw every event twice.
- **`disabled` setter only flagged the input element** — it didn't suppress programmatic `show()`. The picker could still be opened by `picker.show()` or any event path bypassing the browser's pointer-events block. `show()` now early-returns when `picker.input?.disabled` is true.
- **`actionButtons` setter required `customElements.whenDefined()`**. Properties assigned to a not-yet-upgraded element used to become own-properties that shadowed the class accessors forever. Added `_liftPreUpgradeProperties()` in `connectedCallback`: walks the prototype chain for `set` descriptors and re-routes any matching own-properties through their accessors. Fixes the issue for all 35+ property setters, not just `actionButtons` — consumers can now drop `whenDefined` calls before setting complex data.
- **Range-start day's font color was nearly invisible during hover-preview**. The new `--hover-preview` class (declared later in the cascade than `--range-start`) was overriding the solid accent background with a translucent one, leaving the white on-accent text visually mismatched. `updateHoverPreview()` now skips the committed start day so the cascade doesn't get crossed.
- **Horizontal scrollbar appeared on the months area when hovering a badge cell on the rightmost column**. The badge cell's `transform: scale(1.05)` hover effect pushed ~1–2px past the right edge; combined with the CSS-spec coercion (`overflow-y: auto` implicitly making `overflow-x` `auto`), that was enough to trip a scrollbar. **Fix:** `padding-inline: 4px` on the months container — gives breathing room for both the badge scale AND the focused-day outline (4px extent: 2px offset + 2px width), so neither overflows.
- **`'block' mode disabled-dates-handling`** — added a clarifying source comment above the `block` branch in `validateRangeAsync()`. Not a behavior change: `block` always meant "Yes, but shorter" (snap end to the last enabled day before the first disabled gap). The comment now documents the contract so the next reader doesn't mistake it for `prevent` (rejects) or `split` (returns sub-ranges with disabled days excluded from the middle).

## [1.12.0] - 2026-05-02 - PUBLISHED

### Added — Modal positioning mode

- **`positioning-mode="modal"`** — new third value for `positioningMode` alongside `floating` and `inline`. Renders the calendar as a centered overlay with a semi-transparent backdrop scrim instead of anchoring to the input. Solves the small-screen overflow problem: multi-month horizontal layouts that horizontally scrolled off-screen in floating mode now fit. Closes via backdrop click, Escape, Apply (range mode), or `autoClose='selection'`. Body scroll is locked while open (reference-counted so multiple modal pickers don't fight over `document.body.style.overflow`). The input is `blur()`-ed when the modal opens (suppresses the mobile soft keyboard) and re-focused on close. Demo in `examples-buttons.html` section 1b.

- **Per-tier modal width** (CSS variables, aligned with the `_base.css` 480 / 768 / 1200 breakpoint set):
  - `--drp-modal-width-xs` (≤ 480px) — fills viewport minus gap (~95vw)
  - `--drp-modal-width-sm` (481–768px) — fills viewport minus gap
  - `--drp-modal-width-md` (769–1200px) — `900px` (room for 2-month layouts)
  - `--drp-modal-width-lg` (≥ 1201px) — `1100px` (room for 3-month layouts and 2×3 grids as configured)

  Plus shared hooks: `--drp-modal-gap` (16px default), `--drp-modal-backdrop-bg`, `--drp-modal-transition`, `--drp-z-index-modal`, `--drp-z-index-modal-backdrop`. Override per-instance via the host element to retheme.

- **Responsive inner-content tiers (container-query driven)** — the modal scales not just its outer width but how many months it shows side-by-side, based on the modal's *actual* width rather than the viewport:

  | Modal width | Behavior |
  |-------------|----------|
  | ≤ 600px | 1 visible month — sibling columns hidden via `display: none`. Hidden columns still update in lockstep through the existing collision-resolve logic, so range selection across more months still works; the user navigates time linearly with prev/next. |
  | 601–900px | 2 columns. Flex-layout pickers hide months 3+; grid-layout pickers keep all configured months visible and just wrap into more rows. |
  | 901–1200px | 3 columns, same flex/grid distinction. |
  | > 1200px | Configured layout as-is. |

  All driven by `@container drp-modal (...)` rules in `_modal.css` — no JS state changes, no rebuild on resize.

- **Auto-engage modal at small viewports** — two new web component attributes that flip `positioning-mode` from the configured value to `modal` and back as the viewport crosses thresholds:
  - `mobile-modal-breakpoint="640px"` — viewport width threshold
  - `mobile-modal-min-height="500px"` — viewport height threshold

  Either attribute alone works; both together OR. Implemented with `matchMedia` listeners; only auto-engages when the configured mode is `floating` (pickers explicitly set to `inline` or `modal` are left alone). Uses the existing reactive `positioning-mode` rebuild path, so selection survives the transition (input value persists across rebuild and is re-parsed). Demo in `examples-buttons.html` section 1b.

### Added — Other features

- **`showSummary` option (web component attribute: `show-summary`)** — boolean flag to omit the range-mode selection summary block entirely. Default `true` (current behavior). Set to `false` (or `show-summary="false"`) when you want a clean range picker without the days/nights count line — previously the only workaround was `formatSummaryCallback = () => ''`, which still rendered an empty `<div>` with margin and border-top, causing a small layout jump. Structural option (toggling at runtime triggers a rebuild, since the `<div>` needs to be added/removed from DOM). Demo in `examples-buttons.html` section 1.

### Changed — Layout architecture

- **Flex-column scroll layout for floating + modal pickers** (lives in `_base.css` under `.drp-date-picker:not(.drp-date-picker--inline)`). Previously the entire picker was one big `overflow: auto` block; tall content (multi-month grids, 6-row months, etc.) caused the action bar to scroll out of view in floating mode and made days bleed visually behind the action bar in modal mode. Now:
  - Calendar is `display: flex; flex-direction: column; overflow: hidden`
  - Months area is the only scrollable region (`overflow-y: auto; flex: 1; min-height: 0`)
  - Header / unified-header / summary / action bar all `flex-shrink: 0` — pinned at top/bottom
  - The Floating UI `size` middleware no longer forces inline `overflow-y: auto` on the calendar; `_base.css` handles it via the flex layout

  Side benefit: the action bar (`Today` / `Clear` / `Apply`) is always visible regardless of how tall the multi-month content is.

- **Sticky per-month headers** — the per-month header (month name + prev/next, or static label in unified mode) is now `position: sticky; top: 0` within the scrolling months area. Single-row multi-month layouts get a continuous header strip; grid layouts stack-stick on each row as it scrolls past.

- **Always render 6 weeks per month** — the day grid now always renders exactly 42 cells (6 weeks × 7 days), regardless of whether the month fits in 5 or 6 weeks. Previously, 5-week months left empty space at the bottom when laid out next to 6-week months in a grid (rows equalize to the tallest item), creating visible gaps. This is also the standard convention in most date pickers (Google, Apple, Bootstrap datepicker) — clicking through months no longer makes the calendar jump in size. Side effect: single-month inline pickers now show one extra row of dimmed `--other-month` days; if that's unwelcome, scope the change to non-inline pickers only (revert at `date-picker-rendering.ts` line 327 — change `42` back to the previous `Math.ceil(...)` formula but only when `positioningMode !== 'inline'`).

### Fixed

- **Input on a non-focused window required two clicks to open the picker.** When the browser window had lost focus, the first click on the input was consumed by the OS/browser solely to refocus the window — the synthesized `mousedown` and `click` events were suppressed and never reached our listeners. Pointer events sit at a lower level and survive that suppression. Added a `pointerdown` listener on the input alongside the existing `focus` / `mousedown` / `click` handlers. `show()` is idempotent so doubled firings on the normal-click path are harmless.

- **Range mode crashed on `show()` with a partial-range input value when `visible-months-count >= 3`.** `Cannot read properties of undefined (reading 'year')` at `parseAndUpdateSingleDate`. The function built `displayMonths` with at most 2 entries but then iterated `visibleMonthsCount` times — for the 2×3 grid (6 months) or any 3+-month range picker, indices 2+ were `undefined`. **Fix:** build `displayMonths` and `monthDates` with all `visibleMonthsCount` slots upfront, mirroring how single-mode does it. Pre-existing bug; not introduced by the modal work.

- **Click on the input after scroll-close still didn't always reopen the calendar.** v1.11.0 added a `mousedown` listener to handle the "input still focused, calendar got closed" case (since `focus` doesn't re-fire when focus didn't change), but in some pointer/touch sequences and accessibility scenarios `mousedown` alone wasn't enough. Added an early-return guard at the top of `show()` so repeated calls during the same open are no-ops (also stops the silent `cleanupAutoUpdate` leak that occurred when `focus` and `mousedown` both fired on the same click and each re-registered Floating UI's `autoUpdate`); wired both `mousedown` *and* `click` on the input. Three handlers (`focus` + `mousedown` + `click` + later `pointerdown`) all calling `show()` is fine because the `show()` guard makes doubled calls cheap no-ops.

- **Floating UI grid-layout collapse** — `.drp-date-picker__months--grid` had `width: 100%` + `grid-template-columns: repeat(N, minmax(0, 1fr))` from `_base.css`. Inside an auto-sized parent (modal `width: max-content`, or anything with intrinsic sizing), the `minmax(0, ...)` columns let the grid collapse to 0, which made the modal snap back to its `min-width: 280px` floor — looking like a single-month picker at any viewport. **Fix in modal mode:** override grid to `width: auto` + `grid-template-columns: repeat(N, minmax(var(--drp-month-min-width), 1fr))` so columns honor the per-month floor and the grid actually expands.

### Fixed — Examples

- **Code-block styling regression introduced in v1.10.1** — `examples-shared.css` was refactored to scope the dark-background / `white-space: pre` / monospace rules to `.code-block pre` only, and the syntax-highlight span colors (`.keyword`, `.string`, `.comment`, `.function`, `.property`) were dropped entirely. Pages that put `<code>` directly inside `.code-block` (without a `<pre>` wrapper) — `examples-buttons.html` is the most affected, with 14 of 15 code blocks shaped that way — lost all formatting and rendered as flowing plain text. Restored the box styling on `.code-block` itself so it works for both shapes, reset the inner `<pre>` to a transparent zero-margin pass-through to avoid double-padding on pages that do wrap, and re-added the syntax-highlight span colors (scoped to `.code-block` to avoid clashing with anyone else's `.string` / `.function` / etc.). No HTML changes needed; one CSS edit fixes every affected page.

- **`examples-custom-rendering.html` "Hotel Booking with Prices" demo** rendered prices inline next to day numbers instead of stacked below them. The styles for `.custom-day-content` and `.price-tag` lived in the page's `<style>` block, but the picker renders inside Shadow DOM which is style-isolated — page-level CSS doesn't penetrate. **Fix:** added a `customStylesCallback` on the affected picker that injects those styles into the shadow root.

## [1.11.0] - 2026-05-01 - PUBLISHED

### Documentation — Working with Dates Across Timezones

- Added a prominent **⚠️ Working with Dates Across Timezones** section to `README.md` (above Advanced Features). Covers: how the picker represents dates (local-midnight `Date` objects, no UTC anywhere), the `toISOString()` trap and why it shifts dates by ±1 day, the `toLocalISO()` helper pattern for picker callbacks, a server/client transmission table, the `new Date("YYYY-MM-DD")` UTC-midnight gotcha, and a quick checklist. Includes worked examples for the Russia → LA round-trip case.
- Fixed three buggy `toISOString()` snippets in the existing README docs (`getDateMetadataCallback`, `beforeDateSelectCallback` server fetch, `beforeMonthChangedCallback` server fetch) — they were teaching users the same UTC-shift bug we just fixed in the example pages. Each snippet now uses `toLocalISO()` with a comment pointing back to the timezone section.

### Fixed (examples — UTC vs local date in `getDateMetadataCallback` lookups)

- **Badges in `examples-badges-tooltips.html` rendered one day late in any timezone east of UTC** (e.g., CEST). The lookup keys were built from local date components via `dayOffset()`, but `getDateMetadataCallback` used `date.toISOString().split('T')[0]` to derive the key — which converts to UTC. For a user in UTC+2, local **April 30 00:00** is UTC **April 29 22:00**, so the metadata callback queried `"2026-04-29"` and missed; meanwhile querying May 1 returned April 30's value. The icon ended up on May 1 while the tooltip (which uses `data.dateString`, already local) correctly fired on April 30. Most visible in *Method 3: Advanced HTML Tooltips → Event Details Tooltips*.

  **Fix:** added a `toLocalISO(date)` helper to the example scripts and replaced **every** `toISOString().split('T')[0]` callsite — both in live code (~30 callsites across `examples-events.html`, `examples-badges-tooltips.html`, `examples-custom-rendering.html`) and in the documentation `<pre><code>` blocks (5 more) so the docs don't keep teaching the bug. The picker core itself was unaffected; only example code that did its own `Date → string` formatting was wrong.

### Examples — anchored to today (won't go stale next year)

- All example data that was previously hardcoded to 2025/2024 dates is now built relative to today via `dayOffset(N)` / `monthFirstISO()` / `yearFirstISO()` helpers in each `<script>` block:
  - `examples-badges-tooltips.html` — 8 date arrays/maps (specialDates × 4, bookedRanges, bookingInfo, eventInfo, priceData)
  - `examples-basic.html` — `disabledDatesDemo`, `inlineHolidays`, plus 6 HTML pickers (`prefilled-single`, `prefilled-range`, `prefilled-disabled`, `range-limits-demo`, `year-limit-demo`, `q4-demo`) — values + min-date + max-date set via JS at load time
  - `examples-custom-rendering.html` — `prices`, `events`, `cloudyDates`, `bookingData`; all 6 demo pickers' `min-date`/`max-date` constrained to the current month via JS
  - `examples-api-methods.html` — `btn-set-single` and `btn-set-range` button handlers
  - `examples-logging.html` — `drag-debug` picker's pre-filled value
- Labels updated where they referenced specific years ("Only November 2025" → "Only the current month"; "Limited to 2025 Only" → "Limited to Current Year Only"; "Q4 Business Planning (Oct-Dec 2024)" → "Oct-Dec, current year") so the demo descriptions stay truthful.
- `examples-javascript-instantiation.html` — fixed two stale `src/scss/main.scss` imports that referenced a path which never existed in the TS rewrite. Now imports `src/css/main.css`.

### Fixed (pre-existing — calendar opens off-screen below input)

- **Calendar opened below the input even when the input had no room below it (e.g., the 2×3 grid layout near the bottom of the viewport).** Floating UI's `flip()` should have flipped the calendar above, but didn't. Two issues combined:
  1. The author cached the resolved placement (`lockedPlacement`) after the first `computePosition` and removed `flip()` from the middleware on subsequent calls — to prevent "jitter" during `autoUpdate`. But if the first compute happened before the calendar's layout flushed (height ≈ 0), `flip()` wrongly concluded the calendar fit below, locked there, and the cache stuck for the rest of the session.
  2. No `size` middleware, so even when flipping worked, a calendar taller than the viewport (the 2×3 grid is ~900 px) would extend off-screen in either direction.

  **Fix:** dropped the placement cache — `flip({ padding: 8 })` runs on every `position()` call now, so the calendar repositions correctly across the lifecycle. Added Floating UI's `size` middleware to cap the calendar's `max-height` to the available viewport space and turn on internal scrolling when it doesn't fit. The `lockedPlacement` field on the picker class is removed.

  Pre-existing — the cache predates this refactor. Bundle: +1.4 kB UMD (the `size` middleware import).

### Fixed (pre-existing — input click after auto-close)

- **Clicking the input after scroll-close did nothing** until the user clicked elsewhere first. With `calendarOpenTrigger: 'focus'` (the default), `show()` was wired only to the `focus` event. After `closeOnScroll` closed the calendar, the input still had focus, so clicking it again fired no focus event and the calendar stayed closed. **Fix:** added a `mousedown` listener that re-opens the calendar if it's closed and the input is already focused. Pre-existing — predates this refactor.

### Fixed (pre-existing — keyboard navigation scope)

- **Arrow keys fired on every picker on the page simultaneously**, causing focused-day indicators to jump in lockstep across multiple inline pickers and (where the page had room) the page to scroll. Pre-existing since commit `2c57170a` (Nov 6, 2025). The keydown listener lives on `document` and every inline picker set `isCalendarActive = true` at init, so the per-picker `if (!this.isCalendarActive) return` guard was always false for all of them at once.

  **Fix:** new `picker.setCalendarActive()` method broadcasts a `drp-picker-activated` custom event when a picker becomes active. Other pickers listen for it and set their own `isCalendarActive = false`. Inline pickers no longer auto-activate at init — clicking, focusing, or programmatically `show()`-ing a picker activates it and deactivates the others.

  Behavior change: on a page with multiple inline pickers, the user now needs to click any cell or button in a picker once before arrow keys take effect. (Previously arrow keys "worked" but operated on every picker at once, which wasn't useful.) Floating-mode pickers are unaffected — they activate on `show()`.

### Added (Phase 4 — public API)

- **`picker.updateOptions(partial)`** on `DateRangePicker`. Merges a partial `DatePickerOptions` into the live picker, refreshes derived state (locale strings, format info, normalized min/max/disabled/special date sets), and re-renders — **without** destroying selection, focus, scroll, or drag state. Returns `true` when fully applied. Returns `false` for genuinely structural changes (`positioningMode`, `selectionMode`, `visibleMonthsCount`, `monthLayout`, `gridRows`, `gridColumns`, `unifiedNavigation`, `unifiedNavigationAnchorIndex`, `calendarOpenTrigger`) so callers can fall back to a full reinit.
- **`Tooltip` class** exported from `src/tooltip.ts` — self-contained Floating-UI tooltip with hover-delay lifecycle, autoUpdate cleanup, and `destroy()`. Replaces the inline action-button tooltip code that previously lived in `date-picker.ts`.

### Behavior changes (no public API breaks)

- **Attribute changes no longer destroy the picker** for non-structural attributes. Toggling `min-date`, `max-date`, `locale`, `display-format-mask`, `disabled-dates-handling`, `show-today-button`, `show-clear-button`, `show-apply-button`, `auto-close`, `close-on-scroll`, `rolling-year-range`, `rolling-month-range`, `highlight-disabled-in-range`, `show-debug-info`, `disabled-weekdays`, `week-start-day`, `initial-date`, or `calendar-placement` now goes through `updateOptions` and preserves selection state. Reactive frameworks toggling these attributes per render no longer wipe the user's selection on every cycle.
- **Callback-property assignment routes through `updateOptions`** — setting `getDateMetadataCallback`, `badgeTooltipCallback`, `dayTooltipCallback`, `renderDayCallback`, `renderDayContentCallback`, `beforeDateSelectCallback`, `beforeMonthChangedCallback`, `formatSummaryCallback`, `getUnifiedHeaderCallback`, or `getMonthHeaderCallback` no longer rebuilds the picker. (`customStylesCallback` continues to require a full reinit because it injects a `<style>` tag into shadow DOM.)
- **Complex-data setters route through `updateOptions`** — `specialDates`, `disabledDates`, `actionButtons`, and the seven member-mapping properties (`dateMember`, `badgeTextMember`, `badgeClassMember`, `dayClassMember`, `badgeTooltipMember`, `dayTooltipMember`, `isDisabledMember`) update in place. Previously each triggered an immediate destroy + reinit on every assignment.
- **`initializeDateRestrictions` is now idempotent** — clears `normalizedDisabledDates` / `normalizedSpecialDates` before rebuilding, so removing entries via `updateOptions` actually removes them. Also recomputes `normalizedMinDate` / `normalizedMaxDate` (rather than leaving stale values when those options are cleared).

### Internal (Phase 4)

- Single `ATTRIBUTE_TABLE` in `web-component.ts` is now the source of truth for all 29 picker-affecting attributes. Each entry maps `{ attr, key, parser }`. Drives `observedAttributes`, the initial parse in `initializePicker`, and live updates in `attributeChangedCallback`. Replaces the previous hand-coded ~70-line attribute → option block plus the parallel hand-listed `observedAttributes` array.
- Reusable attribute parsers extracted: `parseStringOrUndefined`, `parsePositiveIntOrUndefined`, `parseBoolPresence`, `parseTriStateBool`, `parseTriStateBoolDefaultTrue`, `parseEnum`, `parseDisabledWeekdays`, `parseWeekStartDay`. Adding a new attribute is now one table entry.

### Refactor (Phase 3 — Tooltip class)

- Three methods (`createActionButtonTooltip`, `positionActionButtonTooltip`, `destroyAllActionButtonTooltips`) plus their two state maps in `date-picker.ts` collapse into a single `Tooltip[]` field and a per-button `new Tooltip(target, text, { container })`. Each Tooltip instance owns its DOM element, hover-delay timers, and Floating UI autoUpdate cleanup; `destroy()` releases everything. Same pattern as multiselect 1.9.0's tooltip consolidation.

### Refactor (Phase 2 — internal dedup, behavior-preserving)

- **`moveFocusToDate(picker, target)`** — extracted the duplicated 40-line "walk monthDates → find column → query day cell → toggle `--focused` class" loop in `selectDay`. Single helper replaces the single-mode-adjusted-date and range-end-date blocks.
- **`changeMonth(picker, monthIndex, offset)`** — `prevMonth` and `nextMonth` (mirror images) collapsed into one async function. Public `prevMonth`/`nextMonth` exports kept as thin arrow-function wrappers for source compatibility. Collision-with-neighbour propagation uses the same `offset` direction.
- **Rolling-selector list rendering** — four near-identical render blocks (years/months × per-column/unified) collapsed into `renderRollingItems` + `renderRollingLists`. Both `renderRollingSelector` and `renderUnifiedRollingSelector` now build a small data array and delegate to the shared renderer; HTML output is byte-for-byte identical.
- **`commitInputValue(picker, value)`** — five sites (selectDay single/range/multiple, selectToday, drag-end) gated on `if (picker.input && !picker.requiresApplyButton())` are now a one-liner. `commitInputValue` is exported and reused from `date-picker-interaction.ts` so the gate lives in one place.
- **`formatInputValue(picker)`** — `apply()`'s mode-dispatch input formatting (range / single / multiple) extracted to a pure helper.
- **`commitSelection(picker)`** — three sites of `picker.renderCalendar(); picker.updateSummary();` go through one hook. Single seat for adding debounced events / bulk-op callbacks later.

Net: TS line count across the four affected files dropped by 73 lines (3256 → 3183, −2.2%) after factoring in ~52 lines of new helpers. UMD bundle: 173.72 kB → 172.02 kB (−1.7 kB). No behavior changes, no public API changes.

### Refactor (Phase 2 — CSS)

- **Per-component `*-border-color` hooks now actually do something** — `--drp-nav-border`, `--drp-rolling-border`, `--drp-summary-border`, `--drp-button-border` were defaulting to `var(--drp-border)` directly, ignoring their per-section `*-border-color` siblings. Rebuilt each shorthand from `var(--drp-border-width-base) solid var(--drp-{section}-border-color)` so overriding (e.g.) `--drp-nav-border-color: red;` actually changes the nav border. Defaults unchanged — the per-section `*-border-color` defaults to `--drp-border-color`. Same fix pattern as multiselect 1.9.0 §6.6.
- **Hardcoded `white` replaced** — `.drp-date-picker__day--invalid-range-start/end` had a hardcoded `color: white` bypassing theming. Added `--drp-day-invalid-range-bg` and `--drp-day-invalid-range-color` (defaulting to `--drp-message-error-border` and `--drp-text-color-on-accent` respectively); rule now references the variables. Theme designers can now adjust the invalid-range text/background.

### Fixed

- **Action-button tooltips never attached** — `attachActionButtonTooltips` queried `.drp-date-picker__action`, but rendered buttons use `.drp-date-picker__button`. The selector matched nothing, so tooltips on Today/Clear/Apply/custom buttons silently never appeared. Same flavor as the multiselect 1.9.0 selector bug.
- **Action-button tooltip ID churn** — tooltip IDs used `Date.now()-Math.random()`, regenerated on every render. Switched to a stable per-slot ID (`action-{index}`) stamped onto `data-tooltip-id`. Removes a class of race conditions where an in-flight `hideTooltip` timeout would try to clean up an ID the new render had already replaced.
- **`disabled` attribute triggered full picker rebuild** — `attributeChangedCallback` was missing `disabled` from its surgical-update exclusion list, so toggling `disabled` tore down the calendar and rebuilt it before applying the trivial input-state change. Selection state was lost on every toggle. Added to the exclusion list; the surgical handler immediately below already does the right thing.

### Changed

- **Removed seven `console.log` calls** from production hot paths (drag-end, click handler, `showMessage`, web-component `showMessage`). One genuinely useful `messageElement is null` diagnostic was converted to `uiLogger.warn` so it routes through `loglevel` and respects the configured log level.
- **Removed a `setTimeout` + `getComputedStyle` block in `show()`** that forced layout flush on every calendar open purely to log computed styles. The result was never used by anything but the log call.
- **Documented the HTML-trusted callback contract** — `renderDayCallback`, `renderDayContentCallback`, `formatSummaryCallback`, and `getUnifiedHeaderCallback` splice their string return values directly into `innerHTML`. Added `SECURITY:` JSDoc notes recommending callers sanitize untrusted data or return an `HTMLElement` instead.
- **Locked in `||` semantics in `validateRangeAsync`** — partial adjustment (`adjustedStart` set without `adjustedEnd`, or vice versa) is intentional; consumers fall back per-field. Added a comment so the intent isn't lost in future refactors.
- **`CLAUDE.md`** — rewrote the Architecture section to describe the actual TypeScript module split (`-rendering`, `-navigation`, `-interaction`, `-selection`, `-ui`, `-validation`, `-locales`). Removed stale references to `src/js/`, `src/scss/`, the `[data-date-picker]` auto-init, and the `Sass` build tool.

### Added

- **Selection Hover Text Color Variables**: New CSS variables for full color control on hover states of selected/range days
  - `--drp-day-selected-color-hover` — text color when hovering over a selected day (defaults to `--drp-day-selected-color`)
  - `--drp-day-range-color-hover` — text color when hovering over range start/end days (defaults to `--drp-day-range-color`)
  - Enables full color inversion on hover (e.g., black bg + white text → white bg + black text)
  - Backwards compatible — defaults match non-hover values so existing themes are unaffected
  - Updated `examples-theming.html` to demonstrate full black↔white inversion on selection hover

## [1.10.1] - 2026-01-22 - PUBLISHED

### Fixed

- **Message Alert Horizontal Margins**: Removed unwanted left/right external margins from standard alert messages (error, warning, info, success)
  - Changed `margin: 0 var(--drp-spacing-sm)` to `margin: 0` in `.drp-date-picker__message`
  - Messages now span the full width of the calendar popup without side gaps
  - Bottom margin preserved for proper vertical spacing

## [1.10.0] - 2026-01-22 - PUBLISHED

### Added

- **`custom-action` Event**: New unified event for custom action buttons in both action buttons and messages
  - Fires when any button with `data-action="custom"` is clicked
  - Event detail contains all `data-*` attributes (except `data-action`) as a camelCase key-value map
  - Works identically for action buttons and message buttons
  - Enables declarative custom buttons in `showMessage()` HTML that communicate back to JavaScript
  - Example usage:
    ```javascript
    picker.showMessage(`
      <button data-action="custom" data-start-date="2026-01-14" data-end-date="2026-01-17">
        Apply Jan 14 - Jan 17
      </button>
    `);

    picker.addEventListener('custom-action', (e) => {
      console.log(e.detail); // { startDate: '2026-01-14', endDate: '2026-01-17' }
      picker.selectedRanges = [{
        start: new Date(e.detail.startDate),
        end: new Date(e.detail.endDate)
      }];
      picker.hideMessage();
    });
    ```

- **`data-action="close-message"` Built-in Action**: Simple way to close messages from button clicks
  - Any button with `data-action="close-message"` inside a message will close the message when clicked
  - No JavaScript event listener required for basic close functionality

### Fixed

- **Custom Action Button Click Detection**: Fixed clicks on button child elements (like text nodes or inner spans) not triggering custom actions
  - Now uses `target.closest('[data-action="custom"]')` to properly detect button clicks

- **Selected Ranges Not Re-rendering**: Fixed bug where programmatically setting `selectedRanges` via the reactive setter would not clear invalid range state
  - Now properly clears `invalidRangeStart`, `invalidRangeEnd`, and `focusedDayIndex` when ranges are set

### Documentation

- **XSS Security Notice**: Added security warning to README about callbacks and methods that allow raw HTML injection
  - Lists all affected callbacks: `showMessage()`, `renderDayCallback`, `formatSummaryCallback`, etc.
  - Recommends sanitizing user-generated content before display

## [1.9.6] - 2026-01-21

### Added

- **Event Manager Architecture**: Introduced Pub/Sub event managers for cleaner, more maintainable event handling
  - **ScrollEventManager** (`src/modules/scroll-events/index.ts`):
    - Centralizes scroll event handling with single listener per source
    - Supports `window` and `container` scroll sources
    - Enables multiple subscribers without duplicate listeners
  - **ClickEventManager** (`src/modules/click-events/index.ts`):
    - Centralizes click event handling for inside/outside calendar detection
    - Supports `outsideClick` and `calendarClick` event types
    - Uses `composedPath()` for Shadow DOM compatibility
    - Tracks mousedown/mouseup to survive DOM rebuilds between events

### Fixed

- **Calendar Not Closing on Window Scroll**: Fixed critical bug where the floating calendar would not close when scrolling the page
  - Root cause: No window scroll listener was attached to close the calendar
  - Solution: ScrollEventManager now subscribes to window scroll and closes the calendar in floating mode
  - This was a regression that went unnoticed due to scattered event handling

### Changed

- **Event Handling Architecture**: Migrated from scattered `addEventListener` calls to centralized Pub/Sub pattern
  - Removed `clickOutsideHandler` property and manual listener management
  - Event subscriptions are now tracked and properly cleaned up in `destroy()`
  - Pattern follows web-grid's proven event manager architecture
  - Improves code maintainability and reduces potential for listener leaks

### Documentation

- **Unified Example Page Styling**: Refactored all example pages to use consistent shared CSS
  - New `examples-shared.css` with comprehensive base styles matching web-grid's demo page style
  - Fixed button text visibility (white text on white background) in examples-api-methods.html
  - Fixed code block styling - `<code>` inside `<pre>` and `.code-block` now properly inherits colors
  - Added `.copy-button` styling for code blocks with proper positioning
  - Standardized header styling with gradient cards across all example pages

## [1.9.5] - 2026-01-03

### Added

- **Package Export**: Added `component-variables.manifest.json` to package exports for theme-designer integration

## [1.9.4] - 2026-01-03

### Added

- **Disabled Day Background** - New `--drp-day-disabled-bg` CSS variable for disabled day cell backgrounds
  - References `var(--base-disabled-bg, transparent)` from theme-designer
  - Provides subtle background tint underneath the striped disabled pattern
  - Helps distinguish disabled dates when theme-designer is used

## [1.9.3] - 2025-12-28

### Changed

- **BREAKING: Variable Naming Consistency** - Aligned with theme-designer naming conventions:

  **background → bg:**
  | Old | New |
  |-----|-----|
  | `--drp-dropdown-background` | `--drp-dropdown-bg` |
  | `--drp-tooltip-background` | `--drp-tooltip-bg` |
  | `--drp-loading-overlay-background` | `--drp-loading-overlay-bg` |
  | `--drp-input-background` | `--drp-input-bg` |
  | `--drp-input-background-disabled` | `--drp-input-bg-disabled` |

  **Added -color suffix:**
  | Old | New |
  |-----|-----|
  | `--drp-text-on-accent` | `--drp-text-color-on-accent` |

## [1.9.2] - 2025-12-28

### Changed

- **BREAKING: Renamed `--drp-button-text-color` → `--drp-button-accent-text-color`**
  - Clarifies this is for text on accent backgrounds (Apply button)
  - New `--drp-button-color` is the base button text color

## [1.9.1] - 2025-12-28

### Added

- **Additional CSS Variables**:
  - `--drp-button-bg` - Action button background (default: transparent)
  - `--drp-button-color` - Action button text color (default: --drp-text-primary)
  - `--drp-day-border` - Day cell border
  - `--drp-day-drag-border` - Drag preview border (dashed)
  - `--drp-loading-spinner-size` (default: 40px)
  - `--drp-loading-spinner-border-width` (default: 4px)

### Fixed

- Summary/actions dividers now use `--drp-summary-border` variable instead of hardcoded pattern

## [1.9.0] - 2025-12-28

### Changed

- **BREAKING: Border Variables Aligned with Theme-Designer Spec**

  Input border variables now use full border strings (matching `--base-input-border` pattern) instead of color-only variables:

  | Old Variable | New Variable |
  |--------------|--------------|
  | `--drp-input-border-color` | `--drp-input-border` |
  | `--drp-input-border-color-hover` | `--drp-input-border-hover` |
  | `--drp-input-border-color-focus` | `--drp-input-border-focus` |

  **Migration:** If you were overriding `--drp-input-border-color: #999`, change to `--drp-input-border: 1px solid #999`

### Added

- **Generic Border Variable**: Added `--drp-border` as base full-border variable
  - References `--base-border` from theme-designer (new in theme-designer)
  - Fallback: `var(--drp-border-width-base) solid var(--drp-border-color)`

- **Full Border Variables for Component Elements**:
  - `--drp-nav-border`, `--drp-nav-border-hover-full` - Navigation buttons
  - `--drp-rolling-border` - Rolling selectors
  - `--drp-button-border`, `--drp-button-border-hover-full` - Action buttons
  - `--drp-summary-border` - Summary section

  All inherit from `--drp-border` by default, allowing unified border styling across the component.

- **Theme-Designer Integration**: Input borders now correctly reference:
  - `--base-input-border` (full border string like `1px solid #374151`)
  - `--base-input-border-hover`
  - `--base-input-border-focus`

## [1.8.1] - 2025-12-19

### Added

- **Border Radius Theme Integration**: Added `--drp-border-radius-sm/md/lg` CSS variables with theme-designer support
  - Variables reference `--base-border-radius-sm/md/lg` from theme-designer with fallback defaults
  - Pattern: `calc(var(--base-border-radius-md, 0.6) * var(--drp-rem))` (unitless multiplier × rem base)
  - `--drp-border-radius` alias points to `--drp-border-radius-md` for backward compatibility

- **Input Border Color Theme Integration**: Connected input border colors to theme-designer
  - `--drp-input-border-color` → `var(--base-input-border-color, ...)`
  - `--drp-input-border-color-hover` → `var(--base-input-border-color-hover, ...)`
  - `--drp-input-border-color-focus` → `var(--base-input-border-color-focus, ...)`

- **Input Size Heights Theme Integration** - Input height variables now reference `--base-input-size-*-height` from theme-designer
  - `--drp-input-size-xs-height`: `calc(var(--base-input-size-xs-height, 3.1) * var(--drp-rem))` (31px)
  - `--drp-input-size-sm-height`: `calc(var(--base-input-size-sm-height, 3.3) * var(--drp-rem))` (33px)
  - `--drp-input-size-md-height`: `calc(var(--base-input-size-md-height, 3.5) * var(--drp-rem))` (35px)
  - `--drp-input-size-lg-height`: `calc(var(--base-input-size-lg-height, 3.8) * var(--drp-rem))` (38px)
  - `--drp-input-size-xl-height`: `calc(var(--base-input-size-xl-height, 4.1) * var(--drp-rem))` (41px)
  - Ensures consistent input heights across all KeenMate components when using theme-designer

### Changed

- **BREAKING: SCSS to Pure CSS Migration** - Converted all styles from SCSS to pure CSS
  - Removed SCSS dependency entirely - no more `sass` package required
  - All CSS custom properties now defined in `_variables.css` with hardcoded fallback values
  - Styles now use native CSS `color-mix()` function for opacity calculations (replaces SCSS `color.mix()`)
  - Package exports changed: `./scss` → `./css`, `./scss/variables` → `./css/variables`
  - Import path updated: `@keenmate/web-daterangepicker/css` instead of `@keenmate/web-daterangepicker/scss`

- **Semantic Border Radius**: Applied industry-standard border-radius scale to components
  - **sm** (4px): Day cells, disabled overlay, tooltips - small/compact elements
  - **md** (6px): Input, buttons, nav buttons, month-year header - standard controls
  - **lg** (8px): Calendar container, rolling selectors, loading overlay - larger containers

### Fixed

- **Auto-Close Behavior Fixes**:
  - `requiresApplyButton()` no longer incorrectly defers selection when `show-apply-button="true"` with `auto-close="never"` - selection now commits immediately
  - Apply button now correctly closes the picker in `auto-close="never"` mode (never refers to auto-close on selection, not Apply button)
  - `clearSelection()` now properly clears all visual state including `focusedDayIndex` and drag preview state
  - Calendar now syncs with manually cleared input when reopened via `updateCalendarFromInput()` in `show()`
  - Partial input edit (removing end date portion) now correctly clears `selectedEndDate`

- **Apply Button with Custom Preset Buttons** - `apply()` now always updates input when dates are selected, not just when `pendingSelection` exists. Fixes custom preset buttons (like "Last Week") not committing to input on Apply click.

- **Badge Vertical Alignment** - Fixed badges aligning to top instead of center in calendar cells
  - Removed `height: 100%` from `.drp-date-picker__badge-cell` which caused flex alignment issues

### Removed

- `sass` devDependency - SCSS compiler no longer needed
- `src/scss/` folder - replaced by `src/css/`
- SCSS-specific features like `@use`, `@forward`, `#{interpolation}`, `$variables`

### Migration Guide

**For users importing source styles:**
```css
/* Before */
@import '@keenmate/web-daterangepicker/scss';
@import '@keenmate/web-daterangepicker/scss/variables';

/* After */
@import '@keenmate/web-daterangepicker/css';
@import '@keenmate/web-daterangepicker/css/variables';
```

**For users using the compiled CSS:**
No changes needed - `dist/style.css` works the same way.

**Browser Compatibility:**
The `color-mix()` function requires modern browsers (Chrome 111+, Firefox 113+, Safari 16.2+).
For older browser support, use the compiled `dist/style.css` which is processed by Vite.

## [1.7.0] - 2025-12-08

### Changed

- **Simplified Sizing System - Removed Scale Variables**: Removed the intermediate scale variable system (`--drp-font-scale`, `--drp-spacing-scale`, `--drp-cell-scale`) and associated modifier classes
  - **What was removed**:
    - SCSS variables: `$drp-density-xs` through `$drp-density-xl`
    - CSS modifier classes: `.drp-font-xs/sm/md/lg/xl`, `.drp-spacing-xs/sm/md/lg/xl`, `.drp-cell-xs/sm/md/lg/xl`
    - Responsive scaling classes: `.drp-responsive`
    - Legacy size classes: `.drp-date-picker--xs/sm/lg/xl`
    - Web component attributes: `spacing`, `font-size`, `cell-size`
    - Web component properties: `spacing`, `fontSize`, `cellSize`
  - **Why**: The `--drp-rem` base unit provides cleaner, more flexible scaling without intermediate multipliers
  - **New approach**: Set CSS variables directly on the `<web-daterangepicker>` element
    - Global scaling: `--drp-rem: 8px` (scales everything to 80%)
    - Fine-grained control: `--drp-spacing-xs: 2px`, `--drp-font-size-base: 18px`
  - **Shadow DOM note**: CSS variables must be set on the element itself (via class or inline style), not on wrapper divs
  - **Migration**:
    ```html
    <!-- Before (removed) -->
    <web-daterangepicker spacing="lg" font-size="lg" cell-size="lg">

    <!-- After (CSS variables on element) -->
    <web-daterangepicker style="--drp-rem: 15px;">

    <!-- Or via CSS class -->
    <style>
      web-daterangepicker.large { --drp-rem: 15px; }
    </style>
    <web-daterangepicker class="large">
    ```
  - **Files modified**: `_base.scss`, `_modifiers.scss`, `_calendar-grid.scss`, `_header-navigation.scss`, `_badges.scss`, `_variables.scss`, `web-component.ts`
  - See `examples-sizes.html` for comprehensive CSS variable sizing examples

- **Font Size Variables - Unitless Multipliers**: Changed `--base-font-size-*` variables from expecting rem/em units to unitless multipliers
  - Theme-designer now outputs: `--base-font-size-sm: 1.4` (unitless)
  - Component computes: `calc(1.4 * var(--drp-rem))` = 14px
  - Fixes issue where CSS `em`/`rem` units were computed at assignment time on `:root`, not relative to component's `--drp-rem`
  - Font-size-base variables now use format: `calc(var(--base-font-size-sm, 1.4) * var(--drp-rem))`

### Added

- **`--drp-badge-row-height` CSS Variable**: New custom property for configuring badge row height at runtime
  - Default: `16px` (SCSS variable `$drp-badge-max-height`)
  - Override in your styles: `--drp-badge-row-height: 20px`
  - Replaces hard-coded SCSS calculation with configurable CSS variable

- **Base Variables Example** (`examples-base-variables.html`): New interactive demo for testing theme-designer typography integration
  - Google Fonts loader with auto font-family detection
  - Real-time controls for font sizes (2xs-2xl), weights, and line heights
  - Live CSS output panel showing current variable values
  - Floating and inline date picker demos with special dates

### Fixed

- **'block' Mode Forward Selection**: Fixed `disabled-dates-handling="block"` mode where forward selection (left to right) was behaving like 'prevent' mode
  - Forward drag preview was immediately clipping at disabled dates, preventing users from seeing what they were trying to select
  - Now allows preview to span disabled dates visually, then snaps to last enabled date on completion
  - Both forward and backward selection now work consistently

- **Disabled Dates Visual Highlighting in Range**: Fixed `highlight-disabled-in-range` option not showing visible difference
  - When `highlight-disabled-in-range="true"`, disabled dates within a range now show blue tint behind the disabled overlay
  - When `highlight-disabled-in-range="false"`, disabled dates remain gray (no blue tint)
  - Added CSS rule for `.drp-date-picker__day--disabled.drp-date-picker__day--in-range` combination

- **Today Key ('t') Multi-Month Collision**: Pressing 't' to jump to today now correctly adjusts adjacent months in multi-month view
  - Previously, if right column showed Jan 2026 and you pressed 't', it would show Dec 2025 but left column stayed at Jan 2026 (out of order)
  - Now calls `checkAndResolveCollisions()` to ensure all visible months remain in chronological order

- **Badge Row Spacing**: Removed extra `margin-bottom` from `.drp-date-picker__badge-row`
  - Parent `.drp-date-picker__days` gap already provides spacing between rows
  - Reduces vertical whitespace around badge rows

- **Button Font Inheritance**: Added `font-family: inherit` to action buttons (Today, Clear, Apply)
  - Buttons now inherit the custom font from `--base-font-family`
  - Previously buttons used browser default font for `<button>` elements

- **Keyboard Navigation Boundary Enforcement**: Ctrl+Home and Ctrl+End now respect `rolling-year-range`, `min-date`, and `max-date` constraints
  - Previously these shortcuts could navigate outside allowed date ranges
  - Now stops at the configured boundaries

- **monthHeaders Key Format**: Fixed `monthHeaders` map key format to use 1-based months (YYYY-MM where January = 01)
  - Previously used 0-based months internally which didn't match the documented API
  - Keys like "2025-01" now correctly map to January 2025

## [1.6.0] - 2025-12-05

### Added

- **Custom Month Headers** - New `getMonthHeaderCallback` option to customize individual month header text
  - Callback receives `{ month, monthIndex, monthName, year }` and returns custom header string
  - Example: Display room availability like "Jan 2026 (10 rooms)"

- **Month Headers from beforeMonthChangedCallback** - The `beforeMonthChangedCallback` can now return a `monthHeaders` map
  - Key: `"YYYY-MM"` format (e.g., "2026-01")
  - Value: Custom header text to display
  - Useful when header content depends on async-loaded data
  - Priority order: `monthHeaders` > `getMonthHeaderCallback` > default format

- **Themeable Loading Overlay** - New CSS variables for async loading overlay styling
  - `--drp-loading-overlay-background` - Overlay background color (default: semi-transparent white)
  - `--drp-loading-spinner-color` - Spinner border color
  - `--drp-loading-spinner-accent` - Spinner accent/animated color
  - Enables proper dark theme support for loading states

### Changed

- **BREAKING: Unified Theming Variable Renames** - Renamed several CSS variables for consistency with unified theming system across KeenMate components
  - `--drp-accent-text-color` → `--drp-text-on-accent`
  - `--drp-input-disabled-background` → `--drp-input-background-disabled`
  - `--drp-card-bg` → `--drp-dropdown-background`
  - `--drp-tooltip-bg` → `--drp-tooltip-background`
  - `--drp-tooltip-color` → `--drp-tooltip-text-color`
  - This ensures consistent naming patterns across all KeenMate components (web-multiselect, web-daterangepicker, etc.)
  - Tier 1 variables (core colors, inputs, dropdowns, tooltips) now have identical suffixes across components
  - Enables better integration with the [Theme Designer](https://theme-designer.keenmate.dev) tool
  - **Migration**: Find and replace the old variable names with the new ones in your stylesheets

## [1.5.0] - 2025-11-28

### Changed

- **10px-Based Sizing System**: Converted all rem units to a 10px-based system using `--drp-rem: 10px`
  - All spacing, padding, border-radius, font-size, and height values now use `calc(multiplier * var(--drp-rem))`
  - Visual output remains **identical** - same pixel values, cleaner internal math
  - Enables easy scaling by overriding single `--drp-rem` variable
  - Formula: `multiplier = old_rem_value × 16 ÷ 10`

- **New Input Height Values**: Updated input sizes to match Pure Admin design system
  | Size | Value | Pixels |
  |------|-------|--------|
  | XS | 3.1rem | 31px |
  | SM | 3.3rem | 33px |
  | MD | 3.5rem | 35px |
  | LG | 3.8rem | 38px |
  | XL | 4.1rem | 41px |

### Added

- **`--drp-rem` CSS Variable**: New base unit variable for scaling
  - Default: `10px` (produces same visual output as before)
  - Override to scale entire component: `--drp-rem: 1rem` (inherits from document)
  - Three customization methods documented in README

### Documentation

- Updated README with Input Size Scale section and customization examples
- Documented three ways to customize input heights:
  1. Direct px override: `--drp-input-size-md-height: 42px`
  2. Scale via `--drp-rem`: `--drp-rem: 12px`
  3. Override with calc: `--drp-input-size-md-height: calc(4.2 * var(--drp-rem))`

## [1.4.0] - 2025-11-27 ✅ Published

### Added

- **Input Size Attribute**: New `input-size` attribute for controlling input field dimensions
  - Supports 5-level scale: `xs`, `sm`, `md` (default), `lg`, `xl`
  - Consistent with calendar sizing attributes (`spacing`, `font-size`, `cell-size`)
  - Added CSS variables for xs and xl sizes:
    - `--drp-input-size-xs-*` (font, padding-v, padding-h, height, icon-size)
    - `--drp-input-size-xl-*` (font, padding-v, padding-h, height, icon-size)
  - CSS classes: `.drp-input--xs`, `.drp-input--xl` and icon positioning classes

### Changed

- **Complete 5-Level Size Scale**: All size attributes now support consistent xs/sm/md/lg/xl scale
  - `input-size` - Input field size (floating mode only)
  - `spacing` - Calendar spacing scale
  - `font-size` - Calendar font size scale
  - `cell-size` - Calendar day cell size

### Documentation

- Updated API.md with size attributes in attributes table
- Updated AI documentation (ai/basic-usage.txt, ai/INDEX.txt) with correct size attribute usage
- Added Input Size Variants section to CSS Custom Properties documentation

## [1.3.0] - 2025-11-25

### Added

- **Comprehensive Input Styling**: Added complete styling system for input elements with CSS custom properties
  - New `.drp-input` class with full styling (borders, colors, focus states, disabled states)
  - Three size variants: small, medium (default), and large
  - Size variant classes: `.drp-input--sm`, `.drp-input--lg`
  - Proper calendar icon positioning for all sizes via `.drp-date-picker-input--sm/lg`
  - Input-specific CSS custom properties:
    - `--drp-input-background`, `--drp-input-color`
    - `--drp-input-border-color`, `--drp-input-border-color-hover`, `--drp-input-border-color-focus`
    - `--drp-input-placeholder-color`, `--drp-input-disabled-background`
    - `--drp-input-focus-shadow-color`, `--drp-input-focus-shadow-size`
    - `--drp-input-icon-opacity`
    - Size variant variables for sm/md/lg (font, padding, height, icon size)

### Changed

- **CSS Architecture: Decoupled Component Variables** - Eliminated tight coupling between component styles
  - **Problem**: All components directly referenced base variables (e.g., `var(--drp-text-primary)`, `var(--drp-accent-color)`), creating dependencies where changing one component affected unrelated components
  - **Solution**: Added semantic CSS custom property layer that maps component-specific properties to base variables
  - **Benefits**: Each component can now be styled independently without affecting others

  **New Semantic Variables Added** (in `_base.scss`):

  - **Header & Navigation**: `--drp-header-text-color`, `--drp-header-bg-hover`, `--drp-nav-text-color`, `--drp-nav-border-color`, `--drp-nav-bg-hover`, `--drp-rolling-*` variables
  - **Calendar Grid & Days**: `--drp-weekday-color`, `--drp-day-text-color`, `--drp-day-bg-hover`, `--drp-day-selected-bg`, `--drp-day-selected-color`, `--drp-day-focused-outline`, etc.
  - **Summary & Actions**: `--drp-summary-text-color`, `--drp-summary-count-color`, `--drp-button-border-color`, `--drp-button-today-color`, `--drp-button-apply-bg`, etc.
  - **Badges**: `--drp-badge-number-bg`, `--drp-badge-number-color`, `--drp-badge-count-bg`, `--drp-badge-text-bg`
  - **Unified Navigation**: `--drp-unified-range-text-color`, `--drp-unified-month-color`

  **Files Modified**:
  - `src/scss/_base.scss`: Added 60+ semantic CSS custom properties
  - `src/scss/_header-navigation.scss`: Updated to use semantic variables instead of base variables
  - `src/scss/_calendar-grid.scss`: Updated day cells, weekdays to use semantic variables
  - `src/scss/_summary-actions.scss`: Updated summary and buttons to use semantic variables
  - `src/scss/_badges.scss`: Converted from SCSS variables to CSS custom properties

  **Example Usage**:
  ```css
  /* Now you can customize components independently */
  :root {
    /* Customize just the input without affecting calendar */
    --drp-input-background: #f0f0f0;
    --drp-input-border-color: #999;

    /* Customize buttons without affecting day cells */
    --drp-button-today-color: green;
    --drp-button-apply-bg: purple;
  }
  ```

  **Pattern**: Semantic variables default to base variables (e.g., `--drp-input-color: var(--drp-text-primary)`), but can be overridden independently for fine-grained customization.

## [1.2.0] - 2025-01-24

### Fixed

- **Badge styling in Shadow DOM**: Fixed all examples where `badgeClass` or `dayClass` were used without corresponding `customStylesCallback`
  - **Root Cause**: Badge CSS classes (like `'holiday'`, `'event'`, `'price-high'`) were not defined anywhere. Since web component uses Shadow DOM, these styles must be explicitly injected using `customStylesCallback`.
  - **Files Fixed**:
    - `examples-badges-tooltips.html`: Fixed 8 examples (holidaysDemo, cottageDemo, methodMapping, methodTooltips, memberMappingExample, dynamicPricing, dynamicAvailability, combinedExample)
    - `examples-javascript-instantiation.html`: Updated API documentation from old `class`/`badge`/`tooltip` to new `badgeClass`/`badgeText`/`badgeTooltip`/`dayClass`/`dayTooltip`/`isDisabled`
  - **Pattern Applied**: All fixes inject CSS into Shadow DOM using proper selector format:
    ```javascript
    picker.customStylesCallback = () => {
      return `
        .drp-date-picker__badge-cell.your-class-name {
          background-color: ... !important;
          color: ... !important;
          border: ... !important;
        }
      `;
    };
    ```
  - **Badge Classes Styled**: 'holiday', 'event', 'booked', 'price-high', 'price-medium', 'price-low', 'low-availability', 'medium-availability'
  - **Day Classes Styled**: 'low-availability-day'
  - All badge styling now properly displays in Shadow DOM across all example files

### Added

- **Unified Navigation Enhancements**
  - **`unifiedHeaderInteractive` option**: Makes unified header range display clickable to open month/year rolling selector
    - Default: `false` (header is static text only)
    - When enabled, clicking the unified header (e.g., "January 2025 - June 2025") opens the rolling selector
    - Web component attribute: `unified-header-interactive`
    - Only applies when `unifiedNavigation` is enabled
    - **Example**:
      ```html
      <web-daterangepicker
        unified-navigation
        unified-header-interactive
        visible-months-count="6"
        month-layout="grid"
        grid-rows="2"
        grid-columns="3">
      </web-daterangepicker>
      ```

  - **`getUnifiedHeaderCallback` - Custom unified header text**
    - Callback to customize the unified header range display text
    - Receives: `{ firstMonth: Date, lastMonth: Date, anchorMonth: Date, monthNames: string[] }`
    - Returns: HTML string to display in unified header
    - Enables displaying only anchor month instead of full range
    - **Example** (display only anchor month):
      ```javascript
      const picker = new DateRangePicker(input, {
        unifiedNavigation: true,
        visibleMonthsCount: 9,
        unifiedNavigationAnchorIndex: 4,
        getUnifiedHeaderCallback: ({ anchorMonth, monthNames }) => {
          return `${monthNames[anchorMonth.getMonth()]} ${anchorMonth.getFullYear()}`;
          // Returns: "May 2025" for 3×3 grid with center anchor
        }
      });
      ```
    - **Example** (custom range format):
      ```javascript
      getUnifiedHeaderCallback: ({ firstMonth, lastMonth, monthNames }) => {
        return `${monthNames[firstMonth.getMonth()]} - ${monthNames[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`;
        // Returns: "Jan - Sep 2025"
      }
      ```

  - **Multi-month cache improvement**: `beforeMonthChangedCallback` now calculates full visible range for unified navigation mode
    - Previously only calculated ~42 days for first month
    - Now calculates full range across all visible months (e.g., ~180 days for 2×3 grid)
    - Enables proper bulk metadata loading for multi-month displays
    - Significantly reduces API calls when using unified navigation with `beforeMonthChangedCallback`

- **`beforeMonthChangedCallback` - Performance optimization for bulk metadata loading**
  - New callback invoked BEFORE month navigation occurs (before rendering new month)
  - Enables loading bulk metadata for all visible dates in one API call instead of per-day callbacks
  - **Performance**: 1 API call per month vs 35-42 calls with `getDateMetadataCallback`
  - Can block navigation to unavailable months (returns `action: 'block'`)
  - Shows loading overlay automatically during async operations
  - Callback receives context: `{ year, month, monthIndex, firstVisibleDate, lastVisibleDate }`
  - Returns: `{ action: 'accept' | 'block', metadata?: Map<string, DateInfo>, message?: string }`
  - **Example** (hotel availability):
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeMonthChangedCallback: async ({ firstVisibleDate, lastVisibleDate }) => {
        // Single API call for entire month
        const response = await fetch('/api/availability', {
          method: 'POST',
          body: JSON.stringify({
            start: firstVisibleDate.toISOString(),
            end: lastVisibleDate.toISOString()
          })
        });
        const data = await response.json();

        // Build metadata map
        const metadata = new Map();
        data.forEach(day => {
          metadata.set(day.date, {
            badgeText: `$${day.price}`,
            isDisabled: day.available === 0,
            dayTooltip: `${day.available} rooms available`
          });
        });

        return { action: 'accept', metadata };
      }
    });
    ```
  - **Web Component**: Available as property (not attribute)
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.beforeMonthChangedCallback = async (context) => { ... };
    ```
  - **Priority**: Bulk metadata cache > `getDateMetadataCallback` > `specialDates`
  - See `examples-events.html` for complete examples

### Fixed

- **Unified Navigation: Year range drift in rolling selector**
  - Fixed bug where unified rolling selector's year range would drift after selecting years
  - When `rollingYearRange` not explicitly set, default range (today ± 1) now stays stable
  - Example: Default shows 2024-2026, selecting 2026 keeps range 2024-2026 (previously drifted to 2025-2027)
  - Centralized year/month range calculation via `getEffectiveYearRange()` and `getEffectiveMonthRange()`
  - Both rendering and validation now use same range logic (single source of truth)

- **Navigation buttons now respect rollingYearRange/rollingMonthRange boundaries**
  - Navigation buttons (< >) previously allowed navigating outside configured date ranges
  - Added two-layer boundary enforcement:
    1. Click handler checks if button is disabled before executing navigation
    2. Navigation functions validate target month has enabled days
  - Applies to both unified navigation and individual month navigation
  - Buttons are already visually disabled, now also functionally blocked

- **Unified rolling selector now closes on click outside**
  - Added document-level click handler for all positioning modes
  - **Inline mode**: Clicking outside calendar closes rolling selectors (calendar stays visible)
  - **Floating mode**: Clicking outside calendar closes entire calendar + selectors
  - Matches intuitive behavior of standard dropdown menus
  - Handler properly attached during initialization for inline mode

- **Non-interactive unified headers no longer show hover effects**
  - When `unifiedHeaderInteractive` is false, unified header appeared clickable with hover background
  - Added CSS modifier class `.drp-date-picker__unified-range--static`
  - Non-interactive headers now have default cursor and no hover/active effects
  - Clearly distinguishes clickable vs non-clickable headers

- **Unified Navigation: Individual month headers now non-interactive**
  - Fixed bug where individual month headers were still interactive (clickable) in unified navigation mode
  - Individual month headers now correctly display as static text-only with no prev/next buttons
  - Only the unified header should have navigation controls when `unifiedNavigation` is enabled
  - Eliminates user confusion about which navigation controls are active

- **Unified Navigation: Rolling selector constraints now properly applied**
  - Verified that `rollingYearRange` and `rollingMonthRange` constraints work correctly in unified rolling selector
  - Year and month selectors properly mark disabled years/months
  - Matches behavior of individual month rolling selectors

### Changed

- **BREAKING: Renamed `beforeDateSelect` to `beforeDateSelectCallback`**
  - **What Changed**: To maintain naming consistency across the codebase, the callback property has been renamed.
  - **Naming Convention**: Event handlers (passive) use no suffix (e.g., `onSelect`), while callbacks (active transforms/validation) use "Callback" suffix.
  - **Old API** (removed):
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeDateSelect: async (selection) => {
        return { action: 'accept' };
      }
    });
    ```
  - **New API**:
    ```javascript
    const picker = new DateRangePicker(input, {
      beforeDateSelectCallback: async (selection) => {
        return { action: 'accept' };
      }
    });
    ```
  - **Why**: `beforeDateSelectCallback` actively participates in selection (validates, blocks, adjusts), making it a "callback" not just an "event handler"
  - **Migration**: Simply rename `beforeDateSelect` → `beforeDateSelectCallback` in your code

### Removed

- **BREAKING: Removed deprecated `validateRangeCallback`**
  - The old `validateRangeCallback` has been completely removed
  - Use `beforeDateSelectCallback` instead (works for both single and range modes)

## [1.1.0] - 2025-11-20

### Added

- **`formatSummaryCallback` now available as web component property**
  - Previously only available in JavaScript API, now exposed on `<web-daterangepicker>` element
  - Set directly on web component: `picker.formatSummaryCallback = (data) => { ... }`
  - Allows custom summary formatting in range mode (pricing, night counts, etc.)
  - See updated documentation in `ai/basic-usage.txt` and showcase examples
  - **Example**:
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.formatSummaryCallback = (data) => {
      const total = data.nights * 150;
      return `${data.nights} nights × $150 = $${total}`;
    };
    ```

### Changed

- **Updated documentation to clarify callback availability**
  - `ai/basic-usage.txt`: Added comprehensive section on web component callback properties
  - `ai/INDEX.txt`: Added new "WEB COMPONENT CALLBACK PROPERTIES" section
  - Most callbacks are now properly exposed as web component properties
  - Only `customStrings` and `actionButtons` remain JavaScript API only

### Fixed

- **Updated `examples-basic.html` to use proper API**
  - Changed from accessing private `picker` property to using public `formatSummaryCallback` property
  - Removes reliance on internal implementation details

### Removed

- **BREAKING: Removed `isDateDisabled` callback option**
  - **What Changed**: The `isDateDisabled` callback has been completely removed from the API. Use `getDateMetadataCallback` instead.
  - **Old API** (removed):
    ```javascript
    const picker = new DateRangePicker(input, {
      isDateDisabled: (date) => {
        return date.getDay() === 0 || date.getDay() === 6; // Boolean return
      }
    });
    ```
  - **New API** (correct):
    ```javascript
    const picker = new DateRangePicker(input, {
      getDateMetadataCallback: (date) => {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        return isWeekend ? { isDisabled: true } : null; // DateInfo object or null
      }
    });
    ```
  - **Why**: This removes API inconsistency. The `getDateMetadataCallback` is more powerful as it allows both disabling dates AND adding visual metadata (badges, tooltips, custom classes) in a single callback.
  - **Migration Guide**:
    1. Find all uses of `isDateDisabled` in your code
    2. Replace with `getDateMetadataCallback`
    3. Change return value from boolean to `{ isDisabled: true }` or `null`
    4. Optionally add visual metadata like badges or tooltips
  - **Files Modified**: `src/types.ts`, `src/web-component.ts`, `src/date-picker-validation.ts`, `src/date-picker.ts`

## [1.0.0] - PUBLISHED - 2025-11-20

### Changed

- **BREAKING: Logging System - Complete Rewrite**
  - **Global API Namespace**: Migrated from `window.keenmate.daterangepicker` to `window.components['web-daterangepicker']`
    - **Old**: `window.keenmate.daterangepicker.version()`
    - **New**: `window.components['web-daterangepicker'].version()`
  - **Logger Naming**: Renamed loggers to match hierarchical category system
    - `initLogger` → `drpLogger` (main logger for initialization and general logs)
    - All other loggers renamed to hierarchical categories: `DRP`, `DRP:RENDERING`, `DRP:INTERACTION`, `DRP:SELECTION`, `DRP:NAVIGATION`, `DRP:UI`, `DRP:VALIDATION`, `DRP:DRAG`
  - **Color-Coded Console Output**: Added styled console logs matching svelte-spa-router pattern
    - Blue for debug, green for info, orange for warn, red for error
    - Timestamps with milliseconds for precise debugging
    - Format: `[HH:MM:SS.mmm] [LEVEL] [CATEGORY] message`
  - **New Logging API**: Exposed via `window.components['web-daterangepicker'].logging`
    - `enableLogging()` - Enable all loggers at debug level
    - `disableLogging()` - Silence all loggers
    - `setLogLevel(level)` - Set all loggers to specific level ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
    - `setCategoryLevel(category, level)` - Set specific category level (e.g., 'DRP:RENDERING', 'debug')
    - `getCategories()` - Get array of all available categories
  - **Files Modified**:
    - `src/logger.ts` - Complete rewrite with loglevel-plugin-prefix, custom methodFactory, color scheme
    - `src/index.ts` - Changed global namespace, added logging property to API
    - `src/date-picker.ts` - Updated imports (`initLogger` → `drpLogger`, `setLoggingEnabled` → `enableLogging/disableLogging`)
  - **Usage Example**:
    ```javascript
    // Enable all logging
    window.components['web-daterangepicker'].logging.enableLogging()

    // Set specific category to debug
    window.components['web-daterangepicker'].logging.setCategoryLevel('DRP:RENDERING', 'debug')

    // Get all categories
    window.components['web-daterangepicker'].logging.getCategories()
    // Returns: ['DRP', 'DRP:RENDERING', 'DRP:INTERACTION', 'DRP:SELECTION', 'DRP:NAVIGATION', 'DRP:UI', 'DRP:VALIDATION', 'DRP:DRAG']

    // Disable all logging
    window.components['web-daterangepicker'].logging.disableLogging()
    ```

- **Callback property names** for clarity and consistency
  - `renderDay` → `renderDayCallback`
  - `renderDayContent` → `renderDayContentCallback`
  - `getDateMetadata` → `getDateMetadataCallback`

### Added

- **Size Control Attributes**: New `spacing` and `font-size` attributes for easy calendar sizing
  - **`spacing` attribute**: Controls gaps, padding, and calendar width
  - **`font-size` attribute**: Controls all text sizing
  - **Values**: `"xs"` (0.7×) | `"sm"` (0.85×) | `"md"` (1.0×, default) | `"lg"` (1.2×) | `"xl"` (1.4×)
  - **Usage**:
    ```html
    <!-- Small compact picker -->
    <web-daterangepicker spacing="sm" font-size="sm"></web-daterangepicker>

    <!-- Large picker for desktop -->
    <web-daterangepicker spacing="lg" font-size="lg"></web-daterangepicker>

    <!-- Independent control: large text, compact spacing -->
    <web-daterangepicker spacing="sm" font-size="lg"></web-daterangepicker>
    ```
  - **JavaScript API**:
    ```javascript
    const picker = document.querySelector('web-daterangepicker');
    picker.spacing = 'lg';      // Property setter
    picker.fontSize = 'xl';     // Property setter
    ```
  - **Implementation**: Applies existing `.drp-spacing-*` and `.drp-font-*` CSS classes to the component element
  - **Benefits**:
    - No wrapper divs needed (works with Shadow DOM)
    - Dynamic sizing via JavaScript properties
    - Independent font and spacing control
    - No re-initialization when size changes (just CSS updates)
  - **Files Modified**:
    - `src/web-component.ts`: Added size attribute handling, `applySizeStyles()` method, getters/setters
  - **Replaces**: Wrapper div approach with CSS classes (though CSS classes still work for advanced use)

## [1.0.0-rc08] - 2025-11-13

### Fixed

- **Critical: RC07 was published without today's fixes**: RC07 was built from outdated dist folder (Nov 12 build)
  - This version correctly includes all fixes from rc06 and rc07
  - Updated Makefile: `make publish` now runs `clean-dist` before building
  - Ensures published package always contains latest source code changes

## [1.0.0-rc07] - 2025-11-13

### Changed

- **BREAKING: Calendar Trigger Modes Renamed**: Replaced `calendar-open-trigger` values for better clarity
  - **Old values**: `"auto"` | `"button"`
  - **New values**: `"focus"` | `"typing"` | `"manual"`
  - **Migration Guide**:
    - `"auto"` → `"focus"` (default behavior - opens on input focus)
    - `"button"` → `"manual"` (opens only via button click or programmatic calls)
    - NEW: `"typing"` mode opens calendar when user starts typing
  - **Files Updated**:
    - `src/types.ts`: Updated DatePickerOptions interface
    - `src/date-picker.ts`: Implemented three distinct trigger modes with proper event listeners
    - `src/web-component.ts`: Updated attribute parsing, default is now `"focus"`
  - **New Examples**: Added "Calendar Trigger Modes" section in `examples-basic.html` demonstrating all three modes

### Added

- **Typing Trigger Mode**: New `calendar-open-trigger="typing"` mode that opens calendar when user starts typing in the input
  - Useful for search-as-you-type interfaces
  - Calendar opens automatically when input value length > 0
  - Example: Start typing "2025" and calendar opens showing that year

## [1.0.0-rc06] - 2025-11-13

### Fixed

- **Critical: Month Offset Bug**: Fixed +1 month offset when parsing `data-date` attributes
  - **Root Cause**: `data-date` stores months in 1-based format (1-12), but JavaScript `Date` constructor expects 0-based months (0-11)
  - **Impact**: When selecting November 3-4, the range was actually created for December 3-4. Drag interactions also selected wrong months.
  - **Files Fixed**:
    - `src/date-picker-selection.ts` (lines 99, 193): Added `month - 1` when creating Date from selected day and when tracking focused day
    - `src/date-picker-interaction.ts` (lines 100, 222, 373): Added `month - 1` in drag start, drag move, and drag end handlers
    - `src/date-picker-navigation.ts` (lines 179, 258, 312): Added `month - 1` in keyboard navigation functions
    - `src/date-picker-rendering.ts` (line 739): Added `month - 1` in updateDragPreview to fix drag visual preview
  - **Test File**: Added `test-month-bug.html` to verify fix with 3 test cases (single date, range, cross-month)
  - Now `data-date="2025-11-12"` correctly creates November 12, not December 12

- **Missing Function Import**: Fixed `normalizeDate is not defined` error
  - **Location**: `src/date-picker.ts` line 152
  - **Fix**: Changed `normalizeDate()` to `Validation.normalizeDate()` to use proper namespace
  - This error prevented ALL date pickers from initializing

- **Missing Script Import**: Fixed custom rendering examples not displaying
  - **Location**: `examples-custom-rendering.html`
  - **Fix**: Added `<script type="module" src="/src/index.ts"></script>` to load web component
  - All 6 custom rendering examples now work correctly

## [1.0.0-rc05] - 2025-11-13

### Added

- **Custom Day Cell Rendering**: Added comprehensive customization API with slots and render callbacks
  - **Named Slots per Day**: Declarative HTML customization using `<div slot="day-YYYY-MM-DD">`
    - Example: `<div slot="day-2025-01-15">Custom content</div>`
    - Perfect for marking specific special dates, events, or holidays
    - Highest priority - overrides callbacks and default rendering

  - **`renderDay` Callback**: Full replacement of day cell content
    - Signature: `(data: DayRenderData) => HTMLElement | string | null`
    - Replaces entire day cell content with custom rendering
    - Use for dynamic content like prices, availability, complex layouts
    - Second priority - used when no slot exists for that day

  - **`renderDayContent` Callback**: Augmentation of default day cell
    - Signature: `(data: DayRenderData) => HTMLElement | string | null`
    - Adds content to default day number display
    - Use for badges, icons, indicators that accompany the day number
    - Third priority - used when no slot and no `renderDay`

  - **DayRenderData Interface**: Complete context provided to callbacks
    - Date information: `date` (Date object), `dateString` (ISO format), `dayNumber` (1-31)
    - State flags: `isDisabled`, `isSelected`, `isStartDate`, `isEndDate`, `isInRange`, `isToday`, `isWeekend`
    - Context: `monthIndex`, `element` (default rendered element), `picker` (picker instance)

  - **Priority System**: Three-tier rendering with clear precedence
    1. Per-day slots (highest) - declarative HTML for specific dates
    2. `renderDay` callback - programmatic full replacement
    3. `renderDayContent` callback - programmatic augmentation
    4. Default rendering (lowest) - built-in day number display

  - **Web Component Integration**: Properties exposed on `<web-daterangepicker>` element
    - `picker.renderDay = (data) => { ... }` - Set callback via JavaScript
    - `picker.renderDayContent = (data) => { ... }` - Set callback via JavaScript
    - Callbacks trigger automatic re-render when changed

  - **Examples File**: Created `examples-custom-rendering.html` with 6 complete examples
    - Per-day slots with events and holidays
    - Hotel booking with dynamic pricing
    - Event calendar with indicators
    - Weekend highlighting based on state
    - Mixed slots + callbacks pattern
    - Real-world booking system with totals

  - **Files Modified**:
    - `src/types.ts`: Added `DayRenderData` interface and `renderDay`/`renderDayContent` options
    - `src/date-picker.ts`: Added callback options to constructor (lines 117-118)
    - `src/date-picker-rendering.ts`:
      - Refactored `renderDays()` to wrap content in `<slot>` tags (line 377)
      - Added `processRenderCallbacks()` function to handle callback execution (lines 391-490)
      - Checks slot content, calls callbacks, injects results into DOM
    - `src/web-component.ts`:
      - Added `_renderDay` and `_renderDayContent` private properties
      - Added public getters/setters with auto re-render (lines 429-456)
      - Pass callbacks to picker options (lines 172-173)

### Technical Details

- **Slot Implementation**: Uses HTML `<slot>` elements with named slots for each day
  - Slot names follow format: `day-YYYY-MM-DD` (e.g., `day-2025-01-15`)
  - Default content is day number, replaced by user's slotted content
  - Uses `assignedNodes()` to detect if user provided content

- **Callback Processing**: Runs after DOM update in `renderDays()`
  - Queries all `.drp-date-picker__day` elements
  - Builds `DayRenderData` object with complete state
  - Checks for slot content first (skip callback if slot exists)
  - Executes callback and injects result (HTML string or HTMLElement)
  - Error handling with try-catch and console logging

- **State Classes**: Component ALWAYS adds state CSS classes to container
  - `drp-date-picker__day--disabled`, `--selected`, `--range-start`, etc.
  - Users can leverage these for styling or ignore for complete custom styling
  - Hybrid approach: component manages container, callbacks manage content

## [1.0.0-rc04] - 2025-11-13

### Added

- **Rolling Selector Range Constraints**: Added `rollingYearRange` and `rollingMonthRange` options to limit date selection
  - `rollingYearRange`: Control which years appear in rolling selector and are selectable
    - Examples: `"2025"` (single year), `"2024-2026"` (range)
    - Acts as PRIMARY constraint - dates outside this range are disabled
  - `rollingMonthRange`: Control which months appear in rolling selector and are selectable
    - Format: `"MM-MM"` (e.g., `"06-08"` for summer months, `"11-12"` for year-end)
    - Acts as PRIMARY constraint - dates outside this range are disabled
  - Both options filter the rolling selector lists AND disable dates in the calendar grid
  - Added to `types.ts`, `date-picker.ts`, `web-component.ts` as `rolling-year-range` and `rolling-month-range` attributes
  - Default year range changed from ±50 years to ±1 year (3 years total) when no constraints specified

- **Initial Date Option**: Added `initialDate` option to control which month/year displays when calendar opens
  - Format: Date object or date string (e.g., `"2024-10-01"`)
  - Web component attribute: `initial-date`
  - Smart defaults when not specified:
    - If rolling ranges set: Uses first day of first allowed year/month
    - Else if today is before `minDate`: Uses `minDate`
    - Else if today is after `maxDate`: Uses `maxDate`
    - Else: Uses today
  - Added to `types.ts`, `date-picker.ts`, `web-component.ts`

- **Rolling Selector Examples**: Added comprehensive examples section in `examples-basic.html`
  - Current Year Only
  - Limited to 2025 (via date constraints)
  - Summer Months Only (June-August)
  - Q4 Business Planning (Oct-Dec 2024)
  - Year-End Booking (Nov-Dec only)
  - Multi-Year Range (2024-2026)

### Fixed

- **Rolling Selector Parameters Not Working**: Fixed critical bug where `rollingYearRange` and `rollingMonthRange` were not being applied
  - Root cause: Options were read by web component but never copied to `this.options` in `PureDatePicker` constructor
  - Added missing properties to options object in `date-picker.ts` (lines 114-115)

- **Date Validation Logic**: Made rolling ranges PRIMARY constraints, min/max dates SECONDARY
  - Updated `isDateDisabledInternal()` to check year/month ranges FIRST before other constraints
  - Example: `rolling-month-range="06-07"` only allows June-July dates, even if `min-date/max-date` span full year
  - If ranges are outside min/max dates, all dates are disabled (correct behavior)
  - Added parser helper methods `parseYearRange()` and `parseMonthRange()` to picker class

- **Rolling Selector Width Jump**: Fixed calendar width shrinking by ~0.5rem when opening month/year selector
  - Root cause: Rolling selector had different gap spacing than calendar grid
  - Solution 1: Changed rolling selector gap from `--drp-spacing-md` to `--drp-spacing-xs` in `_header-navigation.scss`
  - Solution 2: Added dynamic width calculation (like height) in `date-picker-rendering.ts`
    - Captures `offsetWidth` of days grid on first render
    - Rounds up with `Math.ceil()` for consistency
    - Sets explicit `style.width` on rolling selector
  - Calendar now maintains consistent width when toggling views

- **Auto-scroll on Rolling Selector Open**: Removed automatic scroll-to-selected-item behavior
  - Removed `scrollIntoView()` calls from `renderRollingSelector()` (lines 395, 414 in `date-picker-rendering.ts`)
  - Selector now stays at top position when opened, providing better UX

- **Month Range Rendering**: Fixed month list to only show months within configured range
  - Changed from rendering all 12 months (with some disabled) to only rendering months in `rolling-month-range`
  - Loop now iterates from `monthRange.min` to `monthRange.max` only
  - Disabled validation still applies to rendered months based on min/max dates

- **Year Range Default**: Reduced default year range for better UX
  - Changed from ±50 years (101 years!) to ±1 year (3 years total)
  - When `min-date/max-date` set but no `rolling-year-range`, automatically constrains to years from those dates
  - Much more sensible default for most use cases

### Changed

- **Validation Logic Priority**: Rolling selector ranges now act as primary constraints
  - Order of validation in `isDateDisabledInternal()`:
    1. Check `rollingYearRange` - disable if outside year range
    2. Check `rollingMonthRange` - disable if outside month range
    3. Check `minDate/maxDate` - disable if outside date range
    4. Check disabled weekdays, disabled dates, custom callbacks
  - This ensures month/year ranges define the "allowed universe" of dates

## [1.0.0-rc03] - 2025-11-11

### Fixed

- **Range Mode Selection Border (Multi-Month)**: Completed fix for visual bug where original clicked date retained focused styling when dragging a range from a different month column
  - Previously only worked within same month column
  - Now properly clears both visual classes and focus state across all month columns in multi-month display
  - Fixed in `date-picker-interaction.ts` lines 119-125:
    - Clears `focusedDayIndex` to prevent re-applying focus during re-render
    - Removes all selection-related CSS classes (`--range-start`, `--range-end`, `--selected`, `--focused`) from all day elements
  - Ensures clean visual state when starting new range from different month

### Removed

- **Old SCSS File**: Removed `src/scss/_date-picker.scss.old` (replaced by modular SCSS architecture)

### Added

- **Example Files**: Added comprehensive example HTML files
  - `examples-basic.html` - Basic usage examples
  - `examples-logging.html` - Logging and debugging examples
  - `examples-theming.html` - Theming and customization examples

## [1.0.0-rc02] - 2025-11-11

### Added

- **Convenience Package Exports**: Added direct exports for commonly used SCSS files
  - `@keenmate/web-daterangepicker/scss/variables` - Direct access to SCSS variables
  - `@keenmate/web-daterangepicker/scss/base` - Direct access to CSS custom properties definitions
  - Makes it easier to import just the variables or base styles without traversing paths

### Fixed

- **Dark Theme Color System**: Fixed theming system to support proper dark mode and custom color schemes
  - **Root Cause**: CSS color properties were missing from month titles and day cells, causing text to default to black
  - **Added Missing Color Declarations**:
    - Added `color: var(--drp-text-primary)` to `.drp-date-picker__month-year` in `_header-navigation.scss`
    - Added `color: var(--drp-text-primary)` to `.drp-date-picker__day` in `_calendar-grid.scss`
  - **New CSS Variables for Themeable Text Colors**:
    - Added `--drp-accent-text-color` for text on accent-colored backgrounds (default: white)
    - Added `--drp-button-text-color` for button text (default: white)
  - **Replaced Hardcoded Colors**: Converted all hardcoded white text colors to CSS variables:
    - Selected days, range dates, and drag preview edges now use `var(--drp-accent-text-color)`
    - Apply button now uses `var(--drp-button-text-color)`
    - Rolling selector selected items now use `var(--drp-accent-text-color)`
  - **Updated Dark Theme Example**: Enhanced `examples-theming.html` with proper dark mode colors:
    - `--drp-text-primary: #f1f5f9` (light text for dark backgrounds)
    - `--drp-accent-text-color: #ffffff` (white text on blue accents)
    - `--drp-button-text-color: #ffffff` (white text on buttons)
  - This enables full theming support where accent colors, backgrounds, and text colors can all be customized independently
- **SCSS Import Structure**: Fixed web component to use new modular SCSS architecture
  - Changed `web-component.ts` to import `./scss/main.scss` instead of old monolithic `_date-picker.scss`
  - Ensures all color properties from modular files are included in the build
  - Renamed old file to `_date-picker.scss.old` to prevent confusion
- **Range Mode Selection Border**: Fixed visual bug where the original clicked date retained its selection border when dragging a range from a different date
  - When clicking a date and then dragging from a different date, the picker now correctly clears the old selection
  - Prevents confusing visual state where multiple dates appear selected
  - Fixed in `date-picker-interaction.ts` startDrag function
- **Month/Year Selector Navigation Interference**: Fixed selector staying open when navigation buttons are clicked
  - Month/year rolling selector now automatically closes when users click previous/next month buttons (< >)
  - Prevents scroll jumping and layout issues caused by open selector during month navigation
  - Fixed in `date-picker-navigation.ts` prevMonth and nextMonth functions

### Documentation

- **Input Styling Limitation**: Documented Shadow DOM limitation for input field styling
  - Added comprehensive warning section in Custom Styling documentation page
  - Explained why component cannot style the `<input>` element directly (Shadow DOM encapsulation)
  - Provided CSS examples for styling inputs in global styles
  - Included framework examples for Tailwind CSS and Bootstrap
  - Cross-referenced with API documentation Known Limitations section
- **Placeholder Clarification**: Documented that `placeholder` attribute must be set explicitly even when using `display-format-mask`
  - The `display-format-mask` only provides localized format tokens for display
  - The `placeholder` attribute controls the actual input placeholder text
  - Both should be set for optimal user experience

## [2.0.0] - 2025-11-06

### BREAKING CHANGES - Comprehensive Naming Refactor

This release focuses entirely on improving naming clarity and self-documentation across the entire API. All changes are **breaking** and require migration.

### Added

#### Internationalization (i18n)

Complete i18n support with automatic locale detection, built-in translations, and full customization:

- **Auto Locale Detection**: Set `locale="auto"` to automatically detect user's browser language
- **Built-in Locales**: English (`en`), German (`de`), French (`fr`), Spanish (`es`)
- **Intl API Integration**: Automatically localized weekday and month names via `Intl.DateTimeFormat`
- **Dual Mask System**:
  - `date-format-mask`: Used for validation (always English tokens: YYYY, MM, DD)
  - `display-format-mask`: Shown to users (localized tokens: aaaa for Spanish año, jjjj for German jahr)
  - Example: `date-format-mask="YYYY-MM-DD"` with `display-format-mask="dd/mm/aaaa"` for Spanish
- **Custom String Overrides**: Override any UI string via `customStrings` option
  - Button labels: `today`, `clear`, `apply`
  - Summary text: `preview`, `day`/`days`, `night`/`nights`
- **New Attributes**:
  - `locale`: Set language (`'auto'`, `'en'`, `'de'`, `'fr'`, `'es'`)
  - `display-format-mask`: Localized format hint for users
- **New Options**:
  - `locale`: Language code or `'auto'`
  - `displayFormatMask`: Localized format mask
  - `customStrings`: Partial<LocaleStrings> for overriding UI text
- **New TypeScript Interface**: `LocaleStrings` for type-safe custom translations

**Example Usage:**

```html
<!-- Spanish with auto-detection -->
<web-daterangepicker locale="auto"></web-daterangepicker>

<!-- Explicit Spanish with localized display mask -->
<web-daterangepicker
  locale="es"
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  placeholder="Selecciona una fecha">
</web-daterangepicker>
```

```javascript
// German with custom string overrides
const picker = new PureDatePicker(input, {
  locale: 'de',
  dateFormatMask: 'DD.MM.YYYY',
  displayFormatMask: 'tt.mm.jjjj',
  customStrings: {
    today: 'Jetzt',
    clear: 'Zurücksetzen'
  }
});
```

### Fixed

- **Grid Layout Overflow**: Fixed floating calendar popups with grid layouts not being visible on smaller screens
  - Added `max-width: calc(100vw - 2rem)` to prevent calendar from extending beyond viewport
  - Added `box-sizing: border-box` to include padding in width calculation
  - Grid layouts (especially 2×3 with 6 months) now properly constrain to viewport width

#### Renamed Web Component Attributes (HTML)

| Old Name | New Name | Reason |
|----------|----------|--------|
| `mode` | `selection-mode` | Clarifies this controls selection behavior |
| `format` | `date-format-mask` | Specifies this is for date formatting |
| `months-to-show` | `visible-months-count` | More explicit about what the number represents |
| `trigger` | `calendar-open-trigger` | Clarifies what is being triggered |
| `disabled-days` | `disabled-weekdays` | Distinguishes from days of month (0-6 are weekdays) |
| `display` | `positioning-mode` | More explicit about what is being displayed |
| `layout` | `month-layout` | Clarifies this controls month arrangement |
| `range-disabled-mode` | `range-disabled-handling` | Better describes the behavior |
| `position` | `calendar-placement` | More specific about what is being positioned |

#### Renamed DatePicker Options (JavaScript/TypeScript)

| Old Name | New Name |
|----------|----------|
| `mode` | `selectionMode` |
| `position` | `calendarPlacement` |
| `monthsToShow` | `visibleMonthsCount` |
| `format` | `dateFormatMask` |
| `calendarTrigger` | `calendarOpenTrigger` |
| `display` | `positioningMode` |
| `layout` | `monthLayout` |
| `disabledDays` | `disabledWeekdays` |
| `getDateInfo` | `getDateMetadata` |
| `rangeDisabledMode` | `rangeDisabledHandling` |

#### Renamed Public Methods

| Old Name | New Name | Reason |
|----------|----------|--------|
| `getValue()` | `getInputValue()` | Clarifies it returns the input's value |
| `setValue()` | `setInputValue()` | Clarifies it sets the input's value |
| `clear()` | `clearSelection()` | Explicit about what is being cleared |

#### Renamed TypeScript Interfaces

| Old Name | New Name | Reason |
|----------|----------|--------|
| `SpecialDate` | `DecoratedDate` | Better describes dates with custom styling/labels |

#### Renamed CSS Classes (ALL)

**All CSS classes** have been renamed from `pa-*` prefix to `drp-*` prefix (Date Range Picker):

- `pa-date-picker` → `drp-date-picker`
- `pa-input` → `drp-input`
- `pa-date-picker__day` → `drp-date-picker__day`
- ... and 100+ other classes

### Migration Guide

#### For HTML/Web Component Users

```html
<!-- BEFORE (v1.0.0-rc01) -->
<web-daterangepicker
  mode="range"
  format="DD/MM/YYYY"
  months-to-show="2"
  trigger="auto"
  disabled-days="0,6"
  range-disabled-mode="block"
  display="floating"
  layout="grid"
  position="bottom">
</web-daterangepicker>

<!-- AFTER (v2.0.0) -->
<web-daterangepicker
  selection-mode="range"
  date-format-mask="DD/MM/YYYY"
  visible-months-count="2"
  calendar-open-trigger="auto"
  disabled-weekdays="0,6"
  range-disabled-handling="block"
  positioning-mode="floating"
  month-layout="grid"
  calendar-placement="bottom">
</web-daterangepicker>
```

#### For JavaScript/TypeScript Users

```javascript
// BEFORE (v1.0.0-rc01)
const picker = new PureDatePicker(input, {
  mode: 'range',
  format: 'DD/MM/YYYY',
  monthsToShow: 2,
  calendarTrigger: 'auto',
  display: 'floating',
  layout: 'horizontal',
  position: 'bottom-start',
  disabledDays: [0, 6],
  specialDates: [...],
  getDateInfo: (date) => {...},
  rangeDisabledMode: 'allow'
});

picker.setValue('2025-01-01');
const value = picker.getValue();
picker.clear();

// AFTER (v2.0.0)
const picker = new PureDatePicker(input, {
  selectionMode: 'range',
  dateFormatMask: 'DD/MM/YYYY',
  visibleMonthsCount: 2,
  calendarOpenTrigger: 'auto',
  positioningMode: 'floating',
  monthLayout: 'horizontal',
  calendarPlacement: 'bottom-start',
  disabledWeekdays: [0, 6],
  specialDates: [...],  // Uses DecoratedDate interface
  getDateMetadata: (date) => {...},
  rangeDisabledHandling: 'allow'
});

picker.setInputValue('2025-01-01');
const value = picker.getInputValue();
picker.clearSelection();
```

#### For CSS Customization

```css
/* BEFORE (v1.0.0-rc01) */
.pa-date-picker { ... }
.pa-date-picker__day { ... }
.pa-input { ... }

/* AFTER (v2.0.0) */
.drp-date-picker { ... }
.drp-date-picker__day { ... }
.drp-input { ... }
```

#### For Size Wrapper Classes

Size wrapper classes remain unchanged:
- `.drp-font-xs/sm/md/lg/xl` (no change - already used drp prefix)
- `.drp-spacing-xs/sm/md/lg/xl` (no change - already used drp prefix)

---

## [1.0.0-rc01] - 2025-11-06

### Added

#### Core Features
- **Grid Layout Support**: Added 2×3 grid calendar layout for displaying multiple months
  - New `layout` option: `'horizontal'` (default) or `'grid'`
  - New `gridRows` and `gridColumns` options for controlling grid dimensions
  - Responsive grid that adapts to screen size (3 columns → 2 columns → 1 column)
  - Support for both inline and floating display modes
- **Position Control**: Added `position` attribute for controlling popup placement
  - Supports all Floating UI positions: `bottom`, `bottom-start`, `bottom-end`, `top`, `top-start`, `top-end`, `left`, `right`
  - Smart default positioning: center for grid layouts, left-aligned for horizontal layouts
- **Pre-filled Value Support**: Calendar now correctly displays dates from pre-filled input values on initialization

#### Independent Font & Spacing System
- **BREAKING CHANGE**: Replaced `.drp-size-*` classes with independent control
  - New `.drp-font-xs/sm/md/lg/xl` classes - Control text sizing only (0.7×, 0.85×, 1×, 1.2×, 1.4× scales)
  - New `.drp-spacing-xs/sm/md/lg/xl` classes - Control gaps/density only (0.7×, 0.85×, 1×, 1.2×, 1.4× scales)
  - Mix any font size with any spacing density (e.g., large readable text in compact layout)
- **Enhanced Responsive Behavior**: Font and spacing now scale independently at breakpoints
  - Desktop (>1200px): Applied size
  - Tablet (768px-1200px): Scales down one level
  - Mobile (<768px): Scales down two levels

#### Navigation Improvements
- **Smart Navigation Buttons**: Previous/next month buttons now disable when adjacent months have no enabled days
  - Added `hasEnabledDaysInMonth()` function to check date availability
  - Visual disabled state with reduced opacity and pointer-events disabled

#### Range Selection Enhancements
- **Drag-to-Draw Ranges**: Users can now draw ranges by dragging without clicking first
  - Start dragging from any enabled day to create a new range
  - No need to click first, then drag - just drag from the start date
  - Works seamlessly with existing drag-to-adjust functionality

#### Architecture
- **Pure Functional Refactoring**: Converted from mixin-based to pure functional architecture
  - Functions with explicit parameters instead of `this` context
  - Modular organization: separate files for validation, rendering, navigation, selection, interaction, UI
  - Improved maintainability and testability
  - Eliminated `this` binding issues

### Fixed
- **Spacing Consistency**: Fixed day cell spacing to scale proportionally with size modifiers
  - Vertical spacing between date rows now uses CSS variables (changed `gap: 0` → `gap: var(--drp-spacing-xs)`)
  - Badge row spacing now scales with size (changed hard-coded `2px` → `var(--drp-spacing-xs)`)
  - Badge dimensions now scale with font size (changed hard-coded `1rem` → `var(--drp-font-size-base)`)
  - Badge font size now scales properly (changed hard-coded `0.7rem` → `var(--drp-font-size-2xs)`)
- **Grid Layout Border/Overflow**: Fixed grid calendars to properly contain content
  - Inline calendars now use `width: fit-content` instead of `100%`
  - Grid columns use `minmax(0, 1fr)` to allow proper shrinking
  - Individual months in grid have `min-width: 0` to let grid control sizing

### Changed
- **Web Component Attributes**: Added new observed attributes for grid and positioning
  - `layout`: Controls calendar layout mode (`'horizontal'` or `'grid'`)
  - `grid-rows`: Number of rows for grid layout
  - `grid-columns`: Number of columns for grid layout
  - `position`: Controls popup positioning
- **Default Positioning Logic**: Smart defaults based on layout type
  - Grid layouts: centered below input (`'bottom'`)
  - Horizontal layouts: left-aligned below input (`'bottom-start'`)

### Migration Guide (Breaking Changes)

#### Size Modifier Classes
Old combined size classes have been replaced with independent font and spacing classes:

```html
<!-- Before (v0.x) -->
<div class="drp-size-lg">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- After (v1.0.0-rc01) -->
<div class="drp-font-lg drp-spacing-lg">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- Or mix sizes independently -->
<div class="drp-font-lg drp-spacing-xs">
  <web-daterangepicker></web-daterangepicker>
</div>
```

**Migration mapping:**
- `.drp-size-xs` → `.drp-font-xs .drp-spacing-xs`
- `.drp-size-sm` → `.drp-font-sm .drp-spacing-sm`
- `.drp-size-md` → `.drp-font-md .drp-spacing-md` (or omit for defaults)
- `.drp-size-lg` → `.drp-font-lg .drp-spacing-lg`
- `.drp-size-xl` → `.drp-font-xl .drp-spacing-xl`

### Documentation
- Added comprehensive examples for all new features in index.html
  - Grid layout examples (floating popup and inline)
  - Position control examples (6 different positions)
  - Independent font/spacing combinations
  - Responsive sizing examples

---

## [Earlier Versions]

Previous version history not documented. This is the first official changelog entry.
