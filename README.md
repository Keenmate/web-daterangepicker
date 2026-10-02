# Date Range Picker Web Component

A lightweight, framework-agnostic date picker that ships as a single
custom element. Keyboard-first navigation, single / range / multiple
selection modes, optional time + datetime modes, and OS-aware dark
mode out of the box.

> **⚠️ Security Notice:** This component intentionally allows raw HTML
> in rendering callbacks and message content to give developers full
> control over content display. If you display user-generated content,
> you must sanitize it yourself. See [HTML Injection (XSS) Notice](#html-injection-xss-notice)
> for the complete list of affected callbacks and methods.

## What's New in v2.0.0-rc06

- **Form integration — submit selections in a `<form>` with just a `name`, like a native control** — `<web-daterangepicker>` now participates in forms the way `<web-multiselect>` does: give it a `name` and it renders a light-DOM hidden `<input>` inside the form carrying the selection, clears on `form.reset()`, and exposes `el.form` / `event.target.form` so frameworks that delegate form changes by reading `target.form` (Phoenix LiveView's `phx-change`) resolve the parent form. It replaces the earlier `ElementInternals.setFormValue` approach, which silently submitted nothing for inline pickers (they have no visible input); the hidden-input model works uniformly across `inline`, `floating`, and `modal`. The submitted value is stable ISO-8601, independent of `date-format-mask` / `display-format-mask`, so a locale display mask never leaks into your form data. Requires `@keenmate/web-components-core` ≥ 1.0.0-rc02 (the `el.form` getter).

- **Definable submission format — `value-format`, `getValueFormatCallback`, and disabled-day awareness** — a new `value-format` attribute (`iso` | `json` | `array`) chooses how the selection serializes: one field (`2026-06-15`, or a `start/end` interval for a range), `JSON.stringify` of the selection, or multiple `name[]` inputs (a range flattens to `start`, `end`). The `getValueFormatCallback` property takes full control, receiving a normalized ISO snapshot and returning the field value. Crucially the value reflects the *real* selection under `disabled-dates-handling`: a range split across disabled days (`split`) submits each sub-range rather than the whole envelope, and `individual` / `block` submit the enabled days — so disabled days in a gap are never submitted.

## What's New in v2.0.0-rc04

- **Editor autocomplete — full IntelliSense for `<web-daterangepicker>` in VS Code and JetBrains** — the package now generates and publishes a Custom-Elements-Manifest (`custom-elements.json`) plus editor-integration artifacts (`web-types.json`, `vscode.html-custom-data.json`), so dropping the element into an HTML file gives you tag completion, all 56 attributes, enum value completion (typing `selection-mode="` offers `single` / `range` / `multiple`), and hover documentation. VS Code picks it up via `html.customData`; JetBrains IDEs auto-discover it through the `web-types` package.json field. Generation is wired into `npm run build`, so the manifest tracks the source and can't go stale.

- **Zero-drift manifest — attributes derived straight from the runtime attribute table** — the element's entire attribute surface lives in one place (`ATTRIBUTE_TABLE`), which the stock analyzer can't read because it's consumed through a dynamic `.map()` spread. A custom analyzer plugin reads that table (and `NON_PICKER_ATTRIBUTES`) directly from the AST, resolves each enum's allowed values from the source union types, and pulls descriptions from the `DatePickerOptions` JSDoc — so the manifest is built from the same single source of truth the component uses at runtime and can never disagree with it.

- **Richer type docs — every option now has an editor hover** — the `DatePickerOptions` interface got a JSDoc pass: inline comments became proper doc comments, and every enum option (selection mode, picker mode, positioning, time display, and more) is documented with its allowed values and defaults in a consistent, readable format. It surfaces both in the new HTML autocomplete and when hovering `DatePickerOptions` fields in TypeScript.

## What is it

`@keenmate/web-daterangepicker` is a date picker that runs as a Web
Component — drop the `<web-daterangepicker>` element into any HTML
page (or any framework that speaks DOM: React, Vue, Svelte, Angular,
plain HTML) and it works. No JavaScript framework integration to
build. No virtualized rendering. No copy-pasted theme tokens to keep
in sync.

It covers the full date-picker matrix in one component: **single date**
or **date range** selection; **single / range / multiple** modes;
**date**, **time**, or **datetime** picker modes with four time-display
UIs (rolls, Material clock face, iOS wheel, iOS compact pills);
**multi-month** grids; **input masking** with progressive auto-format
as the user types; **drag-to-adjust** for range endpoints; **disabled
dates** with five different range-traversal strategies; **special
dates** with badges, tooltips, and `dayClass` / `badgeClass`
discriminator hooks; **localized** week start, month names, and labels;
and **async validation** via `beforeDateSelectCallback` with optional
bulk metadata loading per month.

What makes it different from the rest of the date-picker ecosystem:

- **No JavaScript dark-mode detection.** The picker reacts to five
  separate CSS-only signals (OS `prefers-color-scheme`, page-level
  `color-scheme`, framework class on an ancestor, per-instance
  `data-theme` attribute, explicit `light` override) via `light-dark()`
  and `:host-context(...)` selectors. Set whichever your page already
  uses; it flips automatically.
- **Theme Designer integration.** Optional. If you use the KeenMate
  Theme Designer at [theme-designer.keenmate.dev](https://theme-designer.keenmate.dev),
  the picker reads the cross-component `--base-*` taxonomy so one
  theme drives every KeenMate component on the page.
- **One component, every selection shape.** Date / range / multiple /
  time / datetime in one custom element with one consistent API —
  switch by changing one attribute, not by installing a different
  package.
- **First-class keyboard.** Arrow keys, Home / End, Ctrl+Home / End,
  Tab between month columns, `T` to jump to today. Modal mode blurs
  the input so the mobile soft-keyboard collapses.

For a more honest accessibility audit including current ARIA gaps,
see [`docs/accessibility.md`](./docs/accessibility.md).

## Demos & docs

- 🚀 [Live demo](https://web-daterangepicker.keenmate.dev)
- 📘 [Usage / API reference](./docs/usage.md)
- 🎨 [Theming contract](./docs/theming.md)
- 📚 [Examples / cookbook](./docs/examples.md)
- ♿ [Accessibility](./docs/accessibility.md)

## Install

```bash
npm install @keenmate/web-daterangepicker
```

`rc` releases are tagged separately — install with `@rc` or pin the
exact version:

```bash
npm install @keenmate/web-daterangepicker@rc
```

## Quick start

### Basic HTML

```html
<!-- Single date -->
<web-daterangepicker
  selection-mode="single"
  date-format-mask="YYYY-MM-DD"
  placeholder="Select date"
></web-daterangepicker>

<!-- Date range -->
<web-daterangepicker
  selection-mode="range"
  date-format-mask="YYYY-MM-DD"
  visible-months-count="2"
  placeholder="Select date range"
></web-daterangepicker>
```

### With JavaScript / TypeScript

```ts
// Import the component (registers <web-daterangepicker> + injects styles)
import '@keenmate/web-daterangepicker';

const picker = document.querySelector('web-daterangepicker');

// Listen for date selection
picker.addEventListener('date-select', (e) => {
  console.log('Selected:', e.detail.formattedValue);
  console.log('Date object:', e.detail.date);
  console.log('Range:', e.detail.dateRange);
});

// Programmatic API
picker.open();
picker.close();
picker.toggle();
picker.clearSelection();
picker.setInputValue('2025-11-15');
```

Using the `DateRangePicker` class directly (without the custom
element) is fully supported — see [`docs/usage.md`](./docs/usage.md#javascript-instantiation-datepickerangepicker-class)
for the CSS-loading caveats.

## Editor IntelliSense

The package ships editor metadata so you get autocomplete and hover docs for the
element's attributes, events, and all `--drp-*` CSS custom properties. All of it
is generated from the component's source on every build, so it never drifts.

- **JetBrains** (WebStorm / IntelliJ) — works automatically. The IDE discovers
  `web-types.json` via the `web-types` field in `package.json`; no setup needed.
- **VS Code** — the data files ship but VS Code doesn't auto-discover them from a
  dependency, so point your workspace at them once in `.vscode/settings.json`:

  ```json
  {
    "html.customData": [
      "./node_modules/@keenmate/web-daterangepicker/vscode.html-custom-data.json"
    ],
    "css.customData": [
      "./node_modules/@keenmate/web-daterangepicker/vscode.css-custom-data.json"
    ]
  }
  ```

  `html.customData` powers tag/attribute completion on `<web-daterangepicker>`;
  `css.customData` powers completion for the `--drp-*` theming variables. Reload
  the window after adding them.

## Browser support

Modern browsers with Web Components and CSS `color-mix()` support:

- Chrome / Edge 111+
- Firefox 113+
- Safari 16.2+

## Built with BlissFramework

Follows the [BlissFramework component guidelines](https://blissframework.dev/)
for structure, theming, color-scheme, and accessibility. See
[`VALIDATION-NOTES.md`](./VALIDATION-NOTES.md) for the accepted-deviation
register and [`docs/theming.md`](./docs/theming.md) for the four-contract
theming model.

## HTML Injection (XSS) Notice

The following callbacks and methods allow **raw HTML injection** and
are intentionally **not XSS-safe**. This gives developers full control
over rendering but requires sanitizing untrusted data:

| Callback / Method | Output used in | Risk |
|---|---|---|
| `showMessage(html)` | Message area (innerHTML) | HTML injection |
| `renderDayCallback` | Day cells (innerHTML) | HTML injection |
| `renderDayContentCallback` | Day cells (innerHTML) | HTML injection |
| `getDateMetadataCallback` (`badgeText`, `dayTooltip`) | Badges / tooltips (innerHTML) | HTML injection |
| `formatSummaryCallback` | Summary display (innerHTML) | HTML injection |
| `getMonthHeaderCallback` | Month headers (innerHTML) | HTML injection |
| `getUnifiedHeaderCallback` | Unified header (innerHTML) | HTML injection |
| `customStylesCallback` | Style tag (textContent) | CSS injection |
| `actionButtons[].label` | Button labels (innerHTML) | HTML injection |

**Safe callbacks** (output is escaped or used as data):

- `beforeDateSelectCallback`, `beforeMonthChangedCallback` (return action objects)
- `onSelect`, `onChange` (event handlers)
- `getDateMetadataCallback` (`isDisabled`, `dayClass`, `badgeClass` — CSS class names only)

**If displaying user-generated content**, sanitize it before passing
it to these callbacks or methods.

## Known Limitations

### Consumer-data class convention — `.holiday` / `.event` / `.badge-{count,number,text}`

The shipped CSS includes default styles for a small set of class names
the picker doesn't emit itself — they're applied by your code via the
`dayClassMember` / `badgeClassMember` callbacks (or the equivalent
`getDateMetadataCallback` return shape). The component ships compound
selectors (`.drp__day.holiday`, `.drp__day.event`,
`.drp__badge-cell.badge-count`, `.drp__badge-cell.badge-number`,
`.drp__badge-cell.badge-text`) as ready-to-use hooks for these common
conventions so the most frequent decoration cases work without writing
any CSS.

This means a few CSS classes inside the shadow root don't follow
strict BEM (`.<prefix>__element--modifier`) — they're consumer-data
values used as discriminators next to a BEM block, not
component-emitted modifiers. The BEM block (`.drp__day`,
`.drp__badge-cell`) carries the component scope; the discriminator
carries the data convention.

If your data uses different class names, just supply them via the
callback and provide your own CSS — the defaults won't fight you. To
retheme the existing defaults without rewriting the CSS, override the
backing variables:

- **Holiday cell:** `--drp-holiday-color`, `--drp-holiday-bg-opacity`, `--drp-holiday-hover-bg-opacity`
- **Event cell:** `--drp-event-color`, `--drp-event-bg-opacity`, `--drp-event-hover-bg-opacity`
- **Badge types:** `--drp-badge-number-{bg,color}`, `--drp-badge-count-{bg,color}`, `--drp-badge-text-{bg,color}`

These variables are part of the public theming surface (added in
v1.6.0; see [`CHANGELOG.md`](./CHANGELOG.md)).

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for version history and migration
guides.

## License

MIT — see [LICENSE](./LICENSE) if present, otherwise the MIT terms
apply by default per `package.json`.

## Credits

Extracted from the [Pure Admin](https://github.com/keenmate/pure-admin)
design system.
