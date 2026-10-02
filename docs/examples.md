# Examples / cookbook — `@keenmate/web-daterangepicker`

Every example below is a runnable HTML file at the repo root. Open it
in a browser, or run `npm run dev` and navigate to it through the
[live demo site](https://web-daterangepicker.keenmate.dev). Examples
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

Everything programmatic in one place. Using the `DateRangePicker`
class directly without the `<web-daterangepicker>` custom element
(every callback wired up, explicit CSS-loading recipe); the instance
methods (`open()` / `close()` / `toggle()`, `setInputValue()`,
`clearSelection()`), reactive property accessors, the lock/unlock API,
and the advanced configuration recipes moved out of Basic — rolling
selector constraints, the `disabled-dates-handling` range modes,
week-snapping, custom summary formatting, position control, and the
keyboard-shortcut reference.

## Selection, validation, events

### Events, handlers & interceptors — [`examples-events-callbacks.html`](../examples-events-callbacks.html)

The event system plus the `beforeDateSelectCallback` validation
recipes from `usage.md` (minimum-nights, API availability check, the
`showInvalidRange` red-error state) and `beforeMonthChangedCallback`
for per-month data loading. (The five `disabled-dates-handling` range
modes now live on the **Data & API** page.)

### Action buttons — [`examples-action-buttons.html`](../examples-action-buttons.html)

Custom action buttons, preset buttons ("This week" / "Last 30 days"),
controlling Today / Clear / Apply visibility via the
`is-*-button-shown` attributes, commit modes, the multi-range
selection mode, and the dynamic ActionButton callback API.

## Visual & data customization

### Badges & tooltips — [`examples-badges-tooltips.html`](../examples-badges-tooltips.html)

Static badges from `specialDates`, dynamic badges via
`getDateMetadataCallback`, plain-text and rich-HTML tooltip variants,
the four `Member` mappings for non-standard data shapes, and the
**consumer-data classifier convention** (`dayClass: 'event' | 'holiday'`
+ `badgeClass: 'badge-number' | 'badge-count' | 'badge-text'`) including
the custom-classifier `salsa / rumba / pilates` demo wired up through
`customStylesCallback`.

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

The device-adaptive `mobile-presentation` ladder (floating on desktop,
a centered modal on tablets, an edge-to-edge **full-screen** overlay on
phones), the explicit `positioning-mode="modal"` layout with its
viewport-tier widths (xs / sm / md / lg), container-query inner layout,
the `fullscreen-title` / `fullscreen-autofocus` / `fullscreen-input`
options, and container-responsive compaction (`compact-below`).

## Time / datetime

### Time & datetime — [`examples-time-picker.html`](../examples-time-picker.html)

`picker-mode="time"` and `picker-mode="datetime"` across the four
time-display UIs: **rolls** (default scrollable columns), **clock**
(Material two-step face for hours then minutes, with h12 / h24 dual
ring), **wheel** (iOS UIPickerView snap-scroll columns with center
selection band), and **compact** (iOS 14+ pill with `contentEditable`
typing). All four work with `time-format-mask` token permutations,
`time-step`, seconds, and the `is-seconds-shown` / `is-now-button-shown`
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
- [Live demo site](https://web-daterangepicker.keenmate.dev) — every example above, deployed.
