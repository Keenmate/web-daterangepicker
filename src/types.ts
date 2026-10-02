import type { DateRangePicker } from './date-picker';
import type { PresentationContext } from '@keenmate/web-components-core';

export type { PresentationContext };

/**
 * Base context shared by every callback in the public API.
 * Every callback receives a single context object that extends this,
 * so a handler can always reach the picker instance for imperative actions.
 */
export interface PickerContext {
  /** The DateRangePicker core instance (for calling imperative methods) */
  picker: DateRangePicker;
}

/**
 * Typed, curated imperative facade handed to callbacks (e.g. action-button
 * `onClick`) via `context.controller` — a stable public surface for reading the
 * selection and driving the picker, so callback authors don't reach into the raw
 * instance. The `picker` escape hatch on {@link PickerContext} remains for
 * anything not covered here. Mirrors web-multiselect's `MultiSelectController`.
 */
export interface DateRangePickerController {
  // ── read current selection ──────────────────────────────────────────────
  /** The selected date (single mode), or null. */
  getSelectedDate(): Date | null;
  /** The selected range (`{start,end}`) derived from the current endpoints, or null. */
  getSelectedRange(): DateRange | null;
  /** All committed ranges (range mode; one entry for a simple range, N for split/multi-range). */
  getSelectedRanges(): DateRange[];
  /** The selected dates (multiple mode), or the enabled dates of a range under `individual`/`split`. */
  getSelectedDates(): Date[];
  /** The composed Date when the picker has time semantics (datetime mode), or null. */
  getSelectedDatetime(): Date | null;
  /** Whether the calendar popover is currently open (floating/modal modes). */
  readonly isOpen: boolean;

  // ── mutate the selection ────────────────────────────────────────────────
  /** Select today (and the current time in datetime mode). */
  selectToday(): void;
  /** Clear the current selection. */
  clearSelection(): void;
  /** Commit a pending selection (Apply / `commit-mode="apply"`). */
  apply(): void;

  // ── drive the calendar ──────────────────────────────────────────────────
  open(): void;
  close(): void;
  toggle(): void;
  /** Swap the presentation in place (no rebuild; selection preserved). */
  setPresentation(next: 'floating' | 'modal' | 'fullscreen'): void;
  /** Step the given month column (default: the active column) to the previous month. */
  prevMonth(monthIndex?: number): void;
  /** Step the given month column (default: the active column) to the next month. */
  nextMonth(monthIndex?: number): void;

  // ── locking ─────────────────────────────────────────────────────────────
  lock(aspects?: LockAspect | LockAspect[]): void;
  unlock(aspects?: LockAspect | LockAspect[]): void;

  // ── feedback ────────────────────────────────────────────────────────────
  showMessage(content: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number): void;
  hideMessage(): void;
  showSummary(content: string): void;
  hideSummary(): void;
}

/**
 * Where a loader (spinner) is mounted by showLoader()/hideLoader()/toggleLoader().
 * - 'calendar' (default): full-calendar overlay
 * - 'message': in-block spinner inside the message area
 * - 'summary': in-block spinner inside the range summary area
 */
export type LoaderTarget = 'calendar' | 'message' | 'summary';

/**
 * A lockable interaction family for the scoped read-only lock (see `lock()` / `unlock()`).
 * Locking freezes user interaction for that aspect while keeping the value readable
 * (unlike `disabled`, which greys the input out). The programmatic API is not gated —
 * only user-driven interaction is.
 *
 * - 'selection'  — day clicks, drag-to-adjust range endpoints, typed input, Today/Now/Clear, time picks
 * - 'navigation' — month nav (`<` / `>`), PageUp/Down, Ctrl+arrows, the rolling year/month selector
 * - 'actions'    — the Apply button and custom / preset action buttons
 * - 'open'       — (re)opening the popover in floating & modal modes; closing stays allowed so a user is never trapped
 *
 * `lock()` with no argument locks every aspect; `lock(aspect | aspect[])` locks a subset.
 */
export type LockAspect = 'selection' | 'navigation' | 'actions' | 'open';

/**
 * Result from beforeDateSelectCallback
 * Tells the component what action to take with the proposed selection
 */
export interface BeforeSelectResult {
  /**
   * Action to take:
   * - 'accept': Use the proposed selection as-is
   * - 'adjust': Use adjusted date(s) instead
   * - 'restore': Revert to the previous selection before this operation
   * - 'clear': Clear the selection entirely
   */
  action: 'accept' | 'adjust' | 'restore' | 'clear';

  /** If action is 'adjust' (single mode), the new date to use */
  adjustedDate?: Date;

  /** If action is 'adjust' (range mode), the new start date to use */
  adjustedStartDate?: Date;

  /** If action is 'adjust' (range mode), the new end date to use */
  adjustedEndDate?: Date;

  /**
   * Range mode only. Replace the single proposed range with these N independent
   * ranges — e.g. the enabled-only pieces of a split selection, or a range with
   * a hole carved out. Valid with action 'accept' or 'adjust' (ignored for
   * 'restore' / 'clear' and for single mode).
   *
   * When present, the committed selection becomes exactly these ranges:
   * `selectedRanges` reflects them, the day grid highlights each range's
   * start / end / in-range cells, the summary lists them, and `onSelect`
   * receives the `DateRange[]`. The envelope accessors (`selectedStartDate` /
   * `selectedEndDate`) span the first range's start through the last range's
   * end. Takes precedence over `adjustedStartDate` / `adjustedEndDate`.
   *
   * @example
   * // Turn a range straddling disabled days into its enabled-only segments
   * beforeDateSelectCallback: (ctx) => {
   *   if (ctx.subRanges && ctx.subRanges.length > 1) {
   *     return { action: 'adjust', adjustedRanges: ctx.subRanges,
   *              message: 'Selection split around unavailable days' };
   *   }
   *   return { action: 'accept' };
   * }
   */
  adjustedRanges?: DateRange[];

  /** Optional message to log or display to user */
  message?: string;

  /**
   * When true with action 'restore', keeps the invalid range visible with distinct
   * error styling (red-tinted background) instead of discarding it entirely.
   * This provides visual feedback showing what the user attempted to select.
   * The invalid range styling is cleared when the user makes a new selection attempt.
   *
   * Only applies to range mode with action 'restore'.
   *
   * @example
   * beforeDateSelectCallback: (range) => {
   *   const nights = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));
   *   if (nights > 7) {
   *     return {
   *       action: 'restore',
   *       message: 'Maximum 7 nights allowed',
   *       showInvalidRange: true  // Keep range visible with error styling
   *     };
   *   }
   *   return { action: 'accept' };
   * }
   */
  showInvalidRange?: boolean;
}

/**
 * @deprecated Use BeforeSelectResult instead. Will be removed in v2.0.0
 */
export type AsyncValidationResult = BeforeSelectResult;

/**
 * Context passed to beforeMonthChangedCallback
 * Provides information about the target month being navigated to
 */
export interface MonthChangeContext extends PickerContext {
  /** Target year (e.g., 2025) */
  year: number;

  /** Target month (0-11, where January = 0) */
  month: number;

  /** Which visible month column is changing (0-based) */
  monthIndex: number;

  /** First date visible in the calendar grid (may be from previous month) */
  firstVisibleDate: Date;

  /** Last date visible in the calendar grid (may be from next month) */
  lastVisibleDate: Date;
}

/**
 * Result from beforeMonthChangedCallback
 * Tells the component whether to proceed with month navigation and provides bulk metadata
 */
export interface BeforeMonthChangeResult {
  /**
   * Action to take:
   * - 'accept': Allow navigation to proceed, update metadata cache if provided
   * - 'block': Prevent navigation, stay on current month
   */
  action: 'accept' | 'block';

  /**
   * Bulk metadata for all dates in the visible range
   * Key: YYYY-MM-DD string
   * Value: DayMetadata with styling/disabled state
   *
   * When provided, these values are cached and used instead of calling
   * getDateMetadataCallback for individual dates during rendering
   */
  metadata?: Map<string, DayMetadata>;

  /**
   * Custom header text for each month
   * Key: "YYYY-MM" string (e.g., "2026-01" for January 2026)
   * Value: Custom header text to display (e.g., "Jan 2026 (10 rooms)")
   *
   * When provided, these values override the default month header format.
   * Takes precedence over getMonthHeaderCallback.
   */
  monthHeaders?: Map<string, string>;

  /** Optional message to log or display (typically used with 'block' action) */
  message?: string;
}

/**
 * Action button configuration for calendar actions (Today, Clear, Apply, custom actions)
 * Aligned with web-multiselect ActionButton interface
 */
export interface ActionButton {
  /** Action identifier ('today', 'now', 'clear', 'apply', or 'custom' for custom actions) */
  action: 'today' | 'now' | 'clear' | 'apply' | 'custom';

  /** Button text label */
  text: string;

  /** Optional CSS class(es) to add to the button */
  cssClass?: string;

  /** Optional tooltip text */
  tooltip?: string;

  /** Static visibility - set to false to hide button */
  isVisible?: boolean;

  /** Static disabled state - set to true to disable button */
  isDisabled?: boolean;

  /** Custom click handler (required for 'custom' action) */
  onClick?: (ctx: ActionButtonContext) => void | Promise<void>;

  /** Dynamic visibility callback - return false to hide button (takes priority over isVisible) */
  isVisibleCallback?: (ctx: ActionButtonContext) => boolean;

  /** Dynamic disabled state callback - return true to disable button (takes priority over isDisabled) */
  isDisabledCallback?: (ctx: ActionButtonContext) => boolean;

  /** Dynamic text callback - return button text (takes priority over text) */
  getTextCallback?: (ctx: ActionButtonContext) => string;

  /** Dynamic CSS class callback - return class name(s) (takes priority over cssClass) */
  getClassCallback?: (ctx: ActionButtonContext) => string | string[];

  /** Dynamic tooltip callback - return tooltip text (takes priority over tooltip) */
  getTooltipCallback?: (ctx: ActionButtonContext) => string;
}

/**
 * Context passed to every ActionButton callback (onClick, isVisibleCallback,
 * isDisabledCallback, getTextCallback, getClassCallback, getTooltipCallback).
 */
export interface ActionButtonContext extends PickerContext {
  /** The action identifier of the button this callback belongs to */
  action: ActionButton['action'];
  /** The button's own configuration object */
  button: ActionButton;
  /** data-* attributes on the button (for 'custom' actions); mirrors CustomActionEventDetail.data */
  data?: Record<string, string>;
  /** Typed facade for reading the selection and driving the picker (see {@link DateRangePickerController}). */
  controller: DateRangePickerController;
}

export type PickerMode = 'date' | 'time' | 'datetime';
export type TimeDisplay = 'rolls' | 'clock' | 'wheel' | 'compact';

export interface DatePickerOptions {
  /**
   * What the picker selects. Default: `single`.
   *
   * - `single` — one date
   * - `range` — a start–end range (two clicks, or drag to adjust)
   * - `multiple` — several individual dates (requires Apply to commit)
   */
  selectionMode?: 'single' | 'range' | 'multiple';
  /**
   * What the picker is selecting. Default: `date`.
   *
   * - `date` — calendar grid only
   * - `time` — time rolls only (hours/minutes + optional seconds/AM-PM), no calendar
   * - `datetime` — calendar grid plus time rolls in a side-by-side popover
   *
   * In v1, `time` and `datetime` only support selectionMode `single`, and
   * `datetime` is incompatible with monthLayout `grid` — both fall back with a console warning.
   */
  pickerMode?: PickerMode;
  /** Time format for time / datetime modes. Tokens: HH/H, hh/h, mm/m, ss/s, a. Default: 'HH:mm'. */
  timeFormatMask?: string;
  /** Optional separate display format for the time portion (mirrors displayFormatMask). Falls back to timeFormatMask. */
  displayTimeFormatMask?: string;
  /** Minute (and second) increment for the rolls. Default: 1. */
  timeStep?: number;
  /**
   * Hour numbering for time / datetime modes. Default: derived from timeFormatMask (`h12` if an `a` token is present, else `h24`).
   *
   * - `h24` — 0–23
   * - `h12` — 1–12 with an AM/PM roll
   */
  hourCycle?: 'h12' | 'h24';
  /** Show a third roll for seconds. Default: derived from timeFormatMask (true if `s` token present). */
  isSecondsShown?: boolean;
  /** Show a "Now" button in time/datetime modes (parallel to isTodayButtonShown). Default: true. Ignored in date mode. */
  isNowButtonShown?: boolean;
  /**
   * Which UI to use for picking the time portion (time / datetime modes). Default: `rolls`. Ignored when pickerMode is `date`.
   *
   * - `rolls` — scrollable rolling lists for hours/minutes/seconds/AM-PM.
   * - `clock` — Material-style two-step clock face (hours then minutes). h24 uses a dual ring (outer 1-12, inner 13-24). Seconds are ignored and `time-step` must divide 60 evenly; non-divisor steps fall back to 1 with a console warning.
   * - `wheel` — iOS-style barrel/wheel picker. Snap-scroll columns for hours, minutes, (optional seconds), and AM/PM (h12 only) with a centered selection band and top/bottom fade gradients. Supports any `time-step`. Click any visible row to center it.
   * - `compact` — iOS 14+ pill picker. Tappable HH and MM (and optional SS) pills with a ':' separator; tap a pill to type a value directly. Optional AM/PM toggle (h12). Calmest of the four — basically inline numeric inputs styled as pills.
   */
  timeDisplay?: TimeDisplay;
  /** Floating-UI placement for the popover (e.g. 'bottom-start', 'top-end'). Default: 'bottom-start', flipping/shifting on viewport overflow. */
  calendarPlacement?: string;
  /** Number of month columns shown side by side. Default: 1. */
  visibleMonthsCount?: number;
  /** Date format for the input and parsing. Tokens: YYYY/YY, MM/M, DD/D with any separators. Default: 'YYYY-MM-DD'. */
  dateFormatMask?: string;
  /**
   * When the calendar opens. Default: `focus`.
   *
   * - `focus` — when the input receives focus
   * - `typing` — once the user starts typing a date
   * - `manual` — only via the API (`open()`), never automatically
   */
  calendarOpenTrigger?: 'focus' | 'typing' | 'manual';
  /**
   * Scope the "one overlay open at a time" coordination to a named group. Overlays
   * (datepickers, multiselects, external popovers) sharing a group dismiss each other
   * when one opens; different groups are independent. Unset = the default (ungrouped)
   * group, in which every ungrouped overlay coordinates.
   */
  overlayGroup?: string;
  /**
   * Fire-and-forget notification that a date/range/time was selected (or applied).
   * The first argument is the raw selection (kept for backward compatibility); the
   * second is the standardized {@link SelectEventDetail} — the same payload the
   * web component's `date-select`/`change` CustomEvents carry (formatted value plus
   * the enabled/disabled/split breakdown for range `disabledDatesHandling`). New
   * code should read `detail`; existing one-argument handlers keep working.
   */
  onSelect?: (date: Date | DateRange | DateRange[] | Date[], detail?: SelectEventDetail) => void;
  container?: HTMLElement; // Where to append the calendar (default: document.body)
  /**
   * How the calendar is presented. Default: `floating`.
   *
   * - `inline` — rendered as a static block (no input, always open)
   * - `floating` — popover anchored to the input
   * - `modal` — centered overlay with a backdrop
   */
  positioningMode?: 'inline' | 'floating' | 'modal';

  /**
   * Phone full-screen overlay: focus the input on open (pops the soft keyboard).
   * Default `false` — the sheet opens with the calendar visible, keyboard closed.
   * Only affects the `fullscreen` presentation.
   */
  fullscreenAutofocus?: boolean;

  /**
   * Optional heading shown in the phone full-screen overlay header, beside the
   * close (✕) button. Unset → just the close button.
   */
  fullscreenTitle?: string | null;

  /**
   * In the phone full-screen overlay, relocate the date input into the header so
   * it's visible and typeable above the sheet (the offscreen trigger field would
   * otherwise sit behind the fixed sheet). Gets `inputmode="numeric"` so the phone
   * shows a digits keypad — the input mask supplies the separators, so no `/`/`.`
   * key is needed. Default `false`. Only affects the `fullscreen` presentation;
   * takes over the header row, so `fullscreenTitle` is not shown alongside it.
   */
  fullscreenInput?: boolean;

  /**
   * How a selection is committed and the calendar dismissed (floating mode only).
   * Merges the old `autoClose` + `isApplyButtonShown` into one axis.
   * Default: `selection` for date mode; `apply` for time/datetime and multiple mode.
   *
   * - `selection` — commit and close as soon as a selection completes (single click,
   *   range completion, drag-adjust). No Apply button. Multiple mode can't use this
   *   (it collects several dates), so it falls back to `apply`.
   * - `apply` — render an Apply button; the selection is staged until it's clicked,
   *   which commits the value and closes.
   * - `manual` — never auto-commit or auto-close, and render no built-in Apply button.
   *   The app drives commit/close itself via custom action buttons (ActionButton.onClick
   *   calling `apply()` / `close()`).
   */
  commitMode?: 'selection' | 'apply' | 'manual';

  /**
   * Controls whether the calendar closes when user scrolls the page (floating mode only)
   * - true: Close on scroll (default)
   * - false: Keep open on scroll
   *
   * Note: Even when true, scroll won't close if:
   * - The selection is staged pending Apply (commitMode: 'apply')
   * - A message is currently visible (validation error, etc.)
   */
  shouldCloseOnScroll?: boolean;

  // Calendar layout
  /**
   * How multiple months are arranged. Default: `horizontal`.
   *
   * - `horizontal` — a flex row of month columns
   * - `grid` — a CSS grid (see gridRows / gridColumns)
   */
  monthLayout?: 'horizontal' | 'grid';
  /** Number of rows when monthLayout is 'grid' (e.g. 2 for a 2×3 grid). */
  gridRows?: number;
  /** Number of columns when monthLayout is 'grid' (e.g. 3 for a 2×3 grid). */
  gridColumns?: number;
  /** Show a single navigation header above all months (multi-month calendars); individual month headers become plain month/year text. Default: false. */
  isUnifiedNavigationEnabled?: boolean;
  /**
   * Which month column serves as the anchor for unified navigation (0-based index)
   * Default: 0 (first month)
   *
   * Example: For a 3×3 grid (9 months), set to 4 to use the center month as anchor
   * When navigating, the anchor month moves and all other months are calculated relative to it
   *
   * Only applies when isUnifiedNavigationEnabled is true
   */
  unifiedNavigationAnchorIndex?: number;
  /**
   * When true, clicking the unified header range display shows month/year selector
   * Default: false (header is static text only)
   *
   * Only applies when isUnifiedNavigationEnabled is true
   */
  isUnifiedHeaderInteractive?: boolean;

  // Week start configuration
  /**
   * First day of the week. Default: `auto`.
   *
   * - `auto` — detect from the active locale
   * - `0`–`6` — fixed day, where 0 = Sunday, 1 = Monday … 6 = Saturday
   */
  weekStartDay?: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6;

  // Date restrictions
  /** Earliest selectable date (Date or ISO string). Dates before it are disabled. */
  minDate?: Date | string;
  /** Latest selectable date (Date or ISO string). Dates after it are disabled. */
  maxDate?: Date | string;
  /** Specific dates to disable (array of Date or ISO strings). */
  disabledDates?: (Date | string)[];
  /** Weekdays to disable, by day-of-week number (0 = Sunday … 6 = Saturday). */
  disabledWeekdays?: number[];

  // Initial display date
  /** Month/date to show when the calendar first opens. If unset, uses today (or minDate when constrained). */
  initialDate?: Date | string;

  // Rolling selector configuration
  /** Year range for the rolling year selector. Examples: "2024" (single) or "2022-2026" (range). Default: current year ± 50. */
  rollingYearRange?: string;
  /** Month range for the rolling month selector, format "MM-MM". Examples: "01-12" (all), "06-08" (summer). Default: "01-12". */
  rollingMonthRange?: string;

  // Special dates (holidays, events, etc.)
  specialDates?: DecoratedDate[];

  // Property mapping for specialDates array items
  // Specify which properties in your data objects map to DayMetadata fields
  // If not specified, defaults to DayMetadata property names
  /** Which property in your specialDates objects holds the date value. Default: 'date'. */
  dateMember?: string;
  /** Which property holds the badge text. Default: 'badgeText'. */
  badgeTextMember?: string;
  /** Which property holds the badge CSS class. Default: 'badgeClass'. */
  badgeClassMember?: string;
  /** Which property holds the day-cell CSS class. Default: 'dayClass'. */
  dayClassMember?: string;
  /** Which property holds the badge tooltip. Default: 'badgeTooltip'. */
  badgeTooltipMember?: string;
  /** Which property holds the day-cell tooltip. Default: 'dayTooltip'. */
  dayTooltipMember?: string;
  /** Which property holds the disabled flag. Default: 'isDisabled'. */
  isDisabledMember?: string;

  // Advanced callbacks
  getDateMetadataCallback?: (ctx: DayContext) => DayMetadata | null; // Custom styling/labels

  // Custom rendering
  customStylesCallback?: () => string; // Return CSS string to inject into Shadow DOM for use with renderDayCallback classes

  /**
   * Full replacement — return element or HTML string to completely replace day cell content.
   *
   * SECURITY: When returning a string, the value is spliced into innerHTML without escaping.
   * Callers are responsible for sanitizing any user-controlled data interpolated into the
   * returned string. Prefer returning an HTMLElement when content depends on untrusted input.
   */
  renderDayCallback?: (data: DayContext) => HTMLElement | string | null;

  /**
   * Augmentation — return element or HTML string to add to default day cell.
   *
   * SECURITY: Same caveat as renderDayCallback — string return values are appended to
   * innerHTML unescaped. Sanitize untrusted data or return an HTMLElement.
   */
  renderDayContentCallback?: (data: DayContext) => HTMLElement | string | null;

  // Tooltips (HTML support)
  badgeTooltipCallback?: (data: DayContext) => string | null; // Return HTML string for badge hover tooltip (overrides DayMetadata.badgeTooltip)
  dayTooltipCallback?: (data: DayContext) => string | null; // Return HTML string for day cell hover tooltip (overrides DayMetadata.dayTooltip)

  /**
   * How a range that spans disabled dates is handled.
   *
   * - 'allow' (default): allow ranges over disabled dates
   * - 'prevent': block selections that cross disabled dates
   * - 'block': snap selection to the last enabled date before the disabled gap
   * - 'split': return multiple ranges split by disabled dates (event formatting only)
   * - 'individual': return a flat array of enabled dates (event formatting only)
   */
  disabledDatesHandling?: 'allow' | 'prevent' | 'block' | 'split' | 'individual';

  /** Highlight disabled dates that fall inside a selected range. Default: true; set false to highlight only enabled dates. */
  shouldHighlightDisabledInRange?: boolean;

  // Action button configuration
  /** Array of custom action buttons to display. If not provided, uses default buttons based on selectionMode */
  actionButtons?: ActionButton[];

  /** Show Today button (default: true) */
  isTodayButtonShown?: boolean;

  /** Show Clear button (default: true) */
  isClearButtonShown?: boolean;

  /** Show selection summary (range mode only — days/nights count). Default: true. Set to false to omit the summary block entirely. */
  isSummaryShown?: boolean;

  // Internationalization
  /** Locale for UI strings and date formatting. 'auto' (default) detects from the browser; or pass 'en', 'de', 'fr', 'es', etc. */
  locale?: string | 'auto';
  /** Separate format mask for display only (e.g. 'dd/mm/aaaa'). Falls back to dateFormatMask when unset. */
  displayFormatMask?: string;
  /** Override any UI strings (buttons, labels) individually. */
  customStrings?: Partial<LocaleStrings>;
  /** Custom month names (exactly 12, index 0 = January). Overrides locale names. Example: ['Jan', … , 'Dec']. */
  monthNames?: string[];
  /** Custom weekday names (exactly 7, index 0 = Sunday … 6 = Saturday, always — weekStartDay only rotates the display). Overrides locale names. */
  weekdayNames?: string[];

  /**
   * Custom function to format the summary display (receives all selection data, returns HTML string).
   *
   * SECURITY: Return value is spliced into innerHTML without escaping. Callers are responsible
   * for sanitizing any user-controlled data in the returned string.
   */
  formatSummaryCallback?: (data: SummaryContext) => string;

  /**
   * Callback to customize unified header range display text
   *
   * @param data - Contains first month, last month, anchor month, and month names
   * @returns HTML string to display in unified header
   *
   * @example Display only anchor month
   * getUnifiedHeaderCallback: ({ anchorMonth, monthNames }) => {
   *   return `${monthNames[anchorMonth.getMonth()]} ${anchorMonth.getFullYear()}`;
   *   // Returns: "May 2025" for 3×3 grid with anchor index 4
   * }
   *
   * @example Display full range
   * getUnifiedHeaderCallback: ({ firstMonth, lastMonth, monthNames }) => {
   *   return `${monthNames[firstMonth.getMonth()]} - ${monthNames[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`;
   *   // Returns: "Jan - Sep 2025"
   * }
   *
   * SECURITY: Return value is spliced into innerHTML unescaped. Sanitize untrusted data.
   */
  getUnifiedHeaderCallback?: (data: UnifiedHeaderContext) => string;

  /**
   * Callback to customize individual month header display text
   *
   * @param data - Contains the month being displayed and localized info
   * @returns String to display in month header
   *
   * Priority order for month headers:
   * 1. monthHeaders from beforeMonthChangedCallback result (if key exists)
   * 2. getMonthHeaderCallback (if defined)
   * 3. Default: "${monthName} ${year}"
   *
   * @example Display room availability
   * getMonthHeaderCallback: ({ month, monthName, year }) => {
   *   const key = `${year}-${String(month.getMonth()).padStart(2, '0')}`;
   *   const rooms = roomAvailability[key] || 0;
   *   return `${monthName} ${year} (${rooms} rooms)`;
   * }
   */
  getMonthHeaderCallback?: (data: MonthHeaderContext) => string;

  /**
   * Callback invoked BEFORE a date selection is finalized (single or range mode).
   * Can be sync or async. Allows you to:
   * - Validate against business rules or API
   * - Block/prevent selection
   * - Adjust the selected date(s)
   * - Clear or restore selection
   *
   * Called AFTER local validation (disabled dates, min/max) passes.
   *
   * @param selection - Proposed selection (Date for single mode, DateRange for range mode)
   * @returns BeforeSelectResult or Promise<BeforeSelectResult> with action to take
   *
   * @example Single mode - check against API
   * beforeDateSelectCallback: async (date) => {
   *   const response = await fetch(`/api/check-date/${date.toISOString()}`);
   *   const { available } = await response.json();
   *   return available ? { action: 'accept' } : { action: 'restore', message: 'Date unavailable' };
   * }
   *
   * @example Range mode - adjust to business rules
   * beforeDateSelectCallback: async (range) => {
   *   const nights = Math.floor((range.end - range.start) / (1000 * 60 * 60 * 24));
   *   if (nights < 2) {
   *     return { action: 'restore', message: 'Minimum 2 nights required' };
   *   }
   *   return { action: 'accept' };
   * }
   */
  beforeDateSelectCallback?: (ctx: SelectionContext) => Promise<BeforeSelectResult> | BeforeSelectResult;

  /**
   * Callback invoked BEFORE month navigation occurs (before rendering new month).
   * Can be sync or async. Allows you to:
   * - Load bulk metadata for all visible dates in one API call (performance optimization)
   * - Block navigation to unavailable months
   * - Show loading overlay during async operations
   *
   * Called before the calendar re-renders with the new month.
   *
   * @param context - Context about the target month and visible date range
   * @returns BeforeMonthChangeResult or Promise<BeforeMonthChangeResult> with action and optional bulk metadata
   *
   * @example Hotel availability - bulk load for entire month
   * beforeMonthChangedCallback: async ({ year, month, firstVisibleDate, lastVisibleDate }) => {
   *   const response = await fetch('/api/availability', {
   *     method: 'POST',
   *     body: JSON.stringify({
   *       start: firstVisibleDate.toISOString(),
   *       end: lastVisibleDate.toISOString()
   *     })
   *   });
   *   const data = await response.json();
   *
   *   const metadata = new Map();
   *   data.forEach(day => {
   *     metadata.set(day.date, {
   *       isDisabled: day.available === 0,
   *       badgeText: `$${day.price}`,
   *       dayTooltip: `${day.available} rooms available`
   *     });
   *   });
   *
   *   return { action: 'accept', metadata };
   * }
   *
   * @example Block navigation to unavailable period
   * beforeMonthChangedCallback: async ({ year, month }) => {
   *   const isAvailable = await checkPeriodAvailability(year, month);
   *   return isAvailable
   *     ? { action: 'accept' }
   *     : { action: 'block', message: 'Data not available for this period' };
   * }
   */
  beforeMonthChangedCallback?: (context: MonthChangeContext) => Promise<BeforeMonthChangeResult> | BeforeMonthChangeResult;

  /** Enable detailed console logging for troubleshooting. Default: false. */
  showDebugInfo?: boolean;
}

export interface LocaleStrings {
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

  // Time picker (used in pickerMode 'time' / 'datetime')
  time: string;
  now: string;
  am: string;
  pm: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FormatOptions {
  format: string;
  separator: string;
  parts: {
    year?: { index: number; length: number };
    month?: { index: number; length: number };
    day?: { index: number; length: number };
  };
  maxLength: number;
}

/**
 * Per-field time selection state for the time picker.
 *
 * Each field is independently nullable so we can distinguish "user committed
 * this value" from "still defaulted". `hour` is stored as 0-23 (canonical, mode-
 * independent). `ampm` is a separate commit-flag-with-value used only for the
 * AM/PM roll highlight in h12 mode; its half is always derivable from `hour`.
 */
export interface SelectedTime {
  hour: number | null;       // 0-23
  minute: number | null;     // 0-59
  second: number | null;     // 0-59
  ampm: 'am' | 'pm' | null;  // h12 mode only; UI commit flag
}

/**
 * Parsed time format mask, parallel to FormatOptions for the date side.
 * Used by time/datetime modes. Tokens recognised: HH/H (24h), hh/h (12h), mm/m, ss/s, a (am/pm).
 */
export interface TimeFormatOptions {
  format: string;
  separator: string;
  parts: {
    hours?: { index: number; length: number };
    minutes?: { index: number; length: number };
    seconds?: { index: number; length: number };
    ampm?: { index: number };
  };
  is12Hour: boolean;
  hasSeconds: boolean;
}

/**
 * One visible month column. `month`/`year` identify it; `firstDate`/`lastDate`
 * are the month's own boundaries; `gridStart`/`gridEnd` are the first/last cells
 * actually rendered in this column's 6-week grid (may spill into adjacent months).
 */
export interface MonthDisplay {
  /** 0-based month (Date.getMonth() semantics) */
  month: number;
  /** full year, e.g. 2026 */
  year: number;
  /** first day of the month (day 1, 00:00 local) */
  firstDate: Date;
  /** last day of the month (day 28–31, 00:00 local) */
  lastDate: Date;
  /** first visible grid cell of this column (may be from the previous month) */
  gridStart: Date;
  /** last visible grid cell of this column (may be from the next month) */
  gridEnd: Date;
}

export interface DatePickerEventDetail {
  date?: Date;
  dateRange?: DateRange | null;
  formattedValue: string;

  // For 'allow' mode - arrays of enabled/disabled dates in range
  enabledDates?: Date[];
  disabledDates?: Date[];

  // For 'split' mode - multiple valid ranges
  dateRanges?: DateRange[];

  // For 'individual' mode - flat array of dates
  dates?: Date[];

  // Helper methods for 'allow' mode
  getEnabledDateCount?: () => number;
  getTotalDays?: () => number;
}

// Generic type for specialDates array items
// Users can pass their own data structures and use *Member properties to map fields
export type DecoratedDate = Record<string, any>;

export interface DayMetadata {
  isDisabled?: boolean;      // Override disabled state for this date
  badgeClass?: string;       // CSS class applied to badge cell
  dayClass?: string;         // CSS class applied to day cell
  badgeText?: string;        // Text displayed in badge row above day numbers
  badgeTooltip?: string;     // Plain text hover tooltip for badge cell
  dayTooltip?: string;       // Plain text hover tooltip for day cell
}

export interface SummaryContext extends PickerContext, PresentationContext {
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
  selectionMode: 'single' | 'range' | 'multiple';
  rangeDisabledHandling?: 'allow' | 'block' | 'split' | 'individual';
  localeStrings: LocaleStrings;

  // Preview flag (true when dragging)
  isPreview?: boolean;
}

/**
 * Data passed to the day-level callbacks: getDateMetadataCallback, renderDayCallback,
 * renderDayContentCallback, badgeTooltipCallback, dayTooltipCallback.
 * Provides complete context about the day being rendered.
 *
 * Note: `element` and the selection-state flags are optional because some callers
 * (metadata resolution, string-render tooltip paths) run before the day cell exists
 * or before selection state is resolved.
 */
export interface DayContext extends PickerContext, PresentationContext {
  // Date information
  date: Date;                  // JavaScript Date object for this day
  dateString: string;          // ISO format YYYY-MM-DD
  dayNumber: number;           // Day of month (1-31)

  // State flags
  isDisabled: boolean;         // Day is disabled (cannot be selected)
  isSelected?: boolean;        // Day is selected (single mode or start/end in range mode)
  isStartDate?: boolean;       // Day is the range start date
  isEndDate?: boolean;         // Day is the range end date
  isInRange?: boolean;         // Day is between start and end dates
  isToday: boolean;            // Day is today's date
  isWeekend: boolean;          // Day is Saturday or Sunday

  // Context
  monthIndex?: number;         // Which month column this day appears in (0-based); absent in the metadata path (no column)
  element?: HTMLElement;       // Default rendered element (for augmentation pattern); absent in string-render/metadata paths
}

/**
 * Context passed to getMonthHeaderCallback — a single visible month header.
 */
export interface MonthHeaderContext extends PickerContext, PresentationContext {
  /** First day of the month being displayed */
  month: Date;
  /** Which visible month column this header belongs to (0-based) */
  monthIndex: number;
  /** Localized month name (e.g. "May") */
  monthName: string;
  /** Full year (e.g. 2025) */
  year: number;
}

/**
 * Context passed to getUnifiedHeaderCallback — the single header that spans a
 * unified-navigation grid/row.
 */
export interface UnifiedHeaderContext extends PickerContext, PresentationContext {
  /** First visible month in the grid */
  firstMonth: Date;
  /** Last visible month in the grid */
  lastMonth: Date;
  /** The anchor month that drives unified navigation */
  anchorMonth: Date;
  /** Localized month names (12 entries) */
  monthNames: string[];
}

/**
 * Context passed to beforeDateSelectCallback — the proposed selection.
 * `date` is populated in single mode, `range` in range mode.
 */
export interface SelectionContext extends PickerContext {
  /** Selection mode this proposal came from */
  mode: 'single' | 'range' | 'multiple';
  /** Proposed date (single mode) */
  date?: Date;
  /**
   * Proposed range (range mode) — the contiguous envelope between the two
   * endpoints the user selected. In split/individual disabled-date handling
   * this envelope may straddle disabled days; see `subRanges` / `enabledDates`
   * for the carved-out pieces the summary will actually show.
   */
  range?: DateRange;
  /**
   * Range mode only, and only when `disabledDatesHandling` is 'split' or
   * 'individual': the envelope (`range`) carved into contiguous enabled-only
   * segments — the same pieces `splitRangeByDisabled()` feeds the summary.
   * One entry per gap-separated run of enabled days. Absent for
   * single/'allow'/'block'/'prevent' handling (the envelope is the selection).
   *
   * The return value stays single-range (block/adjust the envelope); this is
   * a read-only view so validation can reason about the pieces without
   * re-deriving them.
   */
  subRanges?: DateRange[];
  /**
   * Range mode only, split/individual handling: the flat list of enabled dates
   * inside the envelope (mirrors `SummaryContext.dates`). Absent otherwise.
   */
  enabledDates?: Date[];
}

/**
 * Detail shape for the `date-select` and `change` events.
 */
export interface SelectEventDetail extends DatePickerEventDetail {}

/**
 * Detail shape for the `custom-action` event, dispatched when an action button
 * carrying data-action="custom" is clicked.
 */
export interface CustomActionEventDetail {
  /** data-* attributes on the button (data-action excluded) */
  data: Record<string, string>;
  /** The DateRangePicker core instance */
  picker: DateRangePicker;
}
