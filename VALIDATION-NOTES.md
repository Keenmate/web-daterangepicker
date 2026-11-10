# Validation notes — accepted deviations

This file records guideline checks the team has reasoned through and
accepted as the right outcome for this component. The
`/validate-web-component` validator (and the individual triad
validators) read this file on every run; entries here downgrade the
matching `❌ Fail` verdicts to `✅ Pass` (or `⚠️ Exception`) and remove
the items from the punch-list.

Each section is headed with the affected check ID(s) and explains
*why the deviation is correct for this component*. A note that reads
like a deferral ("fix later", "low priority") will be ignored by the
validator — those belong in the actual fix queue, not here.

Consumer-facing limitations (things integrators need to know about)
live in `README.md → ## Known Limitations`, not here. This file is
internal/technical.

---

## C-BV-9 — Strategy A signal-override pattern

The 21 `var(--base-*)` reads the auto-script flags outside
`variables.css` all live in `src/css/dark-mode.css:25-60`. They are
**variable redeclarations inside `:host-context(...)` / `:host(...)`
override selectors** — the canonical "Strategy A" dark-mode pattern
documented in
`guidelines/web-components/color-scheme.md` → "Two strategies for
framework-class & per-instance signals":

```css
:host-context([data-theme="dark"]) {
  --drp-dropdown-bg: var(--base-dropdown-bg, var(--base-elevated-bg, #1a1a1a));
  --drp-border-color: var(--base-border-color, #3a3a3a);
  /* ... */
}
```

This is a `--<prefix>-*` declaration that *reads* `--base-*` to keep
the consumer's cross-component theming hook intact while overriding
the literal fallback for the dark scope. It is NOT a feature-rule
read that bypasses the two-layer pattern (which is what C-BV-9
exists to catch).

The C-BV-9 auto-script doesn't distinguish "variable declaration
inside an override selector" from "feature-rule `var(--base-*)`
read"; for Strategy A components the auto-script over-flags.

---

## C-CST-4 / C-CST-10 — Logic-class module split

The auto-script flags 16 service-to-service imports. These are not
independent Service classes — they're one Logic class
(`DateRangePicker`) organized across files for maintainability:

- `src/date-picker.ts` — main class, holds state, public surface
- `src/date-picker-validation.ts`
- `src/date-picker-rendering.ts`
- `src/date-picker-navigation.ts`
- `src/date-picker-selection.ts`
- `src/date-picker-interaction.ts`
- `src/date-picker-ui.ts`
- `src/date-picker-locales.ts`

The collaborators are imported as namespaces
(`import * as Validation from './date-picker-validation'`) and the
main class delegates through wrapper methods:

```typescript
// src/date-picker.ts:2284
startDrag(event, type, dayElement) {
  return Interaction.startDrag(this, event, type, dayElement);
}
```

The collaborators are not independently consumable — none can be
lifted into another package without the main class's state object
threaded through every call. None of the Bliss Service-class
properties (single-purpose, independently consumable, brokered by
the Logic class) holds. They are functionally the Logic layer split
across files.

The Bliss component-structure guideline currently only documents
single-file Logic classes and independent Service classes. This
pattern (namespace-style Logic-class file split) isn't named.
Until the guideline is updated to recognize it, C-CST-4 produces a
false positive here.

C-CST-10 also flags the folder shape as deviating from the canonical
`<feature>.ts` single-file Logic class. Same rationale.

---

## C-CS-10 — Tooltip portal in standalone JS-class path

The auto-script for C-CS-10 needs human judgment to classify tooltip
code paths (in-shadow / portal / native). This component has two
usage modes with different tooltip behavior:

**Web-component path (the typical case) — Kind A, in-shadow.**
The Element class (`src/web-component.ts:474`) passes
`container: this.shadow as unknown as HTMLElement` into
`new DateRangePicker(...)`. That value flows through to
`this.containerElement` (`src/date-picker.ts:164`) and ultimately to
`new Tooltip(buttonElement, text, { container })` for action-button
tooltips (`src/date-picker.ts:831`) and
`this.containerElement.appendChild(this.tooltip)` for day-cell
tooltips (`src/date-picker.ts:1223`). All tooltip DOM lives inside
the shadow root, so the dark-mode signal selectors
(`:host([data-theme="dark"])`, `:host-context(...)`) reach them and
the `--drp-tooltip-*` variables resolve via the standard chain.

**Standalone JS-class path — Kind B, document.body fallback.**
A consumer using
`new DateRangePicker(inputElement, { /* no container */ })` directly
gets `containerElement = document.body` (the `|| document.body`
fallback in `src/date-picker.ts:164`). Tooltips then live in light
DOM and don't inherit the shadow-scope dark-mode flip. This is the
documented standalone-path behavior; consumers using this path can
pass an explicit `container` option to opt back into shadow scope.

The Kind-A path covers the primary use case (web-component). The
Kind-B path is the standalone fallback and consumers using it know
they're bypassing the custom-element infrastructure. Both paths
behave correctly for the OS / page-level `color-scheme: dark` signal
(via `light-dark()` and the `:host, :root` dual declaration); only
the per-instance / framework-class dark signals are shadow-scoped.

---

## C-CSS-7 / C-NC-8 — Consumer-data discriminator classes

Five of the six BEM-flagged classes (`.holiday`, `.event`,
`.badge-count`, `.badge-number`, `.badge-text`) are not
component-emitted — they're consumer-data values applied via the
`dayClassMember` / `badgeClassMember` callbacks. The component
ships compound selectors (`.drp__day.holiday`,
`.drp__badge-cell.badge-count`) as default styling for the common
consumer conventions, with the actual BEM block (`.drp__day`,
`.drp__badge-cell`) on the left of every compound.

The full rationale is in `README.md → ## Known Limitations` (it's
also consumer-facing — integrators need to know about the
convention). Repeated here so the validator can find the check IDs.

---

## C-NC-6 — *Member fields paired with unified getDateMetadataCallback

Seven `*Member` attributes on `DatePickerOptions` expose the
attribute-driven, property-name-extraction API for consumer data
objects:

- `badgeClassMember`, `badgeTextMember`, `badgeTooltipMember`
- `dateMember`
- `dayClassMember`, `dayTooltipMember`
- `isDisabledMember`

The C-NC-6 auto-script expects each `*Member` to pair with a
per-field `get*Callback` (e.g., `getBadgeClassCallback`). For this
component the programmatic peer is the **unified
`getDateMetadataCallback`**, which returns a `DayMetadata` containing
all seven values in one call per day. The pattern is intentional:
per-field callbacks would force seven function calls per day cell
(quadratic in date-range pickers with many visible days) and would
duplicate the data-shape logic on the consumer side. The single
unified callback is the canonical extraction surface for this
component.

The auto-script flags the absence of the per-field callbacks; the
unified callback satisfies the spirit of the check.

---

## C-BV-1 / C-BV-4 / theme-designer integration — `--base-input-size-*-height` taxonomy alignment

The picker reads five `--base-input-size-{xs,sm,md,lg,xl}-height`
variables in `src/css/variables.css:235-259` to drive the input-size
scale (per `input-size="xs|sm|md|lg|xl"` attribute). The validator
cross-cuts this against the BlissFramework canonical `--base-*`
taxonomy because cross-component reads must be on the agreed list —
otherwise consumers using the Theme Designer or pure-admin to
override them silently get no effect.

**Verified 2026-06-16 against all four sources of truth:**

- `C:\Git\BlissFramework\guidelines\web-components\base-variables.md:232-236`
  — all five rows present in the "Canonical `--base-*` taxonomy" table.
- `C:\Git\BlissFramework\guidelines\web-components\base-variables.decisions.md:63`
  — listed in the design-decisions checklist for components with
  multiple input-size variants.
- `C:\Git\KM\theme-designer\src\generators\base.ts:142-146` — emitted
  by the Theme Designer generator with default values 3.1 / 3.3 / 3.5
  / 3.8 / 4.1 (matching the picker's fallback values).
- `C:\Git\KM\pure-admin\packages\core\base-variables.manifest.json:61-65`
  — listed in pure-admin's manifest (md flagged `required: true`,
  others `required: false`).
- `C:\Git\KM\web-multiselect\component-variables.manifest.json:52-56`
  — sibling component reads the same five variables (cross-component
  consumption is the test of cross-component canonicalness).

The full chain is intact: pure-admin SCSS sources → Theme Designer
generator → `--base-*` CSS custom properties → both `web-multiselect`
and `web-daterangepicker` read them. A single
`:root { --base-input-size-md-height: 4.0 }` declaration recolors
input heights across every Keenmate component on the page.

No action required on subsequent validation runs unless the
upstream taxonomy table changes; revisit if the BlissFramework
guidelines drop these rows or the Theme Designer stops emitting them.

---

## C-TC-1 — `:host, :root` dual declaration (D-TC-7 = C)

`src/css/variables.css` declares the `--drp-*` set on `:host, :root`, and its
`prefers-reduced-motion` block (the one the auto-script flags) mirrors that
selector. The `:root` half is for the **standalone engine path**:
`DateRangePickerEngine` is a documented public entry (`docs/usage.md` →
"JavaScript instantiation") that renders into light DOM with
`dist/style.css` / `injectGlobalStyles()`. There is no shadow host there, so
`:host` matches nothing; without `:root` every `--drp-*` read falls to its
literal fallback, and the reduced-motion block would stop zeroing the
transitions for those pickers. Its document-body fallback for tooltips
(C-CS-10 above) is the same D-TC-7 = C portal case.

The web-component path is unaffected by the `:root` copy: each picker's
`:host` declaration is nearer than `:root`, so a `--base-*` wrapper around
one picker still re-themes only that picker (C-TC-12). The script only flags the
reduced-motion block because the main block's first declaration sits more than
30 lines below its selector (header comment).

---

## C-RO-2 — the phone presentation is not a media query (D-RO-5 = B)

The floating → modal → full-screen switch is core's `resolvePresentation`
(`src/web-component.ts`, `resolvePresentation(mode, env, { tablet: 'modal' })`):
device class from touch-primary + the shorter viewport side, so it is
orientation-robust and driven from JS, not from a CSS breakpoint. There is no
`@media (max-width: <phone>)` that decides the presentation, so there is no
phone literal that could drift.

The `max-width` queries the script finds are layout tiers inside a
presentation, each written once per file:

- `base.css` 1200 / 768 / 480 — grid month columns (3 → 2 → 1);
- `modal.css` 1200 / 768 / 480 — the modal width per tier, the same
  boundaries in the same desktop-first cascade (media queries can't read
  variables, so the literals repeat; both files name each other);
- `time-picker.css` 600 — stacking the calendar above the time picker in a
  non-inline datetime popover.

---

## C-BV-6 — `--drp-fullscreen-input-font-size` is an input variable

`--drp-fullscreen-input-font-size` is listed in the manifest but never declared
in CSS, by design: it is an **input** — `fullscreen.css` reads it with a fallback,
`var(--drp-fullscreen-input-font-size, var(--drp-fullscreen-title-font-size))`, so
an unset knob follows the full-screen header title size. Declaring it on `:host`
would pin a value and cut that chain; dropping it from the manifest would hide a
documented theming knob. The check only accepts declared variables — rulebook gap
"C-BV-3 / C-BV-6 — input variables" (`_agent-progress/rulebook-gaps-from-devkit.md`
item 1, same case as web-treeview's context-menu inputs). Drop this note when the
rulebook accepts read-with-fallback input variables.
