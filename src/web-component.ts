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
  createStyleSlot,
  extractConsumedCssVars,
  lintCssVars,
  getEnvironment,
  resolvePresentation,
  type InputDef,
  type StyleSlot,
  type EnvironmentSnapshot,
  type ElementSize,
  type MobilePresentation,
} from '@keenmate/web-components-core';
import { DateRangePicker } from './date-picker';
import { toWeekStartDay, toDisabledWeekdays, toDisabledDates, toPipeList } from './converters';
import {
  serializeFormValue, isoDate, isoDateTime, isoTime,
  type FormValueFormat, type FormValueSelection, type FormValueItem,
} from './form-value';
import type {
  DatePickerOptions, DateRange, DecoratedDate, DayContext, DayMetadata, BeforeSelectResult,
  ActionButton, LocaleStrings, SelectionContext, MonthChangeContext, BeforeMonthChangeResult,
  SummaryContext, UnifiedHeaderContext, MonthHeaderContext, LoaderTarget, LockAspect,
  SelectEventDetail, CustomActionEventDetail, SelectedTime, MonthDisplay,
} from './types';
import styles from './css/main.css?inline';

// Dev-mode custom-styles lint: the set of `--drp-*` names the component's own
// stylesheet actually consumes, used as the ground truth for typo detection in
// author-injected CSS (custom-styles attribute / customStylesCallback). Computed
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
const POSITIONING_MODES = ['inline', 'floating', 'modal'] as const;
const MOBILE_PRESENTATIONS = ['auto', 'floating', 'modal', 'fullscreen'] as const;
const DISABLED_HANDLING = ['allow', 'prevent', 'block', 'split', 'individual'] as const;
const COMMIT_MODE = ['selection', 'apply', 'manual'] as const;
const PICKER_MODES = ['date', 'time', 'datetime'] as const;
const HOUR_CYCLES = ['h12', 'h24'] as const;
const TIME_DISPLAYS = ['rolls', 'clock', 'wheel', 'compact'] as const;
const VALUE_FORMATS = ['iso', 'json', 'array'] as const;

/** Any callback input. */
const cb = (): ReturnType<typeof toFunction> => toFunction();

// ============================================================================
// INPUT TABLE — the whole @keenmate/web-daterangepicker public surface.
// ============================================================================
const INPUTS: readonly InputDef[] = [
  // ── Structural (→ reinit): a change here rebuilds the picker ──────────────
  { configKey: 'selectionMode',                attribute: 'selection-mode',                converter: toEnum(SELECTION_MODES, { default: 'single' }), on: 'reinit', description: 'Selection behavior: `single` day, `range`, or `multiple` days/ranges.' },
  { configKey: 'positioningMode',              attribute: 'positioning-mode',              converter: toEnum(POSITIONING_MODES, { default: 'floating' }), on: 'reinit', description: 'How the calendar is presented: `inline` (always visible, no input), `floating` (popover anchored to an input), or `modal`.' },
  { configKey: 'calendarOpenTrigger',          attribute: 'calendar-open-trigger',         converter: toEnum(TRIGGERS, { default: 'focus' }), on: 'reinit', description: 'What opens the floating calendar: `focus`, `typing`, or `manual` (only `open()`).' },
  { configKey: 'overlayGroup',                 attribute: 'overlay-group',                 converter: toText({ isNullable: true }), on: 'reinit', description: 'Scope the "one overlay open at a time" coordination to a named group. Overlays (datepickers, multiselects, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group.' },
  { configKey: 'visibleMonthsCount',           attribute: 'visible-months-count',          converter: toInt({ min: 1 }), on: 'reinit', description: 'Number of month columns shown side-by-side.' },
  { configKey: 'monthLayout',                  attribute: 'month-layout',                  converter: toEnum(MONTH_LAYOUTS), on: 'reinit', description: 'Multi-month arrangement: a horizontal row or a `grid` (see grid-rows/grid-columns).' },
  { configKey: 'gridRows',                     attribute: 'grid-rows',                     converter: toInt({ min: 1 }), on: 'reinit', description: 'Rows in the month grid when month-layout is `grid`.' },
  { configKey: 'gridColumns',                  attribute: 'grid-columns',                  converter: toInt({ min: 1 }), on: 'reinit', description: 'Columns in the month grid when month-layout is `grid`.' },
  { configKey: 'isUnifiedNavigationEnabled',   attribute: 'is-unified-navigation-enabled', converter: toBool('presence'), on: 'reinit', description: 'In grid layouts, drive the whole grid from one anchor month instead of per-column navigation.' },
  { configKey: 'unifiedNavigationAnchorIndex', attribute: 'unified-navigation-anchor-index', converter: toInt(), on: 'reinit', description: 'Which month index anchors unified navigation.' },
  { configKey: 'pickerMode',                   attribute: 'picker-mode',                   converter: toEnum(PICKER_MODES, { default: 'date' }), on: 'reinit', description: 'Whether the control picks a `date`, a `time`, or a `datetime`.' },
  { configKey: 'isSecondsShown',               attribute: 'is-seconds-shown',              converter: toBool('tristate'), on: 'reinit', description: 'Show a seconds field in time/datetime mode.' },
  { configKey: 'hourCycle',                    attribute: 'hour-cycle',                    converter: toEnum(HOUR_CYCLES), on: 'reinit', description: '12- or 24-hour clock for time/datetime mode.' },
  { configKey: 'isSummaryShown',               attribute: 'is-summary-shown',              converter: toBool('tristate'), on: 'reinit', description: 'Show the range summary (day/night counts) block.' },

  // ── In-place (→ update): the engine patches these without a rebuild ───────
  { configKey: 'dateFormatMask',               attribute: 'date-format-mask',              converter: toText({ default: 'YYYY-MM-DD' }), on: 'update', description: 'Parse/format mask for dates (YYYY/YY, MM/M, DD/D with any separators).' },
  { configKey: 'displayFormatMask',            attribute: 'display-format-mask',           converter: toText({ isNullable: true }), on: 'update', description: 'Localized format hint shown as the input placeholder (when no explicit `placeholder`). In `range` mode the hint is doubled around " - " (e.g. `YYYY-MM-DD - YYYY-MM-DD`).' },
  { configKey: 'isUnifiedHeaderInteractive',   attribute: 'is-unified-header-interactive', converter: toBool('presence'), on: 'update', description: 'Make the unified grid header clickable (opens the rolling selector).' },
  { configKey: 'calendarPlacement',            attribute: 'calendar-placement',            converter: toText({ isNullable: true }), on: 'update', description: 'Floating-UI placement for the popover (default `bottom-start`).' },
  { configKey: 'weekStartDay',                 attribute: 'week-start-day',                converter: toWeekStartDay(), on: 'update', type: "'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6", description: 'First column of the week: `auto` (locale) or a weekday index 0 (Sunday)–6 (Saturday).' },
  { configKey: 'minDate',                      attribute: 'min-date',                      converter: toText({ isNullable: true }), on: 'update', description: 'Earliest selectable date (ISO string).' },
  { configKey: 'maxDate',                      attribute: 'max-date',                      converter: toText({ isNullable: true }), on: 'update', description: 'Latest selectable date (ISO string).' },
  { configKey: 'initialDate',                  attribute: 'initial-date',                  converter: toText({ isNullable: true }), on: 'update', description: 'Month/date the calendar opens on when nothing is selected (ISO string).' },
  { configKey: 'disabledWeekdays',             attribute: 'disabled-weekdays',             converter: toDisabledWeekdays(), on: 'update', type: 'number[]', description: 'CSV of weekday indices (0=Sunday…6=Saturday) that cannot be selected.' },
  { configKey: 'disabledDates',                attribute: 'disabled-dates',                converter: toDisabledDates(), on: 'update', type: 'Array<Date | string>', description: 'Specific dates that cannot be selected. Attribute: CSV of ISO strings; property: array of Date or string.' },
  { configKey: 'disabledDatesHandling',        attribute: 'disabled-dates-handling',       converter: toEnum(DISABLED_HANDLING), on: 'update', description: 'Strategy for ranges that span disabled dates: `allow`, `prevent`, `block`, `split`, or `individual`.' },
  { configKey: 'shouldHighlightDisabledInRange', attribute: 'should-highlight-disabled-in-range', converter: toBool('tristate'), on: 'update', description: 'Visually mark disabled dates that fall inside a selected range.' },
  { configKey: 'locale',                       attribute: 'locale',                        converter: toText({ default: 'auto' }), on: 'update', description: 'BCP-47 locale, or `auto` to detect from the browser.' },
  { configKey: 'monthNames',                   attribute: 'month-names',                   converter: toPipeList(12), on: 'update', type: 'string[]', description: 'Override month names. Attribute: 12 pipe-delimited names, index 0=January; property: `string[]`.' },
  { configKey: 'weekdayNames',                 attribute: 'weekday-names',                 converter: toPipeList(7), on: 'update', type: 'string[]', description: 'Override weekday names. Attribute: 7 pipe-delimited names, index 0=Sunday; property: `string[]`.' },
  { configKey: 'rollingYearRange',             attribute: 'rolling-year-range',            converter: toText({ isNullable: true }), on: 'update', description: 'Constrains the rolling year selector (e.g. `-5:+5` or absolute years).' },
  { configKey: 'rollingMonthRange',            attribute: 'rolling-month-range',           converter: toText({ isNullable: true }), on: 'update', description: 'Constrains the rolling month selector.' },
  { configKey: 'commitMode',                   attribute: 'commit-mode',                   converter: toEnum(COMMIT_MODE), on: 'update', description: 'How a selection is committed + the calendar dismissed: `selection` (commit & close on pick), `apply` (Apply button commits), or `manual` (app-driven, no built-in button).' },
  { configKey: 'shouldCloseOnScroll',          attribute: 'should-close-on-scroll',        converter: toBool('tristate'), on: 'update', description: 'Close the floating calendar when the page scrolls.' },
  { configKey: 'isTodayButtonShown',           attribute: 'is-today-button-shown',         converter: toBool('tristate'), on: 'update', description: 'Show the “Today” action button.' },
  { configKey: 'isClearButtonShown',           attribute: 'is-clear-button-shown',         converter: toBool('tristate'), on: 'update', description: 'Show the “Clear” action button.' },
  { configKey: 'timeFormatMask',               attribute: 'time-format-mask',              converter: toText({ default: 'HH:mm' }), on: 'update', description: 'Parse/format mask for times (HH/mm/ss).' },
  { configKey: 'displayTimeFormatMask',        attribute: 'display-time-format-mask',      converter: toText({ isNullable: true }), on: 'update', description: 'Localized display mask for the time portion.' },
  { configKey: 'timeStep',                     attribute: 'time-step',                     converter: toInt({ min: 1 }), on: 'update', description: 'Minute step for the time picker.' },
  { configKey: 'isNowButtonShown',             attribute: 'is-now-button-shown',           converter: toBool('tristate'), on: 'update', description: 'Show the “Now” button in time/datetime mode.' },
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
  { configKey: 'formFieldName',                attribute: 'name',                          converter: toText({ isNullable: true }), on: 'update', description: 'HTML form field name. When set, the control submits its selection as a light-DOM hidden `<input>` (`name[]` inputs for `value-format="array"`). Also read by core for `el.form` / `form.reset()`.' },
  { configKey: 'valueFormat',                  attribute: 'value-format',                  converter: toEnum(VALUE_FORMATS, { default: 'iso' }), on: 'update', description: `Serialization of the submitted value (stable ISO-8601, independent of the display masks):
- \`iso\` (default) — one field; a single date/time as-is, a range as \`start/end\`, multiple joined by \`,\`.
- \`json\` — one field; \`JSON.stringify\` of the selection (scalar/object for single/range, array for multiple).
- \`array\` — multiple \`name[]\` fields, one per date; a range contributes \`start\` and \`end\`.` },
  { configKey: 'getValueFormatCallback',       converter: cb(), on: 'update', type: '(selection: FormValueSelection) => string', description: 'Custom serialization of the submitted value; receives the normalized ISO selection snapshot and returns the single hidden-input value. Overrides `value-format`. Property-only.' },

  // ── Element-level attributes (NON-picker; handled by this element) ────────
  { configKey: 'inputValue',                   attribute: 'value',                         converter: toText({ isNullable: true, isEmptyAllowed: true }), on: 'update', description: 'Text value of the control (the formatted selection). Reflected to the live input in floating/modal modes and to the hidden form-value input in inline mode; read/write via the `value` property.' },
  { configKey: 'placeholder',                  attribute: 'placeholder',                   converter: toText({ isNullable: true }), on: 'update', description: 'Input placeholder. When unset, plain date pickers auto-derive it from display-format-mask / date-format-mask (`YYYY-MM-DD`), doubled in `range` mode (`YYYY-MM-DD - YYYY-MM-DD`).' },
  { configKey: 'disabled',                     attribute: 'disabled',                      converter: toBool('presence'), reflect: true, on: 'update', description: 'Disable the input.' },
  { configKey: 'isReadonly',                   attribute: 'readonly',                      converter: toBool('presence'), on: 'update', description: 'Full read-only lock (freezes every interaction aspect). Read/write via the `readonly` property, or use `lock()` for partial locks.' },
  { configKey: 'inputSize',                    attribute: 'input-size',                    converter: toText({ default: 'md' }), on: 'update', description: 'Input size scale: `xs` | `sm` | `md` | `lg` | `xl` (floating/modal only).' },
  { configKey: 'enableTransitions',            attribute: 'enable-transitions',            converter: toBool('presence'), reflect: true, on: 'update', description: 'Opt into calendar open/close CSS transitions.' },
  { configKey: 'mobilePresentation',           attribute: 'mobile-presentation',           converter: toEnum(MOBILE_PRESENTATIONS, { default: 'auto' }), reflect: true, on: 'update', description: 'How a `floating` picker adapts to the device (SPEC §12.9, via web-components-core). `auto` (default) keeps the floating popover on desktop, uses a centered `modal` on tablets, and a full-screen overlay on phones (touch-primary + shorter viewport side < 600px, orientation-robust). `floating`/`modal`/`fullscreen` force that presentation on any device (handy for previews/testing). Only adapts a floating picker — an explicit `positioning-mode` of `inline` or `modal` is left as authored. Resolved reactively from the device/viewport environment.' },
  { configKey: 'fullscreenAutofocus',          attribute: 'fullscreen-autofocus',          converter: toBool('presence'), on: 'update', description: 'In the phone full-screen overlay, focus the date input on open (pops the soft keyboard for type-to-fill). Default off: the sheet opens with the calendar visible and the keyboard closed. No effect in floating/modal presentations.' },
  { configKey: 'fullscreenTitle',              attribute: 'fullscreen-title',              converter: toText({ isNullable: true }), on: 'update', description: 'Optional heading shown in the phone full-screen overlay header, next to the close (✕) button. When unset the header shows just the close button.' },
  { configKey: 'fullscreenInput',              attribute: 'fullscreen-input',              converter: toBool('presence'), on: 'update', description: 'In the phone full-screen overlay, relocate the date input into the header so it is visible and typeable above the sheet (with a numeric keypad; the mask supplies the separators). Takes over the header row, so fullscreen-title is not shown alongside it. No effect in floating/modal presentations.' },
  { configKey: 'showDebugInfo',                attribute: 'show-debug-info',               converter: toBool('presence'), on: 'update', description: 'Enable the picker’s debug logging.' },
  { configKey: 'compactBelow',                 attribute: 'compact-below',                 converter: toInt({ min: 0 }), on: 'update', description: 'Container-responsive compaction threshold in CSS px. When the element’s OWN box is narrower than this, the calendar collapses to a single month and hides the Today/Clear buttons — keyed on the element box (core’s shared ResizeObserver), not the viewport, so a picker in a narrow column/sidebar compacts even on a wide monitor. Unset or `0` disables it. Purely presentational tweaks (padding, label→icon) belong in CSS `@container`; this drives the structural month-count change.' },
  { configKey: 'deferRender',                  attribute: 'defer',                         converter: toBool('presence'), on: 'reinit', description: 'Hold the initial render. When the `defer` attribute is present on upgrade the component builds nothing (reserving space only) — so `value`, callbacks (e.g. `customStylesCallback`), and event listeners can all be wired first, then released with `el.ready()` (or by removing the `defer` attribute, for server-driven frameworks). The release builds the picker ONCE with everything already in place, avoiding the upgrade-then-restyle flash. Absent (default): builds immediately on connect. Latched — once released the gate never re-closes.' },

  // ── Complex property data (property-only) ─────────────────────────────────
  { configKey: 'specialDates',                 converter: toObjectArray(), on: 'update', type: 'DecoratedDate[]', description: 'Array of decorated-date objects (badges, tooltips, per-day classes). Property-only.' },
  { configKey: 'actionButtons',               converter: toValue({ validate: (v): v is unknown[] => Array.isArray(v) }), on: 'update', type: 'ActionButton[]', description: 'Custom footer action buttons. Property-only; when unset the built-in buttons apply.' },
  { configKey: 'customStrings',                converter: toObject(), on: 'update', type: 'Partial<LocaleStrings>', description: 'Per-instance locale string overrides. Property-only.' },

  // ── Callbacks (property-only; cosmetic/data → update) ─────────────────────
  { configKey: 'getDateMetadataCallback',      converter: cb(), on: 'update', type: '(ctx: DayContext) => DayMetadata | null', description: 'Compute per-day metadata (badges, classes, disabled) dynamically.' },
  { configKey: 'badgeTooltipCallback',         converter: cb(), on: 'update', type: '(ctx: DayContext) => string | null', description: 'Tooltip text for a day badge.' },
  { configKey: 'dayTooltipCallback',           converter: cb(), on: 'update', type: '(ctx: DayContext) => string | null', description: 'Tooltip text for a day cell.' },
  { configKey: 'renderDayCallback',            converter: cb(), on: 'update', type: '(ctx: DayContext) => HTMLElement | string | null', description: 'Fully custom-render a day cell.' },
  { configKey: 'renderDayContentCallback',     converter: cb(), on: 'update', type: '(ctx: DayContext) => HTMLElement | string | null', description: 'Custom-render the content inside a day cell.' },
  { configKey: 'formatSummaryCallback',        converter: cb(), on: 'update', type: '(ctx: SummaryContext) => string', description: 'Render the range summary text.' },
  { configKey: 'getUnifiedHeaderCallback',     converter: cb(), on: 'update', type: '(ctx: UnifiedHeaderContext) => string', description: 'Render the unified grid header label.' },
  { configKey: 'getMonthHeaderCallback',       converter: cb(), on: 'update', type: '(ctx: MonthHeaderContext) => string', description: 'Render a per-column month header label.' },
  { configKey: 'customStylesCallback',         converter: cb(), on: 'update', type: '() => string', description: 'Return a CSS string injected into the component via a replaceable style slot (§12.8). Takes precedence over the `custom-styles` attribute when both are set.' },
  { configKey: 'customStyles',                 attribute: 'custom-styles',                 converter: toText({ isNullable: true }), on: 'update', description: 'Raw CSS injected into the Shadow DOM — the declarative, no-JS alternative to `customStylesCallback`. The value is a full stylesheet (selectors and all), dropped verbatim into the same replaceable style slot. `customStylesCallback` wins when both are set.' },

  // ── Callbacks: before-hooks (behavior-shaping → update) ───────────────────
  { configKey: 'beforeDateSelectCallback',     converter: cb(), on: 'update', type: '(ctx: SelectionContext) => BeforeSelectResult | Promise<BeforeSelectResult>', description: 'Runs before a day is selected; can veto or adjust the selection.' },
  { configKey: 'beforeMonthChangedCallback',   converter: cb(), on: 'update', type: '(ctx: MonthChangeContext) => BeforeMonthChangeResult | Promise<BeforeMonthChangeResult>', description: 'Runs before month navigation; can veto the change.' },
];

// Outward events (core §12.5). `date-select`/`change` are emitted by this element
// (bridged from the picker's onSelect); `custom-action` is emitted by the picker
// itself and bubbles (composed) up to the host — declaring it here installs the
// managed `onCustomAction` handler property and lists it in the CEM manifest.
type DrpEvents = {
  'date-select': SelectEventDetail;
  change: SelectEventDetail;
  'custom-action': CustomActionEventDetail;
  ready: undefined;
};
const EVENTS = [
  { name: 'date-select', description: 'A date/range/time was selected (or applied). `detail` carries the date(s)/range(s), the formatted value, and — depending on disabled-dates-handling — enabled/disabled/split breakdowns.' },
  { name: 'change', description: 'Fires alongside `date-select` for form-style change wiring; same detail.' },
  { name: 'custom-action', description: 'A custom action button was clicked. `detail.data` is the button’s data-* map; `detail.picker` is the picker instance.' },
  { name: 'ready', description: 'The picker was built and painted for the first time (once per element lifetime). Fires right after the first build — synchronously during upgrade for a normal element, or when the render gate is released (`el.ready()` / removing `defer`) for a deferred one. No detail.' },
] as const;

/**
 * configKeys that are NOT part of the picker's `DatePickerOptions` — handled by
 * this element directly (input shell, presentation policy, custom styles). Stripped
 * before the merged config is handed to the picker.
 */
const NON_PICKER_KEYS = new Set([
  'inputValue', 'placeholder', 'disabled', 'isReadonly', 'inputSize', 'enableTransitions',
  'mobilePresentation', 'customStylesCallback', 'customStyles', 'compactBelow', 'deferRender',
  'formFieldName', 'valueFormat', 'getValueFormatCallback',
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
};

/** Modes that render an input element (inline mode has none). */
function hasInput(mode: string): boolean {
  return mode === 'floating' || mode === 'modal';
}

// ============================================================================
export class WebDaterangepickerElement extends BlissElement<DrpEvents> {
  // Participate in forms. Submission goes through light-DOM hidden <input>(s)
  // (see #updateFormValue) — the same model as web-multiselect — carrying a
  // stable ISO value under `name`, independent of the display masks. Form
  // association (this flag) is kept ONLY so `form.reset()` reaches
  // formResetCallback and core's BlissElement can expose `el.form` /
  // `event.target.form` (the hook host frameworks like Phoenix LiveView read for
  // change delegation). The host itself never calls setFormValue, so it adds no
  // second entry under `name`.
  static formAssociated = true;

  protected static override inputs = INPUTS;
  protected static override events = EVENTS;

  // Type-only: core installs the managed accessors at runtime (§12.5).
  declare onDateSelect: ((e: CustomEvent<SelectEventDetail>) => void) | null;
  declare onChange: ((e: CustomEvent<SelectEventDetail>) => void) | null;
  declare onCustomAction: ((e: CustomEvent<CustomActionEventDetail>) => void) | null;

  #shadow: ShadowRoot;
  #picker?: DateRangePicker;
  #inputElement?: HTMLInputElement;
  // Positioned wrapper around the visible input + its inline ✕ clear button.
  #inputWrapper?: HTMLDivElement;
  #inputClearButton?: HTMLButtonElement;
  #customStyles: StyleSlot | null = null;
  // Dev-mode custom-styles lint: `--drp-*` names already warned about, so a
  // re-apply (or a reactive update) doesn't re-spam the console.
  #customStyleVarsWarned = new Set<string>();
  // Render gate (`defer`): true once released via ready() / attribute removal /
  // first build. Latched — a later re-added `defer` must not re-hold the gate.
  #released = false;
  // Light-DOM hidden <input>(s) that carry the selection into form submission
  // (web-multiselect's model). Children of the host, so they sit inside the
  // <form> and submit under `name`; the host itself never calls setFormValue.
  #hiddenInputs: HTMLInputElement[] = [];

  // Container-responsive compaction (core rc09 `resized` hook). `#narrowMax` is the
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
    // Per-instance replaceable slot for customStylesCallback CSS.
    this.#customStyles = createStyleSlot(this.#shadow, { className: 'drp-custom-styles' });
  }

  // ── core lifecycle hooks ──────────────────────────────────────────────────

  /** Structural change (or first connect): rebuild the picker. */
  protected override reinit(): void {
    // reinit() runs on first connect (isConnected true) and on later on:'reinit'
    // changes. connect() covers the plain-reconnect (DOM move) case. While the
    // render gate is held (`defer` set, not yet released) skip the build — config
    // keeps accumulating and lands whole on release. Removing the `defer`
    // attribute flips deferRender false, so this same reinit then builds.
    if (this.isConnected && !this.#renderHeld()) this.#rebuildPicker();
  }

  /** Cosmetic change: element-level side effects, then patch the picker in place. */
  protected override update(partial: Record<string, unknown>): void {
    // Element-level (non-picker) side effects.
    if ('inputValue' in partial) {
      if (this.#inputElement) this.#inputElement.value = (partial.inputValue as string | null) ?? '';
      this.#refreshFormValue(); // keep form submission in sync with a programmatic value
      this.#updateInputClear();
    }
    // Form wiring changes (name / serialization) re-render the hidden input(s).
    if ('formFieldName' in partial || 'valueFormat' in partial || 'getValueFormatCallback' in partial) {
      this.#refreshFormValue();
    }
    if ('placeholder' in partial) this.#applyPlaceholder();
    if ('disabled' in partial && this.#inputElement) { this.#inputElement.disabled = !!partial.disabled; this.#updateInputClear(); }
    if ('isReadonly' in partial && this.#picker) { partial.isReadonly ? this.#picker.lock() : this.#picker.unlock(); this.#updateInputClear(); }
    if ('inputSize' in partial) this.#applyInputSizeStyles();
    if ('enableTransitions' in partial) this.#applyTransitionStyles();
    if ('displayFormatMask' in partial) this.#applyPlaceholder();
    // date-format-mask feeds the range-mode placeholder fallback, so re-derive the
    // hint when it changes at runtime (no-op for an explicit placeholder).
    if ('dateFormatMask' in partial) this.#applyPlaceholder();
    if ('customStylesCallback' in partial || 'customStyles' in partial) this.#applyCustomStyles();
    if ('mobilePresentation' in partial && this.#picker) {
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

    // Everything else goes to the live picker as an in-place patch; null clears
    // (matches the old `undefined` semantics), NON_PICKER_KEYS are handled above.
    const pickerPartial: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (NON_PICKER_KEYS.has(key)) continue;
      pickerPartial[key] = value === null ? undefined : value;
    }
    if (this.#picker && Object.keys(pickerPartial).length > 0) {
      if (!this.#picker.updateOptions(pickerPartial as Partial<DatePickerOptions>)) this.#rebuildPicker();
    }
  }

  /** Activate: ensure the picker exists (a DOM move destroyed it in disconnect()). */
  protected override connect(): void {
    if (!this.#picker && !this.#renderHeld()) this.#buildPicker();
    // The device-adaptive presentation runs off core's environment observable,
    // which BlissElement (un)subscribes automatically because we override
    // environmentChanged() — no per-connect wiring needed here.
  }

  /** Deactivate: tear the picker down (rebuilt on the next connect). */
  protected override disconnect(): void {
    this.#picker?.destroy();
    this.#picker = undefined;
  }

  /** Form reset: clear the selection and the submitted value with the form. */
  formResetCallback(): void {
    this.#picker?.clearSelection();
    if (this.#inputElement) this.#inputElement.value = '';
    this.#updateInputClear();
    this.#updateFormValue(); // selection is now empty → clears the hidden input(s)
  }

  // ── picker lifecycle ──────────────────────────────────────────────────────

  #rebuildPicker(): void {
    this.#picker?.destroy();
    this.#picker = undefined;
    this.#buildPicker();
  }

  /** Whether the initial render is being held by the `defer` gate (not yet released). */
  #renderHeld(): boolean {
    return this.config.deferRender === true && !this.#released;
  }

  #buildPicker(): void {
    const mode = (this.config.positioningMode as string) ?? 'floating';

    // Reconcile the input shell with the current positioning mode. floating/modal
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

    // Seed the responsive-compaction state from the current box BEFORE assembling
    // config: `resized()` fires only after layout, so the first build must measure
    // directly, otherwise a narrow container would flash the wide layout then rebuild.
    this.#measureNarrow();

    const options = this.#assembleConfig();
    this.#picker = new DateRangePicker(this.#inputElement ?? null, options as DatePickerOptions);

    // Re-apply a declarative full lock (the attribute is the source of truth and
    // must survive a rebuild).
    if (this.config.isReadonly) this.#picker.lock();

    // Seed the hidden form input(s) (a rebuild starts with an empty selection, so
    // this reflects any pre-filled `value` or clears stale inputs from a prior mode).
    this.#refreshFormValue();

    this.#applyCustomStyles();
    // Resolve the device presentation for the freshly built picker. A rebuild via
    // reinit (e.g. positioning-mode change) does NOT re-fire environmentChanged, so
    // seed it here; on a plain connect this is a harmless no-op before the hook's
    // own immediate fire.
    this.#applyPresentation(getEnvironment());
    // Apply transition styles once the calendar DOM exists.
    setTimeout(() => this.#applyTransitionStyles(), 0);

    // First build of this element's lifetime: latch the gate open (a later
    // re-added `defer` must not re-hold), reflect `is-ready` for CSS hooks
    // (`:host([defer]:not([is-ready]))` can reserve space while deferred), and
    // announce `ready` once. `is-ready`'s presence is the once-guard: a later
    // rebuild (reinit) or disconnect/reconnect re-enters #buildPicker but never
    // re-fires.
    if (!this.hasAttribute('is-ready')) {
      this.#released = true;
      this.setAttribute('is-ready', '');
      this.emit('ready', undefined);
    }
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
    const value = this.config.inputValue as string | null;
    if (value) input.value = value;
    if (this.config.disabled && !isHidden) input.disabled = true;

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
      clear.setAttribute('aria-label', 'Clear');
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
   * picker doesn't own, plus the runtime wiring (onSelect bridge + container).
   */
  #assembleConfig(): Record<string, unknown> {
    const cfg: Record<string, unknown> = { ...this.config };
    // Drop element-only keys and normalize "unset" (null) → absent, so the picker
    // sees exactly what the old hand-coded parser handed it (undefined).
    for (const key of NON_PICKER_KEYS) delete cfg[key];
    for (const key of Object.keys(cfg)) {
      if (cfg[key] === null) delete cfg[key];
    }

    // Container-responsive compaction: layer the compact override on top of the
    // pristine base (this.config is never mutated, so widening restores it verbatim).
    if (this.#isNarrow) {
      cfg.visibleMonthsCount = 1;
      cfg.isTodayButtonShown = false;
      cfg.isClearButtonShown = false;
    }

    cfg.onSelect = (date: Date | DateRange | DateRange[] | Date[]) => this.#handleDateSelect(date);
    cfg.container = this.#shadow as unknown as HTMLElement;
    return cfg;
  }

  // ── event bridge ──────────────────────────────────────────────────────────

  #handleDateSelect(date: Date | DateRange | DateRange[] | Date[]): void {
    // A calendar/drag selection writes into input.value — reflect it on the clear ✕.
    this.#updateInputClear();
    const detail: SelectEventDetail = {
      date: date instanceof Date ? date : undefined,
      dateRange: date instanceof Date ? undefined : (Array.isArray(date) ? undefined : date),
      formattedValue: this.#inputElement?.value || '',
    };

    const picker = this.#picker;
    if (!picker) {
      this.#emitSelect(detail);
      return;
    }

    // Deferred until Apply — don't fire yet (apply() re-invokes onSelect later).
    if (picker.requiresApplyButton() && picker.hasPendingSelection) return;

    const handling = picker.options.disabledDatesHandling;

    if (!(date instanceof Date) && !Array.isArray(date) && 'start' in date && 'end' in date) {
      const start = date.start;
      const end = date.end;
      switch (handling) {
        case 'allow':
          detail.enabledDates = picker.getEnabledDatesInRange(start, end);
          detail.disabledDates = picker.getDisabledDatesInRange(start, end);
          detail.getEnabledDateCount = () => detail.enabledDates!.length;
          detail.getTotalDays = () => {
            const msPerDay = 1000 * 60 * 60 * 24;
            return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
          };
          break;
        case 'split':
          detail.dateRanges = picker.splitRangeByDisabled(start, end);
          detail.dates = picker.getEnabledDatesInRange(start, end);
          if (detail.dateRanges.length > 0) {
            detail.formattedValue = detail.dateRanges
              .map((r) => `${picker.formatDate(r.start)} - ${picker.formatDate(r.end)}`)
              .join(', ');
          }
          break;
        case 'individual':
          detail.dates = picker.getEnabledDatesInRange(start, end);
          detail.dateRange = null;
          if (detail.dates.length > 0) {
            detail.formattedValue = detail.dates.map((d) => picker.formatDate(d)).join(', ');
          }
          break;
        case 'block':
          detail.dates = picker.getEnabledDatesInRange(start, end);
          break;
      }
    } else if (Array.isArray(date) && date.length > 0 && typeof date[0] === 'object' && 'start' in (date[0] as object)) {
      const ranges = date as DateRange[];
      detail.dateRanges = ranges;
      detail.formattedValue = ranges
        .map((r) => `${picker.formatDate(r.start)} - ${picker.formatDate(r.end)}`)
        .join(', ');
    }

    this.#emitSelect(detail);
  }

  /**
   * Refresh the hidden form input(s) from the just-committed selection, then fire
   * the outward `date-select` + `change` pair. The hidden input(s) are what make
   * the control submit under its `name` (see #updateFormValue) — carrying a stable
   * ISO value, not the display-formatted string in `detail.formattedValue`.
   */
  #emitSelect(detail: SelectEventDetail): void {
    this.#updateFormValue(detail);
    this.emit('date-select', detail);
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
  #currentSelection(detail?: SelectEventDetail): FormValueSelection {
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
        // selectedRanges is populated when a callback commits independent ranges;
        // otherwise the plain start..end envelope.
        const ranges = picker.selectedRanges;
        if (ranges.length > 0) {
          for (const r of ranges) items.push({ start: isoDate(r.start), end: isoDate(r.end) });
        } else {
          const s = picker.selectedStartDate;
          const e = picker.selectedEndDate;
          if (s && e) items.push({ start: isoDate(s), end: isoDate(e) });
        }
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

  /** Re-render the hidden form input(s) from the current selection. */
  #updateFormValue(detail?: SelectEventDetail): void {
    const format = (this.config.valueFormat as FormValueFormat) ?? 'iso';
    const callback = this.config.getValueFormatCallback as ((s: FormValueSelection) => string) | undefined;
    const values = serializeFormValue(this.#currentSelection(detail), format, callback);
    this.#renderHiddenInputs(format, values);
  }

  /**
   * Refresh the hidden form input(s). A programmatic string `value` set while
   * nothing is selected has no structured selection to serialize, so it submits
   * verbatim as a single field; otherwise the picker's selection is the source.
   */
  #refreshFormValue(): void {
    const iv = this.config.inputValue as string | null;
    if (iv && this.#currentSelection().items.length === 0) {
      this.#renderHiddenInputs('iso', [iv]);
      return;
    }
    this.#updateFormValue();
  }

  /**
   * Replace the light-DOM hidden `<input>`(s) that carry the value into form
   * submission. Children of the host so they sit inside the `<form>`. `array`
   * format emits one `name[]` input per value; the others emit a single `name`
   * input (empty string when nothing is selected). No `name` → no participation.
   */
  #renderHiddenInputs(format: FormValueFormat, values: string[]): void {
    for (const el of this.#hiddenInputs) el.remove();
    this.#hiddenInputs = [];

    const name = this.config.formFieldName as string | null;
    if (!name) return;

    const inputName = format === 'array' ? `${name}[]` : name;
    for (const value of values) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = inputName;
      input.value = value;
      this.appendChild(input);
      this.#hiddenInputs.push(input);
    }
  }

  // ── element-level styling helpers ─────────────────────────────────────────

  #applyPlaceholder(): void {
    if (this.#inputElement) this.#applyPlaceholderTo(this.#inputElement);
  }

  #applyPlaceholderTo(input: HTMLInputElement): void {
    // Explicit placeholder wins verbatim (including an intentional empty string).
    const explicit = this.config.placeholder as string | null;
    if (explicit != null) { input.placeholder = explicit; return; }

    // Otherwise derive a format hint. Prefer the localized display-format-mask; for
    // plain date pickers fall back to the parse mask so a hint always shows without
    // the consumer hardcoding one. (Time/datetime need an explicit placeholder or
    // display-format-mask — the date mask alone is an incomplete hint.) Range mode
    // doubles the hint around the canonical " - " separator (mirroring the committed
    // range form) so users see they type a start AND an end — e.g.
    // "YYYY-MM-DD - YYYY-MM-DD" for range vs the single-date "YYYY-MM-DD".
    const isRange = (this.config.selectionMode as string) === 'range';
    const isDateMode = ((this.config.pickerMode as string) ?? 'date') === 'date';
    const base = (this.config.displayFormatMask as string | null)
      ?? (isDateMode ? (this.config.dateFormatMask as string | null) : null);
    input.placeholder = base ? (isRange ? `${base} - ${base}` : base) : '';
  }

  #applyInputSizeStyles(): void {
    const input = this.#inputElement;
    if (!input) return;
    input.classList.remove('drp__input--xs', 'drp__input--sm', 'drp__input--lg', 'drp__input--xl');
    const size = (this.config.inputSize as string) || 'md';
    if (size && size !== 'md') input.classList.add(`drp__input--${size}`);
  }

  #applyTransitionStyles(): void {
    const calendar = this.#shadow.querySelector('.drp__picker') as HTMLElement | null;
    if (!calendar) return;
    calendar.classList.toggle('drp__picker--transitions-enabled', !!this.config.enableTransitions);
  }

  #applyCustomStyles(): void {
    const slot = this.#customStyles;
    if (!slot) return;
    // The JS callback wins when both are set; the `custom-styles` attribute is the
    // declarative, no-JS fallback. Either resolves to a CSS string for the slot.
    const callback = this.config.customStylesCallback as (() => string | null | undefined) | null | undefined;
    const staticCss = (this.config.customStyles as string | null | undefined) ?? null;
    if (typeof callback !== 'function') {
      slot.set(staticCss);
      if (import.meta.env?.DEV && staticCss) this.#checkCustomStyleVars(staticCss);
      return;
    }
    try {
      const css = callback();
      slot.set(css);
      if (import.meta.env?.DEV && css) this.#checkCustomStyleVars(css);
    } catch (e) {
      console.warn('[web-daterangepicker] customStylesCallback threw', e);
      slot.clear();
    }
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
      console.warn(
        `[web-daterangepicker] custom styles set "${name}", which no ` +
        `--drp-* variable in the component reads — likely a typo.${hint}`,
      );
    }
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
   * live picker (in place — no rebuild). Only a `floating`-configured picker
   * adapts; `inline` and an explicit `modal` base are left exactly as authored.
   *
   * The class→presentation policy is core's `resolvePresentation` with our one
   * override, `{ tablet: 'modal' }`, giving the three-tier ladder:
   *   - phone   (touch, shorter side < 600px) → `fullscreen`
   *   - tablet  (touch, shorter side ≥ 600px) → `modal`
   *   - desktop (fine pointer, any width)      → `floating`
   * A forced `mobile-presentation` (`floating`/`modal`/`fullscreen`) wins on any
   * device — handy for previewing the phone overlay on a desktop.
   */
  #applyPresentation(env: EnvironmentSnapshot): void {
    if (!this.#picker) return;
    if ((this.config.positioningMode as string) !== 'floating') return;
    const mode = (this.config.mobilePresentation as MobilePresentation | null) ?? 'auto';
    this.#picker.setPresentation(resolvePresentation(mode, env, { tablet: 'modal' }));
  }

  // ── container-responsive compaction (SPEC §12.9, core `resized` hook) ──────

  /**
   * React to THIS element's own box changing (core's shared, per-element
   * ResizeObserver), as distinct from the viewport. When the box crosses the
   * `compact-below` threshold we swap between the authored month layout and a
   * compact one (single month, no wide Today/Clear buttons) so a picker in a
   * narrow column stays usable — the container-query companion to the
   * environment-driven `mobilePresentation`.
   *
   * Month-column count is a STRUCTURAL engine option (no in-place patch), so a
   * threshold cross rebuilds the picker; the committed selection is snapshotted
   * and restored so a resize never drops the user's dates. Merely overriding this
   * hook subscribes the element to the observer (core wires it on connect and
   * tears it down on disconnect) — cheap even for pickers that never opt in.
   */
  protected override resized({ width }: ElementSize): void {
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
      ranges: p.selectedRanges,
      startDate: p.selectedStartDate,
      endDate: p.selectedEndDate,
      time: p.selectedTime,
      datetime: p.selectedDatetime,
      inputText: this.#inputElement?.value ?? '',
    };
  }

  /** Restore a {@link SelectionSnapshot} onto the freshly rebuilt picker. */
  #restoreSelection(snap: SelectionSnapshot | null): void {
    const p = this.#picker;
    if (!p || !snap) return;
    const mode = (this.config.selectionMode as string) ?? 'single';
    const pmode = (this.config.pickerMode as string) ?? 'date';

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

  // ── render gate (`defer`) ─────────────────────────────────────────────────

  /**
   * Release the `defer` render gate: build the picker now (once), with every
   * option, callback and listener wired while deferred already in place. No-op
   * when the element wasn't deferred or is already built. `flush()` first so a
   * synchronous `el.value = …; el.customStylesCallback = …; el.ready()` lands
   * those pending writes in the single build rather than after it. Latched — the
   * gate never re-closes. Fires the `ready` event on the first build.
   */
  ready(): void {
    this.#released = true;
    this.flush(); // apply pending input writes (may itself build via reinit())
    if (this.isConnected && !this.#picker) this.#buildPicker();
  }

  /** Whether the picker has been built (the `ready` event has fired). False while a `defer` gate is still held. */
  get isReady(): boolean {
    return this.hasAttribute('is-ready');
  }

  // ── imperative API (flush pending writes, then delegate to the picker) ─────

  /** Open the calendar (floating/modal modes). */
  open(): void { this.flush(); this.#picker?.open(); }
  /** Close the calendar (floating/modal modes). */
  close(): void { this.flush(); this.#picker?.close(); }
  /** Toggle the calendar open/closed. */
  toggle(): void { this.flush(); this.#picker?.toggle(); }
  /** Clear the current selection and reset the input. */
  clearSelection(): void { this.flush(); this.#picker?.clearSelection(); }

  /** Show an inline message; `autoHide` (ms) dismisses it automatically. */
  showMessage(content: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number): void {
    this.flush(); this.#picker?.showMessage(content, type, autoHide);
  }
  /** Hide the current inline message. */
  hideMessage(): void { this.flush(); this.#picker?.hideMessage(); }
  /** Toggle the inline message on/off. */
  toggleMessage(content?: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number): void {
    this.flush(); this.#picker?.toggleMessage(content, type, autoHide);
  }

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
  /** Toggle the loader for the given target (default `calendar`). */
  toggleLoader(target?: LoaderTarget): void { this.flush(); this.#picker?.toggleLoader(target); }

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

  /** The current text in the input (floating/modal modes); `''` when there is no input. */
  getInputValue(): string { return this.#inputElement?.value || ''; }
  /** Set the input text and reflect it to the `value` attribute. */
  setInputValue(value: string): void {
    if (this.#inputElement) this.#inputElement.value = value;
    this.setAttribute('value', value);
  }

  /**
   * Set custom month names.
   * @deprecated Assign the `monthNames` property instead.
   */
  setMonthNames(monthNames: string[]): void { (this as unknown as { monthNames: string[] }).monthNames = monthNames; }

  /** Align items within the rolling year/month selector (`flex-start` | `center` | `flex-end`). */
  setRollingItemAlignment(alignment: 'flex-start' | 'center' | 'flex-end'): void {
    const calendar = this.#shadow.querySelector('.drp__picker') as HTMLElement | null;
    calendar?.style.setProperty('--drp-rolling-item-justify-content', alignment);
  }

  // ── live-state accessors (read the picker/input, not the config) ──────────

  /** Text value of the input. */
  get value(): string { return this.getInputValue(); }
  set value(val: string) { this.setInputValue(val); }

  /**
   * Full read-only lock, reflected to the `readonly` attribute. Reads back `true`
   * only when every aspect is locked. For partial locks use `lock([...])`.
   */
  get readonly(): boolean { return this.#picker ? this.#picker.readonly : this.hasAttribute('readonly'); }
  set readonly(value: boolean) {
    if (value) this.setAttribute('readonly', '');
    else this.removeAttribute('readonly');
  }

  /** Committed ranges (range mode). Assigning replaces the selection. */
  get selectedRanges(): DateRange[] { this.flush(); return this.#picker?.selectedRanges || []; }
  set selectedRanges(ranges: DateRange[]) { this.flush(); if (this.#picker) this.#picker.selectedRanges = ranges; }

  /** Committed dates (multiple mode). Assigning replaces the selection. */
  get selectedDates(): Date[] { this.flush(); return this.#picker?.selectedDates || []; }
  set selectedDates(dates: Date[]) { this.flush(); if (this.#picker) this.#picker.selectedDates = dates; }

  /** Committed date (single mode). Assigning replaces the selection. */
  get selectedDate(): Date | null { this.flush(); return this.#picker?.selectedDate || null; }
  set selectedDate(date: Date | null) { this.flush(); if (this.#picker) this.#picker.selectedDate = date; }

  /** Committed range start (read-only; set a range via `selectedRanges`). */
  get selectedStartDate(): Date | null { this.flush(); return this.#picker?.selectedStartDate || null; }
  /** Committed range end (read-only; set a range via `selectedRanges`). */
  get selectedEndDate(): Date | null { this.flush(); return this.#picker?.selectedEndDate || null; }

  /** Selected time (time/datetime modes). */
  get selectedTime(): SelectedTime | null { this.flush(); return this.#picker?.selectedTime || null; }
  set selectedTime(time: SelectedTime | null) { this.flush(); if (this.#picker) this.#picker.selectedTime = time; }

  /** Composed date+time; the setter accepts a Date or ISO string and splits it. */
  get selectedDatetime(): Date | null { this.flush(); return this.#picker?.selectedDatetime || null; }
  set selectedDatetime(value: Date | string | null) { this.flush(); if (this.#picker) this.#picker.selectedDatetime = value; }

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
   * The live `DateRangePicker` engine instance this element wraps (or `undefined`
   * before first connect / while detached). An escape hatch for advanced use —
   * the engine is also a public export — and the same white-box hook the old
   * `private picker` field exposed. Prefer the element's own methods/properties
   * where they exist.
   */
  get picker(): DateRangePicker | undefined { this.flush(); return this.#picker; }
}

// Importing this module registers the element (back-compat contract). The full
// global-API publish + logger-bundle wiring happens in index.ts via
// registerComponent(); both defines are idempotent, so importing either works.
if (typeof customElements !== 'undefined' && !customElements.get('web-daterangepicker')) {
  customElements.define('web-daterangepicker', WebDaterangepickerElement);
}
