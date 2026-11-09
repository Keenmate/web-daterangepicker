/**
 * `<web-daterangepicker>` — the custom element, now built on
 * `@keenmate/web-components-core` (`BlissElement`).
 *
 * All the custom-element plumbing that used to live here by hand — the
 * `ATTRIBUTE_TABLE`, `observedAttributes`, `attributeChangedCallback`, the
 * `AttrParser` helpers, `DUAL_PATH_KEYS`, the microtask reinit batcher, and the
 * ~35 property/callback getters/setters — is now declared ONCE as a core input
 * table (`static inputs`) plus an event table (`static events`). Core owns
 * parsing, validation, reactivity coalescing, reflection, pre-upgrade lifting,
 * and the managed `on<Name>` handler properties. This file keeps only what is
 * genuinely daterangepicker-specific: the bridge from the merged `config` to the
 * real calendar engine (`DateRangePicker` in `date-picker.ts`), the input-element
 * shell, the device-adaptive presentation (SPEC §12.9), and the imperative API.
 *
 * Reactivity is declared per input via `on:`, derived from the engine's own
 * `updateOptions()` STRUCTURAL_KEYS:
 *   - `reinit`  — structural (selectionMode, positioningMode, layout, pickerMode…)
 *                 → rebuild the picker.
 *   - `update`  — everything the engine can patch in place → `updateOptions()`.
 * A mixed batch runs `reinit()` only (the rebuild absorbs the update keys).
 */
import {
  BlissElement,
  toBool,
  toEnum,
  toInt,
  toText,
  toFunction,
  toObject,
  toObjectArray,
  toValue,
  adoptStyles,
  createCustomStyles,
  extractConsumedCssVars,
  lintCssVars,
  getEnvironment,
  resolvePresentation,
  type InputDef,
  type CustomStylesHandle,
  type EnvironmentSnapshot,
  type ElementSize,
  type Presentation,
} from '@keenmate/web-components-core';
import { DateRangePickerEngine } from './date-picker';
import { resolveLabels } from './date-picker-locales';
import { toWeekStartDay, toDisabledWeekdays, toDisabledDates, toPipeList, toYearRange } from './converters';
import {
  serializeFormValue, toEngineValueText, isoDate, isoDateTime, isoTime,
  type FormValueFormat, type FormValueSelection, type FormValueItem, type FormValueWriteOptions,
} from './form-value';
import type {
  DateRangePickerConfig,
  DatePickerOptions, DateRange, DecoratedDate, DayContext, DayMetadata, BeforeSelectResult,
  DateRangePickerActionItem, DateRangePickerActionEventDetail, DateRangePickerController, DateRangePickerLabels,
  BeforeSelectContext, MonthChangeContext, BeforeMonthChangeResult, MonthDataResult, MonthChangeEventDetail,
  ReadyEventDetail, OpenEventDetail, CloseEventDetail, SummaryContext, UnifiedHeaderContext, MonthHeaderContext, LoaderTarget, LockAspect,
  ChangeEventDetail, SelectedTime, MonthDisplay, PickerContext, ShowMessageOptions, ValueFormatErrorEventDetail,
} from './types';
import styles from './css/main.css?inline';

// Dev-mode custom-styles lint: the set of `--drp-*` names the component's own
// stylesheet actually consumes, used as the ground truth for typo detection in
// author-injected CSS (custom-styles attribute / getCustomStylesCallback). Computed
// once, lazily — parsing the full stylesheet is not free.
let consumedDrpVarsCache: Set<string> | null = null;
function consumedDrpVars(): Set<string> {
  return (consumedDrpVarsCache ??= extractConsumedCssVars(styles, '--drp-'));
}

// Build-time constant (Vite define).
declare const __VERSION__: string;

// ── enum value sets (shared with the CEM manifest via toEnum introspection) ──
const SELECTION_MODES = ['single', 'range', 'multiple'] as const;
const TRIGGERS = ['focus', 'typing', 'manual'] as const;
const MONTH_LAYOUTS = ['horizontal', 'grid'] as const;
const POSITIONING_MODES = ['inline', 'floating'] as const;
const PRESENTATIONS = ['auto', 'floating', 'modal', 'fullscreen'] as const;
const DISABLED_HANDLING = ['allow', 'prevent', 'block', 'split', 'individual'] as const;
const COMMIT_MODE = ['selection', 'apply', 'manual'] as const;
const PICKER_MODES = ['date', 'time', 'datetime'] as const;
const HOUR_CYCLES = ['h12', 'h24'] as const;
const TIME_DISPLAYS = ['rolls', 'clock', 'wheel', 'compact'] as const;
const VALUE_FORMATS = ['text', 'json', 'array'] as const;
const INPUT_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const PLACEMENTS = [
  'top', 'top-start', 'top-end', 'right', 'right-start', 'right-end',
  'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end',
] as const;

/** Any callback input. */
const cb = (): ReturnType<typeof toFunction> => toFunction();

// ============================================================================
// INPUT TABLE — the whole @keenmate/web-daterangepicker public surface.
// ============================================================================
const INPUTS: readonly InputDef[] = [
  // ── Structural (→ reinit): a change here rebuilds the picker ──────────────
  { configKey: 'selectionMode',                attribute: 'selection-mode',                converter: toEnum(SELECTION_MODES, { default: 'single' }), on: 'reinit', description: 'Selection behavior: `single` day, `range`, or `multiple` days/ranges.' },
  { configKey: 'positioningMode',              attribute: 'positioning-mode',              converter: toEnum(POSITIONING_MODES, { default: 'floating' }), on: 'reinit', description: 'Where the calendar lives: `inline` (always visible, no input) or `floating` (opens from an input). How a floating picker opens — popover, centered modal or phone full-screen sheet — is `presentation`.' },
  { configKey: 'calendarOpenTrigger',          attribute: 'calendar-open-trigger',         converter: toEnum(TRIGGERS, { default: 'focus' }), on: 'reinit', description: 'What opens the floating calendar: `focus`, `typing`, or `manual` (only `open()`).' },
  { configKey: 'overlayGroup',                 attribute: 'overlay-group',                 converter: toText({ isNullable: true }), on: 'reinit', description: 'Scope the "one overlay open at a time" coordination to a named group. Overlays (datepickers, multiselects, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group.' },
  { configKey: 'visibleMonthCount',            attribute: 'visible-month-count',           converter: toInt({ min: 1 }), on: 'reinit', description: 'Number of month columns shown side-by-side.' },
  { configKey: 'monthLayout',                  attribute: 'month-layout',                  converter: toEnum(MONTH_LAYOUTS), on: 'reinit', description: 'Multi-month arrangement: a horizontal row or a `grid` (see grid-rows/grid-columns).' },
  { configKey: 'gridRows',                     attribute: 'grid-rows',                     converter: toInt({ min: 1 }), on: 'reinit', description: 'Rows in the month grid when month-layout is `grid`.' },
  { configKey: 'gridColumns',                  attribute: 'grid-columns',                  converter: toInt({ min: 1 }), on: 'reinit', description: 'Columns in the month grid when month-layout is `grid`.' },
  { configKey: 'isUnifiedNavigationEnabled',   attribute: 'enable-unified-navigation',     converter: toBool('default-false'), on: 'reinit', description: 'In grid layouts, drive the whole grid from one anchor month instead of per-column navigation.' },
  { configKey: 'unifiedNavigationAnchorIndex', attribute: 'unified-navigation-anchor-index', converter: toInt(), on: 'reinit', description: 'Which month index anchors unified navigation.' },
  { configKey: 'pickerMode',                   attribute: 'picker-mode',                   converter: toEnum(PICKER_MODES, { default: 'date' }), on: 'reinit', description: 'Whether the control picks a `date`, a `time`, or a `datetime`.' },
  { configKey: 'isSecondsShown',               attribute: 'show-seconds',                  converter: toBool('tristate'), on: 'reinit', description: 'Show a seconds field in time/datetime mode.' },
  { configKey: 'hourCycle',                    attribute: 'hour-cycle',                    converter: toEnum(HOUR_CYCLES), on: 'reinit', description: '12- or 24-hour clock for time/datetime mode.' },
  { configKey: 'isSummaryShown',               attribute: 'show-summary',                  converter: toBool('tristate'), on: 'reinit', description: 'Show the range summary (day/night counts) block.' },

  // ── In-place (→ update): the engine patches these without a rebuild ───────
  { configKey: 'dateFormatMask',               attribute: 'date-format-mask',              converter: toText({ default: 'YYYY-MM-DD' }), on: 'update', description: 'The SHOWN date text: how the selected date is written into the input, and how typed / `value` text is parsed (YYYY/YY, MM/M, DD/D with any separators). Not the submitted value — see `value-format` / `value-format-mask`. Not the placeholder hint — see `placeholder-format-mask`.' },
  { configKey: 'placeholderFormatMask',        attribute: 'placeholder-format-mask',       converter: toText({ isNullable: true }), on: 'update', description: 'The date part of the input PLACEHOLDER hint (when no explicit `placeholder`) — a localized form of the mask, e.g. `dd.mm.rrrr`; unset falls back to `date-format-mask`. Only the hint: the shown text follows `date-format-mask`, the submitted value `value-format`. `range` mode doubles it around " - " (`dd.mm.rrrr - dd.mm.rrrr`); `datetime` appends the time hint (`placeholder-time-format-mask`).' },
  { configKey: 'isUnifiedHeaderInteractive',   attribute: 'unified-header-interactive',    converter: toBool('default-false'), on: 'update', description: 'Make the unified grid header clickable (opens the rolling selector).' },
  { configKey: 'calendarPlacement',            attribute: 'calendar-placement',            converter: toEnum(PLACEMENTS, { isNullable: true }), on: 'update', description: 'Where the floating calendar opens next to the input: `top` | `right` | `bottom` | `left`, each optionally `-start` / `-end` (flips when it doesn\'t fit). Unset = `bottom-start`. Read at each open.' },
  { configKey: 'weekStartDay',                 attribute: 'week-start-day',                converter: toWeekStartDay(), on: 'update', type: "'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6", description: 'First column of the week: `auto` (locale) or a weekday index 0 (Sunday)–6 (Saturday).' },
  { configKey: 'minDate',                      attribute: 'min-date',                      converter: toText({ isNullable: true }), on: 'update', description: 'Earliest selectable date (ISO string).' },
  { configKey: 'maxDate',                      attribute: 'max-date',                      converter: toText({ isNullable: true }), on: 'update', description: 'Latest selectable date (ISO string).' },
  { configKey: 'initialDate',                  attribute: 'initial-date',                  converter: toText({ isNullable: true }), on: 'update', description: 'Month/date the calendar opens on when nothing is selected (ISO string).' },
  { configKey: 'disabledWeekdays',             attribute: 'disabled-weekdays',             converter: toDisabledWeekdays(), on: 'update', type: 'number[]', description: 'CSV of weekday indices (0=Sunday…6=Saturday) that cannot be selected.' },
  { configKey: 'disabledDates',                attribute: 'disabled-dates',                converter: toDisabledDates(), on: 'update', type: 'Array<Date | string>', description: 'Specific dates that cannot be selected. Attribute: CSV of ISO strings; property: array of Date or string.' },
  { configKey: 'disabledDatesHandling',        attribute: 'disabled-dates-handling',       converter: toEnum(DISABLED_HANDLING), on: 'update', description: 'Strategy for ranges that span disabled dates: `allow`, `prevent`, `block`, `split`, or `individual`.' },
  { configKey: 'shouldHighlightDisabledInRange', attribute: 'highlight-disabled-in-range',   converter: toBool('tristate'), on: 'update', description: 'Visually mark disabled dates that fall inside a selected range.' },
  { configKey: 'locale',                       attribute: 'locale',                        converter: toText({ default: 'auto' }), on: 'update', description: 'BCP-47 locale for the `Intl` month / weekday names, or `auto` (the browser language). UI strings are `labels`.' },
  { configKey: 'labels',                       attribute: 'labels',                        converter: toObject(), on: 'update', type: 'Partial<DateRangePickerLabels>', description: 'UI strings — a partial object over the English defaults: `today`, `clear`, `apply`, `now`, `close`, `preview`, `day` / `days` / `night` / `nights` and `selectionCount` (`{count}` placeholder), `time`, `am`, `pm`, `hours`, `minutes`, `seconds`, `fullscreenTitle` (heading in the phone full-screen sheet; empty = none), `valueFormatError` (validation message when `getValueFormatCallback` throws), `loading` (accessible label of the loaders). Property, or a JSON attribute: `labels=\'{"today":"Heute","days":"{count} Tage"}\'`. Month / weekday names come from `Intl` via `locale`.' },
  { configKey: 'monthNames',                   attribute: 'month-names',                   converter: toPipeList(12), on: 'update', type: 'string[]', description: 'Override month names. Attribute: 12 pipe-delimited names, index 0=January; property: `string[]`.' },
  { configKey: 'weekdayNames',                 attribute: 'weekday-names',                 converter: toPipeList(7), on: 'update', type: 'string[]', description: 'Override weekday names. Attribute: 7 pipe-delimited names, index 0=Sunday; property: `string[]`.' },
  { configKey: 'rollingYearRange',             attribute: 'rolling-year-range',            converter: toYearRange(), on: 'update', type: 'string | null', description: 'Years offered by the rolling year selector (and the navigable year span): one year `2024`, absolute `2022-2026`, relative `-5:+5` (signed sides count from TODAY\'s year, not the shown one) or mixed `2020:+2`. Unset: the shown year ±1 (or the min-date/max-date years). A malformed value warns and keeps the previous one.' },
  { configKey: 'rollingMonthRange',            attribute: 'rolling-month-range',           converter: toText({ isNullable: true }), on: 'update', description: 'Constrains the rolling month selector.' },
  { configKey: 'commitMode',                   attribute: 'commit-mode',                   converter: toEnum(COMMIT_MODE), on: 'update', description: 'How a selection is COMMITTED (written + `change`): `selection` — every completed pick is written; `apply` — picks are staged until the Apply button; `manual` — picks are only staged until the app calls `commit()` (no built-in button). Closing is separate: `close-on-select`, `close-on-outside-click`, `close-on-scroll`; closing without `commit()` discards a staged pick. Default `selection` (`apply` for time/datetime and `multiple`).' },
  { configKey: 'shouldCloseOnSelect',          attribute: 'close-on-select',               converter: toBool('tristate'), on: 'update', description: 'Close the calendar when a pick completes in `commit-mode="selection"` (default true). `false` keeps it open to adjust while every pick is still written — the booking.com flow. No effect in `apply` / `manual` (Apply / the app closes).' },
  { configKey: 'shouldCloseOnOutsideClick',    attribute: 'close-on-outside-click',        converter: toBool('tristate'), on: 'update', description: 'Close the floating calendar on a click outside it (the modal on a backdrop click). Default true — false when `commit-mode="manual"` unless set explicitly. A staged pick is discarded on close. Escape and `close()` always close.' },
  { configKey: 'shouldCloseOnScroll',          attribute: 'close-on-scroll',               converter: toBool('tristate'), on: 'update', description: 'Close the floating calendar when the page scrolls.' },
  { configKey: 'isTodayButtonShown',           attribute: 'show-today-button',             converter: toBool('tristate'), on: 'update', description: 'Show the “Today” action button.' },
  { configKey: 'isClearButtonShown',           attribute: 'show-clear-button',             converter: toBool('tristate'), on: 'update', description: 'Show the “Clear” action button.' },
  { configKey: 'timeFormatMask',               attribute: 'time-format-mask',              converter: toText({ default: 'HH:mm' }), on: 'update', description: 'The SHOWN time text (time / datetime modes): how the selected time is written into the input, and how typed / `value` text is parsed (HH/H, hh/h, mm, ss, a). Also derives the hour cycle / seconds. Not the submitted value — see `value-format` / `value-format-mask`. Not the placeholder hint — see `placeholder-time-format-mask`.' },
  { configKey: 'placeholderTimeFormatMask',    attribute: 'placeholder-time-format-mask',  converter: toText({ isNullable: true }), on: 'update', description: 'The time part of the input PLACEHOLDER hint (when no explicit `placeholder`) — e.g. `hh:mm`; unset falls back to `time-format-mask`. `time` mode shows it alone; `datetime` shows the date hint + " " + it. Only the hint: the shown text follows `time-format-mask`, the submitted value `value-format`.' },
  { configKey: 'timeStep',                     attribute: 'time-step',                     converter: toInt({ min: 1 }), on: 'update', description: 'Minute step for the time picker.' },
  { configKey: 'isNowButtonShown',             attribute: 'show-now-button',               converter: toBool('tristate'), on: 'update', description: 'Show the “Now” button in time/datetime mode.' },
  { configKey: 'timeDisplay',                  attribute: 'time-display',                  converter: toEnum(TIME_DISPLAYS, { default: 'rolls' }), on: 'update', description: 'Time-picker UI: `rolls`, `clock`, `wheel`, or `compact`.' },

  // ── Member mappings for the specialDates array (→ update) ─────────────────
  { configKey: 'dateMember',                   attribute: 'date-member',                   converter: toText({ isNullable: true }), on: 'update', description: 'Property name on a decorated-date object holding its date.' },
  { configKey: 'badgeTextMember',              attribute: 'badge-text-member',             converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a day badge’s text.' },
  { configKey: 'badgeClassMember',             attribute: 'badge-class-member',            converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a day badge’s CSS class.' },
  { configKey: 'dayClassMember',               attribute: 'day-class-member',              converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a day cell’s CSS class.' },
  { configKey: 'badgeTooltipMember',           attribute: 'badge-tooltip-member',          converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a badge tooltip string.' },
  { configKey: 'dayTooltipMember',             attribute: 'day-tooltip-member',            converter: toText({ isNullable: true }), on: 'update', description: 'Property name holding a day tooltip string.' },
  { configKey: 'isDisabledMember',             attribute: 'is-disabled-member',            converter: toText({ isNullable: true }), on: 'update', description: 'Property name flagging a decorated date as disabled.' },

  // ── Form integration (NON-picker; light-DOM hidden input[s], like web-multiselect) ──
  { configKey: 'name',                         attribute: 'name',                          converter: toText({ isNullable: true }), on: 'update', description: 'HTML form field name. When set, the control submits its selection as a light-DOM hidden `<input>` (`name[]` inputs for `value-format="array"`). Also read by core for `el.form` / `form.reset()`.' },
  { configKey: 'valueFormat',                  attribute: 'value-format',                  converter: toEnum(VALUE_FORMATS, { default: 'text' }), on: 'update', description: `The SUBMITTED form value (and \`el.value\`) — independent of the shown text (\`date-format-mask\` / \`time-format-mask\`) and the placeholder hint. Each date is written with \`value-format-mask\` (default ISO-8601); serialization:
Range mode always submits a LIST of ranges (one plain range, split pieces, or several).
- \`text\` (default) — one field; a single date/time as-is, each range as \`start{value-separator}end\` (ranges joined by \`,\`), multiple dates joined by \`value-separator\`.
- \`json\` — one field; single \`"date"\`, range \`[{"start":…,"end":…}, …]\`, multiple an array of \`"date"\` / \`{"start":…,"end":…}\` items (a range is always an object).
- \`array\` — multiple \`name[]\` fields: one per date, in range mode one per RANGE (\`start{value-separator}end\`).
Empty selection: \`''\` (\`text\` / \`json\`), no fields (\`array\`). \`getValueFormatCallback\` overrides all of it.` },
  { configKey: 'valueFormatMask',              attribute: 'value-format-mask',             converter: toText({ isNullable: true }), on: 'update', description: 'How each date is written in the SUBMITTED value (and `el.value`) — tokens `YYYY` `YY` `MM` `M` `DD` `D` `HH` `H` `hh` `h` `mm` `ss` `a`, anything else literal (e.g. `DD.MM.YYYY`, `DD.MM.YYYY HH:mm`). Unset = ISO-8601: `YYYY-MM-DD`, time `HH:mm[:ss]`, datetime `YYYY-MM-DDTHH:mm[:ss]` (seconds when shown). Also used to parse the `value` attribute / property (ISO and the displayed form are accepted too).' },
  { configKey: 'valueSeparator',               attribute: 'value-separator',               converter: toText({ isNullable: true }), on: 'update', description: 'Joins the dates in the `text` value format: between a range’s start and end (default `/`), between multiple dates (default `,`). E.g. `value-separator=" - "` → `03.11.2026 - 10.11.2026`. Also used to split the `value` attribute / property.' },
  { configKey: 'getValueFormatCallback',       converter: cb(), on: 'update', type: '(ctx: FormValueSelection & PickerContext) => string', description: 'Custom serialization of the submitted value; receives the normalized ISO selection snapshot (`selectionMode`, `pickerMode`, `items`) plus the picker context and returns the single hidden-input value (also what `el.value` returns). Overrides `value-format` / `value-format-mask` / `value-separator`. If it throws: logged, the field submits an empty string, the host is invalid (`labels.valueFormatError`) and `value-format-error` fires, until the next successful format. Property-only.' },

  // ── Element-level attributes (NON-picker; handled by this element) ────────
  { configKey: 'defaultValue',                 attribute: 'value',                         converter: toText({ isNullable: true, isEmptyAllowed: true }), on: 'update', description: 'The initial / default value — like a native input\'s `value` attribute (`defaultValue`): parsed into the selection on build and whenever the attribute changes, and restored by `form.reset()`. Accepts the submitted form (`value-format` / `value-format-mask` / `value-separator`), the displayed form (`date-format-mask` / `time-format-mask`) or ISO: `2026-06-10`, a range as two dates with any separator between them (`2026-06-10 - 2026-06-14`, `2026-06-10/2026-06-14`, `2026-06-10 to 2026-06-14`, en dash, …), multiple dates `,`-joined, `14:30`, `2026-06-10 14:30`. An unparseable value warns and leaves the selection empty. Not reflected — the `value` PROPERTY sets the current value without touching the attribute.' },
  { configKey: 'placeholder',                  attribute: 'placeholder',                   converter: toText({ isNullable: true }), on: 'update', description: 'Input placeholder. When unset, a format hint is derived: date mode — placeholder-format-mask / date-format-mask (`YYYY-MM-DD`), doubled in `range` mode (`YYYY-MM-DD - YYYY-MM-DD`); `time` — placeholder-time-format-mask / time-format-mask (`HH:mm`); `datetime` — the date hint + " " + the time hint.' },
  { configKey: 'isDisabled',                   attribute: 'disabled',                      converter: toBool('presence'), shouldReflect: true, on: 'update', description: 'Disable the control (like a native input: no interaction — the floating calendar does not open, an inline calendar is inert and greyed — not focusable, not submitted; calls from code keep working). Reflects (a form-associated host is disabled by its own `disabled` attribute). An ancestor `<fieldset disabled>` disables it too (core `isEffectivelyDisabled`) without changing `el.isDisabled`.' },
  { configKey: 'isReadonly',                   attribute: 'readonly',                      converter: toBool('presence'), shouldReflect: true, on: 'update', description: 'Read-only, like a native input (core SPEC §6.4): the user cannot change the value — no day / time picks, typing, Today / Now / Clear / Apply or action buttons, and the floating calendar does not open — but the input stays focusable, an inline calendar can still be browsed month to month, and the value is submitted. Calls from code (`value`, `selectedDate`, `el.controller`, …) keep working. Reflects. Locks the aspects `selection`, `actions`, `open`; use `lock()` / `lockedAspects` for other combinations.' },
  { configKey: 'inputSize',                    attribute: 'input-size',                    converter: toEnum(INPUT_SIZES, { default: 'md' }), on: 'update', description: 'Input size scale: `xs` | `sm` | `md` | `lg` | `xl` (floating only).' },
  { configKey: 'presentation',                 attribute: 'presentation',                  converter: toEnum(PRESENTATIONS, { default: 'auto' }), shouldReflect: true, on: 'update', description: 'How a `floating` picker opens (SPEC §12.9, via web-components-core). `auto` (default) follows the device: the floating popover on desktop, a centered `modal` on tablets, a full-screen sheet on phones (touch-primary + shorter viewport side < 600px, orientation-robust). `floating` / `modal` / `fullscreen` force that presentation on any device. Ignored when `positioning-mode` is `inline`. Resolved reactively from the device/viewport environment; tune it per device class with the core `responsive` rules.' },
  { configKey: 'shouldFullscreenAutofocus',    attribute: 'fullscreen-autofocus',          converter: toBool('default-false'), on: 'update', description: 'In the phone full-screen overlay, focus the date input on open (pops the soft keyboard for type-to-fill). Default off: the sheet opens with the calendar visible and the keyboard closed. No effect in floating/modal presentations.' },
  { configKey: 'isFullscreenInputShown',       attribute: 'show-fullscreen-input',         converter: toBool('default-false'), on: 'update', description: 'In the phone full-screen overlay, relocate the date input into the header so it is visible and typeable above the sheet (with a numeric keypad; the mask supplies the separators). Takes over the header row, so fullscreen-title is not shown alongside it. No effect in floating/modal presentations.' },
  { configKey: 'compactBelow',                 attribute: 'compact-below',                 converter: toInt({ min: 0 }), on: 'update', description: 'Container-responsive compaction threshold in CSS px. When the element’s OWN box is narrower than this, the calendar collapses to a single month and hides the Today/Clear buttons — keyed on the element box (core’s shared ResizeObserver), not the viewport, so a picker in a narrow column/sidebar compacts even on a wide monitor. Unset or `0` disables it. Purely presentational tweaks (padding, label→icon) belong in CSS `@container`; this drives the structural month-count change.' },

  // ── Complex property data (property-only) ─────────────────────────────────
  { configKey: 'specialDates',                 converter: toObjectArray(), on: 'update', type: 'DecoratedDate[]', description: 'Array of decorated-date objects (badges, tooltips, per-day classes). Property-only.' },
  { configKey: 'actionButtons',                converter: toValue({ validate: (v): v is unknown[] => Array.isArray(v) }), on: 'update', type: "(DateRangePickerActionItem | 'today' | 'now' | 'clear' | 'apply')[]", description: 'Footer action buttons (core `ActionItem`s). Built-ins: `action: \'today\' | \'now\' | \'clear\' | \'apply\'` (or the bare string); a custom button sets `id` (and no `action`). Clicks fire the `action` event. Property-only; when unset the built-ins for the mode apply.' },

  // ── Callbacks (property-only; cosmetic/data → update) ─────────────────────
  { configKey: 'getDateMetadataCallback',      converter: cb(), on: 'update', type: '(ctx: DayContext) => DayMetadata | null', description: 'Compute per-day metadata (badges, classes, disabled) dynamically.' },
  { configKey: 'getBadgeTooltipCallback',      converter: cb(), on: 'update', type: '(ctx: DayContext) => string | null', description: 'Tooltip HTML for a day badge; `null` keeps the default.' },
  { configKey: 'getDayTooltipCallback',        converter: cb(), on: 'update', type: '(ctx: DayContext) => string | null', description: 'Tooltip HTML for a day cell; `null` keeps the default.' },
  { configKey: 'renderDayCallback',            converter: cb(), on: 'update', type: '(ctx: DayContext) => HTMLElement | string | null', description: 'Fully custom-render a day cell.' },
  { configKey: 'renderDayContentCallback',     converter: cb(), on: 'update', type: '(ctx: DayContext) => HTMLElement | string | null', description: 'Custom-render the content inside a day cell.' },
  { configKey: 'renderSummaryCallback',        converter: cb(), on: 'update', type: '(ctx: SummaryContext) => string', description: 'Render the range summary (HTML).' },
  { configKey: 'renderLoadingCallback',        converter: cb(), on: 'update', type: '(ctx: LoaderRenderContext) => void | (() => void)', description: 'Draw every loader (`showLoader()` targets, the one around async callbacks): fill `ctx.containerElement` (`ctx.context` = `calendar` | `message` | `summary`), optionally return a cleanup. Beats the page-wide `window.components.renderLoadingCallback`; unset = that, else the default `.drp__loader` (the shared `--base-loader-*` contract). Property-only.' },
  { configKey: 'getUnifiedHeaderCallback',     converter: cb(), on: 'update', type: '(ctx: UnifiedHeaderContext) => string', description: 'Render the unified grid header label.' },
  { configKey: 'getMonthHeaderCallback',       converter: cb(), on: 'update', type: '(ctx: MonthHeaderContext) => string', description: 'Render a per-column month header label.' },
  { configKey: 'getCustomStylesCallback',      converter: cb(), on: 'update', type: '(ctx: PickerContext) => string | null', description: 'Return a CSS string injected into the Shadow DOM (core `createCustomStyles`, after the page-wide `window.components[\'web-daterangepicker\'].customStyles` layer, so it overrides it). Wins over `custom-styles` when both are set. An `@import` is also linked in the document head (fonts). Raw CSS: never pass untrusted input. Property-only.' },
  { configKey: 'customStyles',                 attribute: 'custom-styles',                 converter: toText({ isNullable: true }), on: 'update', description: 'Raw CSS injected into the Shadow DOM — the declarative, no-JS alternative to `getCustomStylesCallback` (a full stylesheet, selectors and all, inserted verbatim after the page-wide layer). `getCustomStylesCallback` wins when both are set. Never pass untrusted input.' },

  // ── Callbacks: before-hooks (behavior-shaping → update) ───────────────────
  { configKey: 'beforeSelectCallback',         converter: cb(), on: 'update', type: '(ctx: BeforeSelectContext) => void | false | null | Date | DateRange | DateRange[] | Promise<…>', description: 'Runs before a selection is committed. Return nothing to accept, `false` to reject (explain via `ctx.controller.showMessage`; `ctx.markRangeInvalid()` keeps a rejected range visible), a `Date` / `DateRange` / `DateRange[]` to adjust, or `null` to clear. May be async.' },
  { configKey: 'beforeMonthChangeCallback',    converter: cb(), on: 'update', type: '(ctx: MonthChangeContext) => void | false | Promise<void | false>', description: 'Runs before month navigation; return `false` to block it. May be async.' },
  { configKey: 'beforeScrollCallback',         converter: cb(), on: 'update', type: '(ctx: BeforeScrollContext) => void | false | Partial<DateRangePickerScrollOptions>', description: 'Runs before every scroll the picker does on its own: a keyboard move bringing the focused day into view (`source: keyboard`), a time roll centring its value on open (`open`) or after a pick (`select`). Synchronous. Return `false` to skip that scroll, or `{ block, inline, behavior }` to replace the defaults. The ctx carries `target` (`day` | `time`), `date` / `timeField` + `timeValue`, `item`, `source`, `container` (`null` = the page) and `options`. Property-only.' },
  { configKey: 'getMonthDataCallback',         converter: cb(), on: 'update', type: '(ctx: MonthChangeContext) => MonthDataResult | null | Promise<MonthDataResult | null>', description: 'Load data for the visible range (`metadata` per `YYYY-MM-DD`, `monthHeaders` per `YYYY-MM`) on the initial open and after each month navigation. May be async (a loader shows meanwhile).' },
  { configKey: 'beforeActionCallback',         converter: cb(), on: 'update', type: '(detail: DateRangePickerActionEventDetail) => void | false | Promise<void | false>', description: 'Runs before any action button / `data-action` trigger; return `false` to cancel it entirely (no `onClick`, no `action` event, no built-in). May be async.' },
];

// Outward events (core §12.5). Each has an `on<Name>` twin property that receives
// the same detail object; every detail carries `controller` + `element`
// (non-enumerable) and the presentation flags.
type DrpEvents = {
  change: ChangeEventDetail;
  action: DateRangePickerActionEventDetail;
  'month-change': MonthChangeEventDetail;
  ready: ReadyEventDetail;
  open: OpenEventDetail;
  close: CloseEventDetail;
  'value-format-error': ValueFormatErrorEventDetail;
};
const EVENTS = [
  { name: 'change', description: 'The selection was committed (the value changed): every completed pick in `commit-mode="selection"`, on Apply / `commit()` in `apply` / `manual`. `detail` carries the date(s)/range(s), the formatted value, and — depending on disabled-dates-handling — enabled/disabled/split breakdowns. Twin: `onChange(detail)`.' },
  { name: 'action', description: 'An action button or a `data-action` trigger (e.g. a button in `showMessage` HTML) was activated. `detail`: `action` (built-in name or `custom`), `id`, `item`, `source` (`action-buttons` | `message` | `summary` | `calendar`), `sourceEvent`, `triggerElement`, `dataset` (the trigger’s other `data-*`), plus `controller` / `element`. Fires after the item’s `onClick`, before the built-in behaviour. Twin: `onAction(detail)`.' },
  { name: 'month-change', description: 'The visible month(s) changed (any navigation). Not fired when assigning `value` or a form reset moves them (both silent). `detail`: `monthIndex`, `year`, `month` (0-11), `visibleMonths`. Twin: `onMonthChange(detail)`.' },
  { name: 'ready', description: 'The picker was built and is live for the first time (once per element lifetime; core `BlissElement`). Fires right after the first build — synchronously during upgrade for a normal element, or when the `defer` gate is released (`el.release()` / removing `defer`) for a deferred one. The host then has the `ready` attribute and matches `:state(ready)`; `el.whenReady()` resolves. `detail`: `controller` / `element`. Twin: `onReady(detail)`.' },
  { name: 'open', description: 'The calendar popover opened (floating / modal / full-screen; inline never opens). `detail`: `controller` / `element` + the presentation flags. Twin: `onOpen(detail)`.' },
  { name: 'close', description: 'The calendar popover closed — any reason (pick, Apply, Escape, outside click, scroll, `close()`). A staged, uncommitted pick has already been discarded. `detail`: `controller` / `element` + the presentation flags. Twin: `onClose(detail)`.' },
  { name: 'value-format-error', description: "`getValueFormatCallback` threw. The error is logged (error level), the form field(s) submit `''`, and the host turns invalid (`validity.customError`, message = the `valueFormatError` label) so the form refuses to submit (`invalid` fires instead of `submit`; a `<form novalidate>` submits `''`). The next successful format makes it valid again. `detail`: `error`, `value` (the ISO selection snapshot it was asked to format) + `controller` / `element`. Twin: `onValueFormatError(detail)`." },
] as const;

/**
 * configKeys that are NOT part of the picker's `DatePickerOptions` — handled by
 * this element directly (input shell, presentation policy, custom styles). Stripped
 * before the merged config is handed to the picker.
 */
/**
 * What `readonly` locks (core SPEC §6.4, native readonly): the data — selection (days,
 * time, typing, Today / Now / Clear), the action bar (Apply, custom buttons) — and opening
 * the popover (like a native `<input type="date" readonly>`). Month navigation stays live
 * (an inline calendar can still be browsed), the input stays focusable, the value is
 * submitted, and calls from code keep working.
 */
const READONLY_ASPECTS: LockAspect[] = ['selection', 'actions', 'open'];

const NON_PICKER_KEYS = new Set([
  'defaultValue', 'placeholder', 'isDisabled', 'isReadonly', 'inputSize',
  'presentation', 'getCustomStylesCallback', 'customStyles', 'compactBelow',
  'name', 'valueFormat', 'valueFormatMask', 'valueSeparator', 'getValueFormatCallback',
  'placeholderFormatMask', 'placeholderTimeFormatMask',
]);

/**
 * A committed-selection snapshot, taken before a structural rebuild (e.g. the
 * responsive month-count flip) and restored after, so a resize never silently
 * drops the user's dates. Covers every selection mode; the restore reads
 * selectionMode/pickerMode to pick the right accessor.
 */
type SelectionSnapshot = {
  date: Date | null;
  dates: Date[];
  ranges: DateRange[];
  startDate: Date | null;
  endDate: Date | null;
  time: SelectedTime | null;
  datetime: Date | null;
  inputText: string;
  /** The modes the selection was made under (the engine's resolved options). */
  selectionMode: string;
  pickerMode: string;
};

/** Modes that render an input element (inline mode has none). */
function hasInput(mode: string): boolean {
  return mode === 'floating';
}

// ============================================================================
export class WebDaterangepickerElement extends BlissElement<DrpEvents, DateRangePickerController> {
  // Participate in forms. Submission goes through light-DOM hidden <input>(s)
  // (see #updateFormValue) — the same model as web-multiselect — carrying a
  // value-format value (default ISO) under `name`, independent of the display masks. Form
  // association (this flag) is kept ONLY so `form.reset()` reaches
  // formResetCallback and core's BlissElement can expose `el.form` /
  // `event.target.form` (the hook host frameworks like Phoenix LiveView read for
  // change delegation). The host itself never calls setFormValue, so it adds no
  // second entry under `name`.
  static formAssociated = true;

  protected static override inputs = INPUTS;
  protected static override events = EVENTS;

  // Type-only: core installs the `on<Name>` twins at runtime (§12.5); each is
  // called with the event detail (not the CustomEvent), right before the event.
  declare onChange: ((detail: ChangeEventDetail) => void) | null;
  declare onAction: ((detail: DateRangePickerActionEventDetail) => void) | null;
  declare onMonthChange: ((detail: MonthChangeEventDetail) => void) | null;
  declare onReady: ((detail: ReadyEventDetail) => void) | null;
  declare onOpen: ((detail: OpenEventDetail) => void) | null;
  declare onClose: ((detail: CloseEventDetail) => void) | null;
  declare onValueFormatError: ((detail: ValueFormatErrorEventDetail) => void) | null;

  #shadow: ShadowRoot;
  #picker?: DateRangePickerEngine;
  #inputElement?: HTMLInputElement;
  // Positioned wrapper around the visible input + its inline ✕ clear button.
  #inputWrapper?: HTMLDivElement;
  #inputClearButton?: HTMLButtonElement;
  #customStyles: CustomStylesHandle | null = null;
  // Dev-mode custom-styles lint: `--drp-*` names already warned about, so a
  // re-apply (or a reactive update) doesn't re-spam the console.
  #customStyleVarsWarned = new Set<string>();
  // Light-DOM hidden <input>(s) that carry the selection into form submission
  // (web-multiselect's model). Children of the host, so they sit inside the
  // <form> and submit under `name`; the host itself never calls setFormValue.
  #hiddenInputs: HTMLInputElement[] = [];
  // A `value` property assigned before the picker was built — applied on the first build.
  #pendingValue: string | readonly string[] | null = null;
  /** What the form submits now (the hidden input values) — also `el.value`. */
  #formValues: string[] = [];
  /** `getValueFormatCallback` threw on the last format — the host is invalid (core setFormatError). */
  #hasFormatError = false;
  #formatError: unknown = null;

  // Container-responsive compaction (core `sizeChanged` hook). `#narrowMax` is the
  // px threshold derived from `compact-below` (0 = disabled); `#isNarrow` is the
  // current state. When narrow, #assembleConfig layers a compact override (1 month,
  // no Today/Clear) on top of the pristine base config — the config itself is never
  // mutated, so widening back restores exactly what the consumer authored.
  #narrowMax = 0;
  #isNarrow = false;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    // §12.8: static shell CSS via one shared, cached CSSStyleSheet (per string).
    adoptStyles(this.#shadow, styles);
  }

  // ── core lifecycle hooks ──────────────────────────────────────────────────

  /** Structural change (or first connect): rebuild the picker. */
  protected override reinit(): void {
    // reinit() runs on first connect (isConnected true) and on later on:'reinit'
    // changes. connect() covers the plain-reconnect (DOM move) case. The `defer`
    // gate is core's (SPEC §6.3): while it holds, core runs no reinit() at all.
    if (!this.isConnected) return;
    // A structural change on a live picker carries the committed selection across
    // the rebuild (FINDINGS #21) — otherwise state reset to empty while the input
    // kept the old text. The first build has nothing to carry.
    if (this.#picker) this.#rebuildPreservingSelection();
    else this.#buildPicker();
  }

  /** Cosmetic change: element-level side effects, then patch the picker in place. */
  protected override update(partial: Record<string, unknown>): void {
    // Element-level (non-picker) side effects.
    // The `value` attribute changed (e.g. a server-rendered patch): it becomes the
    // current selection, like a native input that hasn't been edited.
    if ('defaultValue' in partial) this.#applyValueText((partial.defaultValue as string | null) ?? '', 'value attribute');
    // Form wiring changes (name / serialization) re-render the hidden input(s).
    if ('name' in partial || 'valueFormat' in partial || 'valueFormatMask' in partial
      || 'valueSeparator' in partial || 'getValueFormatCallback' in partial) {
      this.#refreshFormValue();
    }
    else if ('labels' in partial && this.#hasFormatError) this.#applyFormatError();
    if ('placeholder' in partial) this.#applyPlaceholder();
    if ('labels' in partial) this.#inputClearButton?.setAttribute('aria-label', resolveLabels(partial.labels as Partial<DateRangePickerLabels> | null).clear);
    if ('isReadonly' in partial && this.#picker) { partial.isReadonly ? this.#picker.lock(READONLY_ASPECTS) : this.#picker.unlock(READONLY_ASPECTS); this.#updateInputClear(); }
    if ('inputSize' in partial) this.#applyInputSizeStyles();
    // The masks feed the derived placeholder hint (no-op for an explicit placeholder).
    if ('placeholderFormatMask' in partial || 'placeholderTimeFormatMask' in partial
      || 'dateFormatMask' in partial || 'timeFormatMask' in partial) this.#applyPlaceholder();
    if ('getCustomStylesCallback' in partial || 'customStyles' in partial) this.#customStyles?.refresh();
    if ('presentation' in partial && this.#picker) {
      // Presentation policy changed at runtime — the environment observable won't
      // re-fire on its own, so re-resolve against the current environment now.
      this.#applyPresentation(getEnvironment());
    }
    if ('compactBelow' in partial) {
      // Re-evaluate the compaction threshold against the current box; a flip of the
      // compact state requires a rebuild (month-count is structural).
      const prev = this.#isNarrow;
      this.#measureNarrow();
      if (this.#isNarrow !== prev) this.#rebuildPreservingSelection();
    }

    // Everything else goes to the live picker as an in-place patch. Forward `null`
    // verbatim — it's the clear signal under core's null-clear contract (SPEC §6.1);
    // the picker resolves it per field (`?? default` / falsy reads). NON_PICKER_KEYS
    // are handled above.
    const pickerPartial: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (NON_PICKER_KEYS.has(key)) continue;
      pickerPartial[key] = value;
    }
    if (this.#picker && Object.keys(pickerPartial).length > 0) {
      // The engine refuses a structural key in place → rebuild, carrying the selection.
      if (!this.#picker.updateOptions(pickerPartial as Partial<DatePickerOptions>)) this.#rebuildPreservingSelection();
    }
  }

  /**
   * Activate (every connect, after any reinit()/update()). Build-once: the picker
   * survives a DOM move with its full state (decision D1) — reconnecting only
   * restarts the live resources disconnect() stopped. Builds here only when a
   * held `defer` gate was released while detached.
   */
  protected override connect(): void {
    if (this.#picker) this.#picker.activate();
    else this.#buildPicker();
    // The device-adaptive presentation runs off core's environment observable,
    // which BlissElement (un)subscribes automatically because we override
    // environmentChanged() — no per-connect wiring needed here.
  }

  /**
   * Deactivate (every disconnect): stop the picker's document/window-level
   * listeners, overlay registration and positioning loop, keeping its state.
   */
  protected override disconnect(): void {
    this.#picker?.deactivate();
  }

  /**
   * The effective disabled state flipped — the `isDisabled` input (`disabled`
   * attribute) or an ancestor `<fieldset disabled>` (core merges both). A disabled
   * input can't open the calendar, isn't focusable and drops the ✕.
   */
  protected override disabledChanged(isDisabled: boolean): void {
    if (this.#inputElement && this.#inputElement.type !== 'hidden') this.#inputElement.disabled = isDisabled;
    // Native semantics (core SPEC §6.4): a disabled control's value is not submitted.
    for (const input of this.#hiddenInputs) input.disabled = isDisabled;
    // The calendar: an open one closes, an inline one goes inert (no clicks, no focus).
    this.#picker?.setDisabled(isDisabled);
    this.#updateInputClear();
  }

  /**
   * Final teardown (core `destroy()`): release what `disconnect()` keeps — the
   * engine (its DOM, listeners, tooltips, positioning) and the light-DOM hidden
   * form input(s). The element is inert afterwards.
   */
  protected override destroyCallback(): void {
    this.#picker?.destroy();
    this.#picker = undefined;
    for (const el of this.#hiddenInputs) el.remove();
    this.#hiddenInputs = [];
    this.#customStyles?.destroy();
    this.#customStyles = null;
  }

  /**
   * Form reset: the selection goes back to the one parsed from the `value`
   * attribute (the default, like a native input's `defaultValue`), else empty.
   * `flush()` first so a reset right after a `setAttribute('value', …)` sees it.
   */
  formResetCallback(): void {
    this.flush();
    this.#applyValueText(this.getAttribute('value') ?? '', 'value attribute');
  }

  // ── picker lifecycle ──────────────────────────────────────────────────────

  #rebuildPicker(): void {
    this.#picker?.destroy();
    this.#picker = undefined;
    this.#buildPicker(true);
  }

  /**
   * Build the engine. `isRebuild`: a structural rebuild whose caller restores the
   * selection snapshot — the `value` default is applied on the first build only.
   */
  #buildPicker(isRebuild = false): void {
    const mode = (this.config.positioningMode as string) ?? 'floating';

    // Reconcile the input shell with the current positioning mode. floating
    // get a visible text input to anchor to; inline gets a hidden input so it still
    // submits a real value under its `name`. If a mode change flipped the input
    // kind, drop the stale one so #ensureInput rebuilds the right one.
    const wantHidden = !hasInput(mode);
    if (this.#inputElement && (this.#inputElement.type === 'hidden') !== wantHidden) {
      // Remove the wrapper (visible input) or the bare hidden input, and reset refs
      // so #ensureInput rebuilds the right shell.
      (this.#inputWrapper ?? this.#inputElement).remove();
      this.#inputElement = undefined;
      this.#inputWrapper = undefined;
      this.#inputClearButton = undefined;
    }
    this.#ensureInput();
    // A reused input keeps its old hint — re-derive it for the (possibly new) modes.
    this.#applyPlaceholder();

    // Seed the responsive-compaction state from the current box BEFORE assembling
    // config: `sizeChanged()` fires only after layout, so the first build must measure
    // directly, otherwise a narrow container would flash the wide layout then rebuild.
    this.#measureNarrow();

    const options = this.#assembleConfig();
    this.#picker = new DateRangePickerEngine(this.#inputElement ?? null, options as DatePickerOptions);

    // Re-apply `readonly` and the effective disabled state (the attribute / fieldset is
    // the source of truth and must survive a rebuild).
    if (this.config.isReadonly) this.#picker.lock(READONLY_ASPECTS);
    if (this.isEffectivelyDisabled) this.#picker.setDisabled(true);

    // First build: the selection starts from the `value` attribute (the default),
    // then a `value` property assigned before the build. A rebuild's caller
    // restores the selection snapshot instead.
    if (!isRebuild) {
      const initial = this.config.defaultValue as string | null;
      if (initial) this.#applyValueText(initial, 'value attribute');
      if (this.#pendingValue !== null) {
        const pending = this.#pendingValue;
        this.#pendingValue = null;
        this.#applyValueText(pending, 'value property');
      }
    }

    // Seed the hidden form input(s) (also clears stale inputs from a prior mode).
    this.#refreshFormValue();

    this.#applyCustomStyles();
    // Resolve the device presentation for the freshly built picker. A rebuild via
    // reinit (e.g. positioning-mode change) does NOT re-fire environmentChanged, so
    // seed it here; on a plain connect this is a harmless no-op before the hook's
    // own immediate fire.
    this.#applyPresentation(getEnvironment());
    // `ready` (event, attribute, :state(ready), whenReady) is core's — announced
    // once after the first build goes live.
  }

  #ensureInput(): void {
    if (this.#inputElement) return;
    const mode = (this.config.positioningMode as string) ?? 'floating';
    // Inline mode renders no visible field, but still needs an input to carry the
    // form value: the picker writes the formatted selection into `input.value` for
    // every mode, so a hidden input lets an inline picker submit a real value under
    // its `name` (a plain `setFormValue(formattedValue)` would be empty — inline has
    // no text field for the picker to format into).
    const isHidden = !hasInput(mode);
    const input = document.createElement('input');
    if (isHidden) {
      input.type = 'hidden';
    } else {
      input.type = 'text';
      input.classList.add('drp__input');
      this.#applyPlaceholderTo(input);
    }
    if (this.isEffectivelyDisabled && !isHidden) input.disabled = true;

    if (isHidden) {
      this.#shadow.appendChild(input);
    } else {
      // Wrap the visible input so the inline ✕ clear button can pin to its trailing
      // edge. The clear appears only while the field holds a value (see
      // #updateInputClear) and clears the selection without stealing focus.
      const wrapper = document.createElement('div');
      wrapper.className = 'drp__input-wrapper';
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'drp__input-clear';
      clear.setAttribute('aria-label', resolveLabels(this.config.labels as Partial<DateRangePickerLabels> | null).clear);
      clear.tabIndex = -1;
      // mousedown+preventDefault so the tap doesn't blur the field first; the clear
      // runs on click and re-focuses the input.
      clear.addEventListener('mousedown', (e) => e.preventDefault());
      clear.addEventListener('click', () => this.#clearInput());
      // Toggle the clear's visibility as the user types (mask handler dispatches
      // 'input' too), and keep the form value fresh on manual edits.
      input.addEventListener('input', () => this.#updateInputClear());
      wrapper.appendChild(input);
      wrapper.appendChild(clear);
      this.#shadow.appendChild(wrapper);
      this.#inputWrapper = wrapper;
      this.#inputClearButton = clear;
    }

    this.#inputElement = input;
    if (!isHidden) {
      this.#applyInputSizeStyles();
      this.#updateInputClear();
    }
  }

  /** Show the inline ✕ only while the visible field holds a value and is editable. */
  #updateInputClear(): void {
    const btn = this.#inputClearButton;
    const input = this.#inputElement;
    if (!btn || !input) return;
    const show = !!input.value && !input.disabled && !input.readOnly;
    btn.classList.toggle('drp__input-clear--visible', show);
  }

  /** Clear the selection + input value, refresh the submitted value, and refocus. */
  #clearInput(): void {
    this.#picker?.clearSelection();
    if (this.#inputElement) this.#inputElement.value = '';
    this.#refreshFormValue();
    this.#updateInputClear();
    this.#inputElement?.focus();
  }

  /**
   * Build the picker config from the merged `this.config`, minus the keys the
   * picker doesn't own, plus the runtime wiring (onChange bridge + container).
   */
  #assembleConfig(): Record<string, unknown> {
    // Canonical engine-config assembly (core SPEC §6.1 null-clear contract): a shallow
    // copy of the merged config with element-only keys removed and every `null` kept —
    // a cleared nullable input reaches the picker as `null` (the clear signal), which the
    // picker resolves per field (`?? default` / falsy reads). Replaces the old per-component
    // delete-null loop.
    const cfg = this.engineConfig(NON_PICKER_KEYS);

    // Container-responsive compaction: layer the compact override on top of the
    // pristine base (this.config is never mutated, so widening restores it verbatim).
    if (this.#isNarrow) {
      cfg.visibleMonthCount = 1;
      cfg.isTodayButtonShown = false;
      cfg.isClearButtonShown = false;
    }

    cfg.onChange = (detail: ChangeEventDetail) => this.#handleChange(detail);
    cfg.onAction = (detail: DateRangePickerActionEventDetail) => this.emit('action', detail);
    cfg.onMonthChange = (detail: MonthChangeEventDetail) => this.emit('month-change', detail);
    cfg.onOpen = (detail: OpenEventDetail) => this.emit('open', detail);
    cfg.onClose = (detail: CloseEventDetail) => this.emit('close', detail);
    // Contexts carry THIS element and its (rebuild-proof) controller, not the engine's.
    cfg.hostElement = this;
    cfg.controller = this.controller;
    cfg.isRtl = () => this.isRtl;
    cfg.container = this.#shadow as unknown as HTMLElement;
    return cfg;
  }

  // ── event bridge ──────────────────────────────────────────────────────────

  #handleChange(detail: ChangeEventDetail): void {
    // A calendar/drag selection writes into input.value — reflect it on the clear ✕.
    this.#updateInputClear();

    const picker = this.#picker;
    // Deferred until Apply — don't fire yet (commit() re-invokes onChange later).
    if (picker && picker.stagesSelection() && picker.hasPendingSelection) return;

    // `detail` is the canonical payload the core built via buildSelectDetail() — the
    // SAME object the public `onChange` twin receives (date(s)/range(s) plus the
    // enabled/disabled/split breakdown per `disabledDatesHandling`). The host layers
    // on only one thing: it prefers the input's live display text for `formattedValue`
    // ("what the user sees" — e.g. "3 selection(s)" in multiple mode), EXCEPT for the
    // multi-piece joined forms (split / individual / multi-range) that a single input
    // field can't represent, where the core's joined string is kept.
    const joined =
      detail.dateRanges != null ||
      (detail.dates != null && picker?.options.disabledDatesHandling === 'individual');
    if (!joined && this.#inputElement) {
      detail.formattedValue = this.#inputElement.value || detail.formattedValue;
    }

    this.#emitChange(detail);
  }

  /**
   * Refresh the hidden form input(s) from the just-committed selection, then fire
   * the outward `change` event. The hidden input(s) are what make
   * the control submit under its `name` (see #updateFormValue) — carrying a stable
   * value-format value (default ISO), not the display-formatted string in `detail.formattedValue`.
   */
  #emitChange(detail: ChangeEventDetail): void {
    this.#updateFormValue(detail);
    this.emit('change', detail);
  }

  // ── form integration (light-DOM hidden inputs, web-multiselect's model) ─────

  /**
   * Snapshot the current selection as stable, mask-independent ISO strings — the
   * single source of truth for the submitted value.
   *
   * When called from a just-fired selection, `detail` carries the
   * disabled-dates-handling breakdown that DOESN'T live in picker state: a range
   * split across disabled days (`split` → `detail.dateRanges`) or reduced to its
   * enabled days (`individual`/`block` → `detail.dates`). Prefer those so the form
   * submits the real sub-ranges/dates, not the whole envelope. Otherwise (reset,
   * rebuild, programmatic change) read the picker's committed state directly.
   */
  #currentSelection(detail?: ChangeEventDetail): FormValueSelection {
    const selectionMode = (this.config.selectionMode as FormValueSelection['selectionMode']) ?? 'single';
    const pickerMode = (this.config.pickerMode as FormValueSelection['pickerMode']) ?? 'date';
    const showSeconds = !!this.config.isSecondsShown;
    const picker = this.#picker;
    const items: FormValueItem[] = [];

    // Disabled-handling breakdowns only exist on the emitted detail.
    if (detail?.dateRanges?.length) {
      for (const r of detail.dateRanges) items.push({ start: isoDate(r.start), end: isoDate(r.end) });
      return { selectionMode, pickerMode, items };
    }
    if (detail?.dates?.length) {
      for (const d of detail.dates) items.push(isoDate(d));
      return { selectionMode, pickerMode, items };
    }

    if (picker) {
      if (pickerMode === 'time') {
        const t = picker.selectedTime;
        if (t && (t.hour != null || t.minute != null)) items.push(isoTime(t, showSeconds));
      } else if (selectionMode === 'single') {
        const d = pickerMode === 'datetime' ? picker.selectedDatetime : picker.selectedDate;
        if (d) items.push(pickerMode === 'datetime' ? isoDateTime(d, showSeconds) : isoDate(d));
      } else if (selectionMode === 'range') {
        // Every committed range: the plain start..end, the split pieces, or the
        // independent ranges a callback / assignment committed.
        for (const r of picker.selectedRanges) items.push({ start: isoDate(r.start), end: isoDate(r.end) });
      } else {
        // multiple: independent ranges or individual dates (date granularity).
        const ranges = picker.selectedRanges;
        if (ranges.length > 0) {
          for (const r of ranges) items.push({ start: isoDate(r.start), end: isoDate(r.end) });
        } else {
          for (const d of picker.selectedDates) items.push(isoDate(d));
        }
      }
    }
    return { selectionMode, pickerMode, items };
  }

  /**
   * Re-render the hidden form input(s) from the current selection. A throwing
   * `getValueFormatCallback` is logged, submits `''`, marks the host invalid (core
   * `setFormatError`, so the form refuses to submit) and emits `value-format-error`;
   * the next successful format clears the invalid state.
   */
  #updateFormValue(detail?: ChangeEventDetail): void {
    const format = (this.config.valueFormat as FormValueFormat) ?? 'text';
    const callback = this.config.getValueFormatCallback as ((ctx: FormValueSelection & PickerContext) => string) | undefined;
    const withCtx = callback
      ? (s: FormValueSelection) => callback(this.withContext({ ...s }) as unknown as FormValueSelection & PickerContext)
      : undefined;
    const selection = this.#currentSelection(detail);
    let values: string[];
    try {
      values = serializeFormValue(selection, format, withCtx, this.#valueWriteOptions());
    } catch (error) {
      this.log.SELECTION.error('getValueFormatCallback threw — the form submits an empty value and the control is invalid', error);
      this.#formValues = [''];
      this.#renderHiddenInputs('text', this.#formValues);
      this.#hasFormatError = true;
      this.#formatError = error;
      this.#applyFormatError();
      this.emit('value-format-error', { error, value: selection } as ValueFormatErrorEventDetail);
      return;
    }
    if (this.#hasFormatError) {
      this.#hasFormatError = false;
      this.#formatError = null;
      this.setFormatError(null);
    }
    this.#formValues = values;
    // A callback always produces the one `name` field, whatever value-format says.
    this.#renderHiddenInputs(callback ? 'text' : format, values);
  }

  /** Mark the host invalid for the last format error (message = the `valueFormatError` label). */
  #applyFormatError(): void {
    const anchor = this.#inputElement && this.#inputElement.type !== 'hidden' ? this.#inputElement : undefined;
    this.setFormatError(this.#formatError, resolveLabels(this.config.labels as Partial<DateRangePickerLabels> | null).valueFormatError, anchor);
  }

  /** The submitted value's per-date mask + separator (unset = the defaults). */
  #valueWriteOptions(): FormValueWriteOptions {
    return {
      mask: this.config.valueFormatMask as string | null,
      separator: this.config.valueSeparator as string | null,
    };
  }

  /** Refresh the hidden form input(s) from the picker's current selection. */
  #refreshFormValue(): void {
    this.#updateFormValue();
  }

  /**
   * Set the current selection from a value string (the `value` attribute / form
   * reset default, or the `value` property) through the engine's parser, then
   * sync the submitted value and the ✕. An unparseable value warns and leaves the
   * selection empty — the attribute itself is never rewritten (`value` is not a
   * reflected input).
   */
  #applyValueText(value: string | readonly string[], source: 'value attribute' | 'value property'): void {
    const picker = this.#picker;
    if (!picker) return;
    // The value-format form (mask + separator, json, array) first; then the raw
    // text through the engine's lenient parser (ISO / displayed form).
    const engineText = toEngineValueText(
      value, picker.options.selectionMode, picker.options.pickerMode, this.#valueWriteOptions(),
    );
    const raw = typeof value === 'string' ? value : value.join(',');
    const isValid = (engineText !== null && picker.setSelectionFromText(engineText))
      || (engineText !== raw && picker.setSelectionFromText(raw));
    if (!isValid) {
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      this.log.SELECTION.warn(
        `${source} "${text}" is not a valid ${picker.options.pickerMode} value for ` +
        `selection-mode="${picker.options.selectionMode}" — the selection is left empty.`,
      );
    }
    this.#afterSelectionSet();
  }

  /**
   * Replace the light-DOM hidden `<input>`(s) that carry the value into form
   * submission. Children of the host so they sit inside the `<form>`. `array`
   * format emits one `name[]` input per value; the others emit a single `name`
   * input (empty string when nothing is selected). No `name` → no participation.
   * The inputs are `disabled` while the control is (not submitted, like a native one).
   */
  #renderHiddenInputs(format: FormValueFormat, values: string[]): void {
    for (const el of this.#hiddenInputs) el.remove();
    this.#hiddenInputs = [];

    const name = this.config.name as string | null;
    if (!name) return;

    const inputName = format === 'array' ? `${name}[]` : name;
    for (const value of values) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = inputName;
      input.value = value;
      // A disabled control (own `disabled` or a disabled <fieldset>) submits nothing.
      input.disabled = this.isEffectivelyDisabled;
      this.appendChild(input);
      this.#hiddenInputs.push(input);
    }
  }

  // ── element-level styling helpers ─────────────────────────────────────────

  #applyPlaceholder(): void {
    if (this.#inputElement && this.#inputElement.type !== 'hidden') this.#applyPlaceholderTo(this.#inputElement);
  }

  #applyPlaceholderTo(input: HTMLInputElement): void {
    // Explicit placeholder wins verbatim (including an intentional empty string).
    const explicit = this.config.placeholder as string | null;
    if (explicit != null) { input.placeholder = explicit; return; }

    // Otherwise derive a format hint from the placeholder masks, each falling back
    // to its shown-text mask so a hint always shows without the consumer hardcoding
    // one: date → the date hint (range mode doubles it around the canonical " - ",
    // mirroring the committed form — "YYYY-MM-DD - YYYY-MM-DD"); time → the time
    // hint; datetime → date hint + ' ' + time hint (the committed form again).
    const pickerMode = (this.config.pickerMode as string) ?? 'date';
    const dateHint = (this.config.placeholderFormatMask as string | null)
      ?? (this.config.dateFormatMask as string | null) ?? 'YYYY-MM-DD';
    const timeHint = (this.config.placeholderTimeFormatMask as string | null)
      ?? (this.config.timeFormatMask as string | null) ?? 'HH:mm';
    if (pickerMode === 'time') input.placeholder = timeHint;
    else if (pickerMode === 'datetime') input.placeholder = `${dateHint} ${timeHint}`;
    else input.placeholder = (this.config.selectionMode as string) === 'range' ? `${dateHint} - ${dateHint}` : dateHint;
  }

  #applyInputSizeStyles(): void {
    const input = this.#inputElement;
    if (!input) return;
    input.classList.remove('drp__input--xs', 'drp__input--sm', 'drp__input--lg', 'drp__input--xl');
    const size = (this.config.inputSize as string) || 'md';
    if (size && size !== 'md') input.classList.add(`drp__input--${size}`);
  }

  /**
   * Custom CSS, the canonical core adoption (rulebook C-CA-15): the page layer
   * (`window.components['web-daterangepicker'].customStyles` / `.getCustomStylesCallback`)
   * then the instance layer (`custom-styles` / `getCustomStylesCallback`, the callback
   * wins). Created on the first build (writes both layers), refreshed per build.
   */
  #applyCustomStyles(): void {
    if (this.#customStyles) return this.#customStyles.refresh();
    this.#customStyles = createCustomStyles<PickerContext>(this, this.#shadow, { // writes both layers now
      cssClass: 'drp-custom-styles',
      getContext: () => this.withContext({}) as unknown as PickerContext,
      getInstanceStyles: () => ({
        css: this.config.customStyles as string | null | undefined,
        callback: this.config.getCustomStylesCallback as ((ctx: PickerContext) => string | null | undefined) | null | undefined,
      }),
      onApply: (css) => { if (import.meta.env?.DEV) this.#checkCustomStyleVars(css); },
    });
  }

  /**
   * Dev-only lint: warn when injected custom CSS references a `--drp-*` variable
   * the component's own stylesheet never consumes — almost always a typo (e.g.
   * `--drp-day-background` instead of `--drp-day-bg`). Pure matching lives in core
   * (`lintCssVars`); the element owns only the dev gate and the warned-set dedupe.
   * Guarded by `import.meta.env.DEV`, so it's stripped from production builds.
   */
  #checkCustomStyleVars(css: string): void {
    const consumed = consumedDrpVars();
    if (consumed.size === 0) return; // stylesheet not inlined (e.g. vitest) — no ground truth
    for (const { name, suggestions } of lintCssVars(css, { prefix: '--drp-', consumed })) {
      if (this.#customStyleVarsWarned.has(name)) continue;
      this.#customStyleVarsWarned.add(name);
      const hint = suggestions.length ? ` Did you mean ${suggestions.map((s) => `"${s}"`).join(', ')}?` : '';
      this.log.UI.warn(
        `custom styles set "${name}", which no ` +
        `--drp-* variable in the component reads — likely a typo.${hint}`,
      );
    }
  }

  // ── writing direction (core `isRtl` / `directionChanged`) ─────────────────

  /**
   * A runtime `dir` change on the element (core hook). The chevrons mirror through
   * `:host(:dir(rtl))` and the arrow keys read the live `isRtl`; re-render so the
   * open calendar repaints for the new direction.
   */
  protected override directionChanged(_isRtl: boolean): void {
    this.#picker?.renderCalendar();
  }

  // ── responsive presentation (SPEC §12.9) ──────────────────────────────────

  /**
   * Adapt the presentation to the device, driven by core's environment observable
   * (SPEC §12.9). Overriding this hook opts the element into the observable:
   * BlissElement subscribes on connect (firing immediately with the current
   * snapshot) and on every change (an orientation flip / resize re-fires), and
   * unsubscribes on disconnect.
   */
  protected override environmentChanged(env: EnvironmentSnapshot): void {
    this.#applyPresentation(env);
  }

  /**
   * Resolve the concrete presentation for the current device and push it to the
   * live picker (in place — no rebuild). Only a `floating` picker has a
   * presentation; `inline` ignores it.
   *
   * The class→presentation policy is core's `resolvePresentation` with our one
   * override, `{ tablet: 'modal' }`, giving the three-tier ladder:
   *   - phone   (touch, shorter side < 600px) → `fullscreen`
   *   - tablet  (touch, shorter side ≥ 600px) → `modal`
   *   - desktop (fine pointer, any width)      → `floating`
   * A forced `presentation` (`floating`/`modal`/`fullscreen`) wins on any
   * device — e.g. `modal` everywhere, or previewing the phone sheet on a desktop.
   */
  #applyPresentation(env: EnvironmentSnapshot): void {
    if (!this.#picker) return;
    if ((this.config.positioningMode as string) !== 'floating') return;
    const mode = (this.config.presentation as Presentation | null) ?? 'auto';
    this.#picker.setPresentation(resolvePresentation(mode, env, { tablet: 'modal' }));
  }

  // ── container-responsive compaction (SPEC §12.9, core `sizeChanged` hook) ──────

  /**
   * React to THIS element's own box changing (core's shared, per-element
   * ResizeObserver), as distinct from the viewport. When the box crosses the
   * `compact-below` threshold we swap between the authored month layout and a
   * compact one (single month, no wide Today/Clear buttons) so a picker in a
   * narrow column stays usable — the container-query companion to the
   * environment-driven `presentation`.
   *
   * Month-column count is a STRUCTURAL engine option (no in-place patch), so a
   * threshold cross rebuilds the picker; the committed selection is snapshotted
   * and restored so a resize never drops the user's dates. Merely overriding this
   * hook subscribes the element to the observer (core wires it on connect and
   * tears it down on disconnect) — cheap even for pickers that never opt in.
   */
  protected override sizeChanged({ width }: ElementSize): void {
    if (width <= 0) return;                       // detached / pre-layout measure
    const narrow = this.#narrowMax > 0 && width < this.#narrowMax;
    if (narrow === this.#isNarrow) return;        // no threshold cross → nothing to do
    this.#isNarrow = narrow;
    this.#rebuildPreservingSelection();
  }

  /**
   * Sync `#narrowMax` from `compact-below` and re-measure the current box into
   * `#isNarrow`. The single source of truth for the compaction state, called at
   * build time (before assembling config) and whenever the threshold changes.
   */
  #measureNarrow(): void {
    this.#narrowMax = (this.config.compactBelow as number | null) ?? 0;
    if (this.#narrowMax <= 0) { this.#isNarrow = false; return; }
    const width = this.getBoundingClientRect().width;
    if (width > 0) this.#isNarrow = width < this.#narrowMax;
  }

  /** Rebuild the picker while carrying the committed selection across (used by the
   *  structural responsive flip, where the engine can't patch in place). */
  #rebuildPreservingSelection(): void {
    const snap = this.#snapshotSelection();
    this.#rebuildPicker();
    this.#restoreSelection(snap);
    this.#refreshFormValue(); // re-seed the hidden form input(s) from the restored selection
  }

  /** Snapshot the committed selection (every mode) ahead of a structural rebuild. */
  #snapshotSelection(): SelectionSnapshot | null {
    const p = this.#picker;
    if (!p) return null;
    return {
      date: p.selectedDate,
      dates: p.selectedDates,
      ranges: p.independentRanges,
      startDate: p.selectedStartDate,
      endDate: p.selectedEndDate,
      time: p.selectedTime,
      datetime: p.selectedDatetime,
      inputText: this.#inputElement?.value ?? '',
      selectionMode: p.options.selectionMode ?? 'single',
      pickerMode: p.options.pickerMode ?? 'date',
    };
  }

  /** Restore a {@link SelectionSnapshot} onto the freshly rebuilt picker. */
  #restoreSelection(snap: SelectionSnapshot | null): void {
    const p = this.#picker;
    if (!p || !snap) return;
    // The engine's resolved modes (time/datetime force `single`).
    const mode = p.options.selectionMode ?? 'single';
    const pmode = p.options.pickerMode ?? 'date';

    if (mode !== snap.selectionMode || pmode !== snap.pickerMode) {
      this.#carrySelectionAcrossModes(snap, mode, pmode);
      return;
    }

    if (pmode === 'time') {
      if (snap.time) p.selectedTime = snap.time;
    } else if (mode === 'range') {
      if (snap.ranges.length) p.selectedRanges = snap.ranges;
      else if (snap.startDate && snap.endDate) p.selectedRanges = [{ start: snap.startDate, end: snap.endDate }];
    } else if (mode === 'multiple') {
      if (snap.ranges.length) p.selectedRanges = snap.ranges;
      else if (snap.dates.length) p.selectedDates = snap.dates;
    } else if (pmode === 'datetime') {
      if (snap.datetime) p.selectedDatetime = snap.datetime;
    } else if (snap.date) {
      p.selectedDate = snap.date;
    }

    // Multiple-mode (and Apply-mode) leave the input text to the commit path, which
    // a rebuild doesn't re-run — restore the prior text if nothing rewrote it.
    if (this.#inputElement && !this.#inputElement.value && snap.inputText) {
      this.#inputElement.value = snap.inputText;
    }
  }

  /**
   * A `selection-mode` / `picker-mode` flip: carry over whatever the new mode can
   * represent, then rewrite the input for the new mode — a carried selection is
   * reformatted, anything else leaves the input empty (it always shows what the
   * selection holds; the old text was formatted for the old mode).
   *
   * Carried: single date → multiple (one date); range → multiple (its ranges);
   * multiple → single (exactly one date) / range (ranges only); the date part
   * between `date` and `datetime`; the time part between `time` and `datetime`.
   */
  #carrySelectionAcrossModes(snap: SelectionSnapshot, mode: string, pmode: string): void {
    const p = this.#picker!;
    if (pmode === 'time') {
      if (snap.pickerMode === 'datetime' && snap.time) p.selectedTime = snap.time;
    } else if (snap.pickerMode !== 'time') {
      // Old date-granular selection, per the old selection mode.
      const oldDate = snap.selectionMode === 'single' ? snap.date : null;
      const oldRanges = snap.selectionMode === 'range'
        ? (snap.ranges.length ? snap.ranges : snap.startDate && snap.endDate ? [{ start: snap.startDate, end: snap.endDate }] : [])
        : snap.selectionMode === 'multiple' ? snap.ranges : [];
      const oldDates = snap.selectionMode === 'multiple' ? snap.dates : [];

      if (mode === 'single') {
        const date = oldDate ?? (oldDates.length === 1 && oldRanges.length === 0 ? oldDates[0] : null);
        if (date) {
          p.selectedDate = date;
          if (pmode === 'datetime' && snap.pickerMode === 'datetime' && snap.time) p.selectedTime = snap.time;
        }
      } else if (mode === 'range') {
        if (oldRanges.length && oldDates.length === 0 && !oldDate) p.selectedRanges = oldRanges;
      } else if (oldRanges.length) {
        p.selectedRanges = oldRanges;
        if (oldDates.length) p.selectedDates = oldDates;
      } else if (oldDates.length || oldDate) {
        p.selectedDates = oldDate ? [oldDate] : oldDates;
      }
    }
    p.syncInputFromSelection();
  }

  // ── imperative API (flush pending writes, then delegate to the picker) ─────

  /** Open the calendar (floating mode). */
  open(): void { this.flush(); this.#picker?.open(); }
  /** Close the calendar (floating mode). */
  close(): void { this.flush(); this.#picker?.close(); }
  /** Toggle the calendar open/closed. */
  toggle(): void { this.flush(); this.#picker?.toggle(); }
  /** Clear the current selection and reset the input. */
  clearSelection(): void {
    this.flush();
    this.#picker?.clearSelection();
    this.#updateFormValue(); // empty selection → clears the hidden input(s)
    this.#updateInputClear();
  }

  /**
   * Commit the staged selection — what the Apply button does, and the app's call in
   * `commit-mode="manual"`. Writes the value, fires `change`, closes the popover.
   */
  commit(): void { this.flush(); this.#picker?.commit(); }

  /**
   * Show a message in the calendar. `content` is HTML; `opts.variant`
   * (`info` | `success` | `warning` | `danger`) styles it (omit for raw-HTML content),
   * `opts.autoHideMs` hides it after that many ms.
   */
  showMessage(content: string, opts?: ShowMessageOptions): void {
    this.flush(); this.#picker?.showMessage(content, opts);
  }
  /** Hide the current message. */
  hideMessage(): void { this.flush(); this.#picker?.hideMessage(); }

  /** Write custom HTML into the summary block (pins until the next selection change). */
  showSummary(content: string): void { this.flush(); this.#picker?.showSummary(content); }
  /** Drop any summary override and re-derive from selection state. */
  hideSummary(): void { this.flush(); this.#picker?.hideSummary(); }
  /** Re-run summary derivation now (respects an active override). */
  refreshSummary(): void { this.flush(); this.#picker?.refreshSummary(); }

  /** Show a loader overlay. `target`: `calendar` (default) | `message` | `summary`. */
  showLoader(target?: LoaderTarget): void { this.flush(); this.#picker?.showLoader(target); }
  /** Hide the loader for the given target (default `calendar`). */
  hideLoader(target?: LoaderTarget): void { this.flush(); this.#picker?.hideLoader(target); }

  /**
   * Freeze user interaction. No argument locks every aspect (full read-only lock);
   * pass an aspect or array to freeze only part (`'selection' | 'navigation' |
   * 'actions' | 'open'`). The programmatic API is unaffected.
   */
  lock(aspects?: LockAspect | LockAspect[]): void { this.flush(); this.#picker?.lock(aspects); }
  /** Release the given aspect(s), or the whole lock when called with no argument. */
  unlock(aspects?: LockAspect | LockAspect[]): void { this.flush(); this.#picker?.unlock(aspects); }
  /** Toggle the given aspect(s), or the whole lock when called with no argument. */
  toggleLock(aspects?: LockAspect | LockAspect[]): void { this.flush(); this.#picker?.toggleLock(aspects); }
  /** True when the given aspect is currently locked. */
  isAspectLocked(aspect: LockAspect): boolean { this.flush(); return this.#picker?.isAspectLocked(aspect) ?? false; }
  /** The currently locked aspects (read-only snapshot). */
  get lockedAspects(): LockAspect[] { this.flush(); return this.#picker?.lockedAspects ?? []; }

  /** Align items within the rolling year/month selector (`flex-start` | `center` | `flex-end`). */
  setRollingItemAlignment(alignment: 'flex-start' | 'center' | 'flex-end'): void {
    // On the host (inherits into the shadow tree, beats the `:host` default) so it
    // survives a rebuild of the `.drp__picker` node (FINDINGS #15).
    this.style.setProperty('--drp-rolling-item-justify-content', alignment);
  }

  // ── live-state accessors (read the picker/input, not the config) ──────────

  /**
   * The current value — exactly what the form submits under `name`: a string for
   * `value-format="text"` / `"json"` / `getValueFormatCallback`, a `string[]` (one
   * per `name[]` field) for `"array"`. Shaped by `value-format`, `value-format-mask`
   * and `value-separator` — not by the displayed text (`date-format-mask`).
   * Assigning accepts the same form, plus ISO and the displayed text (lenient), and
   * sets the selection without touching the `value` attribute (the `form.reset()`
   * default). An unparseable value warns and clears the selection.
   */
  get value(): string | string[] {
    this.flush();
    const isArray = this.config.valueFormat === 'array' && !this.config.getValueFormatCallback;
    if (!this.#picker) {
      const pending = this.#pendingValue ?? '';
      return isArray ? (typeof pending === 'string' ? (pending ? [pending] : []) : [...pending]) : (typeof pending === 'string' ? pending : pending.join(','));
    }
    return isArray ? [...this.#formValues] : (this.#formValues[0] ?? '');
  }
  set value(val: string | readonly string[]) {
    this.flush();
    const v = val ?? '';
    if (this.#picker) this.#applyValueText(v, 'value property');
    else this.#pendingValue = v;
  }

  /**
   * The selection as ranges. Range mode: always the committed selection — a plain
   * click range reads `[{ start, end }]`, independent ranges (a `beforeSelectCallback`
   * returning several, or an assigned array) and `split` pieces read all of them;
   * `[]` when nothing is selected. Multiple mode: its independent ranges. Assigning
   * replaces the selection and reads back the same. `selectedStartDate` /
   * `selectedEndDate` stay the outer envelope.
   */
  get selectedRanges(): DateRange[] { this.flush(); return this.#picker?.selectedRanges || []; }
  set selectedRanges(ranges: DateRange[]) { this.flush(); if (this.#picker) { this.#picker.selectedRanges = ranges; this.#afterSelectionSet(); } }

  /** Committed dates (multiple mode). Assigning replaces the selection. */
  get selectedDates(): Date[] { this.flush(); return this.#picker?.selectedDates || []; }
  set selectedDates(dates: Date[]) { this.flush(); if (this.#picker) { this.#picker.selectedDates = dates; this.#afterSelectionSet(); } }

  /** Committed date (single mode). Assigning replaces the selection. */
  get selectedDate(): Date | null { this.flush(); return this.#picker?.selectedDate || null; }
  set selectedDate(date: Date | null) { this.flush(); if (this.#picker) { this.#picker.selectedDate = date; this.#afterSelectionSet(); } }

  /** Committed range start (read-only; set a range via `selectedRanges`). */
  get selectedStartDate(): Date | null { this.flush(); return this.#picker?.selectedStartDate || null; }
  /** Committed range end (read-only; set a range via `selectedRanges`). */
  get selectedEndDate(): Date | null { this.flush(); return this.#picker?.selectedEndDate || null; }

  /** Selected time (time/datetime modes). */
  get selectedTime(): SelectedTime | null { this.flush(); return this.#picker?.selectedTime || null; }
  set selectedTime(time: SelectedTime | null) { this.flush(); if (this.#picker) { this.#picker.selectedTime = time; this.#afterSelectionSet(); } }

  /** Composed date+time; the setter accepts a Date or ISO string and splits it. */
  get selectedDatetime(): Date | null { this.flush(); return this.#picker?.selectedDatetime || null; }
  set selectedDatetime(value: Date | string | null) { this.flush(); if (this.#picker) { this.#picker.selectedDatetime = value; this.#afterSelectionSet(); } }

  /** A programmatic selection write: keep the submitted form value and the ✕ in sync (FINDINGS #24). */
  #afterSelectionSet(): void {
    this.#refreshFormValue();
    this.#updateInputClear();
  }

  // Displayed state (read-only; change what's shown via navigation, not assignment).
  /** Descriptor for each visible month column (read-only). */
  get visibleMonths(): MonthDisplay[] { this.flush(); return this.#picker?.visibleMonths || []; }
  /** Anchor date (first-of-month) for each visible column (read-only). */
  get visibleMonthDates(): Date[] { this.flush(); return this.#picker?.visibleMonthDates || []; }
  /** The overall date span currently rendered across all columns (read-only). */
  get visibleDateRange(): { start: Date; end: Date } | null { this.flush(); return this.#picker?.visibleDateRange || null; }

  /** The picker's notion of "today", normalized to 00:00 local. */
  get today(): Date { this.flush(); return this.#picker?.today || new Date(); }

  /** Whether the calendar is currently open. Assigning opens/closes it. */
  get isOpen(): boolean { this.flush(); return this.#picker?.isOpen || false; }
  set isOpen(value: boolean) { this.flush(); if (this.#picker) this.#picker.isOpen = value; }

  /**
   * The public facade (`el.controller`, and `controller` on every callback context
   * and event detail). Delegates to the current engine, so it survives rebuilds;
   * applies pending property writes first (`flush`). Reads return empty values
   * before the first build.
   */
  protected override createController(): DateRangePickerController {
    const engine = () => {
      this.flush();
      return this.#picker?.getController();
    };
    const call = <K extends keyof DateRangePickerController>(name: K) =>
      ((...args: unknown[]) => (engine()?.[name] as ((...a: unknown[]) => unknown) | undefined)?.(...args)) as DateRangePickerController[K];
    return {
      get selectedDate() { return engine()?.selectedDate ?? null; },
      get selectedDates() { return engine()?.selectedDates ?? []; },
      get selectedRanges() { return engine()?.selectedRanges ?? []; },
      get selectedStartDate() { return engine()?.selectedStartDate ?? null; },
      get selectedEndDate() { return engine()?.selectedEndDate ?? null; },
      get selectedTime() { return engine()?.selectedTime ?? null; },
      get selectedDatetime() { return engine()?.selectedDatetime ?? null; },
      get isOpen() { return engine()?.isOpen ?? false; },
      selectToday: call('selectToday'),
      selectNow: call('selectNow'),
      clearSelection: call('clearSelection'),
      commit: call('commit'),
      open: call('open'),
      close: call('close'),
      toggle: call('toggle'),
      setPresentation: call('setPresentation'),
      prevMonth: call('prevMonth'),
      nextMonth: call('nextMonth'),
      lock: call('lock'),
      unlock: call('unlock'),
      showMessage: call('showMessage'),
      hideMessage: call('hideMessage'),
      showSummary: call('showSummary'),
      hideSummary: call('hideSummary'),
      showLoader: call('showLoader'),
      reloadMonthData: () => engine()?.reloadMonthData() ?? Promise.resolve(),
      hideLoader: call('hideLoader'),
    };
  }

  /** Presentation flags on every event detail the element emits itself (e.g. `ready`). */
  protected override eventContext(): object | undefined {
    return this.#picker?.presentationCtx();
  }
}

// Every input row as a typed property (`el.selectionMode`, `el.isDisabled`, …): core
// installs them at runtime, this declaration merge types them (rulebook C-CA-16).
// `DateRangePickerConfig` lists exactly the input rows.
export interface WebDaterangepickerElement extends DateRangePickerConfig {}

// The tag is defined by `registerComponent()` in the package entry (index.ts), which
// also publishes `window.components['web-daterangepicker']` and the logging bundle.
