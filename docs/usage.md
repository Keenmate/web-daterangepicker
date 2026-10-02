# Usage / API reference — `@keenmate/web-daterangepicker`

The full public surface of the component: every attribute, property,
method, event, and the advanced callbacks. For just getting it on the
page see the README quick start; for theming see
[`theming.md`](./theming.md); for keyboard / a11y see
[`accessibility.md`](./accessibility.md).

## Contents

- [JavaScript instantiation (`DateRangePicker` class)](#javascript-instantiation-datepickerangepicker-class)
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
  - [Date selection validation (`beforeDateSelectCallback`)](#date-selection-validation-beforedateselectcallback)
  - [Bulk metadata loading (`beforeMonthChangedCallback`)](#bulk-metadata-loading-beforemonthchangedcallback)
  - [Messages & custom actions](#messages--custom-actions)
  - [Locking (read-only)](#locking-read-only)
- [Range selection modes](#range-selection-modes)

## JavaScript instantiation (`DateRangePicker` class)

If you prefer the `DateRangePicker` class directly instead of the
`<web-daterangepicker>` custom element, you get full programmatic
control:

```ts
import { DateRangePicker } from '@keenmate/web-daterangepicker';
// IMPORTANT: import CSS separately — the web component auto-injects,
// the class doesn't.
import '@keenmate/web-daterangepicker/dist/style.css';

const inputElement = document.getElementById('my-input');

const picker = new DateRangePicker(inputElement, {
  selectionMode: 'range',
  visibleMonthsCount: 2,
  dateFormatMask: 'YYYY-MM-DD',
  onSelect: (detail) => {
    // Range mode: detail is { start: Date, end: Date }
    console.log('Range:', detail.start, 'to', detail.end);
  }
});
```

### ⚠️ CSS requirements

Unlike the web component, the `DateRangePicker` class does **not**
automatically inject styles. You must load the CSS separately or you'll
see an unstyled calendar. Pick one:

**Option 1 — import CSS in JavaScript (recommended):**
```ts
import { DateRangePicker } from '@keenmate/web-daterangepicker';
import '@keenmate/web-daterangepicker/dist/style.css';
```

**Option 2 — link CSS in HTML:**
```html
<link rel="stylesheet" href="./node_modules/@keenmate/web-daterangepicker/dist/style.css">
```

**Option 3 — programmatic injection:**
```ts
import { DateRangePicker } from '@keenmate/web-daterangepicker';

DateRangePicker.injectGlobalStyles();  // once, before creating pickers

const picker = new DateRangePicker(inputElement, options);
```

**Why?** The web component uses Shadow DOM and injects styles into its
isolated scope automatically. The `DateRangePicker` class creates
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
| `visible-months-count` | `number` | `1` (single), `2` (range) | Number of months to display |
| `calendar-open-trigger` | `'focus' \| 'typing' \| 'manual'` | `'focus'` | How the calendar opens (focus = on input focus, typing = when user types, manual = programmatic only) |
| `value` | `string` | — | Current value |
| `placeholder` | `string` | — | Input placeholder |
| `disabled` | `boolean` | `false` | Disable the picker |
| `week-start-day` | `'auto' \| 0–6` | `'auto'` | First day of week (0 = Sunday, 1 = Monday, …; `'auto'` detects from locale) |
| `min-date` | `string` | — | Minimum selectable date (`YYYY-MM-DD`) |
| `max-date` | `string` | — | Maximum selectable date (`YYYY-MM-DD`) |
| `disabled-weekdays` | `string` | — | Comma-separated day numbers to disable (e.g., `"0,6"` for weekends) |
| `disabled-dates` | `string` | — | Comma-separated ISO dates to disable (e.g., `"2026-06-13, 2026-06-14, 2026-12-25"`). The `disabledDates` property still wins if both paths are set. |
| `disabled-dates-handling` | `'allow' \| 'prevent' \| 'block' \| 'split' \| 'individual'` | `'allow'` | How to handle range selections over disabled dates (see [Range selection modes](#range-selection-modes)) |
| `display-format-mask` | `string` | Same as `date-format-mask` | Localized format hint shown to users (`'dd/mm/aaaa'` Spanish, `'tt.mm.jjjj'` German, …). Used as input placeholder when no explicit `placeholder` is set. Validation still uses `date-format-mask`. |
| `should-highlight-disabled-in-range` | `boolean` | `true` | Highlight disabled dates within a selected range. `false` = only highlight enabled dates. |
| `commit-mode` | `'selection' \| 'apply' \| 'manual'` | `'selection'` (`'apply'` for time/datetime and `multiple` mode) | How a selection is committed and when the calendar closes. `selection` = commit and close as soon as the pick completes, no Apply button; `apply` = render an Apply button and stage the pick until it is clicked; `manual` = never auto-commit or auto-close and render no built-in Apply button (app drives commit/close via custom action buttons) |
| `positioning-mode` | `'inline' \| 'floating' \| 'modal'` | `'floating'` | Calendar positioning (inline = embedded, floating = popup anchored to input, modal = centered overlay with backdrop) |
| `mobile-presentation` | `'auto' \| 'floating' \| 'modal' \| 'fullscreen'` | `'auto'` | How a **floating** picker adapts to the device (SPEC §12.9). `auto`: **phone** (touch, shorter viewport side < 600px) → full-screen overlay; **tablet** (touch, ≥ 600px) → centered modal; **desktop** (mouse) → floating popover. A concrete value forces that presentation on any device (e.g. `fullscreen` to preview the phone sheet on desktop). `inline` / explicit `modal` pickers are left as authored. |
| `fullscreen-title` | `string` | — | Optional heading in the phone full-screen header, beside the ✕ close button. |
| `fullscreen-autofocus` | `boolean` | `false` | Phone full-screen only: focus the input on open (pops the soft keyboard). Default off — the sheet opens with the calendar visible, keyboard closed. |
| `is-summary-shown` | `boolean` | `true` | Show range-mode days/nights summary block. `false` = omit entirely (no empty-div jump). |
| `input-size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Input field size (floating/modal modes only) |
| `enable-transitions` | `boolean` | `false` | Enable CSS transitions/animations |
| `name` | `string` | — | HTML form field name. Set it to submit the selection in a `<form>` (see [Form integration](#form-integration)) |
| `value-format` | `'iso' \| 'json' \| 'array'` | `'iso'` | How the submitted value is serialized (see [Form integration](#form-integration)) |
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
picker.value = '2025-11-15';
picker.disabled = true;

// Complex data (arrays / objects / callbacks) — set via property, not attribute
picker.disabledDates = ['2026-06-13', '2026-06-14'];
picker.specialDates  = [{ date: '2026-12-25', badgeText: '🎄', badgeTooltip: 'Christmas' }];

// Localization overrides
picker.customStrings = { today: 'Jump', clear: 'Wipe' };
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
| `selectedRanges` | get / set | `DateRange[]` | range / multiple mode |
| `selectedStartDate` | get | `Date \| null` | range start (set a range via `selectedRanges`) |
| `selectedEndDate` | get | `Date \| null` | range end |
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
| `getInputValue()` | Get the current value as a string |
| `setInputValue(value: string)` | Set the value |
| `showMessage(html, type?, autoHide?)` | Display a message in the calendar with custom HTML content |
| `hideMessage()` | Hide the currently displayed message |
| `toggleMessage(html?, type?, autoHide?)` | Toggle the message block |
| `showSummary(html: string)` | Write custom HTML into the summary block; pins it (survives hover preview) until the next selection change |
| `hideSummary()` | Drop the summary override and re-derive from selection |
| `refreshSummary()` | Re-run summary derivation now (e.g. after async data arrives) |
| `showLoader(target?)` | Show a spinner — `target`: `'calendar'` (default, overlay) \| `'message'` \| `'summary'` (in-block) |
| `hideLoader(target?)` | Hide the loader for a target |
| `toggleLoader(target?)` | Toggle the loader for a target |
| `lock(aspects?)` | Freeze user interaction. No argument = full lock; pass a `LockAspect` or array to lock a subset. See [Locking](#locking-read-only) |
| `unlock(aspects?)` | Release the given aspect(s), or the whole lock when called with no argument |
| `toggleLock(aspects?)` | Toggle the given aspect(s), or the whole lock |
| `isAspectLocked(aspect)` | `boolean` — whether that aspect is currently locked |

Read-only properties/attributes for locking: `lockedAspects` (`LockAspect[]` getter), `readonly` (boolean property + reflected attribute — full-lock convenience).

## Events

| Event | Detail | Description |
|---|---|---|
| `date-select` | `SelectEventDetail` (`{ date?, dateRange?, formattedValue, … }`) | Fired when a date is selected |
| `change` | `SelectEventDetail` | Fired when the selection changes |
| `custom-action` | `{ data: { [key: string]: string }, picker }` | Fired when a button with `data-action="custom"` is clicked. `data` holds all `data-*` attributes as camelCase keys (e.g. `e.detail.data.startDate`). |

> There are no separate `apply` or `cancel` events. The Apply button
> commits the pending selection and dispatches `change`. Pressing
> Escape with an uncommitted selection silently restores the input
> value and fires nothing.

## Form integration

Give the element a `name` and it participates in a `<form>` like a native
control — no wrapper or manual hidden input needed. It works the same in
`inline`, `floating`, and `modal` modes:

```html
<form>
  <web-daterangepicker name="checkin" selection-mode="single"></web-daterangepicker>
  <button>Submit</button>
</form>
```

Under the hood the control renders a light-DOM hidden `<input>` inside the form
(the same approach as `<web-multiselect>`) and clears it on `form.reset()`. It
also exposes `el.form` / `event.target.form`, so frameworks that delegate form
changes by reading `target.form` (e.g. Phoenix LiveView's `phx-change`) resolve
the parent form correctly.

**The submitted value is always stable ISO-8601** — independent of
`date-format-mask` / `display-format-mask`, so a locale display mask never leaks
into your form data. `value-format` picks how the selection is serialized:

| `value-format` | Single | Range | Multiple |
|---|---|---|---|
| `iso` (default) | `2026-06-15` | `2026-06-15/2026-06-20` | comma-joined |
| `json` | `"2026-06-15"` | `{"start":"…","end":"…"}` | JSON array |
| `array` | one `name[]` field | two `name[]` fields (`start`, `end`) | one `name[]` per item |

- `datetime` mode submits `YYYY-MM-DDTHH:mm[:ss]`; `time` mode submits
  `HH:mm[:ss]` (seconds when `is-seconds-shown`).
- The submitted value tracks the *real* selection, not the drawn envelope: a range
  broken over disabled days with `disabled-dates-handling="split"` submits each
  sub-range (`…/…,…/…`), and `"individual"` / `"block"` submit the enabled days.
- For full control, set the **`getValueFormatCallback`** property — it receives
  the normalized ISO selection snapshot (`{ selectionMode, pickerMode, items }`,
  where each item is an ISO string or `{ start, end }`) and returns the single
  field value:

  ```js
  picker.getValueFormatCallback = ({ items }) => items.join('|');
  ```

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
picker.setInputValue("2026-04-30");                  // picker handles parsing internally
picker.value = "2026-04-30";                         // attribute setter
```

### Quick checklist

- [ ] Picker callbacks: format Dates with `toLocalISO()`, not `toISOString()`
- [ ] Outgoing dates (server, URL, localStorage): send `YYYY-MM-DD` strings
- [ ] Incoming dates: prefer `picker.setInputValue("YYYY-MM-DD")` over manual `new Date(...)` parsing
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
const picker = document.querySelector('web-daterangepicker');

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
via `customStylesCallback`. See the [consumer-data class convention
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
`customStylesCallback`:

```js
picker.customStylesCallback = () => `
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

### Date selection validation (`beforeDateSelectCallback`)

Validate or modify date selections before they're applied. Supports
async validation (e.g., API calls):

```js
const picker = document.querySelector('web-daterangepicker');

picker.beforeDateSelectCallback = async (ctx) => {
  // ctx = { mode, date?, range?, subRanges?, enabledDates?, picker }
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
    return {
      action: 'restore',
      message: message,
      showInvalidRange: true  // keep selection visible with error styling
    };
  }

  return { action: 'accept' };
};
```

**Return object options:**

| Property | Type | Description |
|---|---|---|
| `action` | `'accept' \| 'adjust' \| 'restore' \| 'clear'` | **Required.** What to do with the selection |
| `message` | `string` | Optional message to display in the calendar |
| `showInvalidRange` | `boolean` | With `action: 'restore'`, keeps the invalid selection visible with red error styling |
| `adjustedDate` | `Date` | For `action: 'adjust'` in single mode — the corrected date |
| `adjustedStartDate` | `Date` | For `action: 'adjust'` in range mode — the corrected start date |
| `adjustedEndDate` | `Date` | For `action: 'adjust'` in range mode — the corrected end date |
| `adjustedRanges` | `DateRange[]` | Range mode, with `action: 'accept'` or `'adjust'` — replace the single proposed range with N independent ranges (see "Returning multiple ranges") |

**Action behaviors:**

- **`accept`** — apply the selection as-is. Hides any existing message.
- **`adjust`** — apply corrected dates instead (use with `adjustedDate` or `adjustedStartDate` / `adjustedEndDate`, or `adjustedRanges` for multiple ranges).
- **`restore`** — revert to previous selection. Use `showInvalidRange: true` to show what was attempted.
- **`clear`** — clear the selection entirely.

**Split-aware validation (`ctx.subRanges` / `ctx.enabledDates`):**

In range mode the callback receives the contiguous *envelope* between the two endpoints — `ctx.range` may straddle disabled days. When `disabledDatesHandling` is `'split'` or `'individual'`, the context also carries the carved-out pieces so you don't have to re-derive them:

- `ctx.subRanges` — `DateRange[]`, the envelope split into enabled-only segments (split mode only; identical to `picker.splitRangeByDisabled(start, end)`).
- `ctx.enabledDates` — `Date[]`, the flat enabled-day list inside the envelope (split + individual).

```js
picker.beforeDateSelectCallback = (ctx) => {
  // Reject if any enabled-only segment exceeds 7 nights
  if (ctx.subRanges?.some(r => (r.end - r.start) / 86400000 > 7)) {
    return { action: 'restore', message: 'No segment may exceed 7 nights', showInvalidRange: true };
  }
  return { action: 'accept' };
};
```

**Returning multiple ranges (`adjustedRanges`):**

A range-mode callback can commit **N independent ranges** instead of the single proposed span — e.g. to keep the enabled-only pieces of a split selection, or to punch a hole out of a range. Return `adjustedRanges` with `action: 'accept'` or `'adjust'`:

```js
picker.beforeDateSelectCallback = (ctx) => {
  // Turn a range straddling disabled days into its enabled-only segments
  if (ctx.subRanges && ctx.subRanges.length > 1) {
    return { action: 'adjust', adjustedRanges: ctx.subRanges,
             message: 'Selection split around unavailable days' };
  }
  return { action: 'accept' };
};
```

When `adjustedRanges` is returned:

- `picker.selectedRanges` reflects the array; each range's start/end/in-range cells are highlighted in the grid, and the summary lists every piece.
- `onSelect` receives the `DateRange[]` (not a single `{ start, end }`).
- The read-only envelope accessors `selectedStartDate` / `selectedEndDate` span the first range's start through the last range's end.
- Assigning `picker.selectedRanges = [...]` directly in range mode renders identically — the callback path and the programmatic setter share the same multi-range machinery.
- Starting a fresh range selection clears the multi-range result back to a single contiguous range.
- The callback fires the same way whichever way a range is completed — **clicking, dragging, or typing** the second date into the input. (Typing a single date in single mode still doesn't run the callback.)

**Example — minimum-nights validation with error display:**

```js
picker.beforeDateSelectCallback = (ctx) => {
  const range = ctx.range;
  const nights = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));

  if (nights < 2) {
    return {
      action: 'restore',
      message: 'Minimum 2 nights required',
      showInvalidRange: true
    };
  }

  if (nights > 14) {
    return {
      action: 'restore',
      message: 'Maximum 14 nights allowed',
      showInvalidRange: true
    };
  }

  return { action: 'accept' };
};
```

### Bulk metadata loading (`beforeMonthChangedCallback`)

Load metadata for all visible dates in a single API call when the user
navigates months. Much more efficient than `getDateMetadataCallback`
(which fires per-date):

```js
const picker = document.querySelector('web-daterangepicker');

picker.beforeMonthChangedCallback = async (context) => {
  // context: { year, month, monthIndex, firstVisibleDate, lastVisibleDate }

  // Fetch availability for all visible dates in one call.
  // Use toLocalISO (see "Working with dates across timezones") so the
  // server receives the calendar dates the user actually sees.
  const response = await fetch('/api/availability', {
    method: 'POST',
    body: JSON.stringify({
      start: toLocalISO(context.firstVisibleDate),
      end: toLocalISO(context.lastVisibleDate)
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

  return { action: 'accept', metadata };
};
```

**Return object options:**

| Property | Type | Description |
|---|---|---|
| `action` | `'accept' \| 'block'` | **Required.** Allow or prevent month navigation |
| `metadata` | `Map<string, DayMetadata>` | Bulk metadata keyed by `YYYY-MM-DD`. Cached and used instead of `getDateMetadataCallback`. |
| `monthHeaders` | `Map<string, string>` | Custom month headers keyed by `YYYY-MM` (`"2026-01"` → `"Jan 2026 (5 rooms)"`) |
| `message` | `string` | Optional message to display (useful with `action: 'block'`) |

**Performance:** 1 API call per month navigation vs 35–42 calls with
`getDateMetadataCallback`.

### Messages & custom actions

Display contextual messages in the calendar with interactive buttons:

```js
const picker = document.querySelector('web-daterangepicker');

// Simple message
picker.showMessage('<p>Please select a check-in date</p>');

// Message with close button
picker.showMessage(`
  <p>Weekend dates have higher rates</p>
  <button data-action="close-message">Got it</button>
`);

// Message with custom action buttons
picker.showMessage(`
  <p>These dates are unavailable. Try:</p>
  <button data-action="custom" data-start-date="2026-01-14" data-end-date="2026-01-17">
    Jan 14 – Jan 17
  </button>
`);

// Handle custom action clicks — data-* attributes live under e.detail.data
picker.addEventListener('custom-action', (e) => {
  const { startDate, endDate } = e.detail.data;
  if (startDate && endDate) {
    picker.selectedRanges = [{
      start: new Date(startDate),
      end: new Date(endDate)
    }];
    picker.hideMessage();
  }
});

// Hide programmatically
picker.hideMessage();
```

**Built-in button actions:**

- `data-action="close-message"` — closes the message (no event fired).
- `data-action="custom"` — fires the `custom-action` event; all `data-*` attributes are exposed as camelCase keys under `e.detail.data`.

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
| `open` | (re)opening the popover (floating & modal). Closing (hide / Escape / backdrop) stays allowed, so a locked picker is never a keyboard trap |

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
picker.readonly = true;          // full lock; reflects to the `readonly` attribute
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
`0.6`, inherited from `--drp-opacity-disabled`) — set it to `1` to keep
locked regions at full opacity.

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
picker.addEventListener('date-select', (e) => {
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
picker.addEventListener('date-select', (e) => {
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
picker.addEventListener('date-select', (e) => {
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
highlighted. The `should-highlight-disabled-in-range` attribute toggles
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
  should-highlight-disabled-in-range="false">
</web-daterangepicker>
```

**When to use `should-highlight-disabled-in-range="false"`:**

- Selecting working weeks where you only want Monday–Friday highlighted.
- Visual clarity when disabled dates aren't relevant to the selection.
- Any scenario where showing gaps in the range is clearer than continuous highlighting.

## See also

- [`theming.md`](./theming.md) — the four theming contracts (container, variable, color-scheme, cascade-layer).
- [`examples.md`](./examples.md) — index of the runnable `examples-*.html` demos.
- [`accessibility.md`](./accessibility.md) — keyboard shortcuts, ARIA, focus management.
- [`examples-data-api.html`](../examples-data-api.html) — full standalone-class examples with every callback wired up.
