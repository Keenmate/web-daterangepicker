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
| `visible-month-count` | `number` | — | Number of month columns shown side-by-side. |
| `month-layout` | `'horizontal' \| 'grid'` | — | Multi-month arrangement: a horizontal row or a `grid` (see grid-rows/grid-columns). |
| `grid-rows` | `number` | — | Rows in the month grid when month-layout is `grid`. |
| `grid-columns` | `number` | — | Columns in the month grid when month-layout is `grid`. |
| `enable-unified-navigation` | `boolean` | — | In grid layouts, drive the whole grid from one anchor month instead of per-column navigation. |
| `unified-navigation-anchor-index` | `number` | — | Which month index anchors unified navigation. |
| `picker-mode` | `'date' \| 'time' \| 'datetime'` | `'date'` | Whether the control picks a `date`, a `time`, or a `datetime`. |
| `show-seconds` | `boolean \| null` | — | Show a seconds field in time/datetime mode. |
| `hour-cycle` | `'h12' \| 'h24'` | — | 12- or 24-hour clock for time/datetime mode. |
| `show-summary` | `boolean \| null` | — | Show the range summary (day/night counts) block. |
| `date-format-mask` | `string` | `'YYYY-MM-DD'` | The SHOWN date text: how the selected date is written into the input, and how typed / `value` text is parsed (YYYY/YY, MM/M, DD/D with any separators). Not the submitted value — see `value-format` / `value-format-mask`. Not the placeholder hint — see `placeholder-format-mask`. |
| `placeholder-format-mask` | `string \| null` | — | The date part of the input PLACEHOLDER hint (when no explicit `placeholder`) — a localized form of the mask, e.g. `dd.mm.rrrr`; unset falls back to `date-format-mask`. Only the hint: the shown text follows `date-format-mask`, the submitted value `value-format`. `range` mode doubles it around " - " (`dd.mm.rrrr - dd.mm.rrrr`); `datetime` appends the time hint (`placeholder-time-format-mask`). |
| `unified-header-interactive` | `boolean` | — | Make the unified grid header clickable (opens the rolling selector). |
| `calendar-placement` | `string \| null` | — | Floating-UI placement for the popover (default `bottom-start`). |
| `week-start-day` | `'auto' \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | — | First column of the week: `auto` (locale) or a weekday index 0 (Sunday)–6 (Saturday). |
| `min-date` | `string \| null` | — | Earliest selectable date (ISO string). |
| `max-date` | `string \| null` | — | Latest selectable date (ISO string). |
| `initial-date` | `string \| null` | — | Month/date the calendar opens on when nothing is selected (ISO string). |
| `disabled-weekdays` | `number[]` | — | CSV of weekday indices (0=Sunday…6=Saturday) that cannot be selected. |
| `disabled-dates` | `Array<Date \| string>` | — | Specific dates that cannot be selected. Attribute: CSV of ISO strings; property: array of Date or string. |
| `disabled-dates-handling` | `'allow' \| 'prevent' \| 'block' \| 'split' \| 'individual'` | — | Strategy for ranges that span disabled dates: `allow`, `prevent`, `block`, `split`, or `individual`. |
| `highlight-disabled-in-range` | `boolean \| null` | — | Visually mark disabled dates that fall inside a selected range. |
| `locale` | `string` | `'auto'` | BCP-47 locale for the `Intl` month / weekday names, or `auto` (the browser language). UI strings are `labels`. |
| `labels` | `Partial<DateRangePickerLabels>` | — | UI strings — a partial object over the English defaults: `today`, `clear`, `apply`, `now`, `close`, `preview`, `day` / `days` / `night` / `nights` and `selectionCount` (`{count}` placeholder), `time`, `am`, `pm`, `hours`, `minutes`, `seconds`, `fullscreenTitle` (heading in the phone full-screen sheet; empty = none), `valueFormatError` (validation message when `getValueFormatCallback` throws). Property, or a JSON attribute: `labels='{"today":"Heute","days":"{count} Tage"}'`. Month / weekday names come from `Intl` via `locale`. |
| `month-names` | `string[]` | — | Override month names. Attribute: 12 pipe-delimited names, index 0=January; property: `string[]`. |
| `weekday-names` | `string[]` | — | Override weekday names. Attribute: 7 pipe-delimited names, index 0=Sunday; property: `string[]`. |
| `rolling-year-range` | `string \| null` | — | Years offered by the rolling year selector (and the navigable year span): one year `2024`, absolute `2022-2026`, relative `-5:+5` (signed sides count from TODAY's year, not the shown one) or mixed `2020:+2`. Unset: the shown year ±1 (or the min-date/max-date years). A malformed value warns and keeps the previous one. |
| `rolling-month-range` | `string \| null` | — | Constrains the rolling month selector. |
| `commit-mode` | `'selection' \| 'apply' \| 'manual'` | — | How a selection is COMMITTED (written + `change`): `selection` — every completed pick is written; `apply` — picks are staged until the Apply button; `manual` — picks are only staged until the app calls `commit()` (no built-in button). Closing is separate: `close-on-select`, `close-on-outside-click`, `close-on-scroll`; closing without `commit()` discards a staged pick. Default `selection` (`apply` for time/datetime and `multiple`). |
| `close-on-select` | `boolean \| null` | — | Close the calendar when a pick completes in `commit-mode="selection"` (default true). `false` keeps it open to adjust while every pick is still written — the booking.com flow. No effect in `apply` / `manual` (Apply / the app closes). |
| `close-on-outside-click` | `boolean \| null` | — | Close the floating calendar on a click outside it (the modal on a backdrop click). Default true — false when `commit-mode="manual"` unless set explicitly. A staged pick is discarded on close. Escape and `close()` always close. |
| `close-on-scroll` | `boolean \| null` | — | Close the floating calendar when the page scrolls. |
| `show-today-button` | `boolean \| null` | — | Show the “Today” action button. |
| `show-clear-button` | `boolean \| null` | — | Show the “Clear” action button. |
| `time-format-mask` | `string` | `'HH:mm'` | The SHOWN time text (time / datetime modes): how the selected time is written into the input, and how typed / `value` text is parsed (HH/H, hh/h, mm, ss, a). Also derives the hour cycle / seconds. Not the submitted value — see `value-format` / `value-format-mask`. Not the placeholder hint — see `placeholder-time-format-mask`. |
| `placeholder-time-format-mask` | `string \| null` | — | The time part of the input PLACEHOLDER hint (when no explicit `placeholder`) — e.g. `hh:mm`; unset falls back to `time-format-mask`. `time` mode shows it alone; `datetime` shows the date hint + " " + it. Only the hint: the shown text follows `time-format-mask`, the submitted value `value-format`. |
| `time-step` | `number` | — | Minute step for the time picker. |
| `show-now-button` | `boolean \| null` | — | Show the “Now” button in time/datetime mode. |
| `time-display` | `'rolls' \| 'clock' \| 'wheel' \| 'compact'` | `'rolls'` | Time-picker UI: `rolls`, `clock`, `wheel`, or `compact`. |
| `date-member` | `string \| null` | — | Property name on a decorated-date object holding its date. |
| `badge-text-member` | `string \| null` | — | Property name holding a day badge’s text. |
| `badge-class-member` | `string \| null` | — | Property name holding a day badge’s CSS class. |
| `day-class-member` | `string \| null` | — | Property name holding a day cell’s CSS class. |
| `badge-tooltip-member` | `string \| null` | — | Property name holding a badge tooltip string. |
| `day-tooltip-member` | `string \| null` | — | Property name holding a day tooltip string. |
| `is-disabled-member` | `string \| null` | — | Property name flagging a decorated date as disabled. |
| `name` | `string \| null` | — | HTML form field name. When set, the control submits its selection as a light-DOM hidden `<input>` (`name[]` inputs for `value-format="array"`). Also read by core for `el.form` / `form.reset()`. |
| `value-format` | `'text' \| 'json' \| 'array'` | `'text'` | The SUBMITTED form value (and `el.value`) — independent of the shown text (`date-format-mask` / `time-format-mask`) and the placeholder hint. Each date is written with `value-format-mask` (default ISO-8601); serialization: Range mode always submits a LIST of ranges (one plain range, split pieces, or several). - `text` (default) — one field; a single date/time as-is, each range as `start{value-separator}end` (ranges joined by `,`), multiple dates joined by `value-separator`. - `json` — one field; single `"date"`, range `[{"start":…,"end":…}, …]`, multiple an array of `"date"` / `{"start":…,"end":…}` items (a range is always an object). - `array` — multiple `name[]` fields: one per date, in range mode one per RANGE (`start{value-separator}end`). Empty selection: `''` (`text` / `json`), no fields (`array`). `getValueFormatCallback` overrides all of it. |
| `value-format-mask` | `string \| null` | — | How each date is written in the SUBMITTED value (and `el.value`) — tokens `YYYY` `YY` `MM` `M` `DD` `D` `HH` `H` `hh` `h` `mm` `ss` `a`, anything else literal (e.g. `DD.MM.YYYY`, `DD.MM.YYYY HH:mm`). Unset = ISO-8601: `YYYY-MM-DD`, time `HH:mm[:ss]`, datetime `YYYY-MM-DDTHH:mm[:ss]` (seconds when shown). Also used to parse the `value` attribute / property (ISO and the displayed form are accepted too). |
| `value-separator` | `string \| null` | — | Joins the dates in the `text` value format: between a range’s start and end (default `/`), between multiple dates (default `,`). E.g. `value-separator=" - "` → `03.11.2026 - 10.11.2026`. Also used to split the `value` attribute / property. |
| `value` | `string \| null` | — | The initial / default value — like a native input's `value` attribute (`defaultValue`): parsed into the selection on build and whenever the attribute changes, and restored by `form.reset()`. Accepts the submitted form (`value-format` / `value-format-mask` / `value-separator`), the displayed form (`date-format-mask` / `time-format-mask`) or ISO: `2026-06-10`, a range as two dates with any separator between them (`2026-06-10 - 2026-06-14`, `2026-06-10/2026-06-14`, `2026-06-10 to 2026-06-14`, en dash, …), multiple dates `,`-joined, `14:30`, `2026-06-10 14:30`. An unparseable value warns and leaves the selection empty. Not reflected — the `value` PROPERTY sets the current value without touching the attribute. |
| `placeholder` | `string \| null` | — | Input placeholder. When unset, a format hint is derived: date mode — placeholder-format-mask / date-format-mask (`YYYY-MM-DD`), doubled in `range` mode (`YYYY-MM-DD - YYYY-MM-DD`); `time` — placeholder-time-format-mask / time-format-mask (`HH:mm`); `datetime` — the date hint + " " + the time hint. |
| `disabled` | `boolean` | — | Disable the control (like a native input: no interaction, not submitted). Reflects (a form-associated host is disabled by its own `disabled` attribute). An ancestor `<fieldset disabled>` disables it too (core `isEffectivelyDisabled`) without changing `el.isDisabled`. |
| `readonly` | `boolean` | — | Full read-only lock (freezes every interaction aspect; the value is still submitted). Reflects. Read/write via `el.isReadonly`; use `lock()` / `lockedAspects` for partial locks. |
| `input-size` | `string` | `'md'` | Input size scale: `xs` \| `sm` \| `md` \| `lg` \| `xl` (floating/modal only). |
| `enable-transition` | `boolean` | — | Opt into calendar open/close CSS transitions. |
| `mobile-presentation` | `'auto' \| 'floating' \| 'modal' \| 'fullscreen'` | `'auto'` | How a `floating` picker adapts to the device (SPEC §12.9, via web-components-core). `auto` (default) keeps the floating popover on desktop, uses a centered `modal` on tablets, and a full-screen overlay on phones (touch-primary + shorter viewport side < 600px, orientation-robust). `floating`/`modal`/`fullscreen` force that presentation on any device (handy for previews/testing). Only adapts a floating picker — an explicit `positioning-mode` of `inline` or `modal` is left as authored. Resolved reactively from the device/viewport environment. |
| `fullscreen-autofocus` | `boolean` | — | In the phone full-screen overlay, focus the date input on open (pops the soft keyboard for type-to-fill). Default off: the sheet opens with the calendar visible and the keyboard closed. No effect in floating/modal presentations. |
| `show-fullscreen-input` | `boolean` | — | In the phone full-screen overlay, relocate the date input into the header so it is visible and typeable above the sheet (with a numeric keypad; the mask supplies the separators). Takes over the header row, so fullscreen-title is not shown alongside it. No effect in floating/modal presentations. |
| `compact-below` | `number` | — | Container-responsive compaction threshold in CSS px. When the element’s OWN box is narrower than this, the calendar collapses to a single month and hides the Today/Clear buttons — keyed on the element box (core’s shared ResizeObserver), not the viewport, so a picker in a narrow column/sidebar compacts even on a wide monitor. Unset or `0` disables it. Purely presentational tweaks (padding, label→icon) belong in CSS `@container`; this drives the structural month-count change. |
| `custom-styles` | `string \| null` | — | Raw CSS injected into the Shadow DOM — the declarative, no-JS alternative to `getCustomStylesCallback`. The value is a full stylesheet (selectors and all), dropped verbatim into the same replaceable style slot. `getCustomStylesCallback` wins when both are set. |
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
  placeholder-format-mask="dd/mm/aaaa">
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

When instantiating the engine (`DateRangePickerEngine`) directly (not using web component — advanced use), pass these options. The web component automatically converts attributes to options.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selectionMode` | `'single' \| 'range'` | `'single'` | Selection mode |
| `calendarPlacement` | `string` | `'bottom-start'` or `'bottom'` | Floating UI placement |
| `visibleMonthsCount` | `number` | `1` or `2` | Number of months to display |
| `dateFormatMask` | `string` | `'YYYY-MM-DD'` | Date format pattern |
| `calendarOpenTrigger` | `'focus' \| 'typing' \| 'manual'` | `'focus'` | How calendar is triggered: `'focus'` (on input focus), `'typing'` (when typing starts), `'manual'` (button/code only) |
| `onChange` | `(detail: ChangeEventDetail) => void` | `undefined` | Fires when a selection is committed, with the standardized detail (same payload as the element's `change` event) |
| `onAction` | `(detail: DateRangePickerActionEventDetail) => void` | `undefined` | Fires when an action button / `data-action` trigger is activated (the element's `action` event) |
| `onMonthChange` | `(detail: MonthChangeEventDetail) => void` | `undefined` | Fires after month navigation (the element's `month-change` event) |
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
| `getDateMetadataCallback` | `(ctx: DayContext) => DayMetadata \| null` | `undefined` | Custom function to provide date styling/labels |
| `disabledDatesHandling` | `'allow' \| 'prevent' \| 'block' \| 'split' \| 'individual'` | `'allow'` | Range behavior over disabled dates |
| `shouldHighlightDisabledInRange` | `boolean` | `true` | Highlight disabled dates in range |
| `locale` | `string \| 'auto'` | `'auto'` | Locale for UI strings and Intl date formatting. Built-in: `'en'`, `'de'`, `'fr'`, `'es'` |
| `customStrings` | `Partial<LocaleStrings>` | `undefined` | Override built-in UI strings (Today, Clear, Apply, etc.) |
| `monthNames` | `string[]` | locale-based | Override month names. 12 strings, indexed by month: `[0]`=January … `[11]`=December |
| `weekdayNames` | `string[]` | locale-based | Override weekday header labels. 7 strings, indexed by day-of-week: `[0]`=Sunday … `[6]`=Saturday (`weekStartDay` only rotates the display, not this mapping) |
| `renderSummaryCallback` | `(ctx: SummaryContext) => string` | `undefined` | Render the summary display (receives all selection data + picker context, returns HTML string) |
| `beforeSelectCallback` | `(ctx: BeforeSelectContext) => BeforeSelectResult \| Promise<…>` | `undefined` | Intercept a selection: nothing = accept, `false` = reject, `Date` / `DateRange` / `DateRange[]` = adjust, `null` = clear |
| `beforeMonthChangeCallback` | `(ctx: MonthChangeContext) => void \| false \| Promise<…>` | `undefined` | `false` blocks the navigation |
| `getMonthDataCallback` | `(ctx: MonthChangeContext) => MonthData \| null \| Promise<…>` | `undefined` | Bulk-load `metadata` / `monthHeaders` for the visible range |
| `actionButtons` | `(DateRangePickerActionItem \| 'today' \| 'now' \| 'clear' \| 'apply')[]` | built-ins | Footer action buttons (see [Action Buttons](#action-buttons)) |
| `beforeActionCallback` | `(detail: DateRangePickerActionEventDetail) => void \| false \| Promise<…>` | `undefined` | `false` cancels an action click |

### Example Usage

```javascript
const picker = new DateRangePickerEngine(inputElement, {
  selectionMode: 'range',
  dateFormatMask: 'DD/MM/YYYY',
  visibleMonthsCount: 2,
  weekStartDay: 1, // Monday
  disabledWeekdays: [0, 6], // Weekends
  specialDates: [
    { date: '2025-12-25', badgeText: '🎄', badgeTooltip: 'Christmas' }
  ],
  onChange: (detail) => {
    console.log('Selected:', detail.dateRange);
  }
});

// Spanish localization with custom strings
const pickerES = new DateRangePickerEngine(inputElement, {
  selectionMode: 'single',
  locale: 'es',
  dateFormatMask: 'YYYY-MM-DD',
  customStrings: {
    today: 'Hoy',
    clear: 'Borrar',
    preview: 'Previsualización'
  },
  onChange: (detail) => {
    console.log('Fecha seleccionada:', detail.date);
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
| `formResetCallback()` | `() => void` | Form reset: the selection goes back to the one parsed from the `value` attribute (the default, like a native input's `defaultValue`), else empty. `flush()` first so a reset right after a `setAttribute('value', …)` sees it. |
| `open()` | `() => void` | Open the calendar (floating/modal modes). |
| `close()` | `() => void` | Close the calendar (floating/modal modes). |
| `toggle()` | `() => void` | Toggle the calendar open/closed. |
| `clearSelection()` | `() => void` | Clear the current selection and reset the input. |
| `commit()` | `() => void` | Commit the staged selection — what the Apply button does, and the app's call in `commit-mode="manual"`. Writes the value, fires `change`, closes the popover. |
| `showMessage()` | `(content: string, opts?: ShowMessageOptions) => void` | Show a message in the calendar. `content` is HTML; `opts.type` (`info` \| `warning` \| `error` \| `success`) styles it (omit for raw-HTML content), `opts.autoHideMs` hides it after that many ms. |
| `hideMessage()` | `() => void` | Hide the current message. |
| `showSummary()` | `(content: string) => void` | Write custom HTML into the summary block (pins until the next selection change). |
| `hideSummary()` | `() => void` | Drop any summary override and re-derive from selection state. |
| `refreshSummary()` | `() => void` | Re-run summary derivation now (respects an active override). |
| `showLoader()` | `(target?: LoaderTarget) => void` | Show a loader overlay. `target`: `calendar` (default) \| `message` \| `summary`. |
| `hideLoader()` | `(target?: LoaderTarget) => void` | Hide the loader for the given target (default `calendar`). |
| `lock()` | `(aspects?: LockAspect \| LockAspect[]) => void` | Freeze user interaction. No argument locks every aspect (full read-only lock); pass an aspect or array to freeze only part (`'selection' \| 'navigation' \| 'actions' \| 'open'`). The programmatic API is unaffected. |
| `unlock()` | `(aspects?: LockAspect \| LockAspect[]) => void` | Release the given aspect(s), or the whole lock when called with no argument. |
| `toggleLock()` | `(aspects?: LockAspect \| LockAspect[]) => void` | Toggle the given aspect(s), or the whole lock when called with no argument. |
| `isAspectLocked()` | `(aspect: LockAspect) => boolean` | True when the given aspect is currently locked. |
| `setRollingItemAlignment()` | `(alignment: 'flex-start' \| 'center' \| 'flex-end') => void` | Align items within the rolling year/month selector (`flex-start` \| `center` \| `flex-end`). |
<!-- GEN:methods:end -->

**Example:**
```javascript
const picker = document.querySelector('web-daterangepicker');

picker.open();
picker.setInputValue('2025-12-25');
console.log(picker.getInputValue()); // "2025-12-25"
picker.clearSelection();
```

### Controller facade (`el.controller`)

`el.controller` is the picker's public, stable imperative surface — the same
object every callback context and event detail carries as `controller`. It
survives rebuilds, so it's safe to hold on to. (The internal engine is not
reachable from the element; `el.picker` was removed.)

| Member | Signature | Description |
|--------|-----------|-------------|
| `getSelectedDate()` | `() => Date \| null` | The selected date (single mode) |
| `getSelectedRange()` | `() => DateRange \| null` | The selected range (`{ start, end }`) |
| `getSelectedRanges()` | `() => DateRange[]` | All committed ranges (one for a simple range, N for split / multi-range) |
| `getSelectedDates()` | `() => Date[]` | Selected dates (multiple mode), or the enabled dates of a range under `individual` / `split` |
| `getSelectedDatetime()` | `() => Date \| null` | The composed Date in time / datetime modes |
| `isOpen` | `boolean` (read-only) | Whether the popover is open |
| `selectToday()` | `() => void` | Select today (and the current time in datetime mode) |
| `selectNow()` | `() => void` | Select the current time (time / datetime modes) |
| `clearSelection()` | `() => void` | Clear the selection |
| `apply()` | `() => void` | Commit a staged selection (the Apply button in `commit-mode="apply"`; the app in `commit-mode="manual"`) |
| `open()` / `close()` / `toggle()` | `() => void` | Drive the popover |
| `setPresentation(next)` | `('floating' \| 'modal' \| 'fullscreen') => void` | Swap the presentation in place (selection preserved) |
| `prevMonth(monthIndex?)` / `nextMonth(monthIndex?)` | `(monthIndex?: number) => void` | Step a month column (default: the active one) |
| `lock(aspects?)` / `unlock(aspects?)` | `(aspects?: LockAspect \| LockAspect[]) => void` | Scoped read-only lock |
| `showMessage(content, opts?)` | `(content: string, opts?: { type?: 'error' \| 'warning' \| 'info' \| 'success'; autoHideMs?: number }) => void` | Show an (HTML) message in the calendar |
| `hideMessage()` | `() => void` | Hide the message |
| `showSummary(content)` / `hideSummary()` | | Pin / drop a custom summary |
| `showLoader(target?)` / `hideLoader(target?)` | `(target?: LoaderTarget) => void` | Spinner on `calendar` (default) / `message` / `summary` |

> `controller.showMessage` takes an **options object**; the element's own
> `el.showMessage(content, type?, autoHide?)` keeps positional arguments.

```javascript
const el = document.querySelector('web-daterangepicker');
const { controller } = el;

if (!controller.getSelectedRange()) controller.selectToday();
controller.showMessage('Pick a check-out date', { type: 'info', autoHideMs: 3000 });
```

### Advanced: `DateRangePickerEngine`

The internal engine is exported as `DateRangePickerEngine` for advanced
standalone use (an input without the custom element — see
[`docs/usage.md`](./docs/usage.md#javascript-instantiation-daterangepickerengine-class)).
Its methods are internal and may change between releases; prefer the element
and `el.controller`. Engine options follow [DatePicker Options](#datepicker-options);
`onChange`, `onAction` and `onMonthChange` receive the same details as the
element's events.

---

## Events & Event Detail

### Custom Events

The web component dispatches the following events. All bubble; none are
`composed` (listen on the element or an ancestor in the same tree).

| Event Name | Detail | Description |
|------------|--------|-------------|
| `change` | `ChangeEventDetail` | The selection was committed (the value changed): every completed pick in `commit-mode="selection"`, on Apply / `commit()` in `apply` / `manual` |
| `action` | `DateRangePickerActionEventDetail` | An action button (built-ins too) or an HTML `data-action` trigger was activated — see [Action Buttons](#action-buttons) |
| `month-change` | `MonthChangeEventDetail` | The visible month(s) changed (any navigation) |
| `ready` | `ReadyEventDetail` | The picker was built for the first time (once per element; deferred elements fire on `release()` / `defer` removal) |
| `open` | `OpenEventDetail` | The calendar popover opened (floating / modal / full-screen; inline never opens) |
| `close` | `CloseEventDetail` | The calendar popover closed — any reason (pick, Apply, Escape, outside click, scroll, `close()`); a staged, uncommitted pick is already discarded |
| `value-format-error` | `ValueFormatErrorEventDetail` | `getValueFormatCallback` threw: `{ error, value }`; the field submits `''` and the host is invalid (`labels.valueFormatError`) until the next successful format |

Every detail also carries **`controller`** (the [facade](#controller-facade-elcontroller))
and **`element`** (the host) — both non-enumerable, so `JSON.stringify(detail)`
and LiveView `pushEvent` see only the data — plus the presentation flags
(`presentation`, `isModal`, `isFullscreen`).

> **Note**: there are no separate `apply` or `cancel` events. Clicking the Apply button commits the pending selection and dispatches `change` (and `action` with `action: 'apply'` for the click itself). Pressing Escape with an uncommitted selection silently restores the previous input value and fires nothing.

### Event Detail Properties

`change` (`ChangeEventDetail`) — properties depend on the mode and configuration:

| Property | Type | Always Present | Conditions | Description |
|----------|------|----------------|------------|-------------|
| `formattedValue` | `string` | ✓ | - | Formatted date string for display |
| `date` | `Date` | - | Mode: `single` | Selected date (single mode) |
| `dateRange` | `DateRange` | - | Mode: `range` (except `individual`) | Selected range with `start` and `end` dates |
| `enabledDates` | `Date[]` | - | Mode: `range`, `disabledDatesHandling: 'allow'` | All enabled dates within range |
| `disabledDates` | `Date[]` | - | Mode: `range`, `disabledDatesHandling: 'allow'` | All disabled dates within range |
| `dateRanges` | `DateRange[]` | - | Mode: `range`, `disabledDatesHandling: 'split'`, or a `DateRange[]` returned by `beforeSelectCallback` | Multiple ranges |
| `dates` | `Date[]` | - | Mode: `multiple`; or `range` with `'split'` / `'individual'` | Flat array of individual enabled dates |
| `getEnabledDateCount` | `() => number` | - | Mode: `range`, `disabledDatesHandling: 'allow'` | Helper function to count enabled dates |
| `getTotalDays` | `() => number` | - | Mode: `range`, `disabledDatesHandling: 'allow'` | Helper function to get total days in range |
| `controller`, `element` | | ✓ | non-enumerable | The facade and the host |

`month-change` (`MonthChangeEventDetail`): `monthIndex` (the column that changed), `year`, `month` (0–11), `visibleMonths` (`{ year, month }[]`, every column).

`ready` / `open` / `close` (`ReadyEventDetail` / `OpenEventDetail` / `CloseEventDetail`): just `controller` / `element` (+ presentation flags).

`value-format-error` (`ValueFormatErrorEventDetail`): `error` (what `getValueFormatCallback` threw), `value` (the ISO selection snapshot it was asked to format).

`action` (`DateRangePickerActionEventDetail`): see [Action Buttons](#action-buttons).

### Event Examples

```javascript
const picker = document.querySelector('web-daterangepicker');

// Single mode
picker.addEventListener('change', (e) => {
  console.log('Selected date:', e.detail.date);
  console.log('Formatted:', e.detail.formattedValue);
});

// Range mode - 'allow' mode
picker.addEventListener('change', (e) => {
  const { dateRange, enabledDates, disabledDates } = e.detail;
  console.log('Range:', dateRange.start, 'to', dateRange.end);
  console.log('Enabled days:', enabledDates.length);
  console.log('Disabled days:', disabledDates.length);
  console.log('Total days:', e.detail.getTotalDays());
});

// Range mode - 'split' mode
picker.addEventListener('change', (e) => {
  const { dateRanges, dates } = e.detail;
  console.log('Split into', dateRanges.length, 'ranges');
  console.log('Total enabled dates:', dates.length);
  dateRanges.forEach((range, i) => {
    console.log(`Range ${i + 1}:`, range.start, 'to', range.end);
  });
});

// Range mode - 'individual' mode
picker.addEventListener('change', (e) => {
  const { dates } = e.detail;
  console.log('Selected', dates.length, 'individual dates');
  dates.forEach(date => console.log(date.toLocaleDateString()));
});

// Month navigation
picker.addEventListener('month-change', (e) => {
  console.log('Now showing', e.detail.visibleMonths);
});
```

### Event Handler Properties

As an alternative to `addEventListener`, each event has an `on*` property twin.
The handler receives the event **detail** (not the `CustomEvent`) and is called
right before the event is dispatched; assign `null` to remove it.

| Property | Event | Handler receives |
|----------|-------|------------------|
| `onChange` | `change` | `ChangeEventDetail` |
| `onAction` | `action` | `DateRangePickerActionEventDetail` |
| `onMonthChange` | `month-change` | `MonthChangeEventDetail` |
| `onReady` | `ready` | `ReadyEventDetail` |
| `onOpen` | `open` | `OpenEventDetail` |
| `onClose` | `close` | `CloseEventDetail` |
| `onValueFormatError` | `value-format-error` | `ValueFormatErrorEventDetail` |

```javascript
const picker = document.querySelector('web-daterangepicker');

picker.onChange = (detail) => console.log('Selected:', detail.formattedValue);
picker.onAction = (detail) => console.log('Action:', detail.action, detail.id, detail.dataset);

picker.onChange = null; // detach
```

### Commit vs. close

Two separate axes. `commit-mode` decides when a pick is **committed** (written to the
input + `change`):

| `commit-mode` | A completed pick… | Commit path |
|---|---|---|
| `selection` (date default) | is written immediately | every pick |
| `apply` (time / datetime / `multiple` default) | is staged | the built-in Apply button |
| `manual` | is staged | the app calls `commit()` (e.g. a custom action button); no built-in button |

Closing is configured on its own:

| Attribute | Default | Closes when… |
|---|---|---|
| `close-on-select` | `true` | a pick completes (`commit-mode="selection"` only) |
| `close-on-outside-click` | `true` (`false` in `commit-mode="manual"` unless set) | a click lands outside the floating calendar / on the modal backdrop |
| `close-on-scroll` | `true` | the page scrolls (floating; never while a pick is staged) |

Escape and `close()` always close. Closing without `commit()` discards a staged pick.

The booking.com flow — every pick is written right away, but the calendar stays open so the
dates can be adjusted:

```html
<web-daterangepicker selection-mode="range" visible-months-count="2"
  commit-mode="selection" close-on-select="false"></web-daterangepicker>
```

### Action Buttons

The footer action bar is configured with the `actionButtons` property — an array
of core `ActionItem`s (`DateRangePickerActionItem`). When unset, the built-ins for
the mode apply (Today / Now / Clear / Apply, per the `is-*-button-shown` attributes
and `commit-mode`).

- **Built-in** button: `action: 'today' | 'now' | 'clear' | 'apply'`, or the bare
  string shorthand (`'today'`).
- **Custom** button: no `action`; identify it with `id`.

```javascript
const picker = document.querySelector('web-daterangepicker');

picker.actionButtons = [
  'today',
  {
    id: 'next-week',
    text: '+7 days',
    icon: '📅',
    tooltip: 'Select the next 7 days',
    onClick: (detail) => {
      const start = new Date();
      const end = new Date(); end.setDate(start.getDate() + 6);
      detail.element.selectedRanges = [{ start, end }];
    }
  },
  {
    id: 'reset',
    text: 'Reset',
    isDanger: true,
    getIsDisabledCallback: (ctx) => ctx.controller.getSelectedRanges().length === 0
  },
  { action: 'apply', text: 'Book' }
];

// Fires for EVERY button (built-ins included), after its onClick
picker.addEventListener('action', (e) => {
  console.log(e.detail.action, e.detail.id, e.detail.source); // 'custom' 'next-week' 'action-buttons'
});
```

**Item fields** (`DateRangePickerActionItem`):

| Field | Type | Description |
|-------|------|-------------|
| `action` | `'today' \| 'now' \| 'clear' \| 'apply'` | Built-in behaviour; omit for a custom button |
| `id` | `string` | Identifies a custom button (reported back as `detail.id`) |
| `text` | `string` | Label (plain text) |
| `icon` | `string` | Icon (glyph / markup) |
| `tooltip` | `string` | Tooltip text |
| `cssClass` | `string` | Extra CSS classes |
| `isVisible` / `isDisabled` / `isDanger` / `isToggled` | `boolean` | Static flags (`isToggled` renders `aria-pressed="true"`) |
| `getTextCallback` / `getIconCallback` / `getTooltipCallback` | `(ctx: PickerContext) => string` | Dynamic text / icon / tooltip |
| `getClassCallback` | `(ctx: PickerContext) => string \| string[]` | Dynamic classes |
| `getIsVisibleCallback` / `getIsDisabledCallback` / `getIsToggledCallback` | `(ctx: PickerContext) => boolean` | Dynamic flags |
| `onClick` | `(detail: DateRangePickerActionEventDetail) => void \| Promise<void>` | Click handler (any button, built-ins too); awaited — the button is busy meanwhile |

Render-time callbacks (`get*Callback`) receive the **picker context**
(`controller`, `element`, presentation flags) and are re-evaluated whenever the
action bar re-renders.

**Click order:** `beforeActionCallback(detail)` (element property; return `false`
to cancel everything, may be async) → item `onClick(detail)` → built-in behaviour
(`today` / `now` / `clear` / `apply`) → `action` event / `onAction` (a notification
after the fact — the listener sees the new selection).

```javascript
picker.beforeActionCallback = (detail) => {
  if (detail.action === 'clear' && !confirm('Clear the selection?')) return false;
};
```

**Action detail** (`DateRangePickerActionEventDetail` — the `action` event's
`detail`, and the argument of `onClick`, `onAction`, `beforeActionCallback`):

| Property | Type | Description |
|----------|------|-------------|
| `action` | `'today' \| 'now' \| 'clear' \| 'apply' \| 'custom'` | Built-in name, or `'custom'` |
| `id` | `string \| undefined` | The custom item's `id` (or the trigger's `data-id`) |
| `item` | `DateRangePickerActionItem` | The clicked item (synthetic for HTML triggers) |
| `source` | `'action-buttons' \| 'message' \| 'summary' \| 'calendar'` | Where the trigger lives |
| `sourceEvent` | `Event \| undefined` | The DOM event (click / keydown) |
| `triggerElement` | `HTMLElement \| undefined` | The activated element |
| `dataset` | `Record<string, string>` | The trigger's `data-*` attributes (camelCase), minus `data-action` / `data-id` |
| `controller`, `element` | | The facade and the host (non-enumerable) + presentation flags |

#### HTML action triggers (`data-action`)

Any element with `data-action` inside the calendar's message, summary or
custom-rendered content is an action trigger too — it runs the same pipeline
(`beforeActionCallback` → built-in → `action` event). Use
`data-action="custom" data-id="…"` for your own actions; other `data-*`
attributes arrive in `detail.dataset`. `data-action="today"` (etc.) runs that
built-in.

Common pattern — confirm a range before committing it:

```javascript
picker.beforeSelectCallback = async (ctx) => {
  const response = await fetch('/api/check', {
    method: 'POST',
    body: JSON.stringify({ start: ctx.range.start, end: ctx.range.end })
  });
  const data = await response.json();

  if (data.requiresConfirmation) {
    ctx.controller.showMessage(`
      <p>${data.message}</p>
      <button data-action="custom" data-id="confirm-range"
              data-start="${ctx.range.start.toISOString()}"
              data-end="${ctx.range.end.toISOString()}">
        Confirm
      </button>
    `, { type: 'warning' });
    return false; // don't commit yet — wait for the confirm click
  }
  // return nothing → accept
};

picker.addEventListener('action', (e) => {
  const { id, source, dataset, element } = e.detail;
  if (source === 'message' && id === 'confirm-range') {
    element.selectedRanges = [{ start: new Date(dataset.start), end: new Date(dataset.end) }];
    element.hideMessage();
  }
});
```

> Assigning `selectedRanges` programmatically does not re-run `beforeSelectCallback`.

A live demo lives in `examples-data-api.html` ("Confirm & close — validate before dismissing").

---

## Debugging & Logging

The date picker includes a professional, categorized logging system provided by [`@keenmate/web-components-core`](https://github.com/keenmate/web-components-core) that helps you debug issues during development. Log lines are grouped into colour-coded `DRP:*` categories (`DRP:GENERAL`, `DRP:RENDERING`, `DRP:INTERACTION`, `DRP:SELECTION`, `DRP:NAVIGATION`, `DRP:UI`, `DRP:VALIDATION`, `DRP:DRAG`).

### Enabling Debug Logging

The `DRP:*` loggers start at `warn`. Turn them up with core's logging switches (there is no attribute — `show-debug-info` was removed in 2.0):

```js
// every DRP:* category, shared by every picker on the page
window.components['web-daterangepicker'].logging.enableLogging();
window.components['web-daterangepicker'].logging.setLogLevel('warn'); // back to the default

// every KeenMate component on the page
window.components.logging.enableLogging();

// one element's own instance loggers (core BlissElement), independent of the page level
document.querySelector('#my-picker').enableLogging();
document.querySelector('#my-picker').disableLogging();
```

Building a picker never changes the level, so a page-wide setting is never overridden.

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
| `silent` | Opt-in (`disableLogging()`) | No logging |
| `error` | Critical errors (async validation failures, throwing callbacks, etc.) | Visible by default |
| `warn` | Warnings (invalid inputs, validation failures) — the default level | Visible by default |
| `info` | Not currently used | - |
| `debug` | Development debugging | Only when debug logging is turned on (`enableLogging()`) |
| `trace` | Not currently used | - |

### Console Output Example

With debug logging on, you'll see detailed logs in your browser console:

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

1. **Development**: Use `el.enableLogging()` on problematic picker instances only, or `setCategoryLevel()` for one category, to reduce console noise
2. **Production**: Never ship with debug logging turned on
3. **Debugging Selection Issues**: Look for `SELECTION` and `VALIDATION` logs
4. **Debugging Navigation**: Look for `NAVIGATION` logs with `Col` markers
5. **Debugging Input Masking**: Look for `INTERACTION` logs with `updateCalendarFromInput`
6. **Debugging Drag Issues**: Look for `DRAG` logs showing mode and range preview

### Example: Debugging Block Mode

```html
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="block">
</web-daterangepicker>
<script>window.components['web-daterangepicker'].logging.enableLogging();</script>
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

Can be added via `specialDates` array or `getDateMetadataCallback`:

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

Each reads its `--base-*` token first; the defaults below apply without the contract
(inputs = the contract's defaults, derived = the contract's formula on the `--drp-*` input).

| Property | Default | Description |
|----------|---------|-------------|
| `--drp-main-bg` | `light-dark(#ffffff, #1e293b)` | Main surface; source of the derived surfaces |
| `--drp-dropdown-bg` | `var(--drp-main-bg)` | Calendar background |
| `--drp-border-color` | main bg shifted in lightness | Divider color |
| `--drp-input-border-color` | text mixed 45% / 35% into the bg | Field outline |
| `--drp-primary-bg` | translucent overlay of the bg's hue | Hover background |
| `--drp-primary-bg-hover` | stronger overlay | Active / pressed background |
| `--drp-accent-color` | `#3b82f6` | Accent color (selected, focused) |
| `--drp-accent-color-hover` | accent 15% toward black / white | Accent color hover |
| `--drp-text-primary` | `light-dark(#334155, #f1f5f9)` | Primary text color |
| `--drp-text-secondary` | text mixed 55% into the bg | Secondary text color |
| `--drp-text-color-on-accent` | black or white by APCA on the accent | Text color on accent backgrounds |
| `--drp-button-accent-text-color` | `var(--drp-text-color-on-accent)` | Accent button text color |

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

The full option interface lives in `src/types.ts` (`DatePickerOptions`); the
web component maps its attributes/properties onto it. The callback and event
members:

```typescript
interface DatePickerOptions {
  // … layout / format / restriction / member-mapping options …

  // Per-day data & rendering
  getDateMetadataCallback?: (ctx: DayContext) => DayMetadata | null;
  getBadgeTooltipCallback?: (ctx: DayContext) => string | null;
  getDayTooltipCallback?: (ctx: DayContext) => string | null;
  renderDayCallback?: (ctx: DayContext) => HTMLElement | string | null;
  renderDayContentCallback?: (ctx: DayContext) => HTMLElement | string | null;
  renderSummaryCallback?: (ctx: SummaryContext) => string;
  getMonthHeaderCallback?: (ctx: MonthHeaderContext) => string;
  getUnifiedHeaderCallback?: (ctx: UnifiedHeaderContext) => string;
  getCustomStylesCallback?: (ctx: PickerContext) => string | null;

  // Interceptors
  beforeSelectCallback?: (ctx: BeforeSelectContext) => BeforeSelectResult | Promise<BeforeSelectResult>;
  beforeMonthChangeCallback?: (ctx: MonthChangeContext) => void | false | Promise<void | false>;
  getMonthDataCallback?: (ctx: MonthChangeContext) => MonthData | null | void | Promise<MonthData | null | void>;

  // Action buttons
  actionButtons?: (DateRangePickerActionItem | 'today' | 'now' | 'clear' | 'apply')[];
  beforeActionCallback?: (detail: DateRangePickerActionEventDetail) => void | false | Promise<void | false>;

  // Engine notifications (the element re-emits these as events)
  onChange?: (detail: ChangeEventDetail) => void;
  onAction?: (detail: DateRangePickerActionEventDetail) => void;
  onMonthChange?: (detail: MonthChangeEventDetail) => void;
}
```

### DateRange

```typescript
interface DateRange {
  start: Date;
  end: Date;
}
```

### PickerContext

The base of every callback context and event detail:

```typescript
interface PickerContext {
  controller: DateRangePickerController; // the public facade (also el.controller) — non-enumerable
  element: HTMLElement;                  // the host <web-daterangepicker> — non-enumerable
  presentation: 'floating' | 'modal' | 'fullscreen'; // inline pickers report 'floating'
  isModal: boolean;
  isFullscreen: boolean;
}
```

### ChangeEventDetail

Detail of `change`, and the argument of `onChange`.

```typescript
interface ChangeEventDetail extends PickerContext {
  date?: Date;                              // Single mode
  dateRange?: DateRange | null;             // Range mode
  formattedValue: string;                   // Always present

  // 'allow' handling
  enabledDates?: Date[];
  disabledDates?: Date[];
  getEnabledDateCount?: () => number;
  getTotalDays?: () => number;

  // 'split' handling, or N ranges from beforeSelectCallback
  dateRanges?: DateRange[];

  // multiple mode; 'split' / 'individual' handling
  dates?: Date[];
}
```

### MonthChangeEventDetail / ReadyEventDetail

```typescript
interface MonthChangeEventDetail extends PickerContext {
  monthIndex: number;                               // the column that changed
  year: number;
  month: number;                                    // 0-11
  visibleMonths: { year: number; month: number }[]; // every column
}

interface ReadyEventDetail extends PickerContext {}
```

### BeforeSelectContext / BeforeSelectResult

```typescript
interface BeforeSelectContext extends PickerContext {
  mode: 'single' | 'range' | 'multiple';
  date?: Date;              // single mode
  range?: DateRange;        // range mode (the contiguous envelope)
  subRanges?: DateRange[];  // range mode, 'split' handling: enabled-only segments
  enabledDates?: Date[];    // range mode, 'split' / 'individual' handling
  markRangeInvalid(): void; // with `return false`: keep the rejected range visible, error-styled
}

// nothing = accept · false = reject · Date / DateRange = adjust · DateRange[] = N ranges · null = clear
type BeforeSelectResult = void | false | null | Date | DateRange | DateRange[];
```

### MonthChangeContext / MonthData

```typescript
interface MonthChangeContext extends PickerContext {
  year: number;
  month: number;            // 0-11
  monthIndex: number;
  firstVisibleDate: Date;
  lastVisibleDate: Date;
}

interface MonthData {
  metadata?: Map<string, DayMetadata>;   // keyed 'YYYY-MM-DD'
  monthHeaders?: Map<string, string>;    // keyed 'YYYY-MM'
}
```

### DayContext

Argument of `getDateMetadataCallback`, `renderDayCallback`, `renderDayContentCallback`,
`getBadgeTooltipCallback`, `getDayTooltipCallback`.

```typescript
interface DayContext extends PickerContext {
  date: Date;
  dateString: string;          // local YYYY-MM-DD
  dayNumber: number;
  isDisabled: boolean;
  isSelected?: boolean;
  isStartDate?: boolean;
  isEndDate?: boolean;
  isInRange?: boolean;
  isToday: boolean;
  isWeekend: boolean;
  monthIndex?: number;
  cellElement?: HTMLElement;   // the default-rendered day cell (augmentation pattern)
}
```

### Action types

```typescript
type DateRangePickerAction = 'today' | 'now' | 'clear' | 'apply';
type DateRangePickerActionItem = ActionItem<PickerContext, DateRangePickerAction>;               // core /actions
type DateRangePickerActionEventDetail = ActionEventDetail<PickerContext, DateRangePickerAction>; // PickerContext + { action, id, item, source, sourceEvent, triggerElement, dataset }
```

See [Action Buttons](#action-buttons) for the fields.

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

### DayMetadata

```typescript
interface DayMetadata {
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

### SummaryContext

Argument of `renderSummaryCallback`.

```typescript
interface SummaryContext extends PickerContext {
  // Basic counts
  days: number;           // Total days selected
  nights: number;         // Total nights (days - 1)

  // Simple range (when disabledDatesHandling is 'allow' or 'block')
  startDate: Date | null;
  endDate: Date | null;

  // Multiple ranges (when disabledDatesHandling is 'split')
  dateRanges?: DateRange[];

  // Individual dates (multiple mode; 'individual' or 'split' handling)
  dates?: Date[];

  // For 'allow' mode - breakdown of enabled vs disabled
  enabledDates?: Date[];
  disabledDates?: Date[];

  // Context
  selectionMode: 'single' | 'range' | 'multiple';
  disabledDatesHandling?: 'allow' | 'prevent' | 'block' | 'split' | 'individual';
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

**Right-to-left:** in a `dir="rtl"` context the grid and header mirror, the nav chevrons point
outward (`:host(:dir(rtl))` swaps `--drp-nav-icon-rotate-prev` / `-next`), and `←` / `→`
(also with `Ctrl/Cmd`) follow the visual direction — `←` is the next day / month (WAI-ARIA).
The direction is read live (core `isRtl`); a runtime `dir` change on the element re-renders.

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
| `lockedAspects` | `LockAspect[]` | Read-only | The currently locked aspects (read-only snapshot). |
| `value` | `string \| string[]` | Read/Write | The current value — exactly what the form submits under `name`: a string for `value-format="text"` / `"json"` / `getValueFormatCallback`, a `string[]` (one per `name[]` field) for `"array"`. Shaped by `value-format`, `value-format-mask` and `value-separator` — not by the displayed text (`date-format-mask`). Assigning accepts the same form, plus ISO and the displayed text (lenient), and sets the selection without touching the `value` attribute (the `form.reset()` default). An unparseable value warns and clears the selection. |
| `selectedRanges` | `DateRange[]` | Read/Write | The selection as ranges. Range mode: always the committed selection — a plain click range reads `[{ start, end }]`, independent ranges (a `beforeSelectCallback` returning several, or an assigned array) and `split` pieces read all of them; `[]` when nothing is selected. Multiple mode: its independent ranges. Assigning replaces the selection and reads back the same. `selectedStartDate` / `selectedEndDate` stay the outer envelope. |
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
| `selectionMode` | `'single' \| 'range' \| 'multiple'` | Read/Write | Selection behavior: `single` day, `range`, or `multiple` days/ranges. |
| `positioningMode` | `'inline' \| 'floating' \| 'modal'` | Read/Write | How the calendar is presented: `inline` (always visible, no input), `floating` (popover anchored to an input), or `modal`. |
| `calendarOpenTrigger` | `'focus' \| 'typing' \| 'manual'` | Read/Write | What opens the floating calendar: `focus`, `typing`, or `manual` (only `open()`). |
| `overlayGroup` | `string \| null` | Read/Write | Scope the "one overlay open at a time" coordination to a named group. Overlays (datepickers, multiselects, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group. |
| `visibleMonthCount` | `number` | Read/Write | Number of month columns shown side-by-side. |
| `monthLayout` | `'horizontal' \| 'grid'` | Read/Write | Multi-month arrangement: a horizontal row or a `grid` (see grid-rows/grid-columns). |
| `gridRows` | `number` | Read/Write | Rows in the month grid when month-layout is `grid`. |
| `gridColumns` | `number` | Read/Write | Columns in the month grid when month-layout is `grid`. |
| `isUnifiedNavigationEnabled` | `boolean` | Read/Write | In grid layouts, drive the whole grid from one anchor month instead of per-column navigation. |
| `unifiedNavigationAnchorIndex` | `number` | Read/Write | Which month index anchors unified navigation. |
| `pickerMode` | `'date' \| 'time' \| 'datetime'` | Read/Write | Whether the control picks a `date`, a `time`, or a `datetime`. |
| `isSecondsShown` | `boolean \| null` | Read/Write | Show a seconds field in time/datetime mode. |
| `hourCycle` | `'h12' \| 'h24'` | Read/Write | 12- or 24-hour clock for time/datetime mode. |
| `isSummaryShown` | `boolean \| null` | Read/Write | Show the range summary (day/night counts) block. |
| `dateFormatMask` | `string` | Read/Write | The SHOWN date text: how the selected date is written into the input, and how typed / `value` text is parsed (YYYY/YY, MM/M, DD/D with any separators). Not the submitted value — see `value-format` / `value-format-mask`. Not the placeholder hint — see `placeholder-format-mask`. |
| `placeholderFormatMask` | `string \| null` | Read/Write | The date part of the input PLACEHOLDER hint (when no explicit `placeholder`) — a localized form of the mask, e.g. `dd.mm.rrrr`; unset falls back to `date-format-mask`. Only the hint: the shown text follows `date-format-mask`, the submitted value `value-format`. `range` mode doubles it around " - " (`dd.mm.rrrr - dd.mm.rrrr`); `datetime` appends the time hint (`placeholder-time-format-mask`). |
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
| `locale` | `string` | Read/Write | BCP-47 locale for the `Intl` month / weekday names, or `auto` (the browser language). UI strings are `labels`. |
| `labels` | `Partial<DateRangePickerLabels>` | Read/Write | UI strings — a partial object over the English defaults: `today`, `clear`, `apply`, `now`, `close`, `preview`, `day` / `days` / `night` / `nights` and `selectionCount` (`{count}` placeholder), `time`, `am`, `pm`, `hours`, `minutes`, `seconds`, `fullscreenTitle` (heading in the phone full-screen sheet; empty = none), `valueFormatError` (validation message when `getValueFormatCallback` throws). Property, or a JSON attribute: `labels='{"today":"Heute","days":"{count} Tage"}'`. Month / weekday names come from `Intl` via `locale`. |
| `monthNames` | `string[]` | Read/Write | Override month names. Attribute: 12 pipe-delimited names, index 0=January; property: `string[]`. |
| `weekdayNames` | `string[]` | Read/Write | Override weekday names. Attribute: 7 pipe-delimited names, index 0=Sunday; property: `string[]`. |
| `rollingYearRange` | `string \| null` | Read/Write | Years offered by the rolling year selector (and the navigable year span): one year `2024`, absolute `2022-2026`, relative `-5:+5` (signed sides count from TODAY's year, not the shown one) or mixed `2020:+2`. Unset: the shown year ±1 (or the min-date/max-date years). A malformed value warns and keeps the previous one. |
| `rollingMonthRange` | `string \| null` | Read/Write | Constrains the rolling month selector. |
| `commitMode` | `'selection' \| 'apply' \| 'manual'` | Read/Write | How a selection is COMMITTED (written + `change`): `selection` — every completed pick is written; `apply` — picks are staged until the Apply button; `manual` — picks are only staged until the app calls `commit()` (no built-in button). Closing is separate: `close-on-select`, `close-on-outside-click`, `close-on-scroll`; closing without `commit()` discards a staged pick. Default `selection` (`apply` for time/datetime and `multiple`). |
| `shouldCloseOnSelect` | `boolean \| null` | Read/Write | Close the calendar when a pick completes in `commit-mode="selection"` (default true). `false` keeps it open to adjust while every pick is still written — the booking.com flow. No effect in `apply` / `manual` (Apply / the app closes). |
| `shouldCloseOnOutsideClick` | `boolean \| null` | Read/Write | Close the floating calendar on a click outside it (the modal on a backdrop click). Default true — false when `commit-mode="manual"` unless set explicitly. A staged pick is discarded on close. Escape and `close()` always close. |
| `shouldCloseOnScroll` | `boolean \| null` | Read/Write | Close the floating calendar when the page scrolls. |
| `isTodayButtonShown` | `boolean \| null` | Read/Write | Show the “Today” action button. |
| `isClearButtonShown` | `boolean \| null` | Read/Write | Show the “Clear” action button. |
| `timeFormatMask` | `string` | Read/Write | The SHOWN time text (time / datetime modes): how the selected time is written into the input, and how typed / `value` text is parsed (HH/H, hh/h, mm, ss, a). Also derives the hour cycle / seconds. Not the submitted value — see `value-format` / `value-format-mask`. Not the placeholder hint — see `placeholder-time-format-mask`. |
| `placeholderTimeFormatMask` | `string \| null` | Read/Write | The time part of the input PLACEHOLDER hint (when no explicit `placeholder`) — e.g. `hh:mm`; unset falls back to `time-format-mask`. `time` mode shows it alone; `datetime` shows the date hint + " " + it. Only the hint: the shown text follows `time-format-mask`, the submitted value `value-format`. |
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
| `name` | `string \| null` | Read/Write | HTML form field name. When set, the control submits its selection as a light-DOM hidden `<input>` (`name[]` inputs for `value-format="array"`). Also read by core for `el.form` / `form.reset()`. |
| `valueFormat` | `'text' \| 'json' \| 'array'` | Read/Write | The SUBMITTED form value (and `el.value`) — independent of the shown text (`date-format-mask` / `time-format-mask`) and the placeholder hint. Each date is written with `value-format-mask` (default ISO-8601); serialization: Range mode always submits a LIST of ranges (one plain range, split pieces, or several). - `text` (default) — one field; a single date/time as-is, each range as `start{value-separator}end` (ranges joined by `,`), multiple dates joined by `value-separator`. - `json` — one field; single `"date"`, range `[{"start":…,"end":…}, …]`, multiple an array of `"date"` / `{"start":…,"end":…}` items (a range is always an object). - `array` — multiple `name[]` fields: one per date, in range mode one per RANGE (`start{value-separator}end`). Empty selection: `''` (`text` / `json`), no fields (`array`). `getValueFormatCallback` overrides all of it. |
| `valueFormatMask` | `string \| null` | Read/Write | How each date is written in the SUBMITTED value (and `el.value`) — tokens `YYYY` `YY` `MM` `M` `DD` `D` `HH` `H` `hh` `h` `mm` `ss` `a`, anything else literal (e.g. `DD.MM.YYYY`, `DD.MM.YYYY HH:mm`). Unset = ISO-8601: `YYYY-MM-DD`, time `HH:mm[:ss]`, datetime `YYYY-MM-DDTHH:mm[:ss]` (seconds when shown). Also used to parse the `value` attribute / property (ISO and the displayed form are accepted too). |
| `valueSeparator` | `string \| null` | Read/Write | Joins the dates in the `text` value format: between a range’s start and end (default `/`), between multiple dates (default `,`). E.g. `value-separator=" - "` → `03.11.2026 - 10.11.2026`. Also used to split the `value` attribute / property. |
| `getValueFormatCallback` | `(ctx: FormValueSelection & PickerContext) => string` | Read/Write | Custom serialization of the submitted value; receives the normalized ISO selection snapshot (`selectionMode`, `pickerMode`, `items`) plus the picker context and returns the single hidden-input value (also what `el.value` returns). Overrides `value-format` / `value-format-mask` / `value-separator`. If it throws: logged, the field submits an empty string, the host is invalid (`labels.valueFormatError`) and `value-format-error` fires, until the next successful format. Property-only. |
| `defaultValue` | `string \| null` | Read/Write | The initial / default value — like a native input's `value` attribute (`defaultValue`): parsed into the selection on build and whenever the attribute changes, and restored by `form.reset()`. Accepts the submitted form (`value-format` / `value-format-mask` / `value-separator`), the displayed form (`date-format-mask` / `time-format-mask`) or ISO: `2026-06-10`, a range as two dates with any separator between them (`2026-06-10 - 2026-06-14`, `2026-06-10/2026-06-14`, `2026-06-10 to 2026-06-14`, en dash, …), multiple dates `,`-joined, `14:30`, `2026-06-10 14:30`. An unparseable value warns and leaves the selection empty. Not reflected — the `value` PROPERTY sets the current value without touching the attribute. |
| `placeholder` | `string \| null` | Read/Write | Input placeholder. When unset, a format hint is derived: date mode — placeholder-format-mask / date-format-mask (`YYYY-MM-DD`), doubled in `range` mode (`YYYY-MM-DD - YYYY-MM-DD`); `time` — placeholder-time-format-mask / time-format-mask (`HH:mm`); `datetime` — the date hint + " " + the time hint. |
| `isDisabled` | `boolean` | Read/Write | Disable the control (like a native input: no interaction, not submitted). Reflects (a form-associated host is disabled by its own `disabled` attribute). An ancestor `<fieldset disabled>` disables it too (core `isEffectivelyDisabled`) without changing `el.isDisabled`. |
| `isReadonly` | `boolean` | Read/Write | Full read-only lock (freezes every interaction aspect; the value is still submitted). Reflects. Read/write via `el.isReadonly`; use `lock()` / `lockedAspects` for partial locks. |
| `inputSize` | `string` | Read/Write | Input size scale: `xs` \| `sm` \| `md` \| `lg` \| `xl` (floating/modal only). |
| `isTransitionEnabled` | `boolean` | Read/Write | Opt into calendar open/close CSS transitions. |
| `mobilePresentation` | `'auto' \| 'floating' \| 'modal' \| 'fullscreen'` | Read/Write | How a `floating` picker adapts to the device (SPEC §12.9, via web-components-core). `auto` (default) keeps the floating popover on desktop, uses a centered `modal` on tablets, and a full-screen overlay on phones (touch-primary + shorter viewport side < 600px, orientation-robust). `floating`/`modal`/`fullscreen` force that presentation on any device (handy for previews/testing). Only adapts a floating picker — an explicit `positioning-mode` of `inline` or `modal` is left as authored. Resolved reactively from the device/viewport environment. |
| `shouldFullscreenAutofocus` | `boolean` | Read/Write | In the phone full-screen overlay, focus the date input on open (pops the soft keyboard for type-to-fill). Default off: the sheet opens with the calendar visible and the keyboard closed. No effect in floating/modal presentations. |
| `isFullscreenInputShown` | `boolean` | Read/Write | In the phone full-screen overlay, relocate the date input into the header so it is visible and typeable above the sheet (with a numeric keypad; the mask supplies the separators). Takes over the header row, so fullscreen-title is not shown alongside it. No effect in floating/modal presentations. |
| `compactBelow` | `number` | Read/Write | Container-responsive compaction threshold in CSS px. When the element’s OWN box is narrower than this, the calendar collapses to a single month and hides the Today/Clear buttons — keyed on the element box (core’s shared ResizeObserver), not the viewport, so a picker in a narrow column/sidebar compacts even on a wide monitor. Unset or `0` disables it. Purely presentational tweaks (padding, label→icon) belong in CSS `@container`; this drives the structural month-count change. |
| `specialDates` | `DecoratedDate[]` | Read/Write | Array of decorated-date objects (badges, tooltips, per-day classes). Property-only. |
| `actionButtons` | `(DateRangePickerActionItem \| 'today' \| 'now' \| 'clear' \| 'apply')[]` | Read/Write | Footer action buttons (core `ActionItem`s). Built-ins: `action: 'today' \| 'now' \| 'clear' \| 'apply'` (or the bare string); a custom button sets `id` (and no `action`). Clicks fire the `action` event. Property-only; when unset the built-ins for the mode apply. |
| `getDateMetadataCallback` | `(ctx: DayContext) => DayMetadata \| null` | Read/Write | Compute per-day metadata (badges, classes, disabled) dynamically. |
| `getBadgeTooltipCallback` | `(ctx: DayContext) => string \| null` | Read/Write | Tooltip HTML for a day badge; `null` keeps the default. |
| `getDayTooltipCallback` | `(ctx: DayContext) => string \| null` | Read/Write | Tooltip HTML for a day cell; `null` keeps the default. |
| `renderDayCallback` | `(ctx: DayContext) => HTMLElement \| string \| null` | Read/Write | Fully custom-render a day cell. |
| `renderDayContentCallback` | `(ctx: DayContext) => HTMLElement \| string \| null` | Read/Write | Custom-render the content inside a day cell. |
| `renderSummaryCallback` | `(ctx: SummaryContext) => string` | Read/Write | Render the range summary (HTML). |
| `getUnifiedHeaderCallback` | `(ctx: UnifiedHeaderContext) => string` | Read/Write | Render the unified grid header label. |
| `getMonthHeaderCallback` | `(ctx: MonthHeaderContext) => string` | Read/Write | Render a per-column month header label. |
| `getCustomStylesCallback` | `(ctx: PickerContext) => string \| null` | Read/Write | Return a CSS string injected into the component via a replaceable style slot (§12.8). Takes precedence over the `custom-styles` attribute when both are set. |
| `customStyles` | `string \| null` | Read/Write | Raw CSS injected into the Shadow DOM — the declarative, no-JS alternative to `getCustomStylesCallback`. The value is a full stylesheet (selectors and all), dropped verbatim into the same replaceable style slot. `getCustomStylesCallback` wins when both are set. |
| `beforeSelectCallback` | `(ctx: BeforeSelectContext) => void \| false \| null \| Date \| DateRange \| DateRange[] \| Promise<…>` | Read/Write | Runs before a selection is committed. Return nothing to accept, `false` to reject (explain via `ctx.controller.showMessage`; `ctx.markRangeInvalid()` keeps a rejected range visible), a `Date` / `DateRange` / `DateRange[]` to adjust, or `null` to clear. May be async. |
| `beforeMonthChangeCallback` | `(ctx: MonthChangeContext) => void \| false \| Promise<void \| false>` | Read/Write | Runs before month navigation; return `false` to block it. May be async. |
| `getMonthDataCallback` | `(ctx: MonthChangeContext) => MonthData \| null \| Promise<MonthData \| null>` | Read/Write | Load data for the visible range (`metadata` per `YYYY-MM-DD`, `monthHeaders` per `YYYY-MM`) on the initial open and after each month navigation. May be async (a loader shows meanwhile). |
| `beforeActionCallback` | `(detail: DateRangePickerActionEventDetail) => void \| false \| Promise<void \| false>` | Read/Write | Runs before any action button / `data-action` trigger; return `false` to cancel it entirely (no `onClick`, no `action` event, no built-in). May be async. |
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

### Custom Date Styling with `getDateMetadataCallback`

```javascript
const picker = document.querySelector('web-daterangepicker');

// Mark weekends with a custom class
picker.getDateMetadataCallback = (ctx) => {
  if (ctx.isWeekend) {
    return {
      dayClass: 'weekend-day',
      badgeText: '⭐',
      dayTooltip: 'Weekend!'
    };
  }
  return null;
};

// Shadow DOM: inject the matching CSS
picker.getCustomStylesCallback = () => `
  .drp__day.weekend-day { background-color: #fef3c7; }
`;
```

### Dynamic Date Restrictions

```javascript
// Disable dates based on API data
const bookedDates = await fetchBookedDates();

```

### Handling Range with Split Mode

```javascript
picker.setAttribute('disabled-dates-handling', 'split');
picker.addEventListener('change', (e) => {
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

#### Masks: shown text, placeholder hint, submitted value

Four separate concerns, four attributes:

| Attribute | What it controls | Example |
|---|---|---|
| `date-format-mask` / `time-format-mask` | The **shown text** — what the picker writes into the input, and how typed / `value` text is parsed (English tokens: `YYYY MM DD`, `HH mm ss a`) | `DD.MM.YYYY`, `HH:mm` |
| `placeholder-format-mask` / `placeholder-time-format-mask` | Only the **placeholder hint** shown while the input is empty (localized tokens); each falls back to its shown-text mask | `tt.mm.jjjj`, `hh:mm` |
| `value-format` | The **submitted** form value — always ISO-8601, independent of the masks | `2026-06-10`, `2026-06-10/2026-06-14` |

The derived hint (no explicit `placeholder`): date mode — the date hint (doubled around ` - ` in `range` mode); `time` — the time hint; `datetime` — date hint + `' '` + time hint.

```html
<!-- Spanish: hint "dd/mm/aaaa", shows / parses "YYYY-MM-DD" -->
<web-daterangepicker
  date-format-mask="YYYY-MM-DD"
  placeholder-format-mask="dd/mm/aaaa"
  locale="es">
</web-daterangepicker>

<!-- German datetime: hint "tt.mm.jjjj ss:mm", shows "10.06.2026 14:30" -->
<web-daterangepicker
  picker-mode="datetime"
  date-format-mask="DD.MM.YYYY"
  placeholder-format-mask="tt.mm.jjjj"
  placeholder-time-format-mask="ss:mm"
  locale="de">
</web-daterangepicker>
```

Both masks of a pair must describe the same structure, just with different language tokens.

#### Custom String Overrides

```javascript
const picker = document.querySelector('web-daterangepicker');

// Override specific strings while keeping rest of locale
picker.customStrings = {
  today: 'Ahora',          // Custom "Today"
  clear: 'Borrar todo',    // Custom "Clear"
  apply: 'Confirmar'       // Custom "Apply"
  // Other strings inherited from locale
};

// Or on the engine (advanced standalone use):
const engine = new DateRangePickerEngine(input, {
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
  placeholder-format-mask="dd/mm/aaaa"
  visible-months-count="2">
</web-daterangepicker>

<script>
  const picker = document.getElementById('spanish-picker');

  picker.addEventListener('change', (e) => {
    const { dateRange, formattedValue } = e.detail;
    console.log('Rango seleccionado:', formattedValue);
    console.log('Desde:', dateRange.start);
    console.log('Hasta:', dateRange.end);
  });
</script>
```

#### Complete German Example with Custom Strings

```javascript
const picker = new DateRangePickerEngine(inputElement, {
  selectionMode: 'single',
  locale: 'de',
  dateFormatMask: 'DD.MM.YYYY',
  customStrings: {
    today: 'Jetzt',
    clear: 'Zurücksetzen',
    preview: 'Vorschau'
  },
  weekStartDay: 1, // Monday (automatically detected for 'de', but can override)
  onChange: (detail) => {
    console.log('Ausgewähltes Datum:', detail.date);
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
| Placeholder format hint | `placeholder-format-mask` / `placeholder-time-format-mask` attributes | ✅ Yes |
| Week start day | Intl API (`Intl.Locale.weekInfo`) | ✅ Yes (via `week-start-day`) |

### Custom Summary Formatting

The `renderSummaryCallback` property allows you to completely customize the summary display below the calendar. The callback receives a `SummaryContext` — comprehensive data about the selection plus the picker context (`controller`, `element`, presentation flags) — and returns an HTML string (inserted unescaped: sanitize user data).

#### Basic Example: Show Only Nights

```javascript
// <web-daterangepicker selection-mode="range">
const picker = document.querySelector('web-daterangepicker');
picker.renderSummaryCallback = (ctx) => {
  return `<strong>${ctx.nights}</strong> ${ctx.nights === 1 ? ctx.localeStrings.night : ctx.localeStrings.nights}`;
};
```

#### Example: Add Custom Pricing

```javascript
// <web-daterangepicker selection-mode="range">
const picker = document.querySelector('web-daterangepicker');
picker.renderSummaryCallback = (ctx) => {
  const pricePerNight = 150;
  const total = ctx.nights * pricePerNight;

  return `
    <div style="display: flex; justify-content: space-between; width: 100%;">
      <span>${ctx.nights} ${ctx.nights === 1 ? ctx.localeStrings.night : ctx.localeStrings.nights}</span>
      <span style="font-weight: bold;">$${total}</span>
    </div>
  `;
};
```

#### Example: Handle Multiple Ranges (Split Mode)

```javascript
// <web-daterangepicker selection-mode="range" disabled-dates-handling="split" disabled-weekdays="0,6">
const picker = document.querySelector('web-daterangepicker');
picker.renderSummaryCallback = (ctx) => {
  if (ctx.dateRanges && ctx.dateRanges.length > 1) {
    // Multiple ranges
    return `
      <div>
        <div>${ctx.dateRanges.length} separate periods</div>
        <div>${ctx.days} ${ctx.localeStrings.days} total</div>
      </div>
    `;
  } else {
    // Single range
    return `${ctx.days} ${ctx.localeStrings.days}, ${ctx.nights} ${ctx.localeStrings.nights}`;
  }
};
```

#### Example: Show Enabled vs Disabled Count (Allow Mode)

```javascript
// <web-daterangepicker selection-mode="range" disabled-dates-handling="allow" disabled-weekdays="0,6">
const picker = document.querySelector('web-daterangepicker');
picker.renderSummaryCallback = (ctx) => {
  if (ctx.enabledDates && ctx.disabledDates) {
    return `
      <div style="font-size: 0.9em;">
        <div><strong>${ctx.enabledDates.length}</strong> weekdays</div>
        <div style="opacity: 0.7;">${ctx.disabledDates.length} weekends (excluded)</div>
      </div>
    `;
  }
  return `${ctx.days} ${ctx.localeStrings.days}`;
};
```

#### Example: Preview Indicator

```javascript
// <web-daterangepicker selection-mode="range">
const picker = document.querySelector('web-daterangepicker');
picker.renderSummaryCallback = (ctx) => {
  const prefix = ctx.isPreview ?
    `<span style="opacity: 0.7;">${ctx.localeStrings.preview}: </span>` : '';

  return `
    ${prefix}
    <span>${ctx.days} ${ctx.days === 1 ? ctx.localeStrings.day : ctx.localeStrings.days}</span>
    <span>, </span>
    <span>${ctx.nights} ${ctx.nights === 1 ? ctx.localeStrings.night : ctx.localeStrings.nights}</span>
  `;
};
```

#### SummaryContext Properties

The callback receives a context with the following properties (plus `controller` / `element` / presentation flags):

| Property | Type | When Available | Description |
|----------|------|----------------|-------------|
| `days` | `number` | Always | Total days selected |
| `nights` | `number` | Always | Total nights (days - 1) |
| `startDate` | `Date \| null` | Always | Start date of selection |
| `endDate` | `Date \| null` | Always | End date of selection |
| `selectionMode` | `'single' \| 'range' \| 'multiple'` | Always | Current selection mode |
| `disabledDatesHandling` | `string` | Always | Current disabled handling mode |
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

### To v2.0: Interaction Model (web-components-core rc15)

Callbacks, events and action buttons follow the shared KeenMate interaction
model. No aliases — rename on upgrade. The full table is in
[CHANGELOG.md](./CHANGELOG.md); the essentials:

| Old | New |
|-----|-----|
| `date-select` event / `onDateSelect = (e) => e.detail…` | `change` event / `onChange = (detail) => …` (every `on*` twin gets the detail) |
| `custom-action` event, `detail.data` | `action` event (every button + `data-action` trigger), `detail.id` / `detail.dataset` |
| `ctx.picker`, `el.picker` | `ctx.controller` / `ctx.element`, `el.controller` |
| `{ action: 'custom', text, onClick }` | `{ id: 'my-id', text, onClick(detail) }` |
| `isVisibleCallback` / `isDisabledCallback` | `getIsVisibleCallback` / `getIsDisabledCallback` |
| `beforeDateSelectCallback` → `{ action: 'accept' \| 'adjust' \| 'restore' \| 'clear', … }` | `beforeSelectCallback(ctx)` → nothing / `false` / `Date` / `DateRange` / `DateRange[]` / `null`; messages via `ctx.controller.showMessage(text, { type })`; `ctx.markRangeInvalid()` |
| `beforeMonthChangedCallback` → `{ action, metadata, monthHeaders }` | `beforeMonthChangeCallback(ctx)` → `false` blocks; data via `getMonthDataCallback(ctx)` → `{ metadata?, monthHeaders? }` |
| `badgeTooltipCallback` / `dayTooltipCallback` | `getBadgeTooltipCallback` / `getDayTooltipCallback` |
| `formatSummaryCallback` | `renderSummaryCallback` |
| `customStylesCallback()` | `getCustomStylesCallback(ctx)` |
| `DayContext.element` | `DayContext.cellElement` |
| `<button data-action="custom" data-x="1">` → `detail.data` | `<button data-action="custom" data-id="foo" data-x="1">` → `detail.id`, `detail.dataset` |

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
