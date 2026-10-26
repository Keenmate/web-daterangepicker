import type { ComponentContext, PresentationContext } from '@keenmate/web-components-core';
import type { ActionEventDetail, ActionItem } from '@keenmate/web-components-core/actions';

export type { PresentationContext };

/**
 * Base context shared by every callback and every event detail in the public API
 * (core interaction model): the picker's public `controller` facade and its host
 * `element` (both non-enumerable), plus the presentation flags of the open chrome.
 */
export interface PickerContext extends ComponentContext<DateRangePickerController>, PresentationContext {}

/** Feedback message severity. */
export type MessageType = 'error' | 'warning' | 'info' | 'success';

/** Options for {@link DateRangePickerController.showMessage}. */
export interface ShowMessageOptions {
  /** Severity styling; omit for raw-HTML content (custom message). */
  type?: MessageType;
  /** Auto-hide after this many ms; omit / 0 to keep it until dismissed. */
  autoHideMs?: number;
}

/**
 * The picker's public facade — `el.controller`, and `controller` on every callback
 * context and event detail. A stable surface for reading the selection and driving
 * the picker; the internal engine is not part of the public API.
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
  /** Select the current time (time / datetime modes). */
  selectNow(): void;
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
  /**
   * Show a message in the calendar. `content` is HTML; a button inside it with
   * `data-action="custom" data-id="…"` fires the `action` event (`source: 'message'`).
   */
  showMessage(content: string, opts?: ShowMessageOptions): void;
  hideMessage(): void;
  showSummary(content: string): void;
  hideSummary(): void;
  showLoader(target?: LoaderTarget): void;
  hideLoader(target?: LoaderTarget): void;
  /** Re-run `getMonthDataCallback` for the visible months (after the backing data changed). */
  reloadMonthData(): Promise<void>;
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
 * What `beforeSelectCallback` returns (core `before*` contract):
 *
 * - nothing (`undefined`) — accept the proposed selection
 * - `false` — reject it; the previous selection is restored. Explain why with
 *   `ctx.controller.showMessage(…)`; in range mode call `ctx.markRangeInvalid()`
 *   first to keep the rejected range visible with error styling.
 * - a `Date` (single) / `DateRange` (range) — accept this adjusted selection instead
 * - a `DateRange[]` (range) — replace the proposal with these N independent ranges
 *   (e.g. the enabled-only pieces of a split selection)
 * - `null` — clear the selection entirely
 */
export type BeforeSelectResult = void | false | null | Date | DateRange | DateRange[];

/**
 * Context of `beforeSelectCallback` — the proposed selection.
 * `date` is populated in single mode, `range` in range mode.
 */
export interface BeforeSelectContext extends PickerContext {
  /** Selection mode this proposal came from */
  mode: 'single' | 'range' | 'multiple';
  /** Proposed date (single mode) */
  date?: Date;
  /**
   * Proposed range (range mode) — the contiguous envelope between the two
   * endpoints the user selected. In split/individual disabled-date handling
   * this envelope may straddle disabled days; see `subRanges` / `enabledDates`.
   */
  range?: DateRange;
  /**
   * Range mode, `disabledDatesHandling` 'split' or 'individual' only: the envelope
   * carved into contiguous enabled-only segments (read-only view).
   */
  subRanges?: DateRange[];
  /** Range mode, split/individual handling: the enabled dates inside the envelope. */
  enabledDates?: Date[];
  /**
   * Range mode: when you return `false`, keep the rejected range visible with
   * error styling (cleared on the next selection attempt) instead of discarding it.
   */
  markRangeInvalid(): void;
}

/**
 * Context of `beforeMonthChangeCallback` and `getMonthDataCallback` — the month
 * being navigated to and the visible date range.
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

/** `beforeMonthChangeCallback` result: `false` blocks the navigation; nothing continues. */
export type BeforeMonthChangeResult = void | false;

/**
 * Data `getMonthDataCallback` loads for the visible range (sync or async — a
 * loader shows while a Promise is pending).
 */
export interface MonthData {
  /**
   * Metadata for dates in the visible range, keyed `YYYY-MM-DD`. Cached and used
   * instead of calling `getDateMetadataCallback` per date.
   */
  metadata?: Map<string, DayMetadata>;
  /**
   * Header text per month, keyed `YYYY-MM` (0-padded 1-based month, e.g. "2026-01").
   * Takes precedence over `getMonthHeaderCallback`.
   */
  monthHeaders?: Map<string, string>;
}

/** Built-in action names of the footer buttons. */
export type DateRangePickerAction = 'today' | 'now' | 'clear' | 'apply';

/**
 * One footer action button (core `ActionItem`). Built-ins set `action`
 * (`'today'`, `'now'`, `'clear'`, `'apply'`); a custom button omits it and sets
 * `id`. Dynamic fields use `get*Callback(ctx)`; `onClick(detail)` runs first,
 * then the built-in behaviour, then the `action` event (it sees the new state).
 */
export type DateRangePickerActionItem = ActionItem<PickerContext, DateRangePickerAction>;

/**
 * Detail of the `action` event / `onAction` / `beforeActionCallback` / item
 * `onClick`: the picker context plus `action`, `id`, `item`, `source`
 * (`'action-buttons' | 'message' | 'summary' | 'calendar'`), `sourceEvent`,
 * `triggerElement`, `dataset` (the trigger's `data-*`).
 */
export type DateRangePickerActionEventDetail = ActionEventDetail<PickerContext, DateRangePickerAction>;

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
   * Engine-level twin of the `select` event (the element bridges it). Receives the
   * {@link SelectEventDetail} — the same object the `select` / `change` events carry.
   */
  onSelect?: (detail: SelectEventDetail) => void;
  /** Engine-level twin of the `action` event (the element bridges it). */
  onAction?: (detail: DateRangePickerActionEventDetail) => void;
  /** Engine-level twin of the `month-change` event (the element bridges it). */
  onMonthChange?: (detail: MonthChangeEventDetail) => void;
  /**
   * Internal: the host element and its controller, so contexts and details carry
   * them. Set by `<web-daterangepicker>`; a standalone engine falls back to its
   * input / calendar element and its own controller.
   */
  hostElement?: HTMLElement;
  controller?: DateRangePickerController;
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
  /** Return a CSS string injected into the Shadow DOM (e.g. classes used by renderDayCallback). */
  getCustomStylesCallback?: (ctx: PickerContext) => string | null;

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
  /** Return HTML for the badge hover tooltip (overrides DayMetadata.badgeTooltip); null keeps the default. */
  getBadgeTooltipCallback?: (ctx: DayContext) => string | null;
  /** Return HTML for the day-cell hover tooltip (overrides DayMetadata.dayTooltip); null keeps the default. */
  getDayTooltipCallback?: (ctx: DayContext) => string | null;

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
  /**
   * Footer action buttons. Unset → the built-ins for the mode (today / now / clear /
   * apply). Strings are built-in shorthand: `['today', { id: 'next-week', text: '+7d' }]`.
   */
  actionButtons?: (DateRangePickerActionItem | DateRangePickerAction)[];

  /**
   * Runs before any action button (or HTML `data-action` trigger) does anything —
   * `false` cancels: no `onClick`, no `action` event, no built-in. May be async
   * (the button is busy meanwhile).
   */
  beforeActionCallback?: (detail: DateRangePickerActionEventDetail) => void | false | Promise<void | false>;

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
   * Render the summary (receives all selection data, returns an HTML string).
   *
   * SECURITY: Return value is spliced into innerHTML without escaping. Callers are responsible
   * for sanitizing any user-controlled data in the returned string.
   */
  renderSummaryCallback?: (ctx: SummaryContext) => string;

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
   * The value is set as plain text (`textContent`).
   */
  getUnifiedHeaderCallback?: (ctx: UnifiedHeaderContext) => string;

  /**
   * Callback to customize individual month header display text
   *
   * @param data - Contains the month being displayed and localized info
   * @returns String to display in month header
   *
   * Priority order for month headers:
   * 1. monthHeaders from getMonthDataCallback (if key exists)
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
  getMonthHeaderCallback?: (ctx: MonthHeaderContext) => string;

  /**
   * Runs BEFORE a date selection is finalized (single or range mode), after local
   * validation (disabled dates, min/max) passed. Sync or async — a loader shows
   * while it's pending. See {@link BeforeSelectResult} for the return contract.
   *
   * @example Reject with a message
   * beforeSelectCallback: async (ctx) => {
   *   const { available } = await (await fetch(`/api/check/${ctx.date.toISOString()}`)).json();
   *   if (!available) { ctx.controller.showMessage('Date unavailable', { type: 'error' }); return false; }
   * }
   *
   * @example Range — max 7 nights, keep the attempt visible
   * beforeSelectCallback: (ctx) => {
   *   const nights = Math.round((ctx.range.end - ctx.range.start) / 864e5);
   *   if (nights > 7) {
   *     ctx.markRangeInvalid();
   *     ctx.controller.showMessage('Maximum 7 nights allowed', { type: 'error' });
   *     return false;
   *   }
   * }
   */
  beforeSelectCallback?: (ctx: BeforeSelectContext) => BeforeSelectResult | Promise<BeforeSelectResult>;

  /**
   * Runs BEFORE month navigation (not on the initial open). `false` blocks the
   * navigation. Sync or async — a loader shows while a Promise is pending.
   */
  beforeMonthChangeCallback?: (ctx: MonthChangeContext) => BeforeMonthChangeResult | Promise<BeforeMonthChangeResult>;

  /**
   * Load data for the visible range — on the initial open and after every accepted
   * month navigation (per column, or once for the whole grid in unified navigation).
   * Sync or async; a loader shows while a Promise is pending.
   *
   * @example Hotel availability — one request per visible range
   * getMonthDataCallback: async ({ firstVisibleDate, lastVisibleDate }) => {
   *   const days = await (await fetch(`/api/availability?from=${firstVisibleDate.toISOString()}&to=${lastVisibleDate.toISOString()}`)).json();
   *   return { metadata: new Map(days.map(d => [d.date, { isDisabled: d.available === 0, badgeText: `$${d.price}` }])) };
   * }
   */
  getMonthDataCallback?: (ctx: MonthChangeContext) => MonthData | null | void | Promise<MonthData | null | void>;

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

/**
 * Detail of the `select` and `change` events and of `onSelect`.
 */
export interface SelectEventDetail extends PickerContext {
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

/** Detail of the `change` event — the same object as `select`. */
export type ChangeEventDetail = SelectEventDetail;

/** Detail of the `month-change` event / `onMonthChange` — after the visible months changed. */
export interface MonthChangeEventDetail extends PickerContext {
  /** The column that navigated (the anchor column in unified navigation). */
  monthIndex: number;
  /** That column's new year / month (0-11). */
  year: number;
  month: number;
  /** Every visible column, in order. */
  visibleMonths: { year: number; month: number }[];
}

/** Detail of the `ready` event / `onReady` — just the context. */
export interface ReadyEventDetail extends PickerContext {}

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

export interface SummaryContext extends PickerContext {
  // Basic counts
  days: number;           // Total days selected
  nights: number;         // Total nights (days - 1)

  // Simple range (when disabledDatesHandling is 'allow' or 'block')
  startDate: Date | null;
  endDate: Date | null;

  // Multiple ranges (when disabledDatesHandling is 'split')
  dateRanges?: DateRange[];

  // Individual dates (when disabledDatesHandling is 'individual' or 'split')
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

/**
 * Data passed to the day-level callbacks: getDateMetadataCallback, renderDayCallback,
 * renderDayContentCallback, getBadgeTooltipCallback, getDayTooltipCallback.
 * Provides complete context about the day being rendered.
 *
 * Note: `cellElement` and the selection-state flags are optional because some callers
 * (metadata resolution, string-render tooltip paths) run before the day cell exists
 * or before selection state is resolved.
 */
export interface DayContext extends PickerContext {
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
  cellElement?: HTMLElement;   // Default rendered day cell (for augmentation pattern); absent in string-render/metadata paths
}

/**
 * Context passed to getMonthHeaderCallback — a single visible month header.
 */
export interface MonthHeaderContext extends PickerContext {
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
export interface UnifiedHeaderContext extends PickerContext {
  /** First visible month in the grid */
  firstMonth: Date;
  /** Last visible month in the grid */
  lastMonth: Date;
  /** The anchor month that drives unified navigation */
  anchorMonth: Date;
  /** Localized month names (12 entries) */
  monthNames: string[];
}
