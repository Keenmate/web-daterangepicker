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

## What's New in v2.0.0-rc07

Upgrade guide: the [2.0.0-rc07 release notes](release-notes/2.0.0-rc07.md); full list: the
[CHANGELOG 2.0.0-rc07 section](CHANGELOG.md).

- **API — one Keenmate vocabulary, no aliases** — The public surface is renamed to the names every Keenmate component shares, so almost every rc06 page needs edits. Flag attributes use the short HTML form (`is-summary-shown` → `show-summary`, `should-close-on-scroll` → `close-on-scroll`, `visible-months-count` → `visible-month-count`), `display-format-mask` is `placeholder-format-mask`, and `show()` / `hide()` are `open()` / `close()`. `customStrings` is one `labels` object with flat `<elementType>.<name>` keys (`buttons.today`, `labels.days`), and the built-in `de` / `fr` / `es` tables are gone. The standalone `DateRangePicker` class and `DatePickerOptions` are no longer exported: use the element, typed by `DateRangePickerConfig`. The release notes carry an rc06 → rc07 table for every rename.
- **Presentation — phone sheet, tablet modal, `presentation`** — `positioning-mode` is now only `inline` | `floating`; how a floating picker opens is the new `presentation` input (`auto` | `floating` | `modal` | `fullscreen`), which replaces `positioning-mode="modal"` and the `mobile-modal-*` attributes. With the default `auto`, a phone gets a full-screen sheet with core's sheet chrome and a tablet a centered modal; the presentation switches in place when the device or orientation changes, keeping the selection. The modal is a core modal session (inert page, Tab trapped, Escape / Back / backdrop close it), and the phone Back gesture closes the sheet without moving the page. `show-fullscreen-input` puts a typeable field into the sheet header. Set `presentation="floating"` to keep rc06's popover everywhere.
- **Presentation — phone sheet and modal are modal sessions** — The page behind is inert, Tab stays inside, Escape / Back / ✕ close it, and the sheet sits above the soft keyboard; `fullscreen-autofocus` moves the input into the sheet header. [Details](release-notes/2.0.0-rc07.md#the-phone-sheet-and-the-modal-are-core-modal-sessions)
- **Committing — `commit-mode` and staged changes** — `commit-mode` (`selection` | `apply` | `manual`) replaces `auto-close` + `is-apply-button-shown`, which could contradict each other, and closing is its own axis (`close-on-select`, `close-on-outside-click`, `close-on-scroll`). A staged change (a pick, a typed date, a clear) is discarded on closing without a commit, on Escape and when the focus leaves the field; `el.commit()` commits it from code. Typing a complete date and clearing the field now commit like a click and fire `change`. A date-mode range picker defaults to `selection`: rc06 showed an Apply button there, so set `commit-mode="apply"` to keep it.
- **Events, callbacks, action buttons — core's interaction model** — `date-select` is gone (it fired with `change`, same detail), `custom-action` is the `action` event for every button and `data-action` trigger, and new `open`, `close`, `month-change`, `ready` and `value-format-error` events join them. Every `on*` twin receives the detail, and events no longer cross shadow roots (`composed: false`). Callbacks follow the `before*` / `get*` / `render*` naming: `beforeSelectCallback` returns `false`, a `Date` / range or `null` instead of an action object, and month data moved to `getMonthDataCallback`. Action buttons are core action items (`{ id, text, onClick, icon, shortcut }`), run in the order `beforeActionCallback` → `onClick` → built-in → `action` event. Contexts carry the typed, frozen `el.controller` instead of the raw engine.
- **Forms — `el.value` is what the form submits, `required`** — `el.value` now returns the submitted value (`2026-06-15/2026-06-20` for a range), and the `value` attribute is the default that `form.reset()` restores. `value-format="iso"` is `text`, a range always submits a list of ranges (`json` objects, one `array` field per range), and `value-format-mask` / `value-separator` choose the written form. `required` blocks the submit while there is no complete value (`validity.valueMissing`, the `errors.required` label; a half-picked range is empty), with `aria-required` and `:state(required)`. A throwing `getValueFormatCallback` makes the control invalid through core's validity API, so the form refuses to submit. A disabled picker, including one inside a disabled `<fieldset>`, no longer submits.
- **Localization and icons — `locale`, `translateCallback`, `renderIconCallback`** — Labels resolve through core `/locale`: instance `labels`, the element's `translateCallback`, the page-wide `window.components.locale` dictionary and its `translateCallback`, then English. Count labels read their context: `labels.days` is `'Days: {ctx.count}'`, `labels.selectionCount` `'{ctx.count} selected'`, and `ctx.count` is the number the noun agrees with, so an i18n library pluralizes it through `translateCallback` (`params.ctx`); the singular `labels.day` / `labels.night` keys are gone. With no `date-format-mask`, the shown date now follows the locale (`17. 11. 2026` in Czech) instead of a fixed `YYYY-MM-DD`; set the mask to keep ISO — the submitted value stays ISO either way. Action-button icons render through core `renderIcon`: built-in names draw `--base-icon-*` masks, `renderIconCallback` (element or page) maps the rest, and other ASCII names become icon-font classes.
- **Accessibility — ARIA grid and roving focus** — Each month is a WAI-ARIA `grid` whose `gridcell` days carry `aria-selected`, `aria-current="date"` and `aria-disabled`, and the grid is one tab stop whose arrows move real focus (core `createRovingFocus`). Shift+PageUp / Shift+PageDown jump a year and Space picks the focused day. Day and badge tooltips show on keyboard focus too and hide on Escape. Typed input is IME-safe, and right-to-left flips the chevrons and the arrow keys.
- **Theming and lifecycle — page-wide CSS, responsive rules, `defer`** — `window.components['web-daterangepicker'].customStyles` styles every picker on the page, and core's responsive rules (`device`, `breakpoint`, the element's own `container` width) change any input per context. Loaders draw through core `renderLoader()` with `renderLoadingCallback`, colours fall back to the `--base-*` contract, and the z-index tiers are the page-wide `--base-z-*`. Core's lifecycle is new too: `defer` / `release()` hold the first build, `ready` / `whenReady()` signal it, and `destroy()` tears the picker down. A few CSS variables are renamed (`--drp-disabled-opacity`, `--drp-message-danger-*`); the release notes list them.

## What's New in v2.0.0-rc06

- **Form integration — submit selections in a `<form>` with just a `name`, like a native control** — `<web-daterangepicker>` now participates in forms the way `<web-multiselect>` does: give it a `name` and it renders a light-DOM hidden `<input>` inside the form carrying the selection, clears on `form.reset()`, and exposes `el.form` / `event.target.form` so frameworks that delegate form changes by reading `target.form` (Phoenix LiveView's `phx-change`) resolve the parent form. It replaces the earlier `ElementInternals.setFormValue` approach, which silently submitted nothing for inline pickers (they have no visible input); the hidden-input model works uniformly across `inline`, `floating`, and `modal`. The submitted value is stable ISO-8601, independent of `date-format-mask` / `display-format-mask`, so a locale display mask never leaks into your form data. Requires `@keenmate/web-components-core` ≥ 1.0.0-rc02 (the `el.form` getter).

- **Definable submission format — `value-format`, `getValueFormatCallback`, and disabled-day awareness** — a new `value-format` attribute (`iso` | `json` | `array`) chooses how the selection serializes: one field (`2026-06-15`, or a `start/end` interval for a range), `JSON.stringify` of the selection, or multiple `name[]` inputs (a range flattens to `start`, `end`). The `getValueFormatCallback` property takes full control, receiving a normalized ISO snapshot and returning the field value. Crucially the value reflects the *real* selection under `disabled-dates-handling`: a range split across disabled days (`split`) submits each sub-range rather than the whole envelope, and `individual` / `block` submit the enabled days — so disabled days in a gap are never submitted.

Earlier releases: [CHANGELOG](CHANGELOG.md).

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
and **async validation** via `beforeSelectCallback` with optional
bulk metadata loading per month (`getMonthDataCallback`).

What makes it different from the rest of the date-picker ecosystem:

- **Dark mode from whatever your page already uses.** The picker reacts
  to five signals: OS `prefers-color-scheme`, page-level `color-scheme`,
  a framework signal on `<html>` / `<body>` (`data-theme`,
  `data-bs-theme`, `.dark`), a per-instance `data-theme` attribute, and
  an explicit `light` override. Colours resolve through `light-dark()`;
  the framework signal is detected once per page by web-components-core
  and shared by every Keenmate component, so it works in Firefox and
  Safari too.
- **Theme Designer integration.** Optional. If you use the Keenmate
  Theme Designer at [theme-designer.keenmate.dev](https://theme-designer.keenmate.dev),
  the picker reads the cross-component `--base-*` taxonomy so one
  theme drives every Keenmate component on the page.
- **One component, every selection shape.** Date / range / multiple /
  time / datetime in one custom element with one consistent API —
  switch by changing one attribute, not by installing a different
  package.
- **First-class keyboard.** Arrow keys, Home / End, Ctrl+Home / End,
  Tab between month columns, `T` to jump to today. The modal presentation blurs
  the input so the mobile soft-keyboard collapses.

For a more honest accessibility audit including current ARIA gaps,
see [`docs/accessibility.md`](./docs/accessibility.md).

## Demos & docs

- 🚀 [Live demo](https://examples.web-daterangepicker.keenmate.dev)
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
  visible-month-count="2"
  placeholder="Select date range"
></web-daterangepicker>
```

### With JavaScript / TypeScript

```ts
// Import the component (registers <web-daterangepicker> + injects styles)
import '@keenmate/web-daterangepicker';

const picker = document.querySelector('web-daterangepicker');

// Listen for date selection
picker.addEventListener('change', (e) => {
  console.log('Selected:', e.detail.formattedValue);
  console.log('Date object:', e.detail.date);
  console.log('Range:', e.detail.dateRange);
});

// …or the property twin, which receives the detail directly
picker.onChange = (detail) => console.log(detail.formattedValue);

// Action buttons (and `data-action` triggers) fire one `action` event
picker.addEventListener('action', (e) => console.log(e.detail.action, e.detail.id));

// Programmatic API
picker.open();
picker.close();
picker.toggle();
picker.clearSelection();
picker.value = '2025-11-15';   // el.value = exactly what the form submits (value-format / value-format-mask)
picker.showMessage('Pick a weekend', { variant: 'info', autoHideMs: 3000 });

// The popover opened / closed
picker.addEventListener('open', () => console.log('opened'));
picker.addEventListener('close', () => console.log('closed'));

// UI strings: one partial `labels` object over English defaults (months/weekdays come from Intl via `locale`)
picker.labels = { 'buttons.today': 'Heute', 'labels.days': 'Tage: {ctx.count}' };
```

### Presentation

`positioning-mode` says **where** the calendar lives (`inline` block, or `floating` — opens
from the input). `presentation` says **how a floating picker opens**: `auto` (default — the
device ladder: phone → full-screen sheet, tablet → centered `modal`, desktop → anchored
popover), or `floating` / `modal` / `fullscreen` on every device. `inline` ignores it.

```html
<web-daterangepicker presentation="modal"></web-daterangepicker>
```

### Responsive rules

Tune any input per device or window width without app-side viewport code — a **map** of
partial configs, or a **callback** returning one. A map has two axes, both keyed
`mobile` / `tablet` / `desktop`:

- `device` — what the device **is** (core `classifyDevice`: touch capability first, then the
  short side; a mouse/trackpad device is `desktop` at any width). The same classes the
  `presentation="auto"` ladder uses.
- `breakpoint` — the **window width** (768 / 1024 px lines), so a narrowed desktop window is `mobile`.

Breakpoint applies first, then device over it (device wins on the same key). Own widths or
combinations (device class AND width, orientation, …) go in `responsiveCallback`. Rules can
be set page-wide, per tag, or per instance:

```js
// Page-wide (every Keenmate component) and per tag
window.components.responsive = { device: { mobile: { visibleMonthCount: 1 } } };
window.components['web-daterangepicker'].responsive = { device: { tablet: { presentation: 'fullscreen' } } };

// Per instance — map (also the JSON attribute responsive='{"breakpoint":{"mobile":{…}}}') or callback
picker.responsive = { breakpoint: { mobile: { visibleMonthCount: 1 } }, device: { desktop: { visibleMonthCount: 2 } } };
picker.responsiveCallback = (ctx) =>
  ctx.env.orientation === 'landscape' ? { visibleMonthCount: 2 } : undefined;
```

**Precedence** (later wins, key by key): global map → global callback → per-tag map →
per-tag callback → **attributes / properties set on the instance** → instance map →
instance callback. A page rule never overrides something written on the element; an
instance rule returning `null` ignores all page rules. Overrides never reflect to
attributes, and a key a rule stops returning goes back to its base value. Rules are
applied before the first build (no flash of the desktop layout). Typed with
`DateRangePickerResponsiveMap` / `DateRangePickerResponsiveCallback`. Full contract:
web-components-core `docs/SPEC.md` §6.7. Live demo:
[`examples-responsive.html`](./examples-responsive.html).

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

## About

Authored and maintained by [Keenmate s.r.o.](https://keenmate.com/).
The component ships standalone with sensible light/dark defaults;
when mounted inside [Pure Admin](https://pureadmin.io/) — or any
host that publishes the `--base-*` taxonomy via
[`@keenmate/theme-designer`](https://www.npmjs.com/package/@keenmate/theme-designer) — it adopts the host's colors,
typography, and sizing automatically. There is no runtime
dependency on Pure Admin; the integration is opt-in via CSS
variables.

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
| `renderSummaryCallback` | Summary display (innerHTML) | HTML injection |
| `labels` content keys: `labels.preview`, `labels.days`, `labels.nights`, `labels.time`, `labels.hours`, `labels.minutes`, `labels.seconds`, `labels.am` / `labels.pm` | Summary and time-picker headers / buttons (innerHTML) | HTML injection — developer-supplied strings; `{ctx.*}` values are escaped |
| `getMonthHeaderCallback` | Month headers (innerHTML) | HTML injection |
| `getUnifiedHeaderCallback` | Unified header (innerHTML) | HTML injection |
| `getCustomStylesCallback` / `custom-styles`, page-wide `window.components['web-daterangepicker'].customStyles` / `.getCustomStylesCallback` | Style tag (textContent) | CSS injection |

**Safe callbacks** (output is escaped or used as data):

- `beforeSelectCallback`, `beforeMonthChangeCallback`, `beforeScrollCallback` (return values, not markup)
- `actionButtons[].text` / `getTextCallback` (set as plain text)
- `labels` text keys: `buttons.today` / `buttons.clear` / `buttons.apply` / `buttons.now` (button text), `ariaLabels.clear` / `ariaLabels.close` (aria-label), `headers.fullscreen`, `labels.selectionCount` (input value), `errors.valueFormat`, `errors.required`, `ariaLabels.loading` — and `am` / `pm` where they appear in the input value
- `onChange`, `onOpen`, `onClose`, `onAction`, `onMonthChange`, `onReady` (event handlers)
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
