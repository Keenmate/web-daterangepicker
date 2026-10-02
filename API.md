# API Reference

Complete API documentation for the Web Date Range Picker component.

---

## Table of Contents

1. [Package Exports](#package-exports)
2. [Web Component Attributes](#web-component-attributes)
3. [DatePicker Options](#datepicker-options)
4. [Public Methods](#public-methods)
5. [Events & Event Detail](#events--event-detail)
6. [Debugging & Logging](#debugging--logging)
7. [CSS Classes](#css-classes)
8. [CSS Custom Properties](#css-custom-properties)
9. [TypeScript Interfaces](#typescript-interfaces)
10. [Keyboard Navigation](#keyboard-navigation)
11. [Property Accessors](#property-accessors)
12. [Browser Support](#browser-support)
13. [Advanced Usage Examples](#advanced-usage-examples)
14. [Known Limitations](#known-limitations)
15. [Migration Guide](#migration-guide)

---

## Package Exports

The package provides multiple exports for different use cases:

### Component & Styles

```javascript
// Import the web component (auto-registers as <web-daterangepicker>)
import '@keenmate/web-daterangepicker';

// Import compiled CSS
import '@keenmate/web-daterangepicker/style.css';

// Import TypeScript types
import type { DatePickerOptions, DateRange, DecoratedDate } from '@keenmate/web-daterangepicker';
```

### CSS Customization

The component ships **plain CSS** with `--drp-*` custom properties — there is no
SCSS/preprocessor. Import the source CSS (instead of the compiled bundle) when you
want to theme via the custom properties:

```css
/* Import the full source CSS (@layer variables, component, overrides) */
@import '@keenmate/web-daterangepicker/css';

/* Or import specific layers */
@import '@keenmate/web-daterangepicker/css/variables';  /* the --drp-* custom properties */
@import '@keenmate/web-daterangepicker/css/base';       /* base element styles */
@import '@keenmate/web-daterangepicker/src/css/calendar-grid.css';  /* individual partials */
```

Override any `--drp-*` custom property on the host to theme (see
[CSS Custom Properties](#css-custom-properties)).

### Available Exports

| Export | Path | Description |
|--------|------|-------------|
| Main component | `@keenmate/web-daterangepicker` | ES module + UMD, auto-registers web component |
| Compiled CSS | `@keenmate/web-daterangepicker/style.css` | Production-ready CSS bundle |
| Source CSS entry | `@keenmate/web-daterangepicker/css` | `main.css` (`@layer variables, component, overrides`) |
| CSS variables | `@keenmate/web-daterangepicker/css/variables` | The `--drp-*` custom properties |
| Base CSS | `@keenmate/web-daterangepicker/css/base` | Base element styles |
| Individual CSS files | `@keenmate/web-daterangepicker/src/css/*` | Any CSS partial by path |
| Dist files | `@keenmate/web-daterangepicker/dist/*` | Any dist file by path |

**Note:** Customize by overriding `--drp-*` CSS custom properties on the host element (no build step required).

---

## Web Component Attributes

All attributes can be set directly on the `<web-daterangepicker>` HTML element.

<!-- GEN:attributes:start -->
<!-- Auto-generated from custom-elements.json — do not edit by hand. Run `npm run docs:api`. -->
| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `selection-mode` | `'single' \| 'range' \| 'multiple'` | `'single'` | Selection behavior: `single` day, `range`, or `multiple` days/ranges. |
| `positioning-mode` | `'inline' \| 'floating' \| 'modal'` | `'floating'` | How the calendar is presented: `inline` (always visible, no input), `floating` (popover anchored to an input), or `modal`. |
| `calendar-open-trigger` | `'focus' \| 'typing' \| 'manual'` | `'focus'` | What opens the floating calendar: `focus`, `typing`, or `manual` (only `open()`). |
| `overlay-group` | `string \| null` | — | Scope the "one overlay open at a time" coordination to a named group. Overlays (datepickers, multiselects, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group. |
| `visible-months-count` | `number` | — | Number of month columns shown side-by-side. |
| `month-layout` | `'horizontal' \| 'grid'` | — | Multi-month arrangement: a horizontal row or a `grid` (see grid-rows/grid-columns). |
| `grid-rows` | `number` | — | Rows in the month grid when month-layout is `grid`. |
| `grid-columns` | `number` | — | Columns in the month grid when month-layout is `grid`. |
| `is-unified-navigation-enabled` | `boolean` | — | In grid layouts, drive the whole grid from one anchor month instead of per-column navigation. |
| `unified-navigation-anchor-index` | `number` | — | Which month index anchors unified navigation. |
| `picker-mode` | `'date' \| 'time' \| 'datetime'` | `'date'` | Whether the control picks a `date`, a `time`, or a `datetime`. |
| `is-seconds-shown` | `boolean \| null` | — | Show a seconds field in time/datetime mode. |
| `hour-cycle` | `'h12' \| 'h24'` | — | 12- or 24-hour clock for time/datetime mode. |
| `is-summary-shown` | `boolean \| null` | — | Show the range summary (day/night counts) block. |
| `date-format-mask` | `string` | `'YYYY-MM-DD'` | Parse/format mask for dates (YYYY/YY, MM/M, DD/D with any separators). |
| `display-format-mask` | `string \| null` | — | Localized format hint shown as the input placeholder (when no explicit `placeholder`). In `range` mode the hint is doubled around " - " (e.g. `YYYY-MM-DD - YYYY-MM-DD`). |
| `is-unified-header-interactive` | `boolean` | — | Make the unified grid header clickable (opens the rolling selector). |
| `calendar-placement` | `string \| null` | — | Floating-UI placement for the popover (default `bottom-start`). |
| `week-start-day` | `'auto' \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | — | First column of the week: `auto` (locale) or a weekday index 0 (Sunday)–6 (Saturday). |
| `min-date` | `string \| null` | — | Earliest selectable date (ISO string). |
| `max-date` | `string \| null` | — | Latest selectable date (ISO string). |
| `initial-date` | `string \| null` | — | Month/date the calendar opens on when nothing is selected (ISO string). |
| `disabled-weekdays` | `number[]` | — | CSV of weekday indices (0=Sunday…6=Saturday) that cannot be selected. |
| `disabled-dates` | `Array<Date \| string>` | — | Specific dates that cannot be selected. Attribute: CSV of ISO strings; property: array of Date or string. |
| `disabled-dates-handling` | `'allow' \| 'prevent' \| 'block' \| 'split' \| 'individual'` | — | Strategy for ranges that span disabled dates: `allow`, `prevent`, `block`, `split`, or `individual`. |
| `should-highlight-disabled-in-range` | `boolean \| null` | — | Visually mark disabled dates that fall inside a selected range. |
| `locale` | `string` | `'auto'` | BCP-47 locale, or `auto` to detect from the browser. |
| `month-names` | `string[]` | — | Override month names. Attribute: 12 pipe-delimited names, index 0=January; property: `string[]`. |
| `weekday-names` | `string[]` | — | Override weekday names. Attribute: 7 pipe-delimited names, index 0=Sunday; property: `string[]`. |
| `rolling-year-range` | `string \| null` | — | Constrains the rolling year selector (e.g. `-5:+5` or absolute years). |
| `rolling-month-range` | `string \| null` | — | Constrains the rolling month selector. |
| `commit-mode` | `'selection' \| 'apply' \| 'manual'` | — | How a selection is committed + the calendar dismissed: `selection` (commit & close on pick), `apply` (Apply button commits), or `manual` (app-driven, no built-in button). |
| `should-close-on-scroll` | `boolean \| null` | — | Close the floating calendar when the page scrolls. |
| `is-today-button-shown` | `boolean \| null` | — | Show the “Today” action button. |
| `is-clear-button-shown` | `boolean \| null` | — | Show the “Clear” action button. |
| `time-format-mask` | `string` | `'HH:mm'` | Parse/format mask for times (HH/mm/ss). |
| `display-time-format-mask` | `string \| null` | — | Localized display mask for the time portion. |
| `time-step` | `number` | — | Minute step for the time picker. |
| `is-now-button-shown` | `boolean \| null` | — | Show the “Now” button in time/datetime mode. |
| `time-display` | `'rolls' \| 'clock' \| 'wheel' \| 'compact'` | `'rolls'` | Time-picker UI: `rolls`, `clock`, `wheel`, or `compact`. |
| `date-member` | `string \| null` | — | Property name on a decorated-date object holding its date. |
| `badge-text-member` | `string \| null` | — | Property name holding a day badge’s text. |
| `badge-class-member` | `string \| null` | — | Property name holding a day badge’s CSS class. |
| `day-class-member` | `string \| null` | — | Property name holding a day cell’s CSS class. |
| `badge-tooltip-member` | `string \| null` | — | Property name holding a badge tooltip string. |
| `day-tooltip-member` | `string \| null` | — | Property name holding a day tooltip string. |
| `is-disabled-member` | `string \| null` | — | Property name flagging a decorated date as disabled. |
| `name` | `string \| null` | — | HTML form field name. When set, the control submits its selection as a light-DOM hidden `<input>` (`name[]` inputs for `value-format="array"`). Also read by core for `el.form` / `form.reset()`. |
| `value-format` | `'iso' \| 'json' \| 'array'` | `'iso'` | Serialization of the submitted value (stable ISO-8601, independent of the display masks): - `iso` (default) — one field; a single date/time as-is, a range as `start/end`, multiple joined by `,`. - `json` — one field; `JSON.stringify` of the selection (scalar/object for single/range, array for multiple). - `array` — multiple `name[]` fields, one per date; a range contributes `start` and `end`. |
| `value` | `string \| null` | — | Text value of the control (the formatted selection). Reflected to the live input in floating/modal modes and to the hidden form-value input in inline mode; read/write via the `value` property. |
| `placeholder` | `string \| null` | — | Input placeholder. When unset, plain date pickers auto-derive it from display-format-mask / date-format-mask (`YYYY-MM-DD`), doubled in `range` mode (`YYYY-MM-DD - YYYY-MM-DD`). |
| `disabled` | `boolean` | — | Disable the input. |
| `readonly` | `boolean` | — | Full read-only lock (freezes every interaction aspect). Read/write via the `readonly` property, or use `lock()` for partial locks. |
| `input-size` | `string` | `'md'` | Input size scale: `xs` \| `sm` \| `md` \| `lg` \| `xl` (floating/modal only). |
| `enable-transitions` | `boolean` | — | Opt into calendar open/close CSS transitions. |
| `mobile-presentation` | `'auto' \| 'floating' \| 'modal' \| 'fullscreen'` | `'auto'` | How a `floating` picker adapts to the device (SPEC §12.9, via web-components-core). `auto` (default) keeps the floating popover on desktop, uses a centered `modal` on tablets, and a full-screen overlay on phones (touch-primary + shorter viewport side < 600px, orientation-robust). `floating`/`modal`/`fullscreen` force that presentation on any device (handy for previews/testing). Only adapts a floating picker — an explicit `positioning-mode` of `inline` or `modal` is left as authored. Resolved reactively from the device/viewport environment. |
| `fullscreen-autofocus` | `boolean` | — | In the phone full-screen overlay, focus the date input on open (pops the soft keyboard for type-to-fill). Default off: the sheet opens with the calendar visible and the keyboard closed. No effect in floating/modal presentations. |
| `fullscreen-title` | `string \| null` | — | Optional heading shown in the phone full-screen overlay header, next to the close (✕) button. When unset the header shows just the close button. |
| `fullscreen-input` | `boolean` | — | In the phone full-screen overlay, relocate the date input into the header so it is visible and typeable above the sheet (with a numeric keypad; the mask supplies the separators). Takes over the header row, so fullscreen-title is not shown alongside it. No effect in floating/modal presentations. |
| `show-debug-info` | `boolean` | — | Enable the picker’s debug logging. |
| `compact-below` | `number` | — | Container-responsive compaction threshold in CSS px. When the element’s OWN box is narrower than this, the calendar collapses to a single month and hides the Today/Clear buttons — keyed on the element box (core’s shared ResizeObserver), not the viewport, so a picker in a narrow column/sidebar compacts even on a wide monitor. Unset or `0` disables it. Purely presentational tweaks (padding, label→icon) belong in CSS `@container`; this drives the structural month-count change. |
| `defer` | `boolean` | — | Hold the initial render. When the `defer` attribute is present on upgrade the component builds nothing (reserving space only) — so `value`, callbacks (e.g. `customStylesCallback`), and event listeners can all be wired first, then released with `el.ready()` (or by removing the `defer` attribute, for server-driven frameworks). The release builds the picker ONCE with everything already in place, avoiding the upgrade-then-restyle flash. Absent (default): builds immediately on connect. Latched — once released the gate never re-closes. |
| `custom-styles` | `string \| null` | — | Raw CSS injected into the Shadow DOM — the declarative, no-JS alternative to `customStylesCallback`. The value is a full stylesheet (selectors and all), dropped verbatim into the same replaceable style slot. `customStylesCallback` wins when both are set. |
<!-- GEN:attributes:end -->

**Smart default positioning:**
- Grid layouts: `'bottom'` (centered)
- Horizontal layouts: `'bottom-start'` (left-aligned)

### Custom month & weekday names

`month-names` and `weekday-names` are **position-indexed to their JavaScript date number**, not to the visible order. You author each list once, in its natural calendar order — the component handles any rotation.

- **`month-names`** → `[0]`=January … `[11]`=December (matches `Date.getMonth()`). No rotation; the list is always Jan→Dec.
  ```html
  month-names="Leden|Únor|Březen|Duben|Květen|Červen|Červenec|Srpen|Září|Říjen|Listopad|Prosinec"
  ```
- **`weekday-names`** → **always authored Sunday-first**: `[0]`=Sunday … `[6]`=Saturday (matches `Date.getDay()`). `week-start-day` only rotates the *display* — you never re-order the list, and the labels stay aligned to the real days at any start day.
  ```html
  <!-- Wednesday-first business week -->
  <web-daterangepicker
    week-start-day="3"
    weekday-names="Ne|Po|Út|St|Čt|Pá|So">
  </web-daterangepicker>
  <!-- renders header: St Čt Pá So Ne Po Út  (col 0 = actual Wednesday) -->
  ```
  > ⚠️ Do **not** pre-rotate the list to match `week-start-day`. `weekday-names="Po|Út|St|Čt|Pá|So|Ne"` puts Monday at index 0, so the component would label Sunday as "Po". Keep index `[0]` = Sunday and let `week-start-day` do the rotation.

Both accept exactly 12 / 7 pipe-delimited, non-empty segments; anything else is ignored with a `console.warn` and locale names are used. Also settable as arrays via the `monthNames` / `weekdayNames` properties.

### Range Disabled Modes

The `disabled-dates-handling` attribute controls behavior when selecting ranges that include disabled dates:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `'allow'` | Allows ranges over disabled dates. Event includes `enabledDates` and `disabledDates` arrays | Hotel bookings (allow selecting range, calculate only enabled days) |
| `'prevent'` | Rejects a range that would span disabled dates (no selection committed) | Strict scheduling |
| `'block'` | Prevents selections that span disabled dates. Snaps range end to last enabled date before gap | Restricted scheduling (cannot cross blackout dates) |
| `'split'` | Returns multiple ranges split by disabled dates. Event includes `dateRanges` array | Multi-period bookings (weekdays only) |
| `'individual'` | Returns flat array of individual enabled dates. Event includes `dates` array | Cherry-picking dates (select range, get individual days) |

### Example Usage

```html
<!-- Basic single date picker -->
<web-daterangepicker
  selection-mode="single"
  date-format-mask="DD.MM.YYYY"
  placeholder="Select date">
</web-daterangepicker>

<!-- Range picker with weekend restriction -->
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="block">
</web-daterangepicker>

<!-- 6-month grid calendar -->
<web-daterangepicker
  selection-mode="single"
  positioning-mode="inline"
  visible-months-count="6"
  month-layout="grid"
  grid-rows="2"
  grid-columns="3">
</web-daterangepicker>

<!-- Spanish localization with localized display format -->
<web-daterangepicker
  selection-mode="single"
  locale="es"
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  placeholder="Selecciona una fecha">
</web-daterangepicker>

<!-- Size variants - coordinated input and calendar sizing -->
<web-daterangepicker
  input-size="sm"
  spacing="sm"
  font-size="sm"
  cell-size="sm">
</web-daterangepicker>

<web-daterangepicker
  input-size="lg"
  spacing="lg"
  font-size="lg"
  cell-size="lg">
</web-daterangepicker>
```

---

## DatePicker Options

When instantiating `DateRangePicker` directly (not using web component), pass these options. The web component automatically converts attributes to options.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selectionMode` | `'single' \| 'range'` | `'single'` | Selection mode |
| `calendarPlacement` | `string` | `'bottom-start'` or `'bottom'` | Floating UI placement |
| `visibleMonthsCount` | `number` | `1` or `2` | Number of months to display |
| `dateFormatMask` | `string` | `'YYYY-MM-DD'` | Date format pattern |
| `calendarOpenTrigger` | `'focus' \| 'typing' \| 'manual'` | `'focus'` | How calendar is triggered: `'focus'` (on input focus), `'typing'` (when typing starts), `'manual'` (button/code only) |
| `onSelect` | `(date: Date \| DateRange) => void` | `undefined` | Callback when date is selected |
| `container` | `HTMLElement` | `document.body` | Where to append calendar (for web component, uses shadow root) |
| `positioningMode` | `'inline' \| 'floating'` | `'floating'` | Display mode |
| `monthLayout` | `'horizontal' \| 'grid'` | `'horizontal'` | Multi-month layout mode |
| `gridRows` | `number` | `undefined` | Grid rows count |
| `gridColumns` | `number` | `undefined` | Grid columns count |
| `weekStartDay` | `'auto' \| 0-6` | `'auto'` | Week start day |
| `minDate` | `Date \| string` | `undefined` | Minimum selectable date |
| `maxDate` | `Date \| string` | `undefined` | Maximum selectable date |
| `disabledDates` | `(Date \| string)[]` | `undefined` | Array of specific dates to disable |
| `disabledWeekdays` | `number[]` | `undefined` | Array of weekdays to disable (0=Sunday, 6=Saturday) |
| `specialDates` | `DecoratedDate[]` | `undefined` | Array of special dates with custom styling/labels |
| `dateMember` | `string` | `'date'` | Property name in `specialDates` objects containing the date value |
| `badgeTextMember` | `string` | `'badgeText'` | Property name in `specialDates` objects containing badge text |
| `badgeClassMember` | `string` | `'badgeClass'` | Property name in `specialDates` objects containing badge CSS class |
| `dayClassMember` | `string` | `'dayClass'` | Property name in `specialDates` objects containing day CSS class |
| `badgeTooltipMember` | `string` | `'badgeTooltip'` | Property name in `specialDates` objects containing badge tooltip |
| `dayTooltipMember` | `string` | `'dayTooltip'` | Property name in `specialDates` objects containing day tooltip |
| `isDisabledMember` | `string` | `'isDisabled'` | Property name in `specialDates` objects containing disabled flag |
| `getDateMetadataCallback` | `(date: Date) => DateInfo \| null` | `undefined` | Custom function to provide date styling/labels |
| `rangeDisabledHandling` | `'allow' \| 'block' \| 'split' \| 'individual'` | `'allow'` | Range behavior over disabled dates |
| `shouldHighlightDisabledInRange` | `boolean` | `true` | Highlight disabled dates in range |
| `locale` | `string \| 'auto'` | `'auto'` | Locale for UI strings and Intl date formatting. Built-in: `'en'`, `'de'`, `'fr'`, `'es'` |
| `displayFormatMask` | `string` | Same as `dateFormatMask` | Localized format mask for display (e.g., `'dd/mm/aaaa'` for Spanish) |
| `customStrings` | `Partial<LocaleStrings>` | `undefined` | Override built-in UI strings (Today, Clear, Apply, etc.) |
| `monthNames` | `string[]` | locale-based | Override month names. 12 strings, indexed by month: `[0]`=January … `[11]`=December |
| `weekdayNames` | `string[]` | locale-based | Override weekday header labels. 7 strings, indexed by day-of-week: `[0]`=Sunday … `[6]`=Saturday (`weekStartDay` only rotates the display, not this mapping) |
| `formatSummaryCallback` | `(data: SummaryCallbackData) => string` | `undefined` | Custom function to format the summary display (receives all selection data, returns HTML string) |

### Example Usage

```javascript
const picker = new DateRangePicker(inputElement, {
  selectionMode: 'range',
  dateFormatMask: 'DD/MM/YYYY',
  visibleMonthsCount: 2,
  weekStartDay: 1, // Monday
  disabledWeekdays: [0, 6], // Weekends
  specialDates: [
    { date: '2025-12-25', badgeText: '🎄', badgeTooltip: 'Christmas' }
  ],
  onSelect: (dateRange) => {
    console.log('Selected:', dateRange);
  }
});

// Spanish localization with custom strings
const pickerES = new DateRangePicker(inputElement, {
  selectionMode: 'single',
  locale: 'es',
  dateFormatMask: 'YYYY-MM-DD',
  displayFormatMask: 'dd/mm/aaaa',
  customStrings: {
    today: 'Hoy',
    clear: 'Borrar',
    preview: 'Previsualización'
  },
  onSelect: (date) => {
    console.log('Fecha seleccionada:', date);
  }
});
```

---

## Public Methods

### Web Component Methods

Available on `<web-daterangepicker>` element:

<!-- GEN:methods:start -->
<!-- Auto-generated from custom-elements.json — do not edit by hand. Run `npm run docs:api`. -->
| Method | Signature | Description |
|--------|-----------|-------------|
| `formResetCallback()` | `() => void` | Form reset: clear the selection and the submitted value with the form. |
| `ready()` | `() => void` | Release the `defer` render gate: build the picker now (once), with every option, callback and listener wired while deferred already in place. No-op when the element wasn't deferred or is already built. `flush()` first so a synchronous `el.value = …; el.customStylesCallback = …; el.ready()` lands those pending writes in the single build rather than after it. Latched — the gate never re-closes. Fires the `ready` event on the first build. |
| `open()` | `() => void` | Open the calendar (floating/modal modes). |
| `close()` | `() => void` | Close the calendar (floating/modal modes). |
| `toggle()` | `() => void` | Toggle the calendar open/closed. |
| `clearSelection()` | `() => void` | Clear the current selection and reset the input. |
| `showMessage()` | `(content: string, type?: 'error' \| 'warning' \| 'info' \| 'success', autoHide?: number) => void` | Show an inline message; `autoHide` (ms) dismisses it automatically. |
| `hideMessage()` | `() => void` | Hide the current inline message. |
| `toggleMessage()` | `(content?: string, type?: 'error' \| 'warning' \| 'info' \| 'success', autoHide?: number) => void` | Toggle the inline message on/off. |
| `showSummary()` | `(content: string) => void` | Write custom HTML into the summary block (pins until the next selection change). |
| `hideSummary()` | `() => void` | Drop any summary override and re-derive from selection state. |
| `refreshSummary()` | `() => void` | Re-run summary derivation now (respects an active override). |
| `showLoader()` | `(target?: LoaderTarget) => void` | Show a loader overlay. `target`: `calendar` (default) \| `message` \| `summary`. |
| `hideLoader()` | `(target?: LoaderTarget) => void` | Hide the loader for the given target (default `calendar`). |
| `toggleLoader()` | `(target?: LoaderTarget) => void` | Toggle the loader for the given target (default `calendar`). |
| `lock()` | `(aspects?: LockAspect \| LockAspect[]) => void` | Freeze user interaction. No argument locks every aspect (full read-only lock); pass an aspect or array to freeze only part (`'selection' \| 'navigation' \| 'actions' \| 'open'`). The programmatic API is unaffected. |
| `unlock()` | `(aspects?: LockAspect \| LockAspect[]) => void` | Release the given aspect(s), or the whole lock when called with no argument. |
| `toggleLock()` | `(aspects?: LockAspect \| LockAspect[]) => void` | Toggle the given aspect(s), or the whole lock when called with no argument. |
| `isAspectLocked()` | `(aspect: LockAspect) => boolean` | True when the given aspect is currently locked. |
| `getInputValue()` | `() => string` | The current text in the input (floating/modal modes); `''` when there is no input. |
| `setInputValue()` | `(value: string) => void` | Set the input text and reflect it to the `value` attribute. |
| `setMonthNames()` | `(monthNames: string[]) => void` | Set custom month names. **(deprecated)** |
| `setRollingItemAlignment()` | `(alignment: 'flex-start' \| 'center' \| 'flex-end') => void` | Align items within the rolling year/month selector (`flex-start` \| `center` \| `flex-end`). |
<!-- GEN:methods:end -->

You can also reach the underlying engine directly: **`picker.picker`** is a
read-only getter that returns the live `DateRangePicker` instance (or `undefined`
before first connect).

**Example:**
```javascript
const picker = document.querySelector('web-daterangepicker');

picker.open();
picker.setInputValue('2025-12-25');
console.log(picker.getInputValue()); // "2025-12-25"
picker.clearSelection();
```

### DateRangePicker Instance Methods

Available on `DateRangePicker` instance (accessible via `picker.picker` on web component):

| Method | Signature | Description |
|--------|-----------|-------------|
| `open()` | `() => void` | Open calendar |
| `close()` | `() => void` | Close calendar |
| `toggle()` | `() => void` | Toggle calendar visibility |
| `clear()` | `() => void` | Clear selection |
| `destroy()` | `() => void` | Remove calendar and cleanup all event listeners |
| `formatDate(date)` | `(date: Date \| null) => string` | Format date using configured format |
| `isDateDisabledInternal(date)` | `(date: Date) => boolean` | Check if date is disabled (combines all disable logic) |
| `getDateInfoInternal(date)` | `(date: Date) => DateInfo \| null` | Get date info (styling/labels) |
| `hasDisabledDatesInRange(start, end)` | `(start: Date, end: Date) => boolean` | Check if range contains disabled dates |
| `getEnabledDatesInRange(start, end)` | `(start: Date, end: Date) => Date[]` | Get all enabled dates in range |
| `getDisabledDatesInRange(start, end)` | `(start: Date, end: Date) => Date[]` | Get all disabled dates in range |
| `findLastEnabledBeforeGap(start, end)` | `(start: Date, end: Date) => Date` | Find last enabled date before disabled gap (for 'block' mode) |
| `splitRangeByDisabled(start, end)` | `(start: Date, end: Date) => DateRange[]` | Split range into multiple ranges by disabled dates |
| `isToday(date)` | `(date: Date) => boolean` | Check if date is today |
| `isSameDay(date1, date2)` | `(date1: Date \| null, date2: Date \| null) => boolean` | Compare two dates (day precision) |
| `isInRange(date)` | `(date: Date) => boolean` | Check if date is within selected range |

**Example:**
```javascript
const picker = new DateRangePicker(input, { selectionMode: 'range' });

const start = new Date(2025, 0, 1);
const end = new Date(2025, 0, 31);

console.log(picker.hasDisabledDatesInRange(start, end));
const enabled = picker.getEnabledDatesInRange(start, end);
console.log(`${enabled.length} enabled days in January`);
```

---

## Events & Event Detail

### Custom Events

The web component dispatches the following events:

| Event Name | Bubbles | Composed | Description |
|------------|---------|----------|-------------|
| `date-select` | ✓ | ✓ | Fired when a date or range is selected |
| `change` | ✓ | ✓ | Fired when a date or range is selected (alias of `date-select`) |
| `custom-action` | ✓ | ✓ | Fired when the user clicks an action button declared with `action: 'custom'` (see [Custom Action Buttons](#custom-action-buttons) below). |

`date-select` and `change` have the same `detail` structure. `custom-action` has its own — see below.

> **Note**: there are no separate `apply` or `cancel` events. Clicking the Apply button commits the pending selection and dispatches `change`. Pressing Escape with an uncommitted selection silently restores the previous input value and fires nothing.

### Event Detail Properties

The `event.detail` object contains different properties depending on the mode and configuration:

| Property | Type | Always Present | Conditions | Description |
|----------|------|----------------|------------|-------------|
| `formattedValue` | `string` | ✓ | - | Formatted date string for display |
| `date` | `Date` | - | Mode: `single` | Selected date (single mode) |
| `dateRange` | `DateRange` | - | Mode: `range` (except `individual`) | Selected range with `start` and `end` dates |
| `enabledDates` | `Date[]` | - | Mode: `range`, rangeDisabledMode: `'allow'` | All enabled dates within range |
| `disabledDates` | `Date[]` | - | Mode: `range`, rangeDisabledMode: `'allow'` | All disabled dates within range |
| `dateRanges` | `DateRange[]` | - | Mode: `range`, rangeDisabledMode: `'split'` | Multiple ranges split by disabled dates |
| `dates` | `Date[]` | - | Mode: `range`, rangeDisabledMode: `'split'` or `'individual'` | Flat array of individual enabled dates |
| `getEnabledDateCount` | `() => number` | - | Mode: `range`, rangeDisabledMode: `'allow'` | Helper function to count enabled dates |
| `getTotalDays` | `() => number` | - | Mode: `range`, rangeDisabledMode: `'allow'` | Helper function to get total days in range |

### Event Examples

```javascript
const picker = document.querySelector('web-daterangepicker');

// Single mode
picker.addEventListener('date-select', (e) => {
  console.log('Selected date:', e.detail.date);
  console.log('Formatted:', e.detail.formattedValue);
});

// Range mode - 'allow' mode
picker.addEventListener('date-select', (e) => {
  const { dateRange, enabledDates, disabledDates } = e.detail;
  console.log('Range:', dateRange.start, 'to', dateRange.end);
  console.log('Enabled days:', enabledDates.length);
  console.log('Disabled days:', disabledDates.length);
  console.log('Total days:', e.detail.getTotalDays());
});

// Range mode - 'split' mode
picker.addEventListener('date-select', (e) => {
  const { dateRanges, dates } = e.detail;
  console.log('Split into', dateRanges.length, 'ranges');
  console.log('Total enabled dates:', dates.length);
  dateRanges.forEach((range, i) => {
    console.log(`Range ${i + 1}:`, range.start, 'to', range.end);
  });
});

// Range mode - 'individual' mode
picker.addEventListener('date-select', (e) => {
  const { dates } = e.detail;
  console.log('Selected', dates.length, 'individual dates');
  dates.forEach(date => console.log(date.toLocaleDateString()));
});
```

### Event Handler Properties

As an alternative to `addEventListener`, each event exposes a managed `on*`
handler property. Assigning a function registers a real listener (assigning
`null` removes it); the handler receives the same `CustomEvent`, so it behaves
exactly like `addEventListener`:

| Property | Event | Handler receives |
|----------|-------|------------------|
| `onDateSelect` | `date-select` | `CustomEvent<DatePickerEventDetail>` |
| `onChange` | `change` | `CustomEvent<DatePickerEventDetail>` |
| `onCustomAction` | `custom-action` | `CustomEvent<CustomActionEventDetail>` |

```javascript
const picker = document.querySelector('web-daterangepicker');

picker.onDateSelect = (e) => console.log('Selected:', e.detail.formattedValue);
picker.onCustomAction = (e) => console.log('Action:', e.detail.data);

picker.onDateSelect = null; // detach
```

### Custom Action Buttons

The picker's built-in action bar (Today / Clear / Apply) can be replaced with custom buttons via the `actionButtons` option. Buttons with `action: 'custom'` fire a `custom-action` event when clicked, and any `data-*` attributes you attach become the event's `detail` payload.

```javascript
const picker = document.querySelector('web-daterangepicker');

picker.actionButtons = [
  {
    action: 'custom',
    text: 'Apply with note',
    cssClass: 'btn-primary',
    // Any extra fields beyond the well-known ones get serialized as data-* attributes:
    'data-source': 'apply-button',
    'data-note': 'user clicked apply'
  },
  { action: 'clear', text: 'Clear' }
];

// Fired when the custom button is clicked:
picker.addEventListener('custom-action', (e) => {
  console.log(e.detail);
  // → { source: 'apply-button', note: 'user clicked apply' }
});
```

**Detail shape**: `Record<string, string>` — a flat object of every `data-*` attribute on the clicked button (with `data-` prefix stripped, kebab-case → camelCase per the standard `dataset` API). `data-action` itself is excluded.

Common pattern — using a `beforeDateSelectCallback` to inject a custom HTML message with `data-action="custom"` buttons, then handling the click via this event:

```javascript
picker.beforeDateSelectCallback = async (range) => {
  const response = await fetch('/api/check', { method: 'POST', body: JSON.stringify(range) });
  const data = await response.json();

  if (data.requiresConfirmation) {
    picker.showMessage(`
      <p>${data.message}</p>
      <button data-action="custom"
              data-start-date="${range.start.toISOString()}"
              data-end-date="${range.end.toISOString()}">
        Confirm
      </button>
    `);
    return { allow: false }; // don't apply yet — wait for the custom-action click
  }

  return { allow: true };
};

picker.addEventListener('custom-action', (e) => {
  const { startDate, endDate } = e.detail;
  // ... apply the range now that the user confirmed
});
```

A live demo lives in `examples-data-api.html` ("Confirm & close — validate before dismissing").

---

## Debugging & Logging

The date picker includes a professional, categorized logging system provided by [`@keenmate/web-components-core`](https://github.com/keenmate/web-components-core) that helps you debug issues during development. Log lines are grouped into colour-coded `DRP:*` categories (`DRP:GENERAL`, `DRP:RENDERING`, `DRP:INTERACTION`, `DRP:SELECTION`, `DRP:NAVIGATION`, `DRP:UI`, `DRP:VALIDATION`, `DRP:DRAG`).

### Enabling Debug Logging

Add the `show-debug-info` attribute to any picker instance to enable debug logging for that specific instance:

```html
<web-daterangepicker show-debug-info></web-daterangepicker>
```

### Log Categories

The logging system is organized into specialized categories, each emitted under a colour-coded `DRP:*` label:

| Category | Logger Name | What It Logs |
|----------|-------------|--------------|
| **DRP:GENERAL** | `drpLogger` | General/initialization, configuration, and setup |
| **NAVIGATION** | `navigationLogger` | Month/year navigation, keyboard focus movement, collision detection |
| **UI** | `uiLogger` | Calendar show/hide, positioning, floating UI calculations |
| **RENDERING** | `renderingLogger` | Calendar rendering, DOM updates |
| **SELECTION** | `selectionLogger` | Date selection, range completion |
| **VALIDATION** | `validationLogger` | Date validation, disabled date checking |
| **DRAG** | `dragLogger` | Drag-to-adjust operations, drag preview |
| **INTERACTION** | `interactionLogger` | Input masking, user input parsing |

### Log Message Format

Each log line is prefixed with its colour-coded category label, followed by the message and any context:

```
[DRP:CATEGORY] functionName() [context] - message
```

**Examples:**
```
[DRP:NAVIGATION] moveFocus() Col0 - found 31 days in column
[DRP:SELECTION] selectDay() Col1 - activeMonthIndex: 1
[DRP:VALIDATION] validateRangeAsync called - mode: block
[DRP:DRAG] onDragMove - mode: block, start: Mon Jan 01 2025, end: Fri Jan 05 2025
```

### Log Levels

The library uses these log levels:

| Level | When Used | Visibility |
|-------|-----------|------------|
| `silent` | Default (production) | No logging |
| `error` | Critical errors (async validation failures, etc.) | Always visible |
| `warn` | Warnings (invalid inputs, validation failures) | Always visible |
| `info` | Not currently used | - |
| `debug` | Development debugging | Only when `show-debug-info` is enabled |
| `trace` | Not currently used | - |

### Console Output Example

When `show-debug-info` is enabled, you'll see detailed logs in your browser console:

```
[DRP:GENERAL] Week starts on day: 1
[DRP:GENERAL] disabledDatesHandling: block
[DRP:GENERAL] Locale: en Weekdays: (7) ['Mo', 'Tu', ...] Months: (12) ['January', ...]
[DRP:GENERAL] Format info: {separator: '-', parts: {...}, maxLength: 10}
[DRP:GENERAL] Creating calendar
[DRP:RENDERING] renderCalendar() called
[DRP:UI] open() - adding visible class
[DRP:UI] position() - FloatingUI computed - x: 245, y: 380, placement: 'bottom-start'
```

### Filtering Logs by Category

You can filter browser console output by category name. In Chrome DevTools Console:

- Filter by category: Type `DRP:DRAG` or `DRP:SELECTION` (or just `DRP:` for all) in the filter box
- Filter by function: Type `moveFocus()` or `selectDay()`
- Filter by column: Type `Col0` or `Col1` for multi-month navigation

### Programmatic Control

Access the logging system directly via JavaScript:

```javascript
import { enableLogging, disableLogging, setLogLevel, setCategoryLevel } from '@keenmate/web-daterangepicker';

// Enable/disable all logging
enableLogging();   // Turn on debug logging (all categories → debug)
disableLogging();  // Turn off all logging (silent)

// Set specific log level (all categories)
setLogLevel('debug');  // Show debug and above
setLogLevel('warn');   // Show only warnings and errors
setLogLevel('silent'); // Disable all logging

// Target one category (bare 'UI' or full 'DRP:UI' both work)
setCategoryLevel('DRP:UI', 'debug');
```

> These same controls are also exposed at runtime on
> `window.components['web-daterangepicker'].logging` (`enableLogging`,
> `disableLogging`, `setLogLevel`, `setCategoryLevel`, `getCategories`).

### Per-Category Loggers

For advanced debugging, import individual category loggers:

```javascript
import {
  drpLogger,
  navigationLogger,
  uiLogger,
  renderingLogger,
  selectionLogger,
  validationLogger,
  dragLogger,
  interactionLogger
} from '@keenmate/web-daterangepicker';

// Set level for specific category only
navigationLogger.setLevel('debug');
dragLogger.setLevel('trace');
```

### Best Practices

1. **Development**: Enable `show-debug-info` on problematic picker instances only to reduce console noise
2. **Production**: Never ship with `show-debug-info` enabled
3. **Debugging Selection Issues**: Look for `SELECTION` and `VALIDATION` logs
4. **Debugging Navigation**: Look for `NAVIGATION` logs with `Col` markers
5. **Debugging Input Masking**: Look for `INTERACTION` logs with `updateCalendarFromInput`
6. **Debugging Drag Issues**: Look for `DRAG` logs showing mode and range preview

### Example: Debugging Block Mode

```html
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="block"
  show-debug-info>
</web-daterangepicker>
```

Console output when selecting a range:
```
[14:30:45.120] [DEBUG] [SELECTION] selectDay() Col0 - activeMonthIndex: 0
[14:30:45.122] [DEBUG] [VALIDATION] validateRangeAsync called - mode: block, start: Mon Jan 01 2025, end: Sat Jan 06 2025
[14:30:45.123] [DEBUG] [VALIDATION] Checking BLOCK mode
[14:30:45.124] [DEBUG] [VALIDATION] BLOCK mode - range contains disabled dates, adjusting
[14:30:45.125] [DEBUG] [VALIDATION] BLOCK mode - adjusted end: Fri Jan 05 2025
```

---

## CSS Classes

### Wrapper Classes (Applied to Parent Element)

Wrap the `<web-daterangepicker>` in a `<div>` with these classes for styling control:

#### Font Size Classes

Control text size independently of spacing:

| Class | Scale | Description |
|-------|-------|-------------|
| `.drp-font-xs` | 0.7× | Extra small font |
| `.drp-font-sm` | 0.85× | Small font |
| `.drp-font-md` | 1.0× | Medium font (default) |
| `.drp-font-lg` | 1.2× | Large font |
| `.drp-font-xl` | 1.4× | Extra large font |

#### Spacing/Density Classes

Control gaps and padding independently of font size:

| Class | Scale | Description |
|-------|-------|-------------|
| `.drp-spacing-xs` | 0.7× | Extra compact spacing |
| `.drp-spacing-sm` | 0.85× | Compact spacing |
| `.drp-spacing-md` | 1.0× | Medium spacing (default) |
| `.drp-spacing-lg` | 1.2× | Spacious |
| `.drp-spacing-xl` | 1.4× | Extra spacious |

#### Responsive Class

| Class | Description |
|-------|-------------|
| `.drp-responsive` | Enable responsive breakpoints. Font and spacing scale down at 1200px and 768px breakpoints |

**Example:**
```html
<!-- Large readable text in compact layout -->
<div class="drp-font-lg drp-spacing-xs">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- Small text with generous spacing -->
<div class="drp-font-sm drp-spacing-lg">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- Responsive: both font and spacing scale down on mobile -->
<div class="drp-font-lg drp-spacing-lg drp-responsive">
  <web-daterangepicker></web-daterangepicker>
</div>
```

### Component Structure Classes

These classes are automatically applied by the component (read-only):

#### Calendar Container

| Class | Description |
|-------|-------------|
| `.drp-date-picker` | Main calendar container |
| `.drp-date-picker--visible` | Calendar is visible |
| `.drp-date-picker--inline` | Inline mode (always visible) |

#### Layout

| Class | Description |
|-------|-------------|
| `.drp-date-picker__months` | Container for all months |
| `.drp-date-picker__months--horizontal` | Horizontal layout (side-by-side) |
| `.drp-date-picker__months--grid` | Grid layout (rows × columns) |
| `.drp-date-picker__month` | Individual month container |

#### Month Header

| Class | Description |
|-------|-------------|
| `.drp-date-picker__header` | Month header container |
| `.drp-date-picker__month-year` | Month/year display (clickable for rolling selector) |
| `.drp-date-picker__nav` | Navigation button base |
| `.drp-date-picker__nav--prev` | Previous month button |
| `.drp-date-picker__nav--next` | Next month button |
| `.drp-date-picker__nav--disabled` | Disabled navigation button |

#### Rolling Selector

| Class | Description |
|-------|-------------|
| `.drp-date-picker__rolling-selector` | Rolling month/year selector container |
| `.drp-date-picker__rolling-selector--visible` | Visible state |
| `.drp-date-picker__rolling-list` | Scrollable list of years/months |
| `.drp-date-picker__rolling-item` | Individual year/month item |
| `.drp-date-picker__rolling-item--selected` | Currently selected item |

#### Calendar Grid

| Class | Description |
|-------|-------------|
| `.drp-date-picker__weekdays` | Weekday labels container (Mo, Tu, We...) |
| `.drp-date-picker__weekday` | Individual weekday label |
| `.drp-date-picker__days` | Days grid container |
| `.drp-date-picker__date-row` | Row of 7 days |
| `.drp-date-picker__day` | Individual day cell |

#### Day States

| Class | Description |
|-------|-------------|
| `.drp-date-picker__day--today` | Today's date |
| `.drp-date-picker__day--selected` | Selected date (single mode) |
| `.drp-date-picker__day--focused` | Keyboard focused |
| `.drp-date-picker__day--disabled` | Disabled date (not selectable) |
| `.drp-date-picker__day--other-month` | Day from adjacent month (grayed out) |

#### Range Mode States

| Class | Description |
|-------|-------------|
| `.drp-date-picker__day--range-start` | Range start date |
| `.drp-date-picker__day--range-end` | Range end date |
| `.drp-date-picker__day--in-range` | Date within selected range |

#### Drag States (Range Mode)

| Class | Description |
|-------|-------------|
| `.drp-date-picker__day--dragging` | Currently being dragged |
| `.drp-date-picker__day--drag-preview` | Preview of new range during drag |
| `.drp-date-picker__day--drag-invalid` | Invalid drag position (block mode) |

#### Badge System

| Class | Description |
|-------|-------------|
| `.drp-date-picker__badge-row` | Badge row (appears above date row) |
| `.drp-date-picker__badge-cell` | Individual badge cell |

#### Custom Date Classes

Can be added via `specialDates` array or `getDateInfo` callback:

| Predefined Class | Description |
|------------------|-------------|
| `.holiday` | Holiday styling (red tint) |
| `.event` | Event styling (green tint) |

You can also add any custom class names for complete control.

#### Actions & Summary

| Class | Description |
|-------|-------------|
| `.drp-date-picker__summary` | Summary container (range mode) |
| `.drp-date-picker__actions` | Actions container |
| `.drp-date-picker__button` | Button base class |
| `.drp-date-picker__button--today` | Today button |
| `.drp-date-picker__button--clear` | Clear button |
| `.drp-date-picker__button--apply` | Apply button (range mode) |
| `.drp-date-picker__button--cancel` | Cancel button |

---

## CSS Custom Properties

All CSS variables use the `--drp-` prefix and can be overridden from page-level CSS.

### How It Works

The component defines CSS variables using `:host` in its shadow DOM styles. This allows you to override them from your page-level CSS by targeting the web component element:

```css
/* Your page CSS */
web-daterangepicker {
  --drp-accent-color: #10b981;
  --drp-border-radius: 0.5rem;
}
```

**Why `:host`?** CSS variables defined with `:host` inside shadow DOM are:
- ✅ Accessible to all styles inside the shadow DOM
- ✅ Overridable from page-level CSS (as shown above)
- ✅ Scoped to each component instance

**Note:** If you see `:root` mentioned in old documentation or examples, it has been replaced with `:host` for proper shadow DOM support. Using `:root` inside shadow DOM doesn't work correctly.

### Available Variables

### Colors

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-card-bg` | `#ffffff` | Calendar background |
| `--drp-border-color` | `#e5e7eb` | Border color |
| `--drp-primary-bg` | `#f3f4f6` | Primary background (hover states) |
| `--drp-primary-bg-hover` | `#e5e7eb` | Primary background hover |
| `--drp-accent-color` | `#3b82f6` | Accent color (selected, focused) |
| `--drp-accent-color-hover` | `#2563eb` | Accent color hover |
| `--drp-text-primary` | `#111827` | Primary text color |
| `--drp-text-secondary` | `#6b7280` | Secondary text color |
| `--drp-accent-text-color` | `#ffffff` | Text color on accent backgrounds |
| `--drp-button-text-color` | `#ffffff` | Button text color |

### Spacing

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-spacing-xs` | `0.25rem` | Extra small spacing |
| `--drp-spacing-sm` | `0.5rem` | Small spacing |
| `--drp-spacing-md` | `1rem` | Medium spacing |
| `--drp-spacing-lg` | `1.5rem` | Large spacing |
| `--drp-spacing-xl` | `2rem` | Extra large spacing |

### Typography

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-font-size-2xs` | `0.625rem` | Extra extra small |
| `--drp-font-size-xs` | `0.75rem` | Extra small |
| `--drp-font-size-sm` | `0.875rem` | Small |
| `--drp-font-size-base` | `1rem` | Base font size |
| `--drp-font-size-lg` | `1.125rem` | Large |
| `--drp-font-size-xl` | `1.25rem` | Extra large |
| `--drp-font-size-2xl` | `1.5rem` | Extra extra large |
| `--drp-font-weight-medium` | `500` | Medium weight |
| `--drp-font-weight-semibold` | `600` | Semibold weight |

### Borders & Shadows

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-border-width-base` | `1px` | Base border width |
| `--drp-border-radius` | `0.375rem` | Border radius |
| `--drp-shadow-xl` | (complex value) | Extra large shadow for floating calendar |

### Transitions

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-transition-fast` | `150ms` | Fast transition duration |
| `--drp-easing-snappy` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Snappy easing curve |

### Input Size Variants

Five size variants for the input element, customizable via CSS variables:

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-input-size-xs-font` | `0.75rem` | Extra small font size |
| `--drp-input-size-xs-padding-v` | `0.25rem` | Extra small vertical padding |
| `--drp-input-size-xs-padding-h` | `0.25rem` | Extra small horizontal padding |
| `--drp-input-size-xs-height` | `1.5rem` | Extra small height |
| `--drp-input-size-xs-icon-size` | `0.75em` | Extra small icon size |
| `--drp-input-size-sm-font` | `0.875rem` | Small font size |
| `--drp-input-size-sm-padding-v` | `0.25rem` | Small vertical padding |
| `--drp-input-size-sm-padding-h` | `0.5rem` | Small horizontal padding |
| `--drp-input-size-sm-height` | `2rem` | Small height |
| `--drp-input-size-sm-icon-size` | `0.875em` | Small icon size |
| `--drp-input-size-md-font` | `1rem` | Medium font size (default) |
| `--drp-input-size-md-padding-v` | `0.5rem` | Medium vertical padding |
| `--drp-input-size-md-padding-h` | `0.75rem` | Medium horizontal padding |
| `--drp-input-size-md-height` | `2.5rem` | Medium height |
| `--drp-input-size-md-icon-size` | `1em` | Medium icon size |
| `--drp-input-size-lg-font` | `1.125rem` | Large font size |
| `--drp-input-size-lg-padding-v` | `1rem` | Large vertical padding |
| `--drp-input-size-lg-padding-h` | `1rem` | Large horizontal padding |
| `--drp-input-size-lg-height` | `3rem` | Large height |
| `--drp-input-size-lg-icon-size` | `1.125em` | Large icon size |
| `--drp-input-size-xl-font` | `1.25rem` | Extra large font size |
| `--drp-input-size-xl-padding-v` | `1rem` | Extra large vertical padding |
| `--drp-input-size-xl-padding-h` | `1.5rem` | Extra large horizontal padding |
| `--drp-input-size-xl-height` | `3.5rem` | Extra large height |
| `--drp-input-size-xl-icon-size` | `1.25em` | Extra large icon size |

### Other

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-input-padding-h` | `0.75rem` | Input horizontal padding |
| `--drp-grid-rows` | (dynamic) | Grid rows count (set automatically) |
| `--drp-grid-columns` | (dynamic) | Grid columns count (set automatically) |

### Theming Examples

#### Basic Theme Override

```css
/* Target specific picker instances with classes */
web-daterangepicker.custom-theme {
  --drp-accent-color: #10b981;
  --drp-accent-color-hover: #059669;
  --drp-border-radius: 0.5rem;
  --drp-font-size-base: 1.125rem;
}
```

#### Dark Theme

```css
web-daterangepicker.dark-theme {
  --drp-card-bg: #1e293b;
  --drp-text-primary: #f1f5f9;
  --drp-text-secondary: #cbd5e1;
  --drp-border-color: #334155;
  --drp-accent-color: #3b82f6;
  --drp-accent-color-hover: #2563eb;
  --drp-primary-bg: #334155;
  --drp-primary-bg-hover: #475569;
  --drp-accent-text-color: #ffffff;
  --drp-button-text-color: #ffffff;
}
```

#### Multiple Themes

```css
/* Blue theme */
web-daterangepicker.theme-blue {
  --drp-accent-color: #3b82f6;
  --drp-accent-color-hover: #2563eb;
}

/* Green theme */
web-daterangepicker.theme-green {
  --drp-accent-color: #10b981;
  --drp-accent-color-hover: #059669;
}

/* Purple theme */
web-daterangepicker.theme-purple {
  --drp-accent-color: #8b5cf6;
  --drp-accent-color-hover: #7c3aed;
}
```

#### Dynamic Theme Switching

```javascript
// Change theme at runtime
const picker = document.querySelector('web-daterangepicker');

// Apply dark theme
picker.classList.add('dark-theme');

// Switch to different color theme
picker.classList.remove('theme-blue');
picker.classList.add('theme-green');
```

---

## TypeScript Interfaces

### DatePickerOptions

```typescript
interface DatePickerOptions {
  mode?: 'single' | 'range';
  position?: string;
  monthsToShow?: number;
  format?: string;
  calendarTrigger?: 'auto' | 'button';
  onSelect?: (date: Date | DateRange) => void;
  container?: HTMLElement;
  display?: 'inline' | 'floating';
  layout?: 'horizontal' | 'grid';
  gridRows?: number;
  gridColumns?: number;
  weekStartDay?: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minDate?: Date | string;
  maxDate?: Date | string;
  disabledDates?: (Date | string)[];
  disabledDays?: number[];
  specialDates?: DecoratedDate[];

  // Member mapping for specialDates
  dateMember?: string;
  badgeTextMember?: string;
  badgeClassMember?: string;
  dayClassMember?: string;
  badgeTooltipMember?: string;
  dayTooltipMember?: string;
  isDisabledMember?: string;

  getDateInfo?: (date: Date) => DateInfo | null;
  rangeDisabledMode?: 'allow' | 'block' | 'split' | 'individual';
  shouldHighlightDisabledInRange?: boolean;

  // Internationalization
  locale?: string | 'auto';
  displayFormatMask?: string;
  customStrings?: Partial<LocaleStrings>;

  // Custom summary formatting
  formatSummaryCallback?: (data: SummaryCallbackData) => string;
}
```

### DateRange

```typescript
interface DateRange {
  start: Date;
  end: Date;
}
```

### DatePickerEventDetail

```typescript
interface DatePickerEventDetail {
  date?: Date;                              // Single mode
  dateRange?: DateRange;                    // Range mode
  formattedValue: string;                   // Always present

  // 'allow' mode
  enabledDates?: Date[];
  disabledDates?: Date[];
  getEnabledDateCount?: () => number;
  getTotalDays?: () => number;

  // 'split' mode
  dateRanges?: DateRange[];

  // 'split' or 'individual' mode
  dates?: Date[];
}
```

### DecoratedDate

```typescript
type DecoratedDate = Record<string, any>;
```

**Member Mapping**: `DecoratedDate` is a flexible type that accepts any object structure. Use the `*Member` options to map your custom property names to the picker's fields:

- `dateMember` - Which property contains the date (default: `'date'`)
- `badgeTextMember` - Which property contains badge text (default: `'badgeText'`)
- `badgeClassMember` - Which property contains badge CSS class (default: `'badgeClass'`)
- `dayClassMember` - Which property contains day CSS class (default: `'dayClass'`)
- `badgeTooltipMember` - Which property contains badge tooltip (default: `'badgeTooltip'`)
- `dayTooltipMember` - Which property contains day tooltip (default: `'dayTooltip'`)
- `isDisabledMember` - Which property contains disabled flag (default: `'isDisabled'`)

**Example with default property names:**
```typescript
const holidays = [
  { date: '2025-12-25', badgeText: '🎄', badgeTooltip: 'Christmas' },
  { date: '2025-12-31', badgeText: '🥳', badgeTooltip: 'New Year Eve' }
];
picker.specialDates = holidays;
```

**Example with custom property names:**
```typescript
const myHolidays = [
  { id: 1, displayDate: '2025-12-25', icon: '🎄', description: 'Christmas', style: 'holiday' },
  { id: 2, displayDate: '2025-12-31', icon: '🥳', description: 'New Year Eve', style: 'holiday' }
];

picker.dateMember = 'displayDate';
picker.badgeTextMember = 'icon';
picker.badgeClassMember = 'style';
picker.badgeTooltipMember = 'description';
picker.specialDates = myHolidays;
```

### DateInfo

```typescript
interface DateInfo {
  isDisabled?: boolean;      // Override disabled state for this date
  badgeClass?: string;       // CSS class applied to badge cell
  dayClass?: string;         // CSS class applied to day cell
  badgeText?: string;        // Text displayed in badge row above day numbers
  badgeTooltip?: string;     // Plain text hover tooltip for badge cell
  dayTooltip?: string;       // Plain text hover tooltip for day cell
}
```

Returned by `getDateMetadataCallback` to provide custom styling/labels for specific dates.

### LocaleStrings

```typescript
interface LocaleStrings {
  // Button labels
  today: string;
  clear: string;
  apply: string;

  // Summary text
  preview: string;
  day: string;
  days: string;
  night: string;
  nights: string;

  // Time picker (used when pickerMode is 'time' or 'datetime')
  time: string;   // Label above the time rolls
  now: string;    // "Now" button label
  am: string;     // AM/PM column label for the 12-hour roll
  pm: string;
}
```

### SummaryCallbackData

```typescript
interface SummaryCallbackData {
  // Basic counts
  days: number;           // Total days selected
  nights: number;         // Total nights (days - 1)

  // Simple range (when rangeDisabledHandling is 'allow' or 'block')
  startDate: Date | null;
  endDate: Date | null;

  // Multiple ranges (when rangeDisabledHandling is 'split')
  dateRanges?: DateRange[];

  // Individual dates (when rangeDisabledHandling is 'individual' or 'split')
  dates?: Date[];

  // For 'allow' mode - breakdown of enabled vs disabled
  enabledDates?: Date[];
  disabledDates?: Date[];

  // Context
  selectionMode: 'single' | 'range';
  rangeDisabledHandling?: 'allow' | 'block' | 'split' | 'individual';
  localeStrings: LocaleStrings;

  // Preview flag (true when dragging)
  isPreview?: boolean;
}
```

### FormatInfo

```typescript
interface FormatInfo {
  format: string;
  separator: string;
  parts: {
    year?: { index: number; length: number };
    month?: { index: number; length: number };
    day?: { index: number; length: number };
  };
  maxLength: number;
}
```

### MonthDisplay

```typescript
interface MonthDisplay {
  month: number;  // 0-11 (January = 0)
  year: number;   // Full year (e.g., 2025)
}
```

---

## Keyboard Navigation

Complete keyboard support for accessibility:

### Calendar Navigation

| Key | Action |
|-----|--------|
| `Escape` | Close calendar (floating mode) |
| `↑` | Move focus up 1 week (7 days) |
| `↓` | Move focus down 1 week (7 days) |
| `←` | Move focus left 1 day |
| `→` | Move focus right 1 day |
| `Ctrl/Cmd + ←` or `PageUp` | Previous month (maintain day position) |
| `Ctrl/Cmd + →` or `PageDown` | Next month (maintain day position) |
| `Enter` | Select focused day |
| `t` or `T` | Jump to today |
| `Tab` | Switch to next month column (multi-month mode) |
| `Shift + Tab` | Switch to previous month column (multi-month mode) |
| `Home` | First day of current month. Press again for previous month |
| `End` | Last day of current month. Press again for next month |
| `Ctrl/Cmd + Home` | January 1st of current year. Press again for previous year |
| `Ctrl/Cmd + End` | December 31st of current year. Press again for next year |

### Input Masking

| Key | Action |
|-----|--------|
| Separator (`-`, `/`, `.`) | Auto-pad single digit with leading zero |
| `Ctrl/Cmd + V` | Clean and format pasted content |

---

## Property Accessors

The web component provides convenient property accessors for JavaScript:

### Read/Write Properties

<!-- GEN:properties:start -->
<!-- Auto-generated from custom-elements.json — do not edit by hand. Run `npm run docs:api`. -->
| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `isReady` | `boolean` | Read-only | Whether the picker has been built (the `ready` event has fired). False while a `defer` gate is still held. |
| `lockedAspects` | `LockAspect[]` | Read-only | The currently locked aspects (read-only snapshot). |
| `value` | `string` | Read/Write | Text value of the input. |
| `readonly` | `boolean` | Read/Write | Full read-only lock, reflected to the `readonly` attribute. Reads back `true` only when every aspect is locked. For partial locks use `lock([...])`. |
| `selectedRanges` | `DateRange[]` | Read/Write | Committed ranges (range mode). Assigning replaces the selection. |
| `selectedDates` | `Date[]` | Read/Write | Committed dates (multiple mode). Assigning replaces the selection. |
| `selectedDate` | `Date \| null` | Read/Write | Committed date (single mode). Assigning replaces the selection. |
| `selectedStartDate` | `Date \| null` | Read-only | Committed range start (read-only; set a range via `selectedRanges`). |
| `selectedEndDate` | `Date \| null` | Read-only | Committed range end (read-only; set a range via `selectedRanges`). |
| `selectedTime` | `SelectedTime \| null` | Read/Write | Selected time (time/datetime modes). |
| `selectedDatetime` | `Date \| null` | Read/Write | Composed date+time; the setter accepts a Date or ISO string and splits it. |
| `visibleMonths` | `MonthDisplay[]` | Read-only | Descriptor for each visible month column (read-only). |
| `visibleMonthDates` | `Date[]` | Read-only | Anchor date (first-of-month) for each visible column (read-only). |
| `visibleDateRange` | `{ start: Date; end: Date } \| null` | Read-only | The overall date span currently rendered across all columns (read-only). |
| `today` | `Date` | Read-only | The picker's notion of "today", normalized to 00:00 local. |
| `isOpen` | `boolean` | Read/Write | Whether the calendar is currently open. Assigning opens/closes it. |
| `picker` | `DateRangePicker \| undefined` | Read-only | The live `DateRangePicker` engine instance this element wraps (or `undefined` before first connect / while detached). An escape hatch for advanced use — the engine is also a public export — and the same white-box hook the old `private picker` field exposed. Prefer the element's own methods/properties where they exist. |
| `selectionMode` | `'single' \| 'range' \| 'multiple'` | Read/Write | Selection behavior: `single` day, `range`, or `multiple` days/ranges. |
| `positioningMode` | `'inline' \| 'floating' \| 'modal'` | Read/Write | How the calendar is presented: `inline` (always visible, no input), `floating` (popover anchored to an input), or `modal`. |
| `calendarOpenTrigger` | `'focus' \| 'typing' \| 'manual'` | Read/Write | What opens the floating calendar: `focus`, `typing`, or `manual` (only `open()`). |
| `overlayGroup` | `string \| null` | Read/Write | Scope the "one overlay open at a time" coordination to a named group. Overlays (datepickers, multiselects, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group. |
| `visibleMonthsCount` | `number` | Read/Write | Number of month columns shown side-by-side. |
| `monthLayout` | `'horizontal' \| 'grid'` | Read/Write | Multi-month arrangement: a horizontal row or a `grid` (see grid-rows/grid-columns). |
| `gridRows` | `number` | Read/Write | Rows in the month grid when month-layout is `grid`. |
| `gridColumns` | `number` | Read/Write | Columns in the month grid when month-layout is `grid`. |
| `isUnifiedNavigationEnabled` | `boolean` | Read/Write | In grid layouts, drive the whole grid from one anchor month instead of per-column navigation. |
| `unifiedNavigationAnchorIndex` | `number` | Read/Write | Which month index anchors unified navigation. |
| `pickerMode` | `'date' \| 'time' \| 'datetime'` | Read/Write | Whether the control picks a `date`, a `time`, or a `datetime`. |
| `isSecondsShown` | `boolean \| null` | Read/Write | Show a seconds field in time/datetime mode. |
| `hourCycle` | `'h12' \| 'h24'` | Read/Write | 12- or 24-hour clock for time/datetime mode. |
| `isSummaryShown` | `boolean \| null` | Read/Write | Show the range summary (day/night counts) block. |
| `dateFormatMask` | `string` | Read/Write | Parse/format mask for dates (YYYY/YY, MM/M, DD/D with any separators). |
| `displayFormatMask` | `string \| null` | Read/Write | Localized format hint shown as the input placeholder (when no explicit `placeholder`). In `range` mode the hint is doubled around " - " (e.g. `YYYY-MM-DD - YYYY-MM-DD`). |
| `isUnifiedHeaderInteractive` | `boolean` | Read/Write | Make the unified grid header clickable (opens the rolling selector). |
| `calendarPlacement` | `string \| null` | Read/Write | Floating-UI placement for the popover (default `bottom-start`). |
| `weekStartDay` | `'auto' \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | Read/Write | First column of the week: `auto` (locale) or a weekday index 0 (Sunday)–6 (Saturday). |
| `minDate` | `string \| null` | Read/Write | Earliest selectable date (ISO string). |
| `maxDate` | `string \| null` | Read/Write | Latest selectable date (ISO string). |
| `initialDate` | `string \| null` | Read/Write | Month/date the calendar opens on when nothing is selected (ISO string). |
| `disabledWeekdays` | `number[]` | Read/Write | CSV of weekday indices (0=Sunday…6=Saturday) that cannot be selected. |
| `disabledDates` | `Array<Date \| string>` | Read/Write | Specific dates that cannot be selected. Attribute: CSV of ISO strings; property: array of Date or string. |
| `disabledDatesHandling` | `'allow' \| 'prevent' \| 'block' \| 'split' \| 'individual'` | Read/Write | Strategy for ranges that span disabled dates: `allow`, `prevent`, `block`, `split`, or `individual`. |
| `shouldHighlightDisabledInRange` | `boolean \| null` | Read/Write | Visually mark disabled dates that fall inside a selected range. |
| `locale` | `string` | Read/Write | BCP-47 locale, or `auto` to detect from the browser. |
| `monthNames` | `string[]` | Read/Write | Override month names. Attribute: 12 pipe-delimited names, index 0=January; property: `string[]`. |
| `weekdayNames` | `string[]` | Read/Write | Override weekday names. Attribute: 7 pipe-delimited names, index 0=Sunday; property: `string[]`. |
| `rollingYearRange` | `string \| null` | Read/Write | Constrains the rolling year selector (e.g. `-5:+5` or absolute years). |
| `rollingMonthRange` | `string \| null` | Read/Write | Constrains the rolling month selector. |
| `commitMode` | `'selection' \| 'apply' \| 'manual'` | Read/Write | How a selection is committed + the calendar dismissed: `selection` (commit & close on pick), `apply` (Apply button commits), or `manual` (app-driven, no built-in button). |
| `shouldCloseOnScroll` | `boolean \| null` | Read/Write | Close the floating calendar when the page scrolls. |
| `isTodayButtonShown` | `boolean \| null` | Read/Write | Show the “Today” action button. |
| `isClearButtonShown` | `boolean \| null` | Read/Write | Show the “Clear” action button. |
| `timeFormatMask` | `string` | Read/Write | Parse/format mask for times (HH/mm/ss). |
| `displayTimeFormatMask` | `string \| null` | Read/Write | Localized display mask for the time portion. |
| `timeStep` | `number` | Read/Write | Minute step for the time picker. |
| `isNowButtonShown` | `boolean \| null` | Read/Write | Show the “Now” button in time/datetime mode. |
| `timeDisplay` | `'rolls' \| 'clock' \| 'wheel' \| 'compact'` | Read/Write | Time-picker UI: `rolls`, `clock`, `wheel`, or `compact`. |
| `dateMember` | `string \| null` | Read/Write | Property name on a decorated-date object holding its date. |
| `badgeTextMember` | `string \| null` | Read/Write | Property name holding a day badge’s text. |
| `badgeClassMember` | `string \| null` | Read/Write | Property name holding a day badge’s CSS class. |
| `dayClassMember` | `string \| null` | Read/Write | Property name holding a day cell’s CSS class. |
| `badgeTooltipMember` | `string \| null` | Read/Write | Property name holding a badge tooltip string. |
| `dayTooltipMember` | `string \| null` | Read/Write | Property name holding a day tooltip string. |
| `isDisabledMember` | `string \| null` | Read/Write | Property name flagging a decorated date as disabled. |
| `formFieldName` | `string \| null` | Read/Write | HTML form field name. When set, the control submits its selection as a light-DOM hidden `<input>` (`name[]` inputs for `value-format="array"`). Also read by core for `el.form` / `form.reset()`. |
| `valueFormat` | `'iso' \| 'json' \| 'array'` | Read/Write | Serialization of the submitted value (stable ISO-8601, independent of the display masks): - `iso` (default) — one field; a single date/time as-is, a range as `start/end`, multiple joined by `,`. - `json` — one field; `JSON.stringify` of the selection (scalar/object for single/range, array for multiple). - `array` — multiple `name[]` fields, one per date; a range contributes `start` and `end`. |
| `getValueFormatCallback` | `(selection: FormValueSelection) => string` | Read/Write | Custom serialization of the submitted value; receives the normalized ISO selection snapshot and returns the single hidden-input value. Overrides `value-format`. Property-only. |
| `placeholder` | `string \| null` | Read/Write | Input placeholder. When unset, plain date pickers auto-derive it from display-format-mask / date-format-mask (`YYYY-MM-DD`), doubled in `range` mode (`YYYY-MM-DD - YYYY-MM-DD`). |
| `disabled` | `boolean` | Read/Write | Disable the input. |
| `inputSize` | `string` | Read/Write | Input size scale: `xs` \| `sm` \| `md` \| `lg` \| `xl` (floating/modal only). |
| `enableTransitions` | `boolean` | Read/Write | Opt into calendar open/close CSS transitions. |
| `mobilePresentation` | `'auto' \| 'floating' \| 'modal' \| 'fullscreen'` | Read/Write | How a `floating` picker adapts to the device (SPEC §12.9, via web-components-core). `auto` (default) keeps the floating popover on desktop, uses a centered `modal` on tablets, and a full-screen overlay on phones (touch-primary + shorter viewport side < 600px, orientation-robust). `floating`/`modal`/`fullscreen` force that presentation on any device (handy for previews/testing). Only adapts a floating picker — an explicit `positioning-mode` of `inline` or `modal` is left as authored. Resolved reactively from the device/viewport environment. |
| `fullscreenAutofocus` | `boolean` | Read/Write | In the phone full-screen overlay, focus the date input on open (pops the soft keyboard for type-to-fill). Default off: the sheet opens with the calendar visible and the keyboard closed. No effect in floating/modal presentations. |
| `fullscreenTitle` | `string \| null` | Read/Write | Optional heading shown in the phone full-screen overlay header, next to the close (✕) button. When unset the header shows just the close button. |
| `fullscreenInput` | `boolean` | Read/Write | In the phone full-screen overlay, relocate the date input into the header so it is visible and typeable above the sheet (with a numeric keypad; the mask supplies the separators). Takes over the header row, so fullscreen-title is not shown alongside it. No effect in floating/modal presentations. |
| `showDebugInfo` | `boolean` | Read/Write | Enable the picker’s debug logging. |
| `compactBelow` | `number` | Read/Write | Container-responsive compaction threshold in CSS px. When the element’s OWN box is narrower than this, the calendar collapses to a single month and hides the Today/Clear buttons — keyed on the element box (core’s shared ResizeObserver), not the viewport, so a picker in a narrow column/sidebar compacts even on a wide monitor. Unset or `0` disables it. Purely presentational tweaks (padding, label→icon) belong in CSS `@container`; this drives the structural month-count change. |
| `deferRender` | `boolean` | Read/Write | Hold the initial render. When the `defer` attribute is present on upgrade the component builds nothing (reserving space only) — so `value`, callbacks (e.g. `customStylesCallback`), and event listeners can all be wired first, then released with `el.ready()` (or by removing the `defer` attribute, for server-driven frameworks). The release builds the picker ONCE with everything already in place, avoiding the upgrade-then-restyle flash. Absent (default): builds immediately on connect. Latched — once released the gate never re-closes. |
| `specialDates` | `DecoratedDate[]` | Read/Write | Array of decorated-date objects (badges, tooltips, per-day classes). Property-only. |
| `actionButtons` | `ActionButton[]` | Read/Write | Custom footer action buttons. Property-only; when unset the built-in buttons apply. |
| `customStrings` | `Partial<LocaleStrings>` | Read/Write | Per-instance locale string overrides. Property-only. |
| `getDateMetadataCallback` | `(ctx: DayContext) => DayMetadata \| null` | Read/Write | Compute per-day metadata (badges, classes, disabled) dynamically. |
| `badgeTooltipCallback` | `(ctx: DayContext) => string \| null` | Read/Write | Tooltip text for a day badge. |
| `dayTooltipCallback` | `(ctx: DayContext) => string \| null` | Read/Write | Tooltip text for a day cell. |
| `renderDayCallback` | `(ctx: DayContext) => HTMLElement \| string \| null` | Read/Write | Fully custom-render a day cell. |
| `renderDayContentCallback` | `(ctx: DayContext) => HTMLElement \| string \| null` | Read/Write | Custom-render the content inside a day cell. |
| `formatSummaryCallback` | `(ctx: SummaryContext) => string` | Read/Write | Render the range summary text. |
| `getUnifiedHeaderCallback` | `(ctx: UnifiedHeaderContext) => string` | Read/Write | Render the unified grid header label. |
| `getMonthHeaderCallback` | `(ctx: MonthHeaderContext) => string` | Read/Write | Render a per-column month header label. |
| `customStylesCallback` | `() => string` | Read/Write | Return a CSS string injected into the component via a replaceable style slot (§12.8). Takes precedence over the `custom-styles` attribute when both are set. |
| `customStyles` | `string \| null` | Read/Write | Raw CSS injected into the Shadow DOM — the declarative, no-JS alternative to `customStylesCallback`. The value is a full stylesheet (selectors and all), dropped verbatim into the same replaceable style slot. `customStylesCallback` wins when both are set. |
| `beforeDateSelectCallback` | `(ctx: SelectionContext) => BeforeSelectResult \| Promise<BeforeSelectResult>` | Read/Write | Runs before a day is selected; can veto or adjust the selection. |
| `beforeMonthChangedCallback` | `(ctx: MonthChangeContext) => BeforeMonthChangeResult \| Promise<BeforeMonthChangeResult>` | Read/Write | Runs before month navigation; can veto the change. |
<!-- GEN:properties:end -->

**Note:** Property-only inputs and the attribute-backed accessors are all writable; read-only entries (marked _Read-only_) are derived state. Setting an `on:'reinit'` input rebuilds the calendar.

### Example

```javascript
const picker = document.querySelector('web-daterangepicker');

// Get/set via properties
picker.selectionMode = 'range';
picker.minDate = '2025-01-01';
picker.maxDate = '2025-12-31';

// Set complex properties (must use JS, not HTML attributes)
picker.specialDates = [
  { date: '2025-12-25', badgeText: '🎄', badgeTooltip: 'Christmas' }
];

```

---

## Browser Support

### Modern Browsers

- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+

### Week Start Day Detection

The component uses `Intl.Locale` API with `weekInfo` for automatic week start detection:

- **Modern browsers** (Chrome 99+, Firefox 105+, Safari 16+): Uses native `weekInfo`
- **Older browsers**: Falls back to locale-based detection
- **Fallback list**: Sunday-start countries include US, Canada, Japan, Israel, Saudi Arabia, UAE, South Korea
- **Default**: Monday (most of the world)

### Dependencies

- **@floating-ui/dom** - Positioning system for floating calendar

---

## Advanced Usage Examples

### Custom Date Styling with `getDateInfo`

```javascript
const picker = document.querySelector('web-daterangepicker');

// Mark weekends with a custom class
picker.getDateInfo = (date) => {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return {
      class: 'weekend-day',
      label: '⭐',
      tooltip: 'Weekend!'
    };
  }
  return null;
};
```

```css
/* Add custom styling */
.drp-date-picker__day.weekend-day {
  background-color: #fef3c7;
}
```

### Dynamic Date Restrictions

```javascript
// Disable dates based on API data
const bookedDates = await fetchBookedDates();

```

### Handling Range with Split Mode

```javascript
picker.setAttribute('range-disabled-mode', 'split');
picker.addEventListener('date-select', (e) => {
  const { dateRanges, dates } = e.detail;

  console.log(`Selected ${dateRanges.length} separate ranges`);
  dateRanges.forEach((range, i) => {
    const nights = Math.floor(
      (range.end - range.start) / (1000 * 60 * 60 * 24)
    );
    console.log(`Range ${i + 1}: ${nights} nights`);
  });

  console.log(`Total ${dates.length} individual days`);
});
```

### Internationalization (i18n)

The date picker provides comprehensive i18n support with automatic browser detection, built-in locales, and full customization options.

#### Auto-Detection

```html
<!-- Auto-detect user's browser locale -->
<web-daterangepicker locale="auto"></web-daterangepicker>
```

The picker will:
1. Detect the user's browser language (`navigator.language`)
2. Use built-in translations if available (`en`, `de`, `fr`, `es`)
3. Fall back to English if locale is not supported
4. Use Intl API for weekday and month names

#### Built-in Locales

```html
<!-- Spanish -->
<web-daterangepicker locale="es"></web-daterangepicker>

<!-- German -->
<web-daterangepicker locale="de"></web-daterangepicker>

<!-- French -->
<web-daterangepicker locale="fr"></web-daterangepicker>

<!-- English (explicit) -->
<web-daterangepicker locale="en"></web-daterangepicker>
```

#### Dual Mask System

Use `date-format-mask` for validation (English tokens) and `display-format-mask` for visual display (localized tokens):

```html
<!-- Spanish: Show "dd/mm/aaaa" to users, validate with "YYYY-MM-DD" -->
<web-daterangepicker
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  locale="es">
</web-daterangepicker>

<!-- German: Show "tt.mm.jjjj" to users, validate with "DD.MM.YYYY" -->
<web-daterangepicker
  date-format-mask="DD.MM.YYYY"
  display-format-mask="tt.mm.jjjj"
  locale="de">
</web-daterangepicker>
```

**How it works:**
- `date-format-mask`: Used for parsing and validation (always use English: YYYY, MM, DD)
- `display-format-mask`: Shown to users as a hint (use localized: aaaa for año, jjjj for jahr, etc.)
- Both masks must represent the same format structure, just with different language tokens

#### Custom String Overrides

```javascript
const picker = document.querySelector('web-daterangepicker');

// Override specific strings while keeping rest of locale
picker.picker.options.customStrings = {
  today: 'Ahora',          // Custom "Today"
  clear: 'Borrar todo',    // Custom "Clear"
  apply: 'Confirmar'       // Custom "Apply"
  // Other strings inherited from locale
};

// Or in DateRangePicker:
const picker = new DateRangePicker(input, {
  locale: 'es',
  customStrings: {
    today: 'Ahora',
    preview: 'Vista previa personalizada'
  }
});
```

**Available strings:**
- `today` - Today button
- `clear` - Clear button
- `apply` - Apply button (range mode)
- `preview` - Preview label in summary
- `day` / `days` - Day count (singular/plural)
- `night` / `nights` - Night count (singular/plural)

#### Complete Spanish Example

```html
<web-daterangepicker
  id="spanish-picker"
  selection-mode="range"
  locale="es"
  date-format-mask="YYYY-MM-DD"
  display-format-mask="dd/mm/aaaa"
  placeholder="Selecciona fechas"
  visible-months-count="2">
</web-daterangepicker>

<script>
  const picker = document.getElementById('spanish-picker');

  picker.addEventListener('date-select', (e) => {
    const { dateRange, formattedValue } = e.detail;
    console.log('Rango seleccionado:', formattedValue);
    console.log('Desde:', dateRange.start);
    console.log('Hasta:', dateRange.end);
  });
</script>
```

#### Complete German Example with Custom Strings

```javascript
const picker = new DateRangePicker(inputElement, {
  selectionMode: 'single',
  locale: 'de',
  dateFormatMask: 'DD.MM.YYYY',
  displayFormatMask: 'tt.mm.jjjj',
  customStrings: {
    today: 'Jetzt',
    clear: 'Zurücksetzen',
    preview: 'Vorschau'
  },
  weekStartDay: 1, // Monday (automatically detected for 'de', but can override)
  onSelect: (date) => {
    console.log('Ausgewähltes Datum:', date);
  }
});
```

#### What Gets Localized

| Element | Source | Customizable |
|---------|--------|--------------|
| Weekday names (Mo, Tu, We...) | Intl API (`Intl.DateTimeFormat`) | ❌ No (browser-provided) |
| Month names (January, February...) | Intl API (`Intl.DateTimeFormat`) | ❌ No (browser-provided) |
| Button labels (Today, Clear, Apply) | Built-in locale strings | ✅ Yes (via `customStrings`) |
| Summary text (day, days, night, nights) | Built-in locale strings | ✅ Yes (via `customStrings`) |
| Display format mask hint | `display-format-mask` attribute | ✅ Yes |
| Week start day | Intl API (`Intl.Locale.weekInfo`) | ✅ Yes (via `week-start-day`) |

### Custom Summary Formatting

The `formatSummaryCallback` option allows you to completely customize the summary display below the calendar. The callback receives comprehensive data about the selection and returns an HTML string.

#### Basic Example: Show Only Nights

```javascript
const picker = new DateRangePicker(input, {
  selectionMode: 'range',
  formatSummaryCallback: (data) => {
    return `<strong>${data.nights}</strong> ${data.nights === 1 ? data.localeStrings.night : data.localeStrings.nights}`;
  }
});
```

#### Example: Add Custom Pricing

```javascript
const picker = new DateRangePicker(input, {
  selectionMode: 'range',
  formatSummaryCallback: (data) => {
    const pricePerNight = 150;
    const total = data.nights * pricePerNight;

    return `
      <div style="display: flex; justify-content: space-between; width: 100%;">
        <span>${data.nights} ${data.nights === 1 ? data.localeStrings.night : data.localeStrings.nights}</span>
        <span style="font-weight: bold;">$${total}</span>
      </div>
    `;
  }
});
```

#### Example: Handle Multiple Ranges (Split Mode)

```javascript
const picker = new DateRangePicker(input, {
  selectionMode: 'range',
  rangeDisabledHandling: 'split',
  disabledWeekdays: [0, 6], // Disable weekends
  formatSummaryCallback: (data) => {
    if (data.dateRanges && data.dateRanges.length > 1) {
      // Multiple ranges
      return `
        <div>
          <div>${data.dateRanges.length} separate periods</div>
          <div>${data.days} ${data.localeStrings.days} total</div>
        </div>
      `;
    } else {
      // Single range
      return `${data.days} ${data.localeStrings.days}, ${data.nights} ${data.localeStrings.nights}`;
    }
  }
});
```

#### Example: Show Enabled vs Disabled Count (Allow Mode)

```javascript
const picker = new DateRangePicker(input, {
  selectionMode: 'range',
  rangeDisabledHandling: 'allow',
  disabledWeekdays: [0, 6],
  formatSummaryCallback: (data) => {
    if (data.enabledDates && data.disabledDates) {
      return `
        <div style="font-size: 0.9em;">
          <div><strong>${data.enabledDates.length}</strong> weekdays</div>
          <div style="opacity: 0.7;">${data.disabledDates.length} weekends (excluded)</div>
        </div>
      `;
    }
    return `${data.days} ${data.localeStrings.days}`;
  }
});
```

#### Example: Preview Indicator

```javascript
const picker = new DateRangePicker(input, {
  selectionMode: 'range',
  formatSummaryCallback: (data) => {
    const prefix = data.isPreview ?
      `<span style="opacity: 0.7;">${data.localeStrings.preview}: </span>` : '';

    return `
      ${prefix}
      <span>${data.days} ${data.days === 1 ? data.localeStrings.day : data.localeStrings.days}</span>
      <span>, </span>
      <span>${data.nights} ${data.nights === 1 ? data.localeStrings.night : data.localeStrings.nights}</span>
    `;
  }
});
```

#### SummaryCallbackData Properties

The callback receives an object with the following properties:

| Property | Type | When Available | Description |
|----------|------|----------------|-------------|
| `days` | `number` | Always | Total days selected |
| `nights` | `number` | Always | Total nights (days - 1) |
| `startDate` | `Date \| null` | Always | Start date of selection |
| `endDate` | `Date \| null` | Always | End date of selection |
| `selectionMode` | `'single' \| 'range'` | Always | Current selection mode |
| `rangeDisabledHandling` | `string` | Always | Current disabled handling mode |
| `localeStrings` | `LocaleStrings` | Always | Localized UI strings |
| `isPreview` | `boolean` | Always | True when dragging (preview) |
| `dateRanges` | `DateRange[]` | Split mode | Array of separate ranges |
| `dates` | `Date[]` | Individual/Split mode | Array of selected dates |
| `enabledDates` | `Date[]` | Allow mode | Enabled dates in range |
| `disabledDates` | `Date[]` | Allow mode | Disabled dates in range |

---

## Known Limitations

### Input Field Styling

**The component cannot style the `<input>` element directly due to Shadow DOM encapsulation.**

#### Why This Happens

The date picker is built as a web component using Shadow DOM for style encapsulation. This architectural decision provides several benefits:

- **Style isolation**: Component styles don't leak to your page
- **Predictable styling**: Your global CSS doesn't break the calendar
- **Encapsulation**: Clean API boundary between component and consumer

However, Shadow DOM creates a barrier:
- The `<input>` element lives in the **light DOM** (your page)
- The calendar popup lives in the **shadow DOM** (component internals)
- Styles inside shadow DOM **cannot reach out** to style light DOM elements

#### What the Component Provides

The component adds minimal decoration to the input:

```html
<div class="drp-date-picker-input">
  <input type="text" />  <!-- Your input, must be styled by you -->
  <!-- Calendar icon (📅) added via CSS ::after -->
</div>
```

**Available CSS custom properties (for icon only):**
- `--drp-input-padding-h` - Horizontal padding for icon positioning
- `--drp-input-icon-opacity` - Opacity of the calendar icon

#### How to Style Your Input

**You must style the input element using your own CSS** in your application:

```css
/* Your global CSS or component styles */
web-daterangepicker input {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
}

web-daterangepicker input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

web-daterangepicker input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.6;
}
```

#### Wrapper Class Approach

The component adds a `.drp-date-picker-input` wrapper class that you can target:

```css
/* Style the wrapper */
.drp-date-picker-input {
  position: relative;
}

/* Style the input inside the wrapper */
.drp-date-picker-input input {
  padding: 0.75rem 2.5rem 0.75rem 0.75rem; /* Extra padding-right for icon */
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 150ms;
}

.drp-date-picker-input input:hover {
  border-color: #9ca3af;
}

.drp-date-picker-input input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

#### Alternative: Use Your Own Input

Instead of letting the component create the input, you can provide your own pre-styled input:

```html
<web-daterangepicker>
  <input
    type="text"
    class="my-custom-input"
    placeholder="Select date"
  />
</web-daterangepicker>
```

```css
/* Your custom input class */
.my-custom-input {
  /* Full control over input styling */
  padding: 1rem;
  border: 2px solid #3b82f6;
  border-radius: 9999px;
  font-size: 1.125rem;
  /* ... */
}
```

#### What DOES Work

These CSS properties **do work** on the input element:

✅ All basic styling:
- `padding`, `margin`, `border`, `border-radius`
- `background-color`, `color`, `font-size`, `font-family`
- `width`, `height`, `box-sizing`
- Pseudo-classes: `:hover`, `:focus`, `:disabled`, `:placeholder`
- Transitions and animations

✅ Flexbox/Grid parent styling:
- Wrap the `<web-daterangepicker>` in a flex/grid container
- Control layout and positioning normally

#### What Does NOT Work

These approaches **will not work**:

❌ Trying to style from inside shadow DOM:
```css
/* Inside component styles - THIS WON'T WORK */
input {
  border: 1px solid red; /* Cannot reach light DOM */
}
```

❌ CSS variables in shadow DOM to style input:
```css
/* Inside component - THIS WON'T WORK */
:host {
  --input-border-color: red;
}

/* Light DOM input cannot access shadow DOM variables */
```

❌ Using `::part()` or `::slotted()` on input:
- Input is not in a slot or exposed as a part

#### Framework-Specific Examples

**Vue 3 / Scoped Styles:**
```vue
<template>
  <web-daterangepicker></web-daterangepicker>
</template>

<style scoped>
/* :deep() pierces component boundary */
web-daterangepicker :deep(input) {
  padding: 1rem;
  border: 1px solid #ccc;
}
</style>
```

**React / CSS Modules:**
```jsx
<div className={styles.pickerWrapper}>
  <web-daterangepicker></web-daterangepicker>
</div>
```

```css
/* styles.module.css */
.pickerWrapper input {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}
```

**Svelte:**
```svelte
<web-daterangepicker></web-daterangepicker>

<style>
  :global(web-daterangepicker input) {
    padding: 1rem;
    border: 1px solid #ccc;
  }
</style>
```

#### Design System Integration

If you're using a design system (Material UI, Bootstrap, Tailwind, etc.), apply your input classes directly:

**Tailwind CSS:**
```html
<web-daterangepicker>
  <input
    type="text"
    class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  />
</web-daterangepicker>
```

**Bootstrap:**
```html
<web-daterangepicker>
  <input type="text" class="form-control" />
</web-daterangepicker>
```

#### Summary

- ✅ **Calendar styling**: Fully controlled by component `--drp-*` CSS custom properties
- ❌ **Input styling**: Must be handled by you in your application CSS
- 💡 **Reason**: Shadow DOM encapsulation keeps calendar styles isolated but prevents styling light DOM elements
- 🎯 **Solution**: Style `web-daterangepicker input` selector in your global/component CSS

---

## Migration Guide

### From v1.0.0-rc06 and Earlier: Calendar Trigger Modes

Starting in **v1.0.0-rc07**, the `calendar-open-trigger` attribute values have been renamed for better clarity:

**Old values (deprecated):**
- `"auto"` - Calendar opened on click/focus
- `"button"` - Calendar opened only via button/code

**New values (current):**
- `"focus"` (default) - Calendar opens when input receives focus
- `"typing"` - Calendar opens when user starts typing
- `"manual"` - Calendar opens only via button click or programmatic calls

**Migration:**

```html
<!-- OLD -->
<web-daterangepicker calendar-open-trigger="auto"></web-daterangepicker>
<web-daterangepicker calendar-open-trigger="button"></web-daterangepicker>

<!-- NEW -->
<web-daterangepicker calendar-open-trigger="focus"></web-daterangepicker>
<web-daterangepicker calendar-open-trigger="manual"></web-daterangepicker>
```

**Changes:**
- `"auto"` → `"focus"` (opens on input focus, same behavior)
- `"button"` → `"manual"` (opens only via button/code, same behavior)
- **NEW:** `"typing"` mode opens calendar when user starts typing

### From v0.x Size Classes

The old `.drp-size-*` classes have been replaced with independent font and spacing classes:

```html
<!-- OLD (v0.x) -->
<div class="drp-size-lg">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- NEW (v1.0+) -->
<div class="drp-font-lg drp-spacing-lg">
  <web-daterangepicker></web-daterangepicker>
</div>

<!-- Or mix independently -->
<div class="drp-font-lg drp-spacing-xs">
  <web-daterangepicker></web-daterangepicker>
</div>
```

**Quick Migration Table:**

| Old Class | New Classes |
|-----------|-------------|
| `.drp-size-xs` | `.drp-font-xs .drp-spacing-xs` |
| `.drp-size-sm` | `.drp-font-sm .drp-spacing-sm` |
| `.drp-size-md` | `.drp-font-md .drp-spacing-md` or omit for defaults |
| `.drp-size-lg` | `.drp-font-lg .drp-spacing-lg` |
| `.drp-size-xl` | `.drp-font-xl .drp-spacing-xl` |

---

## Status Note

All documented features are **actively maintained and fully functional**. No deprecated or unused features found as of v1.0.0-rc01.
