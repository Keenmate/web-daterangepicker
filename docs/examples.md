# Examples / cookbook — `@keenmate/web-daterangepicker`

Every example below is a runnable HTML file at the repo root. Open it
in a browser, or run `npm run dev` and navigate to it through the
[live demo site](https://examples.web-daterangepicker.keenmate.dev). Examples
are listed in **rough learning order** — start with `examples-basic.html`,
follow your nose from there.

For the picker's full API surface, see [`usage.md`](./usage.md). For
theming, see [`theming.md`](./theming.md). For keyboard / a11y, see
[`accessibility.md`](./accessibility.md).

## Starting points

### Basic usage — [`examples-basic.html`](../examples-basic.html)

A focused quick tour of the most common use cases: single + range
modes, calendar trigger modes, date-format masks, multi-month display,
pre-filled values, the disabled state, date restrictions, and inline
display. The single best file to skim when you first see the component.

### Data & API — [`examples-data-api.html`](../examples-data-api.html)

Everything programmatic in one place: the instance
methods (`open()` / `close()` / `toggle()`, `commit()`,
`clearSelection()`, the `value` property), reactive property accessors, the lock/unlock API,
and the advanced configuration recipes moved out of Basic — rolling
selector constraints, the `disabled-dates-handling` range modes,
week-snapping, custom summary formatting, position control, and the
keyboard-shortcut reference.

## Selection, validation, events

### Events, handlers & interceptors — [`examples-events-callbacks.html`](../examples-events-callbacks.html)

The event system (`change` / `open` / `close` / `action` / `month-change`) plus
the `beforeSelectCallback` validation recipes from `usage.md`
(minimum-nights, API availability check, the `ctx.markRangeInvalid()`
red-error state), `beforeMonthChangeCallback` for blocking navigation and
`getMonthDataCallback` for per-month data loading, and `beforeScrollCallback` (EV07) for the picker's own scrolling. (The five `disabled-dates-handling` range
modes now live on the **Data & API** page.)

### Action buttons — [`examples-action-buttons.html`](../examples-action-buttons.html)

Custom action buttons, preset buttons ("This week" / "Last 30 days"),
controlling Today / Clear / Apply visibility via the
`is-*-button-shown` attributes, commit modes, the multi-range
selection mode, and the dynamic action-item callback API (`getTextCallback`,
`getIsVisibleCallback`, `getIsDisabledCallback`, `getIsToggledCallback`,
`beforeActionCallback`).

## Visual & data customization

### Badges & tooltips — [`examples-badges-tooltips.html`](../examples-badges-tooltips.html)

Static badges from `specialDates`, dynamic badges via
`getDateMetadataCallback`, plain-text and rich-HTML tooltip variants,
the four `Member` mappings for non-standard data shapes, and the
**consumer-data classifier convention** (`dayClass: 'event' | 'holiday'`
+ `badgeClass: 'badge-number' | 'badge-count' | 'badge-text'`) including
the custom-classifier `salsa / rumba / pilates` demo wired up through
`getCustomStylesCallback`.

### Custom rendering — [`examples-custom-rendering.html`](../examples-custom-rendering.html)

`renderDayCallback` (full replacement) and `renderDayContentCallback`
(augmentation) — for when you need to render arbitrary HTML inside day
cells. Includes the security note from `usage.md` about untrusted
content + `innerHTML`.

## Theming, sizing, layout

### Theming & sizing — [`examples-theming.html`](../examples-theming.html)

The combined theming + sizing showcase. Color overrides (green /
purple / red / orange), dark theme, range mode under themes,
selection-hover states, pastel theme, **the four time-picker UIs
themed in one shot**, and the **classifier retheming panel** (three
pickers with identical data, different `--drp-holiday-color` /
`--drp-event-color` / `--drp-badge-*` overrides). Then the sizing
system: the 5-level input-size scale (`xs` / `sm` / `md` / `lg` /
`xl`), the `--drp-rem` calendar scaling recipe, per-token spacing/font
overrides, the `--base-*` typography controls, and the full `--drp-*`
reference list. Cross-references the input-size table in
[`theming.md`](./theming.md).

### Responsive & mobile — [`examples-responsive.html`](../examples-responsive.html)

The device-adaptive `presentation` ladder (floating on desktop,
a centered modal on tablets, an edge-to-edge **full-screen** overlay on
phones), **responsive rules** (a `device` / `breakpoint` map, a callback, and an
instance override beating a per-tag rule), the forced `presentation="modal"` layout with its
viewport-tier widths (xs / sm / md / lg), container-query inner layout,
the `headers.fullscreen` label heading, the `fullscreen-autofocus` / `show-fullscreen-input`
options, and container-responsive compaction (the `responsive` map's `container` axis).

### Localization — [`examples-localization.html`](../examples-localization.html)

Every UI string through core `/locale`: instance `labels` (LO01), the
page-wide dictionary (LO08), `translateCallback` — the element's own
first, then the page-wide one, with the generic i18next bridge
(`count: params.ctx?.count`, Slovak `_one` / `_few` / `_other`; the page
picks the same forms with `Intl.PluralRules`) (LO09), screen-reader
twins (LO10), `locale` + date formatting (LO11), `shouldEscapeLabels`
(LO12), Czech plurals on a real count — a range of 1 / 3 / 5 days in
the summary and 1 / 3 / 5 picked dates in multiple mode (LO13) — then
week start and custom month / weekday names (LO02–LO07).

## Time / datetime

### Time & datetime — [`examples-time-picker.html`](../examples-time-picker.html)

`picker-mode="time"` and `picker-mode="datetime"` across the four
time-display UIs: **rolls** (default scrollable columns), **clock**
(Material two-step face for hours then minutes, with h12 / h24 dual
ring), **wheel** (iOS UIPickerView snap-scroll columns with center
selection band), and **compact** (iOS 14+ pill with `contentEditable`
typing). All four work with `time-format-mask` token permutations,
`time-step`, seconds, and the `show-seconds` / `show-now-button`
flags.

## Debugging

### Logging — [`examples-logging.html`](../examples-logging.html)

The built-in `loglevel`-based logger system. Eight named categories
(`drp`, `ui`, `drag`, `selection`, …), runtime level control via
`window.components['web-daterangepicker'].logging.*`, and the
recommended pattern for narrowing logs to one category while
debugging.

## See also

- [`usage.md`](./usage.md) — full attribute / property / method / event reference.
- [`theming.md`](./theming.md) — the four theming contracts.
- [`accessibility.md`](./accessibility.md) — keyboard, ARIA, focus.
- [`../README.md`](../README.md) — quick start + "Known limitations".
- [Live demo site](https://examples.web-daterangepicker.keenmate.dev) — every example above, deployed.
