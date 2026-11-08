# Usage / API reference — `@keenmate/web-daterangepicker`

The full public surface of the component: every attribute, property,
method, event, and the advanced callbacks. For just getting it on the
page see the README quick start; for theming see
[`theming.md`](./theming.md); for keyboard / a11y see
[`accessibility.md`](./accessibility.md).

## Contents

- [JavaScript instantiation (`DateRangePickerEngine` class)](#javascript-instantiation-daterangepickerengine-class)
- [Attributes](#attributes)
- [Properties](#properties)
- [Methods](#methods)
- [Events](#events)
- [Form integration](#form-integration)
- [Working with dates across timezones](#working-with-dates-across-timezones) — **read this** before shipping
- [Advanced features](#advanced-features)
  - [Week start day](#week-start-day)
  - [Disabled dates & date restrictions](#disabled-dates--date-restrictions)
  - [Special dates (holidays, events)](#special-dates-holidays-events)
  - [Advanced styling & info](#advanced-styling--info)
  - [CSS styling for special dates](#css-styling-for-special-dates)
  - [Date selection validation (`beforeSelectCallback`)](#date-selection-validation-beforeselectcallback)
  - [Month navigation & bulk metadata loading (`beforeMonthChangeCallback` / `getMonthDataCallback`)](#month-navigation--bulk-metadata-loading-beforemonthchangecallback--getmonthdatacallback)
  - [Messages & actions](#messages--actions)
  - [Labels (i18n)](#labels-i18n)
  - [Locking (read-only)](#locking-read-only)
  - [Responsive rules](#responsive-rules)
- [Range selection modes](#range-selection-modes)

## JavaScript instantiation (`DateRangePickerEngine` class)

The internal engine is exported as `DateRangePickerEngine` for advanced
standalone use (no custom element, no Shadow DOM). Prefer the
`<web-daterangepicker>` element — callbacks and events there carry the
public `controller` facade, and the engine's own methods are not a
stable API:

```ts
import { DateRangePickerEngine } from '@keenmate/web-daterangepicker';
// IMPORTANT: import CSS separately — the web component auto-injects,
// the class doesn't.
import '@keenmate/web-daterangepicker/dist/style.css';

const inputElement = document.getElementById('my-input');

const picker = new DateRangePickerEngine(inputElement, {
  selectionMode: 'range',
  visibleMonthCount: 2,
  dateFormatMask: 'YYYY-MM-DD',
  onChange: (detail) => {
    // Range mode: detail.dateRange is { start: Date, end: Date }
    console.log('Range:', detail.dateRange.start, 'to', detail.dateRange.end);
  }
});
```

### ⚠️ CSS requirements

Unlike the web component, the `DateRangePickerEngine` class does **not**
automatically inject styles. You must load the CSS separately or you'll
see an unstyled calendar. Pick one:

**Option 1 — import CSS in JavaScript (recommended):**
```ts
import { DateRangePickerEngine } from '@keenmate/web-daterangepicker';
import '@keenmate/web-daterangepicker/dist/style.css';
```

**Option 2 — link CSS in HTML:**
```html
<link rel="stylesheet" href="./node_modules/@keenmate/web-daterangepicker/dist/style.css">
```

**Option 3 — programmatic injection:**
```ts
import { DateRangePickerEngine } from '@keenmate/web-daterangepicker';

DateRangePickerEngine.injectGlobalStyles();  // once, before creating pickers

const picker = new DateRangePickerEngine(inputElement, options);
```

**Why?** The web component uses Shadow DOM and injects styles into its
isolated scope automatically. The `DateRangePickerEngine` class creates
calendar elements in the regular DOM, so it expects global CSS to be
loaded separately.

See [`examples-data-api.html`](../examples-data-api.html) for complete code samples and configuration options.

## Attributes

HTML attributes use kebab-case (`selection-mode`); JavaScript options
use camelCase (`selectionMode`).

| Attribute | Type | Default | Description |
|---|---|---|---|
| `selection-mode` | `'single' \| 'range'` | `'single'` | Single date or date-range selection |
| `date-format-mask` | `string` | `'YYYY-MM-DD'` | Date format (`YYYY-MM-DD`, `DD.MM.YYYY`, `MM/DD/YYYY`, …) |
| `visible-month-count` | `number` | `1` (single), `2` (range) | Number of months to display |
| `calendar-open-trigger` | `'focus' \| 'typing' \| 'manual'` | `'focus'` | How the calendar opens (focus = on input focus, typing = when user types, manual = programmatic only) |
| `value` | `string` | — | Initial / default value (like a native input's `defaultValue`): parsed into the selection on build and restored by `form.reset()`. The `value` **property** sets the current value without writing the attribute. |
| `placeholder` | `string` | — | Input placeholder |
| `disabled` | `boolean` | `false` | Disable the picker (property `isDisabled`); an ancestor `<fieldset disabled>` disables it too |
| `readonly` | `boolean` | `false` | Full read-only lock (property `isReadonly`); the value is still submitted |
| `defer` | `boolean` | `false` | Hold the first build until `el.release()` / removing the attribute (core; property `shouldDefer`) |
| `labels` | JSON | English | UI strings, partial — see [Labels](#labels-i18n) |
| `week-start-day` | `'auto' \| 0–6` | `'auto'` | First day of week (0 = Sunday, 1 = Monday, …; `'auto'` detects from locale) |
| `min-date` | `string` | — | Minimum selectable date (`YYYY-MM-DD`) |
| `rolling-year-range` | `string` | shown year ±1 | Years offered by the rolling year selector: `2024`, `2022-2026`, relative `-5:+5` (signed sides count from today's year) or mixed `2020:+2`. A malformed value warns and keeps the previous one |
| `max-date` | `string` | — | Maximum selectable date (`YYYY-MM-DD`) |
| `disabled-weekdays` | `string` | — | Comma-separated day numbers to disable (e.g., `"0,6"` for weekends) |
| `disabled-dates` | `string` | — | Comma-separated ISO dates to disable (e.g., `"2026-06-13, 2026-06-14, 2026-12-25"`). The `disabledDates` property still wins if both paths are set. |
| `disabled-dates-handling` | `'allow' \| 'prevent' \| 'block' \| 'split' \| 'individual'` | `'allow'` | How to handle range selections over disabled dates (see [Range selection modes](#range-selection-modes)) |
| `placeholder-format-mask` | `string` | Same as `date-format-mask` | Only the input placeholder hint (when no explicit `placeholder`) — a localized form of the mask (`'dd/mm/aaaa'` Spanish, `'tt.mm.jjjj'` German, …). Doubled around ` - ` in `range` mode. The shown text and parsing follow `date-format-mask`; the submitted value is ISO (`value-format`). |
| `placeholder-time-format-mask` | `string` | Same as `time-format-mask` | The time part of the placeholder hint: alone in `time` mode, after the date hint (`date + ' ' + time`) in `datetime` mode. |
| `highlight-disabled-in-range` | `boolean` | `true` | Highlight disabled dates within a selected range. `false` = only highlight enabled dates. |
| `commit-mode` | `'selection' \| 'apply' \| 'manual'` | `'selection'` (`'apply'` for time/datetime and `multiple` mode) | When a pick is **committed** (written + `change`). `selection` = every completed pick is written; `apply` = picks are staged until the built-in Apply button; `manual` = picks are only staged until the app calls `commit()` (no built-in button). Closing is separate (next rows); closing without `commit()` discards a staged pick |
| `close-on-select` | `boolean` | `true` | Close when a pick completes in `commit-mode="selection"`. `false` keeps the calendar open while every pick is still written (booking.com flow) |
| `close-on-outside-click` | `boolean` | `true` (`false` in `commit-mode="manual"`) | Close on a click outside the floating calendar / on the modal backdrop. Escape and `close()` always close |
| `positioning-mode` | `'inline' \| 'floating'` | `'floating'` | Where the calendar lives: `inline` = embedded block (no input), `floating` = opens from the input. How a floating picker opens is `presentation`. (The former `'modal'` value is `presentation="modal"`.) |
| `presentation` | `'auto' \| 'floating' \| 'modal' \| 'fullscreen'` | `'auto'` | How a **floating** picker opens (SPEC §12.9). `auto`: **phone** (touch, shorter viewport side < 600px) → full-screen overlay; **tablet** (touch, ≥ 600px) → centered modal; **desktop** (mouse) → anchored popover. A concrete value forces that presentation on every device (`modal` = centered overlay with backdrop; `fullscreen` previews the phone sheet on desktop). Ignored by `inline`. Tune per device class with [responsive rules](#responsive-rules). |
| `fullscreen-autofocus` | `boolean` | `false` | Phone full-screen only: focus the input on open (pops the soft keyboard). Default off — the sheet opens with the calendar visible, keyboard closed. |
| `show-fullscreen-input` | `boolean` | `false` | Phone full-screen only: move the input into the sheet header (numeric keypad). The heading (`labels.fullscreenTitle`) is not shown alongside it. |
| `show-summary` | `boolean` | `true` | Show range-mode days/nights summary block. `false` = omit entirely (no empty-div jump). |
| `input-size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Input field size (floating mode only) |
| `name` | `string` | — | HTML form field name. Set it to submit the selection in a `<form>` (see [Form integration](#form-integration)) |
| `value-format` | `'text' \| 'json' \| 'array'` | `'text'` | How the submitted value (and `el.value`) is serialized (see [Form integration](#form-integration)) |
| `value-format-mask` | `string` | ISO (`YYYY-MM-DD`, `HH:mm[:ss]`, `YYYY-MM-DDTHH:mm[:ss]`) | How each date is written in the submitted value / `el.value`, and parsed from the `value` attribute / property |
| `value-separator` | `string` | `/` (range), `,` (multiple) | Joins the dates in the `text` value format |
| `date-member` | `string` | `'date'` | Field name on `specialDates` objects holding the date. Lets you reuse existing data shapes without renaming keys. |
| `badge-text-member` | `string` | `'badgeText'` | Field name on `specialDates` objects holding the badge label |
| `badge-class-member` | `string` | `'badgeClass'` | Field name on `specialDates` objects holding the badge's extra CSS class |
| `day-class-member` | `string` | `'dayClass'` | Field name on `specialDates` objects holding the day cell's extra CSS class |
| `badge-tooltip-member` | `string` | `'badgeTooltip'` | Field name on `specialDates` objects holding the badge tooltip text |
| `day-tooltip-member` | `string` | `'dayTooltip'` | Field name on `specialDates` objects holding the day tooltip text |
| `is-disabled-member` | `string` | `'isDisabled'` | Field name on `specialDates` objects holding the disabled flag |

## Properties

```ts
// Get/set properties (camelCase in JavaScript)
picker.selectionMode = 'range';
picker.dateFormatMask = 'DD.MM.YYYY';
picker.value = '2025-11-15';   // reads back exactly what the form submits
picker.isDisabled = true;

// Complex data (arrays / objects / callbacks) — set via property, not attribute
picker.disabledDates = ['2026-06-13', '2026-06-14'];
picker.specialDates  = [{ date: '2026-12-25', badgeText: '🎄', badgeTooltip: 'Christmas' }];

// UI strings (partial over the English defaults) — see "Labels (i18n)"
picker.labels = { today: 'Jump', clear: 'Wipe', days: '{count} dní' };
picker.monthNames    = ['01','02','03','04','05','06','07','08','09','10','11','12'];
```

> Property setters work even before the element is upgraded —
> assignments made before `customElements.define()` runs are routed
> through the accessors during `connectedCallback`, so you don't need
> `customElements.whenDefined('web-daterangepicker')` guards.

### Selection accessors (read / write)

Assigning to any of these re-renders and syncs the input — no manual
`renderCalendar()` / `updateSummary()` needed. Reads return defensive copies.

| Accessor | Access | Type | Notes |
|---|---|---|---|
| `selectedDate` | get / set | `Date \| null` | single mode |
| `selectedDates` | get / set | `Date[]` | multiple mode |
| `selectedRanges` | get / set | `DateRange[]` | range mode: always the selection — `[{ start, end }]` for a plain range, every piece for independent / `split` ranges, `[]` when empty; multiple mode: its ranges |
| `selectedStartDate` | get | `Date \| null` | range start — the outer envelope (set a range via `selectedRanges`) |
| `selectedEndDate` | get | `Date \| null` | range end — the outer envelope |
| `selectedTime` | get / set | `SelectedTime \| null` | time / datetime modes |
| `selectedDatetime` | get / set | `Date \| null` (set accepts `Date \| string`) | composed value; the setter accepts an ISO datetime and splits it into date + time |

```ts
// Round-trip a full datetime from an API — the setter splits it for you:
picker.selectedDatetime = '2026-07-06T14:30:00';
// Set a range in one line (re-renders + syncs input):
picker.selectedRanges = [{ start: new Date(2026, 6, 1), end: new Date(2026, 6, 8) }];
```

### Displayed-state accessors (read-only)

Reflect what's currently on screen; change what's shown via navigation, not by assignment.

| Accessor | Type | Notes |
|---|---|---|
| `visibleMonths` | `MonthDisplay[]` | one per column: `{ month, year, firstDate, lastDate, gridStart, gridEnd }`; ascending, may have gaps |
| `visibleMonthDates` | `Date[]` | first-of-month per column (mirror of `visibleMonths`) |
| `visibleDateRange` | `{ start, end }` | outer envelope of the visible grid (first column's first cell → last column's last cell) |
| `today` | `Date` | the picker's notion of today, normalized to 00:00 |

## Methods

| Method | Description |
|---|---|
| `open()` | Open the calendar (floating mode only) |
| `close()` | Close the calendar |
| `toggle()` | Toggle calendar visibility |
| `clearSelection()` | Clear the current selection |
| `commit()` | Commit the staged selection (what Apply does; the app's call in `commit-mode="manual"`) |
| `showMessage(html, { type?, autoHideMs? })` | Display a message in the calendar (`type`: `info` \| `warning` \| `error` \| `success`; omit for raw HTML) |
| `hideMessage()` | Hide the currently displayed message |
| `showSummary(html: string)` | Write custom HTML into the summary block; pins it (survives hover preview) until the next selection change |
| `hideSummary()` | Drop the summary override and re-derive from selection |
| `refreshSummary()` | Re-run summary derivation now (e.g. after async data arrives) |
| `showLoader(target?)` | Show a loader — `target`: `'calendar'` (default, overlay) \| `'message'` \| `'summary'` (in-block). Drawn by the shared loader: `renderLoadingCallback`, else `window.components.renderLoaderCallback`, else the default `.drp-loader`; see [Loaders](#loaders) |
| `hideLoader(target?)` | Hide the loader for a target |
| `lock(aspects?)` | Freeze user interaction. No argument = full lock; pass a `LockAspect` or array to lock a subset. See [Locking](#locking-read-only) |
| `unlock(aspects?)` | Release the given aspect(s), or the whole lock when called with no argument |
| `toggleLock(aspects?)` | Toggle the given aspect(s), or the whole lock |
| `isAspectLocked(aspect)` | `boolean` — whether that aspect is currently locked |
| `release()` | Release the `defer` gate (core; builds the picker once) |
| `whenReady()` | `Promise` resolved once the first build is live (core) |
| `destroy()` | Tear the picker down for good (core); the element is inert afterwards |

`el.controller` (`DateRangePickerController`) is the same facade every callback
context and event detail carries as `controller`: the read-only selection state `selectedDate`,
`selectedDates`, `selectedRanges`, `selectedStartDate`, `selectedEndDate`, `selectedTime`, `selectedDatetime`,
`isOpen`, `selectToday()`, `selectNow()`, `clearSelection()`, `commit()`, `open()` / `close()` / `toggle()`,
`setPresentation()`, `prevMonth()` / `nextMonth()`, `lock()` / `unlock()`,
`showMessage(content, { type, autoHideMs })`, `hideMessage()`, `showSummary()` / `hideSummary()`,
`showLoader()` / `hideLoader()`, `reloadMonthData()`.

Locking state: `lockedAspects` (`LockAspect[]` getter); `isReadonly` / the `readonly` attribute is the declarative full lock.

## Loaders

Every loading state — `showLoader('calendar' | 'message' | 'summary')` and the overlay shown
automatically while an async callback (`beforeSelectCallback`, `beforeMonthChangeCallback`,
`getMonthDataCallback`) is pending — draws through the shared KeenMate loader
(`@keenmate/web-components-core` `renderLoader`). The container gets `role="status"` and
`aria-label` = `labels.loading`. Precedence:

1. the instance **`renderLoadingCallback`** property;
2. the page-wide **`window.components.renderLoaderCallback`** (one place for every KeenMate component);
3. the default `<span class="drp-loader">` — a single-colour mask shape from the
   `--drp-loader-icon` / `-rotate` / `-duration` / `-size` tokens (chained to `--base-loader-*`),
   coloured by `--drp-loader-color`.

```js
// Page-wide: every component's loaders
window.components.renderLoaderCallback = ({ component, context, containerElement }) => {
  containerElement.innerHTML = '<span class="my-dots"><i></i><i></i><i></i></span>';
};
// This picker only; ctx.context = 'calendar' | 'message' | 'summary'
picker.renderLoadingCallback = ({ context, containerElement }) => {
  containerElement.textContent = context === 'summary' ? 'Saving…' : 'Loading…';
  return () => { /* optional cleanup when the loader is hidden */ };
};
```

## Events

| Event | Detail | Description |
|---|---|---|
| `change` | `ChangeEventDetail` (`{ date?, dateRange?, dates?, dateRanges?, formattedValue, … }`) | The selection was committed — every completed pick in `commit-mode="selection"`, on Apply / `commit()` otherwise |
| `open` | `OpenEventDetail` (context only) | The calendar popover opened (not in inline mode) |
| `close` | `CloseEventDetail` (context only) | The calendar popover closed (any reason; a staged pick is already discarded) |
| `action` | `DateRangePickerActionEventDetail` (`{ action, id, item, source, sourceEvent, triggerElement, dataset, … }`) | An action button (built-ins included) or an HTML `data-action` trigger was activated. `action` is the built-in name (`today` / `now` / `clear` / `apply`) or `'custom'`; `id` identifies a custom item; `source` is `'action-buttons' \| 'message' \| 'summary' \| 'calendar'`; `dataset` holds the trigger's other `data-*` attributes (camelCase). Fires after the item's `onClick`, before the built-in behaviour. |
| `month-change` | `MonthChangeEventDetail` (`{ monthIndex, year, month, visibleMonths }`) | The visible month(s) changed (any navigation) |
| `ready` | `ReadyEventDetail` (`{ controller, element }`) | The picker was built for the first time (core; see `defer` / `release()`); the host gets the `ready` attribute and `:state(ready)` |
| `value-format-error` | `ValueFormatErrorEventDetail` (`{ error, value }`) | `getValueFormatCallback` threw: the field submits `''` and the host is invalid (`labels.valueFormatError`) until the next successful format. `value` = the ISO selection snapshot. See [Form integration](#form-integration) |

Every detail also carries `controller` (the public facade, same as
`el.controller`) and `element` (the host) — both non-enumerable, so
`JSON.stringify(detail)` / LiveView `pushEvent` see only the data — plus the
presentation flags. Events bubble but are not `composed`.

Each event has an `on*` property twin — `onChange`, `onOpen`, `onClose`, `onAction`,
`onMonthChange`, `onReady` — called with the **detail** (not the
CustomEvent), right before the event is dispatched:

```ts
picker.onChange = (detail) => console.log(detail.formattedValue, detail.date);
picker.onAction = (detail) => {
  if (detail.id === 'next-week') detail.controller.showMessage('Next week!', { type: 'info', autoHideMs: 2000 });
};
picker.addEventListener('month-change', (e) => console.log(e.detail.year, e.detail.month));
```

> There are no separate `apply` or `cancel` events. The Apply button
> commits the pending selection and dispatches `change`. Pressing
> Escape with an uncommitted selection silently restores the input
> value and fires nothing.

## Form integration

Give the element a `name` and it participates in a `<form>` like a native
control — no wrapper or manual hidden input needed. It works the same in
`inline` and `floating` modes (every presentation):

```html
<form>
  <web-daterangepicker name="checkin" selection-mode="single"></web-daterangepicker>
  <button>Submit</button>
</form>
```

Under the hood the control renders a light-DOM hidden `<input>` inside the form
(the same approach as `<web-multiselect>`). It also exposes `el.form` /
`event.target.form`, so frameworks that delegate form changes by reading
`target.form` (e.g. Phoenix LiveView's `phx-change`) resolve the parent form correctly.

**`el.value` is exactly what the form submits** — a string (`text` / `json` /
`getValueFormatCallback`) or a `string[]` (`array`, one entry per `name[]` field).
The setter accepts the same form, plus ISO and the displayed (`date-format-mask`)
text, and changes the current selection only. The `value` **attribute** is the
default (`el.defaultValue`, like a native input): parsed the same way on build and
restored by `form.reset()`. A range value is lenient about what separates the two
dates — `2026-06-10/2026-06-14`, `2026-06-10 - 2026-06-14`, `2026-06-10 to 2026-06-14`,
an en dash, … all parse. An unparseable value warns and clears the selection.

The submitted value is independent of `date-format-mask` / `time-format-mask` (the
shown text) and the placeholder masks. Three inputs shape it (priority:
`getValueFormatCallback` > `value-format-mask` / `value-separator` > `value-format`):

- **`value-format-mask`** — how each date is written (tokens `YYYY` `YY` `MM` `M` `DD`
  `D` `HH` `H` `hh` `h` `mm` `ss` `a`; anything else literal). Default ISO-8601:
  `YYYY-MM-DD`; `time` mode `HH:mm[:ss]`; `datetime` `YYYY-MM-DDTHH:mm[:ss]` (seconds
  when shown).
- **`value-separator`** — joins the dates in `text`: a range's start/end (default
  `/`), multiple dates (default `,`).
- **`value-format`**:

| `value-format` | Single | Range | Multiple |
|---|---|---|---|
| `text` (default) | `2026-06-15` | `2026-06-15/2026-06-20` | `2026-06-15,2026-06-18` |
| `json` | `"2026-06-15"` | `[{"start":"2026-06-15","end":"2026-06-20"}]` | `["2026-06-15",{"start":"2026-06-18","end":"2026-06-20"}]` |
| `array` | one `name[]` field | one `name[]` per range (`2026-06-15/2026-06-20`) | one `name[]` per date |

**Range mode always submits a list of ranges** — one plain range, the pieces of a
range split around disabled days, or several independent ranges (`text`: each
`start{value-separator}end`, joined by `,`; `json`: an array of `{ start, end }`;
`array`: one field per range). The same forms parse back as ranges.

An empty selection submits `''` (`text` / `json`) or no field at all (`array`).

```html
<!-- stay=03.11.2026 - 10.11.2026 -->
<web-daterangepicker name="stay" selection-mode="range"
  value-format-mask="DD.MM.YYYY" value-separator=" - "></web-daterangepicker>

<!-- stay[]=03.11.2026/10.11.2026 -->
<web-daterangepicker name="stay" selection-mode="range"
  value-format="array" value-format-mask="DD.MM.YYYY"></web-daterangepicker>

<!-- stay=[{"start":"03.11.2026","end":"10.11.2026"}] -->
<web-daterangepicker name="stay" selection-mode="range"
  value-format="json" value-format-mask="DD.MM.YYYY"></web-daterangepicker>
```

- The submitted value tracks the *real* selection, not the drawn envelope: a range
  broken over disabled days with `disabled-dates-handling="split"` submits each
  sub-range, and `"individual"` / `"block"` submit the enabled days (each as a
  one-day range `day/day`).
- In `multiple` mode a committed range item is written `start/end` in `text`
  (`{"start":…,"end":…}` in `json` — a range is always an object); `array` flattens it to two fields.
- For full control, set the **`getValueFormatCallback`** property — it receives
  the normalized ISO selection snapshot (`{ selectionMode, pickerMode, items }`,
  where each item is an ISO string or `{ start, end }`) plus the picker context and
  returns the single field value (also what `el.value` returns):

  ```js
  picker.getValueFormatCallback = ({ items }) => items.join('|');
  ```

- **A throwing `getValueFormatCallback` makes the control invalid.** The error is
  logged (`DRP:SELECTION`, error level), the field submits `''`, and the host gets
  `validity.customError` with the `labels.valueFormatError` message (default "The
  value could not be formatted.") — the form refuses to submit (`invalid` fires
  instead of `submit`; a `<form novalidate>` submits `''`). A `value-format-error`
  event fires with `{ error, value }` (`value` = the ISO selection snapshot; twin
  `onValueFormatError`). The next successful format makes it valid again. The
  standard `validity` / `validationMessage` / `willValidate` / `checkValidity()` /
  `reportValidity()` are available on the element.

## Working with dates across timezones

This is a **calendar-date picker** — it represents days, not moments in
time. Skipping this section will eventually cost you a one-day-shift
bug, so please read it.

### How the picker represents dates

When the user clicks April 30, the picker stores `new Date(year, month - 1, day)`
— that's **local midnight** on the picked day. The same is true for
`selectedDate`, `selectedStartDate`, `selectedEndDate`, and the Date
passed to every callback. There's no UTC anywhere in the picker's
internal lookup paths.

### The trap: `Date.prototype.toISOString()`

`toISOString()` returns the date in **UTC**. For any user not in UTC,
that string represents a different *calendar* day than the one they see:

```js
// User in Moscow (UTC+3) picks April 30.
// selectedDate is `new Date(2026, 3, 30)` = April 30 00:00 MSK = April 29 21:00 UTC.

selectedDate.toISOString().split('T')[0]  // → "2026-04-29"  ❌ wrong day
selectedDate.getDate()                     // → 30           ✅ what the user clicked
```

This is what broke the example demos in earlier versions: lookup keys
built from `dayOffset()` (local) didn't match keys derived from
`toISOString()` (UTC). Badges rendered one day late, tooltips on the
right day. Same bug strikes any user who tries `date.toISOString()` to
key into a `Map<string, DayMetadata>`.

### The rule

**Format dates from local components, never from `toISOString()`:**

```js
const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

picker.getDateMetadataCallback = (ctx) => {
  const dateStr = ctx.dateString;      // ✅ already local YYYY-MM-DD (ctx.date is the Date)
  // …lookup, return DayMetadata…
};
```

### Sending dates to a server / between users

`Date` objects can't survive transport — they get serialized. The
serialization format determines whether the date stays on the right
calendar day across timezones:

| What you send | Russian user picks Apr 30 → LA user receives | Verdict |
|---|---|---|
| `event.detail.formattedValue` (`"2026-04-30"`) | `"2026-04-30"` → set on LA picker → April 30 | ✅ |
| `JSON.stringify(detail)` (Date → ISO string) | `"2026-04-29T21:00:00.000Z"` → April 29 in LA | ❌ |
| `selectedDate.toISOString()` | `"2026-04-29T21:00:00.000Z"` → April 29 in LA | ❌ |
| `toLocalISO(selectedDate)` (`"2026-04-30"`) | `"2026-04-30"` | ✅ |

**Recommendation:** transmit calendar dates as `YYYY-MM-DD` **strings**,
never as ISO timestamps or raw `Date` / JSON-serialized payloads.

### Receiving a date string

`new Date("2026-04-30")` parses as **UTC midnight** — surprising for
non-UTC users (in LA it'd be April 29). Build local Dates from the
string parts:

```js
// ❌ Don't do this
const d = new Date("2026-04-30");                    // UTC midnight, surprising in non-UTC

// ✅ Do this
const [y, m, day] = "2026-04-30".split("-").map(Number);
const localDate = new Date(y, m - 1, day);           // April 30 local — what the user picked

// Or, if you just need to set the picker:
picker.value = "2026-04-30";                  // picker handles parsing internally
picker.value = "2026-04-30";                         // attribute setter
```

### Quick checklist

- [ ] Picker callbacks: format Dates with `toLocalISO()`, not `toISOString()`
- [ ] Outgoing dates (server, URL, localStorage): send `YYYY-MM-DD` strings
- [ ] Incoming dates: prefer `picker.value = "YYYY-MM-DD")` over manual `new Date(...)` parsing
- [ ] Map/dictionary keys for date lookups: build keys with `toLocalISO()` and look up the same way

## Advanced features

### Week start day

Control which day the week starts on (auto-detected by default from the
user's locale):

```html
<!-- Auto-detect from locale (default) -->
<web-daterangepicker week-start-day="auto"></web-daterangepicker>

<!-- Force Sunday start -->
<web-daterangepicker week-start-day="0"></web-daterangepicker>

<!-- Force Monday start (common in Europe) -->
<web-daterangepicker week-start-day="1"></web-daterangepicker>
```

### Disabled dates & date restrictions

#### Simple restrictions (attributes)

```html
<!-- Disable weekends -->
<web-daterangepicker disabled-weekdays="0,6"></web-daterangepicker>

<!-- Date range restriction -->
<web-daterangepicker
  min-date="2025-01-01"
  max-date="2025-12-31">
</web-daterangepicker>
```

#### Complex restrictions (JavaScript)

```js
const picker = document.querySelector('web-daterangepicker';

// Disable specific dates (e.g., public holidays)
picker.disabledDates = [
  '2025-12-25', // Christmas
  '2025-01-01', // New Year
  new Date(2025, 6, 4) // July 4th
];

// Custom disable logic (e.g., cottage booking)
picker.getDateMetadataCallback = (ctx) => {
  // Disable all dates that overlap with existing bookings
  const isBooked = bookedRanges.some(range =>
    ctx.date >= range.start && ctx.date <= range.end
  );
  return isBooked ? { isDisabled: true } : null;
};
```

### Special dates (holidays, events)

Add visual indicators and labels to specific dates:

```js
const picker = document.querySelector('web-daterangepicker');

picker.specialDates = [
  {
    date: '2025-12-25',
    dayClass: 'holiday',     // CSS class for the day cell
    badgeText: '🎄',         // Badge overlay (emoji or short text)
    dayTooltip: 'Christmas Day'
  },
  {
    date: '2025-07-04',
    dayClass: 'holiday',
    badgeText: '🎆',
    dayTooltip: 'Independence Day'
  },
  {
    date: '2025-02-14',
    dayClass: 'event',
    badgeText: '❤️',
    dayTooltip: 'Valentine\'s Day'
  }
];
```

The `'holiday'` / `'event'` strings are consumer-data discriminators
applied as literal classes on the day cell — the picker ships default
styling for them (consuming `--drp-holiday-color` / `--drp-event-color`),
and you can supply your own custom classifier names with matching CSS
via `getCustomStylesCallback` (or the `custom-styles` attribute). See the [consumer-data class convention
note](../README.md#known-limitations) for the full story.

### Advanced styling & info

For complete control, use `getDateMetadataCallback`:

```js
// Local-date formatter — see "Working with dates across timezones" above.
// Don't use date.toISOString() here; it shifts by one day in non-UTC timezones.
const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

picker.getDateMetadataCallback = (ctx) => {
  const date = ctx.date;
  const dateStr = ctx.dateString;      // local YYYY-MM-DD

  // Check if it's a peak-season date
  if (isPeakSeason(date)) {
    return {
      dayClass: 'peak-season',
      badgeText: '$$$',
      dayTooltip: 'Peak season pricing'
    };
  }

  // Check if it's a special-offer date
  if (specialOffers[dateStr]) {
    return {
      dayClass: 'special-offer',
      badgeText: '%',
      dayTooltip: `${specialOffers[dateStr]}% off!`
    };
  }

  return null;
};
```

### CSS styling for special dates

Since the component uses Shadow DOM, inject custom styles via
`getCustomStylesCallback` (receives the picker context) or the declarative
`custom-styles` attribute:

```js
picker.getCustomStylesCallback = (ctx) => `
  /* Custom classifier — picker emits .drp__day.peak-season when you set dayClass: 'peak-season' */
  .drp__day.peak-season {
    background-color: rgba(251, 191, 36, 0.15);
    font-weight: 600;
  }

  /* Override the built-in .holiday tint */
  .drp__day.holiday {
    background-color: rgba(239, 68, 68, 0.15);
  }
`;
```

### Date selection validation (`beforeSelectCallback`)

Validate or modify date selections before they're committed. Runs after
local validation (disabled dates, min/max) passed; may be async (a loader
shows while the Promise is pending — e.g. an API call):

```js
const picker = document.querySelector('web-daterangepicker');

picker.beforeSelectCallback = async (ctx) => {
  // ctx = { mode, date?, range?, subRanges?, enabledDates?, markRangeInvalid(),
  //         controller, element, presentation… }
  //   ctx.date   is set in single mode; ctx.range = { start, end } in range mode.
  //   ctx.subRanges / ctx.enabledDates are populated in range mode when
  //   disabledDatesHandling is 'split' / 'individual' — see "Split-aware validation".
  const range = ctx.range;

  // Example: check availability via API.
  // Send YYYY-MM-DD strings, not toISOString() — the picker is a calendar-date
  // picker, and ISO timestamps shift by ±1 day across timezones.
  const response = await fetch('/api/check-availability', {
    method: 'POST',
    body: JSON.stringify({
      start: toLocalISO(range.start),
      end: toLocalISO(range.end)
    })
  });
  const { available, message } = await response.json();

  if (!available) {
    ctx.markRangeInvalid();                                   // keep the attempt visible with error styling
    ctx.controller.showMessage(message, { type: 'error' });
    return false;                                             // reject → previous selection restored
  }
  // return nothing → accept
};
```

**Return values:**

| Return | Effect |
|---|---|
| nothing (`undefined`) | Accept the proposed selection as-is |
| `false` | Reject it — the previous selection is restored. Call `ctx.markRangeInvalid()` first (range mode) to keep the rejected range visible with red error styling until the next attempt |
| a `Date` (single mode) | Accept this adjusted date instead |
| a `DateRange` `{ start, end }` (range mode) | Accept this adjusted range instead |
| a `DateRange[]` (range mode) | Replace the proposal with N independent ranges (see "Returning multiple ranges") |
| `null` | Clear the selection entirely |

Messages are not part of the return value — show them through the
facade: `ctx.controller.showMessage(text, { type: 'error' | 'warning' | 'info' | 'success', autoHideMs })`.
A new selection attempt hides the previous message automatically.

**Split-aware validation (`ctx.subRanges` / `ctx.enabledDates`):**

In range mode the callback receives the contiguous *envelope* between the two endpoints — `ctx.range` may straddle disabled days. When `disabledDatesHandling` is `'split'` or `'individual'`, the context also carries the carved-out pieces so you don't have to re-derive them:

- `ctx.subRanges` — `DateRange[]`, the envelope split into enabled-only segments (split mode only).
- `ctx.enabledDates` — `Date[]`, the flat enabled-day list inside the envelope (split + individual).

```js
picker.beforeSelectCallback = (ctx) => {
  // Reject if any enabled-only segment exceeds 7 nights
  if (ctx.subRanges?.some(r => (r.end - r.start) / 86400000 > 7)) {
    ctx.markRangeInvalid();
    ctx.controller.showMessage('No segment may exceed 7 nights', { type: 'error' });
    return false;
  }
};
```

**Returning multiple ranges (`DateRange[]`):**

A range-mode callback can commit **N independent ranges** instead of the single proposed span — e.g. to keep the enabled-only pieces of a split selection, or to punch a hole out of a range. Return an array of ranges:

```js
picker.beforeSelectCallback = (ctx) => {
  // Turn a range straddling disabled days into its enabled-only segments
  if (ctx.subRanges && ctx.subRanges.length > 1) {
    ctx.controller.showMessage('Selection split around unavailable days', { type: 'info' });
    return ctx.subRanges;
  }
};
```

When a `DateRange[]` is returned:

- `picker.selectedRanges` reflects the array; each range's start/end/in-range cells are highlighted in the grid, and the summary lists every piece.
- The `change` detail (and `onChange`) carries the pieces in `detail.dateRanges` (not a single `detail.dateRange`).
- The read-only envelope accessors `selectedStartDate` / `selectedEndDate` span the first range's start through the last range's end.
- Assigning `picker.selectedRanges = [...]` directly in range mode renders identically — the callback path and the programmatic setter share the same multi-range machinery.
- Starting a fresh range selection clears the multi-range result back to a single contiguous range.
- The callback fires the same way whichever way a range is completed — **clicking, dragging, or typing** the second date into the input. (Typing a single date in single mode still doesn't run the callback.)

**Example — minimum-nights validation with error display:**

```js
picker.beforeSelectCallback = (ctx) => {
  const range = ctx.range;
  const nights = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));

  if (nights < 2 || nights > 14) {
    ctx.markRangeInvalid();
    ctx.controller.showMessage(
      nights < 2 ? 'Minimum 2 nights required' : 'Maximum 14 nights allowed',
      { type: 'error' }
    );
    return false;
  }
};
```

### Month navigation & bulk metadata loading (`beforeMonthChangeCallback` / `getMonthDataCallback`)

Two separate hooks:

- **`beforeMonthChangeCallback(ctx)`** — runs before a month navigation (not on
  the initial open). Return `false` to block it; anything else continues. May be async.
- **`getMonthDataCallback(ctx)`** — loads data for the visible range on the
  initial open and after every accepted navigation (per column, or once for the
  whole grid in unified navigation). Returns `{ metadata?, monthHeaders? }`
  (or nothing). May be async — a loader shows meanwhile.

Both receive a `MonthChangeContext`: `{ year, month, monthIndex, firstVisibleDate, lastVisibleDate }`
plus `controller` / `element` / presentation flags. After the navigation the
`month-change` event fires (`onMonthChange`).

Loading all visible dates in a single API call is much more efficient than
`getDateMetadataCallback` (which fires per date):

```js
const picker = document.querySelector('web-daterangepicker');

picker.getMonthDataCallback = async (ctx) => {
  // Fetch availability for all visible dates in one call.
  // Use toLocalISO (see "Working with dates across timezones") so the
  // server receives the calendar dates the user actually sees.
  const response = await fetch('/api/availability', {
    method: 'POST',
    body: JSON.stringify({
      start: toLocalISO(ctx.firstVisibleDate),
      end: toLocalISO(ctx.lastVisibleDate)
    })
  });
  const data = await response.json();

  // Build metadata map (key: YYYY-MM-DD, value: DayMetadata)
  const metadata = new Map();
  data.forEach(day => {
    metadata.set(day.date, {
      badgeText: `$${day.price}`,
      isDisabled: !day.available,
      dayTooltip: `${day.roomsLeft} rooms available`
    });
  });

  return { metadata };
};

// Block navigation past the booking horizon
picker.beforeMonthChangeCallback = (ctx) => {
  if (ctx.year > 2027) {
    ctx.controller.showMessage('Bookings open up to 2027', { type: 'warning', autoHideMs: 2000 });
    return false;
  }
};
```

**`getMonthDataCallback` result (`MonthDataResult`):**

| Property | Type | Description |
|---|---|---|
| `metadata` | `Map<string, DayMetadata>` | Bulk metadata keyed by `YYYY-MM-DD`. Cached and used instead of `getDateMetadataCallback`. |
| `monthHeaders` | `Map<string, string>` | Custom month headers keyed by `YYYY-MM` (`"2026-01"` → `"Jan 2026 (5 rooms)"`). Takes precedence over `getMonthHeaderCallback`. |

**Performance:** 1 API call per month navigation vs 35–42 calls with
`getDateMetadataCallback`.

### Messages & actions

Display contextual messages in the calendar with interactive buttons.
Any element inside the message (or summary, or custom-rendered day content)
carrying `data-action` is an **action trigger**: clicking it runs
`beforeActionCallback` → the built-in, if `data-action` names one (`today` /
`now` / `clear` / `apply`) → the `action` event (`onAction`), which sees the
state the built-in left.

```js
const picker = document.querySelector('web-daterangepicker');

// Simple message: raw HTML, or a typed message that auto-hides
picker.showMessage('<p>Please select a check-in date</p>');
picker.showMessage('Saved', { type: 'success', autoHideMs: 2000 });

// Same via the controller facade — e.g. from a callback
picker.controller.showMessage('Saved', { type: 'success', autoHideMs: 2000 });

// Message with custom action buttons — data-id identifies the action,
// every other data-* attribute arrives in detail.dataset (camelCase)
picker.showMessage(`
  <p>These dates are unavailable. Try:</p>
  <button data-action="custom" data-id="suggest" data-start-date="2026-01-14" data-end-date="2026-01-17">
    Jan 14 – Jan 17
  </button>
  <button data-action="custom" data-id="dismiss">Got it</button>
`);

picker.addEventListener('action', (e) => {
  const { id, source, dataset, controller } = e.detail;
  if (source !== 'message') return;
  if (id === 'suggest') {
    picker.selectedRanges = [{
      start: new Date(dataset.startDate),
      end: new Date(dataset.endDate)
    }];
  }
  controller.hideMessage();
});

// Hide programmatically
picker.hideMessage();
```

**Action-trigger attributes:**

- `data-action="custom" data-id="…"` — fires the `action` event with `action: 'custom'`, `id` from `data-id`, `source: 'message'` (or `'summary'` / `'calendar'`), `triggerElement`, and the remaining `data-*` attributes in `detail.dataset`.
- `data-action="today" | "now" | "clear" | "apply"` — runs that built-in, then fires the `action` event.
- The message's own ✕ close button is internal and fires nothing; to dismiss from your own button, handle its `action` event and call `hideMessage()`.

### Labels (i18n)

Every UI string comes from one `labels` object — a **partial** override of the
English defaults (exported as `DEFAULT_LABELS`). Set it as a property or a JSON
attribute; changing it at runtime re-renders without losing the selection. Month
and weekday names are not labels: they come from `Intl` for `locale` (`auto` = the
browser language), or from `monthNames` / `weekdayNames`. There are no built-in
translations.

| Key | Default | Used for |
|---|---|---|
| `today` / `clear` / `apply` / `now` | `Today` / `Clear` / `Apply` / `Now` | built-in action buttons (`clear` is also the input ✕'s ARIA label) |
| `close` | `Close` | ARIA label of the full-screen ✕ and the message ✕ |
| `preview` | `Preview` | prefix of the range summary while hovering / dragging |
| `day` / `days` | `{count} day` / `{count} days` | range summary |
| `night` / `nights` | `{count} night` / `{count} nights` | range summary |
| `selectionCount` | `{count} selection(s)` | the input text in multiple mode |
| `time` / `hours` / `minutes` / `seconds` / `am` / `pm` | `Time` / `Hours` / … / `AM` / `PM` | time picker |
| `fullscreenTitle` | `''` | heading in the phone full-screen sheet (empty = none, the ✕ merges into the month row) |
| `valueFormatError` | `The value could not be formatted.` | validation message while `getValueFormatCallback` throws (`validationMessage`) |
| `loading` | `Loading…` | accessible label (`aria-label`, `role="status"`) of every loader |

`''` is a deliberate empty label (renders nothing); a missing / `undefined` key falls back to
the English default. Content labels (`preview`, `day(s)`, `night(s)`, `time`, `hours`,
`minutes`, `seconds`, `am` / `pm` in the time pickers) are inserted as HTML — never pass
untrusted text; the `{count}` value is escaped. The others (button text, ARIA labels,
`fullscreenTitle`, `selectionCount` in the input) are plain text. See the README's
HTML Injection (XSS) notice.

```html
<web-daterangepicker selection-mode="range" locale="de"
  labels='{"today":"Heute","clear":"Löschen","apply":"Übernehmen","days":"{count} Tage","nights":"{count} Nächte"}'>
</web-daterangepicker>
```

```js
picker.labels = { today: 'Dnes', days: '{count} dní', fullscreenTitle: 'Vyberte termín' };
```

### Locking (read-only)

Freeze user interaction while keeping the value **readable** — unlike
`disabled`, which greys the input out and only affects the `<input>`.
The lock is **scoped**: freeze everything, or just some of four
independent aspects.

| Aspect | Freezes |
|---|---|
| `selection` | day clicks, drag-to-adjust endpoints, typed input (`<input>` becomes read-only), Today / Now / Clear, and all time-picker interactions |
| `navigation` | month nav (`<` / `>`), PageUp/Down, Ctrl+arrows, `t`, and the rolling year/month selector |
| `actions` | the Apply button and custom / preset action buttons |
| `open` | (re)opening the popover (floating — every presentation). Closing (hide / Escape / backdrop) stays allowed, so a locked picker is never a keyboard trap |

The lock gates the **end user only** — the programmatic API
(`selectedRanges = …`, `clearSelection()`, `open()`, the nav methods,
etc.) keeps working while locked, just like a `readOnly` `<input>` is
still settable from JS.

```js
const picker = document.querySelector('web-daterangepicker');

// The motivating flow: confirm a range, then lock it.
confirmBtn.addEventListener('click', async () => {
  const range = picker.selectedRanges?.[0];
  if (!range) return;
  picker.showLoader('calendar');
  const code = await sendToServer(range);       // your API call
  picker.hideLoader('calendar');
  picker.showSummary(`<b>Confirmed</b> — code ${code}`);
  picker.lock();                                 // full read-only lock
});

// Scoped: freeze the range + buttons, but let the user still
// browse other months with the < > arrows.
picker.lock(['selection', 'actions']);

// Release everything, or a subset.
picker.unlock();
picker.unlock('selection');

// Toggle, inspect, or use the declarative attribute.
picker.toggleLock('navigation');
picker.isAspectLocked('open');   // -> boolean
picker.lockedAspects;            // -> LockAspect[]
picker.isReadonly = true;        // full lock (same as the `readonly` attribute)
```

```html
<!-- Declarative full lock -->
<web-daterangepicker readonly></web-daterangepicker>
```

Each locked aspect adds a `.drp__picker--locked-{aspect}` modifier
(plus a `.drp__picker--locked` marker) inside the shadow root. A locked
region greys out like a disabled control and stops responding to the
pointer, while any unlocked aspect on the same calendar stays live and
full-opacity. The greying is driven by `--drp-opacity-locked` (default
`0.65`, inherited from `--drp-disabled-opacity`) — set it to `1` to keep
locked regions at full opacity.

### Responsive rules

Core's responsive rules (web-components-core `docs/SPEC.md` §6.7) override any input per
device or window width. A map has two axes, both keyed `mobile` / `tablet` / `desktop`:
`device` — core `classifyDevice` (touch capability first, then the 600px short side; the
same classes the `presentation="auto"` ladder uses; a mouse device is `desktop` at any
width) — and `breakpoint` — the window width (768 / 1024 px lines). Breakpoint applies
first, device over it (device wins on the same key). Own widths / combinations go in a
callback.

```ts
import type { DateRangePickerResponsiveMap, DateRangePickerResponsiveCallback } from '@keenmate/web-daterangepicker';

// page-wide (all KeenMate components) — unknown keys are skipped silently here
window.components.responsive = { device: { mobile: { visibleMonthCount: 1 } } };
// per tag
window.components['web-daterangepicker'].responsive = { device: { tablet: { presentation: 'fullscreen' } } };
window.components['web-daterangepicker'].responsiveCallback = (ctx) =>
  ctx.deviceClass === 'desktop' && ctx.env.viewportWidth > 1600 ? { visibleMonthCount: 3 } : undefined;

// per instance — property, or the JSON attribute responsive='{"device":{"mobile":{"presentation":"modal"}}}'
const map: DateRangePickerResponsiveMap = {
  device: { mobile: { presentation: 'modal' } },          // phones (touch)
  breakpoint: { mobile: { visibleMonthCount: 1 } },       // any window < 768px, incl. a narrowed desktop
};
picker.responsive = map;
const rule: DateRangePickerResponsiveCallback = (ctx) =>
  ctx.config.selectionMode === 'range' && ctx.deviceClass !== 'mobile' ? { visibleMonthCount: 2 } : undefined;
picker.responsiveCallback = rule;
```

- **Precedence** (later wins, key by key): global map → global callback → per-tag map →
  per-tag callback → **attributes / properties on the instance** → instance map → instance
  callback. A page rule never overrides an attribute written on the element.
- `undefined` = nothing to add; `null` from an **instance** rule = ignore every page rule.
- `el.config` / the property getters report the **effective** value; `ctx.config` is the
  base (no responsive overrides). Overrides never reflect to attributes; a key a rule stops
  returning returns to its base value. Invalid values / unknown keys warn and are skipped.
- Rules re-run on a device-class / breakpoint / orientation change and whenever a layer
  changes; only changed keys are applied (one batch — `presentation` swaps in place, a
  structural key such as `visibleMonthCount` rebuilds with the selection kept). They apply
  before the first build.

## Range selection modes

When selecting date ranges that include disabled dates (e.g., a working
week where weekends are disabled), the `disabled-dates-handling`
attribute controls how the selection is handled.

### Mode: `'allow'` (default)

Allows range selections over disabled dates. Returns both enabled and
disabled date arrays:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="allow">
</web-daterangepicker>

<script>
picker.addEventListener('change', (e) => {
  console.log('Enabled dates:',  e.detail.enabledDates);
  console.log('Disabled dates:', e.detail.disabledDates);
  console.log('Total days:',     e.detail.getTotalDays());
  console.log('Enabled count:',  e.detail.getEnabledDateCount());
});
</script>
```

**Use case:** Selecting working weeks where you need to know both
working days and weekends (e.g., "Select 3 weeks of work" where
weekends are included in the range but you get a separate array of
working days).

### Mode: `'prevent'`

Prevents selecting disabled dates entirely. Clicking a disabled date
does nothing:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-dates-handling="prevent">
</web-daterangepicker>
```

**Use case:** Strict date selection where disabled dates should never
be part of any selection.

### Mode: `'block'`

Prevents range selections from crossing disabled dates. Automatically
snaps to the last enabled date before the gap:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-dates-handling="block">
</web-daterangepicker>
```

When dragging from day 1 to day 7 with days 4–5 disabled, the selection
snaps to days 1–3.

**Use case:** Cottage booking where you can't book across existing
reservations, or any scenario where gaps in the range aren't allowed.

### Mode: `'split'`

Returns multiple date ranges separated by disabled dates:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="split">
</web-daterangepicker>

<script>
picker.addEventListener('change', (e) => {
  console.log('Ranges:', e.detail.dateRanges);
  // e.g., [{start: Mon, end: Fri}, {start: Mon, end: Fri}, {start: Mon, end: Fri}]
  console.log('Formatted:', e.detail.formattedValue);
  // "2025-11-03 - 2025-11-07, 2025-11-10 - 2025-11-14, 2025-11-17 - 2025-11-21"
});
</script>
```

**Use case:** Reporting or analytics where you need distinct time
periods (e.g., "Generate report for these 3 work weeks").

### Mode: `'individual'`

Returns a flat array of individual enabled dates:

```html
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="individual">
</web-daterangepicker>

<script>
picker.addEventListener('change', (e) => {
  console.log('Individual dates:', e.detail.dates);
  // [Date(Mon), Date(Tue), Date(Wed), Date(Thu), Date(Fri), Date(Mon), ...]
  console.log('Formatted:', e.detail.formattedValue);
  // "2025-11-03, 2025-11-04, 2025-11-05, 2025-11-06, 2025-11-07, ..."
});
</script>
```

**Use case:** Scheduling or event planning where you need a list of
specific dates (e.g., "Schedule training sessions on these dates").

### Event detail structure by mode

| Mode | Properties | Description |
|---|---|---|
| `allow` | `dateRange`, `enabledDates`, `disabledDates`, `getTotalDays()`, `getEnabledDateCount()` | Full range with helper methods |
| `prevent` | `dateRange`, `dates` | Only enabled dates can be selected |
| `block` | `dateRange`, `dates` | Single continuous range (no disabled dates) |
| `split` | `dateRanges`, `dates` | Multiple ranges split by disabled dates |
| `individual` | `dates` | Flat array of enabled dates |

### Visual highlighting control

By default, when you select a range that includes disabled dates, all
dates (both enabled and disabled) within the range are visually
highlighted. The `highlight-disabled-in-range` attribute toggles
this:

```html
<!-- Default: highlights all dates in range, including disabled weekends -->
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="split">
</web-daterangepicker>

<!-- Only highlight enabled dates (Mon-Fri), skip weekends -->
<web-daterangepicker
  selection-mode="range"
  disabled-weekdays="0,6"
  disabled-dates-handling="split"
  highlight-disabled-in-range="false">
</web-daterangepicker>
```

**When to use `highlight-disabled-in-range="false"`:**

- Selecting working weeks where you only want Monday–Friday highlighted.
- Visual clarity when disabled dates aren't relevant to the selection.
- Any scenario where showing gaps in the range is clearer than continuous highlighting.

## See also

- [`theming.md`](./theming.md) — the four theming contracts (container, variable, color-scheme, cascade-layer).
- [`examples.md`](./examples.md) — index of the runnable `examples-*.html` demos.
- [`accessibility.md`](./accessibility.md) — keyboard shortcuts, ARIA, focus management.
- [`examples-data-api.html`](../examples-data-api.html) — full standalone-class examples with every callback wired up.
