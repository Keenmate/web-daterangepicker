/**
 * Web DateRangePicker
 *
 * Lightweight date picker with excellent keyboard navigation
 *
 * Features:
 * - Keyboard navigation (arrows, enter, esc)
 * - Rolling month/year selector
 * - Today and Clear buttons
 * - Single date and date range selection
 * - Floating UI positioning
 *
 * Dependencies: @floating-ui/dom
 */

import type { ShowMessageOptions, DatePickerOptions, DateRange, FormatOptions, TimeFormatOptions, SelectedTime, MonthDisplay, DecoratedDate, DayMetadata, DateRangePickerLabels, DateRangePickerAction, DateRangePickerActionItem, DateRangePickerActionEventDetail, LoaderTarget, LockAspect, PickerContext, ChangeEventDetail, DateRangePickerController } from './types';
import * as Validation from './date-picker-validation';
import * as Rendering from './date-picker-rendering';
import * as Navigation from './date-picker-navigation';
import * as Selection from './date-picker-selection';
import * as Interaction from './date-picker-interaction';
import * as UI from './date-picker-ui';
import * as Lock from './date-picker-lock';
import { resolveLocale, resolveLabels, formatLabel, escapeHtml, getWeekdayNames, getMonthNames } from './date-picker-locales';
import { drpLogger, navigationLogger } from './logger';
import { createTooltip, type TooltipHandle, type PopoverHandle } from '@keenmate/web-components-core/positioning';
import { adoptStyles, createPresentationContext, getEnvironment, withComponentContext, type PresentationContext } from '@keenmate/web-components-core';
import { normalizeActionItems, readActionDataset, resolveActionItem, runAction, type ActionSource } from '@keenmate/web-components-core/actions';
import { createClickEventManager, type ClickEventManager, type ClickSubscription } from './modules';
// Import styles for static injection (only used when injectGlobalStyles is called)
import styles from './css/main.css?inline';


class DateRangePickerEngine {
    input: HTMLInputElement | null;
    options: Required<DatePickerOptions>;
    formatInfo: FormatOptions;
    /** Parsed time format mask, only populated when pickerMode is 'time' or 'datetime'. */
    timeFormatOptions!: TimeFormatOptions;
    _previousInputValue: string;
    /** Month anchor (first-of-month) per visible column — the single source of
     *  truth for what's displayed. Public read views: visibleMonths /
     *  visibleMonthDates / visibleDateRange. */
    private _monthDates: Date[];
    // Raw selection storage — private. Public read/write goes through the
    // reactive accessors below (selectedDate / selectedDates / selectedRanges /
    // selectedStartDate / selectedEndDate / selectedTime / selectedDatetime).
    private _selectedDate: Date | null;
    private _selectedStartDate: Date | null;
    private _selectedEndDate: Date | null;
    private _selectedRanges: DateRange[];
    private _selectedDates: Date[];
    private pendingSelection: any; // Stores uncommitted selection when Apply button is required

    // Time picker state for pickerMode 'time' / 'datetime'. Each field is
    // independently nullable so we can highlight only the rolls the user has
    // explicitly committed (clicking only the hour shouldn't visually claim
    // minutes/seconds as selected just because they default to 00).
    private _selectedTime: SelectedTime | null = null;

    // Wall-clock snapshot captured when the picker opens (time/datetime modes).
    // renderTimePicker uses this as the focus fallback for fields the user hasn't
    // committed, so real-time-seconds advance doesn't pull the rolls along.
    timePickerOpenSnapshot: Date | null = null;

    // Set by open() to tell the next renderTimePicker to force-scroll each roll
    // to center, bypassing the "already visible" optimization. Needed on reopen
    // because the rolls keep their stale scroll position from the previous open.
    forceTimePickerScroll: boolean = false;

    // Clock picker (timeDisplay: clock) — which step of the two-step Material
    // flow is showing. Reset to 'hours' on open(); advances to 'minutes' when
    // the user picks an hour; clicking the HH or MM digit in the header jumps
    // back to that step.
    clockStep: 'hours' | 'minutes' = 'hours';

    // Wheel picker (timeDisplay: wheel) — same role as forceTimePickerScroll, but
    // for the iOS-style barrel columns. Set true by open() so each column re-centers
    // its focus value on every open even if scrollTop is preserved.
    forceWheelScroll: boolean = false;

    // Set true while a wheel column is being programmatically scrolled (renderer
    // or click router calling scrollTo). The scroll listener checks this so an
    // animated scroll-to-center doesn't keep re-committing on every interim frame.
    wheelScrollLock: boolean = false;

    // State for deferred commit when Apply button is required
    originalInputValue: string | null = null; // Stores input value when calendar opens (for restore on close without Apply)
    private committedDate: Date | null = null; // Last committed single date
    private committedStartDate: Date | null = null; // Last committed range start
    private committedEndDate: Date | null = null; // Last committed range end
    private committedRanges: DateRange[] = []; // Last committed multi-range result (range mode); empty for a plain single range
    private committedTime: SelectedTime | null = null; // Last committed time parts (time/datetime modes)
    private _controller?: DateRangePickerController; // Memoized imperative facade (getController())
    focusedDayIndex: number | null;
    activeMonthIndex: number;
    rollingSelectorOpenByColumn: boolean[];
    draggingType: 'start' | 'end' | null;
    isDragging: boolean;
    dragStartDate: Date | null;
    originalStartDate: Date | null;
    originalEndDate: Date | null;
    dragPreviewStart: Date | null;
    dragPreviewEnd: Date | null;
    hoverPreviewEnd: Date | null;
    invalidRangeStart: Date | null;
    invalidRangeEnd: Date | null;
    autoScrollInterval: number | null;
    navInterval?: number | null;
    calendar!: HTMLElement;
    containerElement: HTMLElement;
    onDragMoveBound?: (event: MouseEvent) => void;
    onDragEndBound?: (event: MouseEvent) => void;
    private isFirstRender: boolean = true;
    private calendarContentHeight?: number; // Store calendar height for rolling selector
    private calendarContentWidth?: number; // Store calendar width for rolling selector
    isCalendarActive: boolean = false; // Track if this calendar is the keyboard-active one
    // The open calendar as a core popover (date-picker-ui.ts createCalendarPopover):
    // anchoring, the cross-component overlay tree ("one overlay open at a time" per
    // overlay group — other datepickers, multiselects, external popovers — Escape and
    // the outside click) and the scroll / resize close. Exists only while open (non-
    // inline); torn down by close() / deactivate() / destroy().
    calendarPopover: PopoverHandle | null = null;
    // Release of the core page-scroll lock held by an open modal / full-screen sheet.
    releaseScrollLock: (() => void) | null = null;
    private readonly onAnotherPickerActivated = (e: Event) => {
        if ((e as CustomEvent).detail === this) return;
        // Inline keyboard-active tracking only: exactly one inline picker responds to
        // arrow keys at a time. Popover dismissal is the core overlay tree's (see
        // calendarPopover), which also crosses component types.
        this.isCalendarActive = false;
    };

    // Scoped read-only lock state. Empty = fully interactive. See date-picker-lock.ts.
    private _lockedAspects: Set<LockAspect> = new Set();

    // Async validation state
    private isValidating: boolean = false;
    // Active loaders keyed by target ('calendar' | 'message' | 'summary'); single instance per target.
    loaders: Partial<Record<LoaderTarget, HTMLElement | undefined>> = {};
    // Each loader's renderLoader() remove() (runs the render hook's cleanup).
    loaderRemovers: Partial<Record<LoaderTarget, (() => void) | undefined>> = {};

    // Month change callback state
    private isMonthChanging: boolean = false;
    bulkMetadataCache: Map<string, DayMetadata> | null = null;
    monthHeadersCache: Map<string, string> | null = null;

    // Unified navigation state
    private unifiedHeader?: HTMLElement;
    private unifiedRangeDisplay?: HTMLElement;
    private unifiedRollingSelector?: HTMLElement;
    isUnifiedRollingSelectorOpen: boolean = false;

    // Floating UI tooltips
    private tooltip?: HTMLElement;
    private tooltipArrow?: HTMLElement;
    private currentTooltipTarget?: HTMLElement;

    // Message area
    private messageElement?: HTMLElement;
    private messageAutoHideTimeout?: number;

    // Summary area
    summaryElement?: HTMLElement;
    // Imperative override written by showSummary(); persists until the next selection change.
    summaryOverride: string | null = null;

    // Action button tooltips
    private actionButtonTooltipInstances: TooltipHandle[] = [];
    actionsContainer: HTMLElement | null = null;
    /** Rendered footer button → the item it was built from (click + tooltip lookup). */
    private actionButtonItems = new WeakMap<HTMLElement, DateRangePickerActionItem>();

    // Click event manager (Pub/Sub): the calendar-click active tracking and the
    // rolling selectors' outside close. Closing the floating calendar on an outside
    // click is the core popover's (calendarPopover).
    clickEvents: ClickEventManager;
    private clickSubscriptions: ClickSubscription[] = [];
    /**
     * The concrete presentation of the OPEN calendar chrome (non-inline pickers):
     * `floating` popover, centered `modal`, or phone `fullscreen` overlay. Starts as
     * `floating`; swapped in place by {@link setPresentation} (the element's `presentation`)
     * as the device environment changes. `inline` pickers ignore this field.
     */
    presentation: 'floating' | 'modal' | 'fullscreen' = 'floating';
    // Back-gesture trap for the full-screen sheet: on open we push a same-URL
    // history entry so the phone Back gesture/button pops it (closing the sheet)
    // instead of navigating the page. `onOverlayPopstate` is the bound listener.
    // Managed by pushOverlayHistory()/popOverlayHistory()/handleOverlayPopstate() in
    // date-picker-ui.ts — kept parallel with web-multiselect so this trap can later
    // be extracted into web-components-core in one symmetric change.
    overlayHistoryActive = false;
    onOverlayPopstate: (() => void) | null = null;
    /**
     * Set by the input's pointer triggers so the just-opened modal/full-screen sheet
     * knows to swallow the tap's trailing "ghost" click (which would otherwise land
     * on a day cell of the overlay and select it). Consumed + cleared on open.
     */
    openViaPointer = false;
    // All input-element listeners are registered with this controller's signal so
    // destroy() can drop them in one call. The input element is REUSED across a
    // destroy()+rebuild (e.g. the positioning-mode flip), so without this a zombie
    // picker's open()/handlers would keep firing on the shared input.
    private inputListenersAbort = new AbortController();
    // Document-level keyboard navigation listener (see setupCalendarListeners).
    private onDocumentKeydown: ((e: KeyboardEvent) => void) | null = null;
    // deactivate()/activate() state: true while the host is out of the DOM. The
    // Back-trap flag is parked here so a re-activated open sheet doesn't push a
    // second history entry.
    private isSuspended = false;
    private suspendedOverlayHistory = false;
    private suspendedModalRestoreFocus = false;

    // Week start and date restrictions
    private weekStartDay: number = 0; // 0 = Sunday, 1 = Monday, etc.
    private normalizedMinDate: Date | null = null;
    private normalizedMaxDate: Date | null = null;
    private normalizedDisabledDates: Set<string> = new Set(); // Store as 'YYYY-MM-DD' strings
    private normalizedSpecialDates: Map<string, DecoratedDate> = new Map(); // Store as 'YYYY-MM-DD' -> DecoratedDate

    // Internationalization
    locale: string = 'en';
    /** The resolved UI labels (`labels` over the English defaults). */
    labels: DateRangePickerLabels;
    weekdayNames: string[] = [];
    monthNames: string[] = [];

    constructor(inputElement: HTMLInputElement | null, options: DatePickerOptions = {}) {
        this.input = inputElement;
        this.containerElement = options.container || document.body;
        this.options = {
            selectionMode: options.selectionMode || 'single',
            calendarPlacement: options.calendarPlacement || (options.monthLayout === 'grid' ? 'bottom' : 'bottom-start'),
            visibleMonthCount: options.visibleMonthCount || (options.selectionMode === 'range' ? 2 : 1),
            dateFormatMask: options.dateFormatMask || 'YYYY-MM-DD',
            calendarOpenTrigger: options.calendarOpenTrigger || 'focus',
            overlayGroup: options.overlayGroup || undefined,
            onChange: options.onChange || undefined,
            onAction: options.onAction || undefined,
            onMonthChange: options.onMonthChange || undefined,
            onOpen: options.onOpen || undefined,
            onClose: options.onClose || undefined,
            hostElement: options.hostElement || undefined,
            controller: options.controller || undefined,
            isRtl: options.isRtl || undefined,
            container: this.containerElement,
            positioningMode: options.positioningMode || 'floating',
            monthLayout: options.monthLayout || 'horizontal',
            gridRows: options.gridRows,
            gridColumns: options.gridColumns,
            isUnifiedNavigationEnabled: options.isUnifiedNavigationEnabled || false,
            unifiedNavigationAnchorIndex: options.unifiedNavigationAnchorIndex ?? 0,
            isUnifiedHeaderInteractive: options.isUnifiedHeaderInteractive || false,
            getUnifiedHeaderCallback: options.getUnifiedHeaderCallback,
            getMonthHeaderCallback: options.getMonthHeaderCallback,
            weekStartDay: options.weekStartDay !== undefined ? options.weekStartDay : 'auto',
            minDate: options.minDate,
            maxDate: options.maxDate,
            initialDate: options.initialDate,
            disabledDates: options.disabledDates,
            disabledWeekdays: options.disabledWeekdays,
            specialDates: options.specialDates,
            getDateMetadataCallback: options.getDateMetadataCallback,
            disabledDatesHandling: options.disabledDatesHandling || 'allow',
            shouldHighlightDisabledInRange: options.shouldHighlightDisabledInRange ?? true,
            locale: options.locale || 'auto',
            labels: options.labels ?? null,
            monthNames: options.monthNames,
            weekdayNames: options.weekdayNames,
            renderSummaryCallback: options.renderSummaryCallback,
            renderLoadingCallback: options.renderLoadingCallback ?? null,
            beforeSelectCallback: options.beforeSelectCallback,
            beforeMonthChangeCallback: options.beforeMonthChangeCallback,
            getMonthDataCallback: options.getMonthDataCallback,
            beforeActionCallback: options.beforeActionCallback,
            rollingYearRange: options.rollingYearRange,
            rollingMonthRange: options.rollingMonthRange,
            getCustomStylesCallback: options.getCustomStylesCallback,
            renderDayCallback: options.renderDayCallback,
            renderDayContentCallback: options.renderDayContentCallback,
            getBadgeTooltipCallback: options.getBadgeTooltipCallback,
            getDayTooltipCallback: options.getDayTooltipCallback,
            dateMember: options.dateMember,
            badgeTextMember: options.badgeTextMember,
            badgeClassMember: options.badgeClassMember,
            dayClassMember: options.dayClassMember,
            badgeTooltipMember: options.badgeTooltipMember,
            dayTooltipMember: options.dayTooltipMember,
            isDisabledMember: options.isDisabledMember,
            commitMode: options.commitMode || 'selection',
            shouldCloseOnScroll: options.shouldCloseOnScroll ?? true,
            shouldCloseOnSelect: options.shouldCloseOnSelect ?? true,
            shouldCloseOnOutsideClick: options.shouldCloseOnOutsideClick ?? null,
            actionButtons: options.actionButtons,
            isTodayButtonShown: options.isTodayButtonShown ?? true,
            isClearButtonShown: options.isClearButtonShown ?? true,
            isSummaryShown: options.isSummaryShown ?? true,
            pickerMode: options.pickerMode || 'date',
            timeFormatMask: options.timeFormatMask || 'HH:mm',
            timeStep: options.timeStep && options.timeStep > 0 ? options.timeStep : 1,
            hourCycle: options.hourCycle,
            isSecondsShown: options.isSecondsShown,
            isNowButtonShown: options.isNowButtonShown ?? true,
            timeDisplay: options.timeDisplay || 'rolls',
            shouldFullscreenAutofocus: options.shouldFullscreenAutofocus || false,
            isFullscreenInputShown: options.isFullscreenInputShown || false
        };

        // Runtime presentation of the OPEN calendar chrome, for floating pickers.
        // Starts as the anchored popover; the web component swaps it in place via
        // setPresentation() from its `presentation` input and the device environment
        // (floating popover ⇄ centered modal ⇄ phone full-screen overlay).
        this.presentation = 'floating';

        // Mode fallback enforcement — keep downstream code free of defensive checks.
        // pickerMode 'time'/'datetime' only support selectionMode 'single' in v1.
        if (this.options.pickerMode !== 'date' &&
            (this.options.selectionMode === 'range' || this.options.selectionMode === 'multiple')) {
            drpLogger.warn(`pickerMode="${this.options.pickerMode}" does not support selectionMode="${this.options.selectionMode}" yet. Falling back to "single".`);
            this.options.selectionMode = 'single';
            this.options.visibleMonthCount = 1;
        }
        // pickerMode 'datetime' + monthLayout 'grid' — the time picker fights the grid for width.
        if (this.options.pickerMode === 'datetime' && this.options.monthLayout === 'grid') {
            drpLogger.warn('pickerMode="datetime" is incompatible with monthLayout="grid". Falling back to "horizontal".');
            this.options.monthLayout = 'horizontal';
        }
        // timeDisplay 'clock' constraints — only when actually rendering time.
        // The clock face places labels at equal angles around the dial, so a step
        // that doesn't divide 60 leaves "valid" values mid-arc with no label.
        // Seconds drop entirely because a third clock step (or a 60-tick dial)
        // would clutter the UI past the point of usefulness.
        const clockActive = this.options.timeDisplay === 'clock'
            && (this.options.pickerMode === 'time' || this.options.pickerMode === 'datetime');
        if (clockActive && this.options.timeStep && 60 % this.options.timeStep !== 0) {
            drpLogger.warn(`timeDisplay="clock" requires (60 % timeStep === 0). Got timeStep=${this.options.timeStep}. Falling back to 1.`);
            this.options.timeStep = 1;
        }
        if (clockActive && this.options.isSecondsShown) {
            drpLogger.warn('timeDisplay="clock" does not support isSecondsShown; seconds will always be 00. Set timeDisplay="rolls" to pick seconds.');
            this.options.isSecondsShown = false;
        }
        // Multiple mode collects several dates, so it can't commit-and-close on each
        // pick — default it to `apply` (the Apply button is its commit path) unless the
        // caller set commitMode explicitly.
        if (this.options.selectionMode === 'multiple' && options.commitMode == null) {
            this.options.commitMode = 'apply';
        }
        // Time/datetime default to `apply` too, so each roll-click doesn't auto-commit
        // and close; honors an explicit caller value. `apply` renders the Apply button,
        // which is the only commit path once selection is staged.
        if (this.options.pickerMode !== 'date' && options.commitMode == null) {
            this.options.commitMode = 'apply';
        }

        // Validate anchor index is within bounds
        if (this.options.isUnifiedNavigationEnabled && this.options.unifiedNavigationAnchorIndex !== undefined) {
            const maxIndex = this.options.visibleMonthCount - 1;
            if (this.options.unifiedNavigationAnchorIndex < 0 || this.options.unifiedNavigationAnchorIndex > maxIndex) {
                drpLogger.warn(`unifiedNavigationAnchorIndex (${this.options.unifiedNavigationAnchorIndex}) out of bounds. Using 0.`);
                this.options.unifiedNavigationAnchorIndex = 0;
            }
        }

        // Initialize internationalization
        this.locale = resolveLocale(this.options.locale);
        // Week start day — `auto` follows the resolved locale (not the browser language)
        this.weekStartDay = Validation.detectWeekStartDay(this.options.weekStartDay, this.locale);
        drpLogger.debug('Week starts on day:', this.weekStartDay);
        drpLogger.debug('disabledDatesHandling:', this.options.disabledDatesHandling);
        this.labels = resolveLabels(this.options.labels);
        this.weekdayNames = this.options.weekdayNames || getWeekdayNames(this.locale);
        this.monthNames = this.options.monthNames || getMonthNames(this.locale);
        drpLogger.debug('Locale:', this.locale, 'Weekdays:', this.weekdayNames, 'Months:', this.monthNames);

        // Normalize date restrictions
        this.initializeDateRestrictions();

        // Parse format to understand structure
        this.formatInfo = this.parseFormat(this.options.dateFormatMask);
        drpLogger.debug('Format info:', this.formatInfo);

        // Parse time format for time / datetime modes. Always parse (even in date mode)
        // so the field is populated for any later picker-mode flip via updateOptions.
        this.timeFormatOptions = this.parseTimeFormat(this.options.timeFormatMask);
        // Derive hourCycle and isSecondsShown from the time mask if not explicitly set.
        // `== null` so a cleared nullable input (null, the null-clear signal) counts as
        // "not set" — same as an absent/undefined value — and the mask-derived default wins.
        if (this.options.hourCycle == null) {
            this.options.hourCycle = this.timeFormatOptions.is12Hour ? 'h12' : 'h24';
        }
        if (this.options.isSecondsShown == null) {
            this.options.isSecondsShown = this.timeFormatOptions.hasSeconds;
        }

        // Track previous input value for deletion detection
        this._previousInputValue = '';

        // Determine initial display date
        let initialDisplayDate: Date;
        if (this.options.initialDate) {
            // Use explicit initialDate if provided. Preserve the time portion when
            // pickerMode carries time meaning so ISO datetime strings survive.
            const preserveTime = this.options.pickerMode === 'time' || this.options.pickerMode === 'datetime';
            const parsedDate = Validation.normalizeDate(this.options.initialDate, preserveTime);
            initialDisplayDate = parsedDate || new Date();
            drpLogger.debug(`Using initialDate: ${initialDisplayDate.toISOString()}`);
        } else if (this.options.rollingYearRange || this.options.rollingMonthRange) {
            // If rolling ranges are set, use first allowed year/month
            const yearRange = this.getAvailableYearRange();
            const monthRange = this.getAvailableMonthRange();

            const year = yearRange.min;
            const month = monthRange.min - 1; // Convert to 0-based

            initialDisplayDate = new Date(year, month, 1);
            drpLogger.debug(`Using first allowed year/month as initial: ${initialDisplayDate.toISOString()}`);
        } else if (this.normalizedMinDate && this.normalizedMinDate > new Date()) {
            // If today is before minDate, start at minDate
            initialDisplayDate = new Date(this.normalizedMinDate);
            drpLogger.debug(`Using minDate as initial: ${initialDisplayDate.toISOString()}`);
        } else if (this.normalizedMaxDate && this.normalizedMaxDate < new Date()) {
            // If today is after maxDate, start at maxDate
            initialDisplayDate = new Date(this.normalizedMaxDate);
            drpLogger.debug(`Using maxDate as initial: ${initialDisplayDate.toISOString()}`);
        } else {
            // Default to current date
            initialDisplayDate = new Date();
            drpLogger.debug(`Using current date as initial: ${initialDisplayDate.toISOString()}`);
        }

        // Initialize the month anchor per visible column (single source of truth
        // for what's displayed; visibleMonths / visibleMonthDates derive from it).
        this._monthDates = [];
        for (let i = 0; i < this.options.visibleMonthCount; i++) {
            const date = new Date(initialDisplayDate.getFullYear(), initialDisplayDate.getMonth() + i, 1);
            this._monthDates.push(date);
            drpLogger.debug(`_monthDates[${i}] = ${date.getFullYear()}-${date.getMonth()+1}`);
        }

        this._selectedDate = null;
        this._selectedStartDate = null;
        this._selectedEndDate = null;
        this._selectedRanges = [];
        this._selectedDates = [];
        this.pendingSelection = null;
        this.focusedDayIndex = null;
        this.activeMonthIndex = 0; // Track which month column is active for keyboard navigation

        // For time/datetime modes: if initialDate was provided with time, seed selectedDate
        // (date portion) and selectedTime (h/m/s) so the input shows it on first render.
        // Otherwise leave both null and let the user commit.
        if (this.options.pickerMode !== 'date' && this.options.initialDate) {
            const seedDate = Validation.normalizeDate(this.options.initialDate, true);
            if (seedDate) {
                // Date portion (Y/M/D only, time zeroed)
                const dateOnly = new Date(seedDate.getFullYear(), seedDate.getMonth(), seedDate.getDate());
                this._selectedDate = dateOnly;
                this.committedDate = dateOnly;
                // Time portion — every field is a developer commitment.
                const h = seedDate.getHours();
                this._selectedTime = {
                    hour: h,
                    minute: seedDate.getMinutes(),
                    second: seedDate.getSeconds(),
                    ampm: h >= 12 ? 'pm' : 'am',
                };
                this.committedTime = { ...this._selectedTime };
            }
        }

        // Initialize rolling selector state for each month
        this.rollingSelectorOpenByColumn = [];
        for (let i = 0; i < this.options.visibleMonthCount; i++) {
            this.rollingSelectorOpenByColumn.push(false);
        }

        // Drag state for range adjustment
        this.draggingType = null; // 'start' | 'end'
        this.isDragging = false;
        this.dragStartDate = null;
        this.originalStartDate = null;
        this.originalEndDate = null;
        this.dragPreviewStart = null;
        this.dragPreviewEnd = null;
        // Hover preview: only active in range mode after the first click (half-selected
        // state). Repainted on every day-cell mouseover; cleared on commit, mouseleave,
        // drag-start, hide, and destroy. See updateHoverPreview() for per-mode logic.
        this.hoverPreviewEnd = null;
        this.invalidRangeStart = null;
        this.invalidRangeEnd = null;
        this.autoScrollInterval = null;

        // Initialize the click event manager
        this.clickEvents = createClickEventManager();

        this.init();
    }

    init() {
        drpLogger.debug('Init called');
        this.createCalendar();

        // Initialize the click event manager
        this.clickEvents.init(this.calendar, this.input);

        // Subscribe to events
        this.setupEventSubscriptions();

        // Listen for sibling pickers becoming active so this one can deactivate.
        // (The keydown listener lives on document, so without this, every picker
        // on the page would respond to arrow keys at once.)
        document.addEventListener(DateRangePickerEngine.ACTIVE_EVENT, this.onAnotherPickerActivated);

        // Only attach input listeners if we have an input element
        if (this.input) {
            this.attachInputListeners();

            // Parse any pre-filled value in the input
            if (this.input.value) {
                drpLogger.debug('Parsing pre-filled value:', this.input.value);
                this.updateCalendarFromInput();
            }
        }

        // For inline mode, render and show the calendar immediately
        if (this.options.positioningMode === 'inline') {
            this.renderCalendar();
            this.calendar.classList.add('drp__picker--visible', 'drp__picker--inline');
            // Don't auto-activate on init — multiple inline pickers on a page would
            // otherwise all be keyboard-active at once. The user clicking or focusing
            // any picker calls setCalendarActive() and deactivates the others.
            this.isFirstRender = false;

            // Load getMonthDataCallback data for the initial months
            Navigation.handleInitialMonthLoad(this);
        }
        // Note: for floating mode, renderCalendar() is called on first open() instead of here
        // to avoid rendering days before the calendar is displayed

        drpLogger.debug('Init complete');
    }

    /**
     * Set up event subscriptions using the pub/sub event managers
     */
    private setupEventSubscriptions() {
        // Subscribe to outside clicks - close calendar or rolling selectors
        const outsideClickSub = this.clickEvents.subscribe('outsideClick', (ctx) => {
            drpLogger.debug('Outside click detected', ctx.target);

            // Modal handles "outside click" via the backdrop element; fullscreen is
            // edge-to-edge (no document-level "outside" to click). Both ignore the
            // outside-click stream here.
            if (this.presentation === 'modal' || this.presentation === 'fullscreen') {
                return;
            }

            if (this.options.positioningMode !== 'inline' && this.closesOnOutsideClick()) {
                // A floating calendar that closes on an outside click: the core popover
                // closes it once the click has ended (calendarPopover).
                return;
            } else {
                // Inline mode (or close-on-outside-click off): close only rolling selectors
                let needsRender = false;

                // Close any open individual selectors
                for (let i = 0; i < this.rollingSelectorOpenByColumn.length; i++) {
                    if (this.rollingSelectorOpenByColumn[i]) {
                        this.rollingSelectorOpenByColumn[i] = false;
                        needsRender = true;
                    }
                }

                // Close unified selector if open
                if (this.isUnifiedRollingSelectorOpen) {
                    this.isUnifiedRollingSelectorOpen = false;
                    needsRender = true;
                }

                // Re-render to apply closed state
                if (needsRender) {
                    this.renderCalendar();
                }
            }
        });
        this.clickSubscriptions.push(outsideClickSub);

        // Subscribe to calendar clicks - track active state (and deactivate sibling pickers)
        const calendarClickSub = this.clickEvents.subscribe('calendarClick', () => {
            this.setCalendarActive();
        });
        this.clickSubscriptions.push(calendarClickSub);
    }

    /**
     * Initialize and normalize date restrictions
     *
     * Rebuilds `normalizedMinDate`, `normalizedMaxDate`, `normalizedDisabledDates`,
     * and `normalizedSpecialDates` from the current `this.options`. Safe to call
     * repeatedly — clears prior normalized state first so removed entries vanish.
     */
    initializeDateRestrictions() {
        this.normalizedMinDate = this.options.minDate ? Validation.normalizeDate(this.options.minDate) : undefined;
        this.normalizedMaxDate = this.options.maxDate ? Validation.normalizeDate(this.options.maxDate) : undefined;

        this.normalizedDisabledDates.clear();
        if (this.options.disabledDates && this.options.disabledDates.length > 0) {
            this.options.disabledDates.forEach(dateInput => {
                const date = Validation.normalizeDate(dateInput);
                if (date) {
                    this.normalizedDisabledDates.add(Validation.formatDateKey(date));
                }
            });
        }

        this.normalizedSpecialDates.clear();
        if (this.options.specialDates && this.options.specialDates.length > 0) {
            const dateMember = this.options.dateMember || 'date';
            this.options.specialDates.forEach(specialDate => {
                const date = Validation.normalizeDate(specialDate[dateMember]);
                if (date) {
                    this.normalizedSpecialDates.set(Validation.formatDateKey(date), specialDate);
                } else {
                    drpLogger.warn('[Special Dates] Failed to normalize date:', specialDate[dateMember]);
                }
            });
        }
    }

    /**
     * Apply a partial options update in place.
     *
     * Refreshes derived state (locale strings, format info, normalized date sets,
     * etc.) for any options that were changed, then re-renders the calendar.
     * Selection / focus / scroll / drag state survives.
     *
     * Returns `true` when the update was fully applied. Returns `false` for
     * genuinely structural changes (column count, positioning mode, layout —
     * things that change the DOM topology) so the caller can fall back to a
     * full destroy + reinit.
     */
    updateOptions(partial: Partial<DatePickerOptions>): boolean {
        const STRUCTURAL_KEYS: (keyof DatePickerOptions)[] = [
            'positioningMode',
            'selectionMode',
            'visibleMonthCount',
            'monthLayout',
            'gridRows',
            'gridColumns',
            'isUnifiedNavigationEnabled',
            'unifiedNavigationAnchorIndex',
            'calendarOpenTrigger',
            'isSummaryShown',
            'pickerMode',
            'isSecondsShown',
            'hourCycle',
            // The time UI skeleton (clock / wheel / compact / rolls) is built once in
            // createCalendar(), and the time mask derives hour cycle + seconds at
            // construction — both need a rebuild (FINDINGS #18, #20).
            'timeDisplay',
            'timeFormatMask',
        ];
        const has = (k: keyof DatePickerOptions) => Object.prototype.hasOwnProperty.call(partial, k);
        const changed = (k: keyof DatePickerOptions) => has(k) && (partial as any)[k] !== (this.options as any)[k];

        // Bail out for structural changes — caller (web component) does a full rebuild.
        if (STRUCTURAL_KEYS.some(changed)) {
            return false;
        }
        // The time picker's static headings (Time / Hours / AM…) are built once with
        // the calendar — new labels there need a rebuild (the host carries the selection).
        if (changed('labels') && this.options.pickerMode !== 'date') {
            return false;
        }

        // Captured before the merge (afterwards partial and options agree).
        const isMonthDataSourceChanged = changed('getMonthDataCallback');

        // Merge partial into options (only keys present on partial — preserves untouched ones).
        for (const key of Object.keys(partial) as (keyof DatePickerOptions)[]) {
            (this.options as any)[key] = (partial as any)[key];
        }

        // Refresh derived state where touched.
        if (has('locale') || has('labels') || has('monthNames') || has('weekdayNames')) {
            this.locale = resolveLocale(this.options.locale);
            this.labels = resolveLabels(this.options.labels);
            this.weekdayNames = this.options.weekdayNames || getWeekdayNames(this.locale);
            this.monthNames = this.options.monthNames || getMonthNames(this.locale);
        }
        // `auto` follows the locale, so a locale change moves the week start too.
        if (has('weekStartDay') || has('locale')) {
            this.weekStartDay = Validation.detectWeekStartDay(this.options.weekStartDay, this.locale);
        }
        if (has('dateFormatMask')) {
            this.formatInfo = this.parseFormat(this.options.dateFormatMask);
        }
        if (has('minDate') || has('maxDate') || has('disabledDates') || has('specialDates') || has('dateMember')) {
            this.initializeDateRestrictions();
        }

        // Re-render is the universal post-step. Calendar DOM structure is unchanged,
        // so this just updates content/classes/inline styles.
        this.renderCalendar();
        // Labels feed the summary text and the message ✕ (outside the re-rendered grid).
        if (has('labels')) {
            this.updateSummary();
            this.calendar.querySelector('.drp__message-close')?.setAttribute('aria-label', this.labels.close);
        }

        // A month-data source set (or replaced) after the first paint loads for the
        // months already on screen — same as on the initial open.
        if (isMonthDataSourceChanged && !this.isFirstRender) this.reloadMonthData();
        return true;
    }

    /**
     * Re-run `getMonthDataCallback` for the visible months (replacing the cached
     * metadata / headers) — e.g. after the backing data changed.
     */
    reloadMonthData(): Promise<void> {
        return Navigation.handleInitialMonthLoad(this);
    }

    /**
     * Get effective year range considering all constraints
     * Returns the year range that should be enforced for date validation and navigation
     * Considers: rollingYearRange option, minDate/maxDate, or defaults to today ± 1
     */
    getAvailableYearRange(): { min: number, max: number } {
        const todayYear = new Date().getFullYear();
        return Rendering.parseYearRange(this.options.rollingYearRange, todayYear, this);
    }

    /**
     * Get effective month range considering all constraints
     * Returns the month range that should be enforced for date validation and navigation
     * Considers: rollingMonthRange option, or defaults to all months (1-12)
     */
    getAvailableMonthRange(): { min: number, max: number } {
        return Rendering.parseMonthRange(this.options.rollingMonthRange);
    }

    // =========================================================================
    // DISPLAYED — read-only views of what's currently on screen. All derive from
    // the single source of truth `_monthDates` (one anchor per visible column),
    // so they can never drift out of sync. Change what's shown via navigation,
    // not by assigning to these.
    // =========================================================================

    /** Build the rich per-column descriptor for a month anchor (first-of-month). */
    private buildMonthDisplay(anchor: Date): MonthDisplay {
        const year = anchor.getFullYear();
        const month = anchor.getMonth();
        const firstDate = new Date(year, month, 1);
        const lastDate = new Date(year, month + 1, 0);
        // Back-offset the 1st to the week-start to get the first rendered cell,
        // then +41 for the last cell of the fixed 6-week (42-cell) grid.
        const offset = (firstDate.getDay() - this.weekStartDay + 7) % 7;
        const gridStart = new Date(year, month, 1 - offset);
        const gridEnd = new Date(gridStart);
        gridEnd.setDate(gridStart.getDate() + 41);
        return { month, year, firstDate, lastDate, gridStart, gridEnd };
    }

    /** One descriptor per visible month column, in display order (ascending, may have gaps). */
    get visibleMonths(): MonthDisplay[] {
        return this._monthDates.map(d => this.buildMonthDisplay(d));
    }

    /** First-of-month Date per visible column — convenience mirror of visibleMonths. */
    get visibleMonthDates(): Date[] {
        return this._monthDates.map(d => new Date(d));
    }

    /**
     * Outer envelope of the visible grid: first cell of the first column to the
     * last cell of the last column. Columns are strictly ascending, so start ≤ end
     * always holds — but they may be non-contiguous, so this can include gap
     * months that aren't on screen. Iterate `visibleMonths` for gap-honest work.
     */
    get visibleDateRange(): { start: Date; end: Date } {
        const months = this.visibleMonths;
        return { start: months[0].gridStart, end: months[months.length - 1].gridEnd };
    }

    /** The picker's notion of "today", normalized to 00:00 local. */
    get today(): Date {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Render action buttons based on configuration (core `resolveActionItem`):
     * every field resolves get*Callback → static value → built-in default, e.g.
     * - Visibility: getIsVisibleCallback → isVisible → true (default visible)
     * - Disabled: getIsDisabledCallback → isDisabled → false (default enabled)
     * - Text: getTextCallback → text (required)
     * - CSS: getClassCallback → cssClass → ''
     * - Tooltip: getTooltipCallback → tooltip → undefined
     */
    private renderButtons(container: HTMLElement): void {
        // Destroy all existing button tooltips before re-rendering
        this.destroyAllActionButtonTooltips();

        container.innerHTML = ''; // Clear existing buttons

        // Store container reference for re-rendering
        this.actionsContainer = container;

        // Core ActionItem resolution (SPEC §12.12): get*Callback > static > built-in default.
        const ctx = this.ctx({});
        this.getActionItems().forEach((item) => {
            const resolved = resolveActionItem(item, ctx, this.getBuiltInItemDefaults(item.action));
            if (!resolved.isVisible) return;

            const buttonEl = document.createElement('button');
            buttonEl.type = 'button';
            buttonEl.className = `drp__button drp__button--${resolved.action}`;
            if (resolved.cssClass) buttonEl.classList.add(...resolved.cssClass.split(' '));
            if (resolved.isDanger) buttonEl.classList.add('drp__button--danger');
            if (resolved.isToggled) {
                buttonEl.classList.add('drp__button--toggled');
                buttonEl.setAttribute('aria-pressed', 'true');
            }
            // Icon: a glyph / short text before the label (set as text, never HTML).
            if (resolved.icon) {
                const icon = document.createElement('span');
                icon.className = 'drp__button-icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = resolved.icon;
                buttonEl.appendChild(icon);
            }
            if (resolved.text) {
                const label = document.createElement('span');
                label.className = 'drp__button-label';
                label.textContent = resolved.text;
                buttonEl.appendChild(label);
            }
            if (!resolved.text && resolved.tooltip) buttonEl.setAttribute('aria-label', resolved.tooltip);
            if (resolved.isDisabled) buttonEl.disabled = true;

            buttonEl.dataset.action = resolved.action;
            if (resolved.id) buttonEl.dataset.id = resolved.id;
            this.actionButtonItems.set(buttonEl, item);

            container.appendChild(buttonEl);
        });

        // Attach Floating UI tooltips after rendering
        this.attachActionButtonTooltips();
    }

    /** The configured footer items (string shorthand expanded), or the built-ins for the mode. */
    private getActionItems(): DateRangePickerActionItem[] {
        return this.options.actionButtons
            ? normalizeActionItems<DateRangePickerActionItem>(this.options.actionButtons)
            : this.getDefaultButtons();
    }

    /** Built-in label for a built-in action (used when the item sets no `text`). */
    private getBuiltInItemDefaults(action: DateRangePickerActionItem['action']): { text?: string } | undefined {
        switch (action) {
            case 'today': return { text: this.labels.today };
            case 'now': return { text: this.labels.now };
            case 'clear': return { text: this.labels.clear };
            case 'apply': return { text: this.labels.apply };
            default: return undefined;
        }
    }

    /**
     * Get default buttons based on options
     */
    private getDefaultButtons(): DateRangePickerActionItem[] {
        const buttons: DateRangePickerActionItem[] = [];

        // Today button — date and datetime modes only. Time-only has no day to navigate to.
        if (this.options.isTodayButtonShown && this.options.pickerMode !== 'time') buttons.push({ action: 'today' });

        // Now button — time and datetime modes only.
        if (this.options.isNowButtonShown && this.options.pickerMode !== 'date') buttons.push({ action: 'now' });

        // Clear button
        if (this.options.isClearButtonShown) buttons.push({ action: 'clear' });

        // Apply button — only in `apply` commit mode (the staged-selection commit path).
        if (this.options.commitMode === 'apply') buttons.push({ action: 'apply' });

        return buttons;
    }

    /**
     * Attach Floating UI tooltips to action buttons. Each rendered button maps back
     * to ITS item (not the first item with the same action), so several custom
     * buttons each get their own tooltip.
     */
    private attachActionButtonTooltips(): void {
        if (!this.actionsContainer) return;

        const container = this.options.container || document.body;
        const ctx = this.ctx({});
        const renderedButtons = this.actionsContainer.querySelectorAll('.drp__button');

        renderedButtons.forEach((button: Element) => {
            const buttonElement = button as HTMLElement;
            const item = this.actionButtonItems.get(buttonElement);
            if (!item) return;

            const tooltipText = resolveActionItem(item, ctx).tooltip;
            if (!tooltipText) return;

            // Core createTooltip (SPEC §12.2): per-trigger hover tooltip with delay.
            this.actionButtonTooltipInstances.push(createTooltip({
                trigger: buttonElement,
                content: tooltipText,
                container,
                delay: { show: 300, hide: 100 },
                cssClass: 'drp__tooltip',
                visibleClass: 'drp__tooltip--visible',
            }));
        });
    }

    private destroyAllActionButtonTooltips(): void {
        this.actionButtonTooltipInstances.forEach(t => t.destroy());
        this.actionButtonTooltipInstances = [];
    }

    private parseMonthRange(range: string): { min: number, max: number } {
        const [minStr, maxStr] = range.split('-');
        return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
    }

    /**
     * Check if a date should be disabled
     */
    isDateDisabled(date: Date): boolean {
        // FIRST: Check rolling selector ranges (primary constraints)
        // Always check year range (considers rollingYearRange, minDate/maxDate, or defaults to today ± 1)
        const yearRange = this.getAvailableYearRange();
        const year = date.getFullYear();
        if (year < yearRange.min || year > yearRange.max) {
            return true; // Outside allowed year range
        }

        // Always check month range (considers rollingMonthRange or defaults to all months 1-12)
        const monthRange = this.getAvailableMonthRange();
        const month = date.getMonth() + 1; // Convert to 1-12
        if (month < monthRange.min || month > monthRange.max) {
            return true; // Outside allowed month range
        }

        // SECOND: Check secondary constraints (min/max dates, disabled dates, etc.)
        return Validation.isDateDisabled(
            date,
            this.normalizedMinDate,
            this.normalizedMaxDate,
            this.normalizedDisabledDates,
            this.options.disabledWeekdays
        );
    }

    /**
     * Get additional info for a date (special styling, labels, etc.)
     * Priority: bulkMetadataCache > callback > specialDates
     */
    getDayMetadata(date: Date): DayMetadata | null {
        const dateKey = Validation.formatDateKey(date);

        // 1. Check bulk metadata cache FIRST (highest priority - from getMonthDataCallback)
        if (this.bulkMetadataCache && this.bulkMetadataCache.has(dateKey)) {
            const cachedInfo = this.bulkMetadataCache.get(dateKey)!;
            return {
                ...cachedInfo,
                isDisabled: cachedInfo.isDisabled !== undefined ? cachedInfo.isDisabled : this.isDateDisabled(date)
            };
        }

        // 2. Check callback SECOND (per-day callback)
        if (this.options.getDateMetadataCallback) {
            const customInfo = this.options.getDateMetadataCallback(this.ctx({
                date,
                dateString: dateKey,
                dayNumber: date.getDate(),
                isDisabled: this.isDateDisabled(date),
                isToday: Validation.isToday(date),
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            }));
            if (customInfo) {
                return {
                    ...customInfo,
                    isDisabled: customInfo.isDisabled !== undefined ? customInfo.isDisabled : this.isDateDisabled(date)
                };
            }
        }

        // 3. Check specialDates THIRD (static array with member mapping)
        if (this.normalizedSpecialDates.has(dateKey)) {
            const specialDate = this.normalizedSpecialDates.get(dateKey)!;

            // Use member mapping with defaults
            const badgeTextMember = this.options.badgeTextMember || 'badgeText';
            const badgeClassMember = this.options.badgeClassMember || 'badgeClass';
            const dayClassMember = this.options.dayClassMember || 'dayClass';
            const badgeTooltipMember = this.options.badgeTooltipMember || 'badgeTooltip';
            const dayTooltipMember = this.options.dayTooltipMember || 'dayTooltip';
            const isDisabledMember = this.options.isDisabledMember || 'isDisabled';

            return {
                isDisabled: specialDate[isDisabledMember] !== undefined ? specialDate[isDisabledMember] : this.isDateDisabled(date),
                badgeClass: specialDate[badgeClassMember],
                dayClass: specialDate[dayClassMember],
                badgeText: specialDate[badgeTextMember],
                badgeTooltip: specialDate[badgeTooltipMember],
                dayTooltip: specialDate[dayTooltipMember]
            };
        }

        return null;
    }

    /**
     * Check if there are any disabled dates in a range
     */
    hasDisabledDatesInRange(start: Date, end: Date): boolean {
        return Validation.hasDisabledDatesInRange(start, end, (date) => this.isDateDisabled(date));
    }

    /**
     * Get all enabled dates in a range
     */
    getEnabledDatesInRange(start: Date, end: Date): Date[] {
        return Validation.getEnabledDatesInRange(start, end, (date) => this.isDateDisabled(date));
    }

    /**
     * Get all disabled dates in a range
     */
    getDisabledDatesInRange(start: Date, end: Date): Date[] {
        return Validation.getDisabledDatesInRange(start, end, (date) => this.isDateDisabled(date));
    }

    /**
     * For 'block' mode: Find the last enabled date before hitting a disabled date
     */
    findLastEnabledBeforeGap(start: Date, end: Date): Date {
        return Validation.findLastEnabledBeforeGap(start, end, (date) => this.isDateDisabled(date));
    }

    /**
     * For 'split' mode: Split a range into multiple ranges separated by disabled dates
     */
    splitRangeByDisabled(start: Date, end: Date): DateRange[] {
        return Validation.splitRangeByDisabled(start, end, (date) => this.isDateDisabled(date));
    }

    /**
     * Build the standardized {@link ChangeEventDetail} for a selection — the single
     * payload handed to `onChange` and re-emitted by the web component's
     * `date-select`/`change` events. Centralizing it here means a core-class consumer
     * (`new DateRangePickerEngine(el, { onChange })`) gets the exact same rich breakdown
     * (`enabledDates`/`disabledDates`/`dateRanges`/`dates` per `disabledDatesHandling`)
     * that a web-component listener gets. `formattedValue` is composed from
     * {@link formatDate}; the web component prefers the input's live display string
     * when it re-emits (except for the multi-piece joined forms, which it keeps).
     */
    buildSelectDetail(selection: Date | DateRange | DateRange[] | Date[]): ChangeEventDetail {
        return this.ctx(this.buildSelectFields(selection));
    }

    private buildSelectFields(selection: Date | DateRange | DateRange[] | Date[]): Omit<ChangeEventDetail, keyof PickerContext> {
        const formatRange = (r: DateRange) => `${this.formatDate(r.start)} - ${this.formatDate(r.end)}`;

        // Single date.
        if (selection instanceof Date) {
            return { date: selection, formattedValue: this.formatDate(selection) };
        }

        // Array: either multiple ranges (split/multi-range) or a flat list of dates.
        if (Array.isArray(selection)) {
            if (selection.length > 0 && selection[0] instanceof Date) {
                const dates = selection as Date[];
                return { formattedValue: dates.map((d) => this.formatDate(d)).join(', '), dates };
            }
            const ranges = selection as DateRange[];
            return { formattedValue: ranges.map(formatRange).join(', '), dateRanges: ranges };
        }

        // Single range — apply the disabled-dates breakdown for the active handling.
        const { start, end } = selection;
        const detail: Omit<ChangeEventDetail, keyof PickerContext> = { dateRange: selection, formattedValue: formatRange(selection) };
        switch (this.options.disabledDatesHandling) {
            case 'allow':
                detail.enabledDates = this.getEnabledDatesInRange(start, end);
                detail.disabledDates = this.getDisabledDatesInRange(start, end);
                detail.getEnabledDateCount = () => detail.enabledDates!.length;
                detail.getTotalDays = () => {
                    const msPerDay = 1000 * 60 * 60 * 24;
                    return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
                };
                break;
            case 'split':
                detail.dateRanges = this.splitRangeByDisabled(start, end);
                detail.dates = this.getEnabledDatesInRange(start, end);
                if (detail.dateRanges.length > 0) detail.formattedValue = detail.dateRanges.map(formatRange).join(', ');
                break;
            case 'individual':
                detail.dates = this.getEnabledDatesInRange(start, end);
                detail.dateRange = null;
                if (detail.dates.length > 0) detail.formattedValue = detail.dates.map((d) => this.formatDate(d)).join(', ');
                break;
            case 'block':
                detail.dates = this.getEnabledDatesInRange(start, end);
                break;
        }
        return detail;
    }

    isToday(date: Date): boolean {
        return Validation.isToday(date);
    }

    isSameDay(date1: Date | null, date2: Date | null): boolean {
        return Validation.isSameDay(date1, date2);
    }

    isInRange(date: Date): boolean {
        return Validation.isInRange(date, this._selectedStartDate, this._selectedEndDate);
    }

    /**
     * Range-mode day decoration, multi-range aware. When a callback (or the
     * `selectedRanges` setter) has committed N independent ranges, these read
     * from `_selectedRanges`; otherwise they fall back to the single
     * `_selectedStartDate`.._selectedEndDate` envelope. Used by both rendering
     * paths so a single-range and a multi-range selection decorate identically.
     */
    isRangeStart(date: Date): boolean {
        if (this._selectedRanges.length > 0) {
            return this._selectedRanges.some(r => this.isSameDay(date, r.start));
        }
        return this.isSameDay(date, this._selectedStartDate);
    }

    isRangeEnd(date: Date): boolean {
        if (this._selectedRanges.length > 0) {
            return this._selectedRanges.some(r => this.isSameDay(date, r.end));
        }
        return this.isSameDay(date, this._selectedEndDate);
    }

    isInCommittedRange(date: Date): boolean {
        if (this._selectedRanges.length > 0) {
            // Exclusive of each range's endpoints — mirrors Validation.isInRange, so
            // start/end cells keep the solid endpoint style instead of being tinted
            // with the pale --in-range fill.
            return this._selectedRanges.some(r => date > r.start && date < r.end);
        }
        return Validation.isInRange(date, this._selectedStartDate, this._selectedEndDate);
    }

    /** Whether the picker is laid out right-to-left (the host's `isRtl`, else the calendar's computed direction). */
    isRtl(): boolean {
        if (this.options.isRtl) return this.options.isRtl();
        return !!this.calendar?.isConnected && getComputedStyle(this.calendar).direction === 'rtl';
    }

    /**
     * Whether a pick only STAGES the selection (nothing written, no `select` /
     * `change`) until `commit()` commits it: `commitMode` `apply` (the Apply button
     * calls it) and `manual` (the app calls it). Closing discards a staged pick.
     */
    stagesSelection(): boolean {
        return this.options.commitMode === 'apply' || this.options.commitMode === 'manual';
    }

    /**
     * Whether a completed pick closes the calendar: `commitMode: 'selection'` with
     * `shouldCloseOnSelect` (default true). Multiple mode never closes on a pick.
     */
    shouldAutoClose(): boolean {
        if (this.options.selectionMode === 'multiple') return false;
        return this.options.commitMode === 'selection' && this.options.shouldCloseOnSelect !== false;
    }

    /**
     * Whether a click outside the floating calendar (or on the modal backdrop)
     * closes it: `shouldCloseOnOutsideClick` when set, otherwise true — except in
     * `commitMode: 'manual'`, where the app owns closing (default false).
     */
    closesOnOutsideClick(): boolean {
        return this.options.shouldCloseOnOutsideClick ?? this.options.commitMode !== 'manual';
    }

    /**
     * Whether a scroll that moves the input closes the open floating calendar (asked by
     * the core popover per scroll; scrolls inside the calendar never count):
     * `shouldCloseOnScroll` (default true), except while a pick is staged for Apply /
     * `commit()` (the user must apply or cancel), a message is shown (the user needs to
     * see it), and in time / datetime modes (the rolls are scroll widgets).
     */
    closesOnScroll(): boolean {
        if (this.presentation !== 'floating' || !this.isOpen) return false;
        if (this.options.shouldCloseOnScroll === false) return false;
        if (this.options.pickerMode === 'time' || this.options.pickerMode === 'datetime') return false;
        if (this.stagesSelection()) return false;
        if (this.messageElement?.classList.contains('drp__message--visible')) return false;
        drpLogger.debug('Scroll moved the input - closing calendar');
        return true;
    }

    createCalendar() {
        drpLogger.debug('Creating calendar');
        this.calendar = document.createElement('div');
        this.calendar.className = 'drp__picker';

        // Add unified navigation class if enabled
        if (this.options.isUnifiedNavigationEnabled) {
            this.calendar.classList.add('drp__picker--unified-nav');
        }

        // Picker-mode modifier class — used by CSS for the time picker layout.
        if (this.options.pickerMode === 'time' || this.options.pickerMode === 'datetime') {
            this.calendar.classList.add(`drp__picker--${this.options.pickerMode}`);
        }

        // Create unified navigation header (if enabled)
        if (this.options.isUnifiedNavigationEnabled) {
            this.unifiedHeader = document.createElement('div');
            this.unifiedHeader.className = 'drp__unified-header';

            // Conditionally make range display interactive
            const rangeClass = this.options.isUnifiedHeaderInteractive ? '' : ' drp__unified-range--static';
            const rangeAction = this.options.isUnifiedHeaderInteractive ? ' data-drp-action="toggle-unified-rolling"' : '';

            this.unifiedHeader.innerHTML = `
                <button class="drp__nav drp__nav--prev" data-drp-action="unified-prev"></button>
                <div class="drp__unified-range${rangeClass}"${rangeAction}></div>
                <button class="drp__nav drp__nav--next" data-drp-action="unified-next"></button>
            `;

            // Create unified rolling selector
            this.unifiedRollingSelector = document.createElement('div');
            this.unifiedRollingSelector.className = 'drp__unified-rolling-selector';
            this.unifiedRollingSelector.innerHTML = `
                <div class="drp__rolling-list" data-list="years" data-unified="true"></div>
                <div class="drp__rolling-list" data-list="months" data-unified="true"></div>
            `;

            this.calendar.appendChild(this.unifiedHeader);
            this.calendar.appendChild(this.unifiedRollingSelector);

            // Store reference to range display element
            this.unifiedRangeDisplay = this.unifiedHeader.querySelector('.drp__unified-range') as HTMLElement;
        }

        // Create container for months
        const monthsContainer = document.createElement('div');
        // Add layout class based on layout option
        if (this.options.monthLayout === 'grid') {
            monthsContainer.className = 'drp__months drp__months--grid';
            // Set CSS custom properties for grid dimensions
            if (this.options.gridRows) {
                monthsContainer.style.setProperty('--drp-grid-rows', String(this.options.gridRows));
            }
            if (this.options.gridColumns) {
                monthsContainer.style.setProperty('--drp-grid-columns', String(this.options.gridColumns));
            }
        } else {
            monthsContainer.className = 'drp__months drp__months--horizontal';
        }

        // Skip month rendering entirely in time-only mode.
        const skipMonths = this.options.pickerMode === 'time';

        // Create individual month calendars
        for (let i = 0; !skipMonths && i < this.options.visibleMonthCount; i++) {
            const monthCalendar = document.createElement('div');
            monthCalendar.className = 'drp__month';
            monthCalendar.dataset.monthIndex = String(i);

            // In unified mode, headers are static (non-interactive)
            // In non-unified mode, headers have navigation and rolling selector
            const headerHtml = this.options.isUnifiedNavigationEnabled
                ? `<div class="drp__header drp__header--static">
                    <div class="drp__month-year"></div>
                </div>`
                : `<div class="drp__header">
                    <button class="drp__nav drp__nav--prev" data-drp-action="prev" data-month-index="${i}"></button>
                    <div class="drp__month-year" data-drp-action="toggle-rolling" data-month-index="${i}"></div>
                    <button class="drp__nav drp__nav--next" data-drp-action="next" data-month-index="${i}"></button>
                </div>`;

            monthCalendar.innerHTML = `
                ${headerHtml}
                <div class="drp__calendar-container">
                    <div class="drp__rolling-selector" data-month-index="${i}">
                        <div class="drp__rolling-list" data-list="years" data-month-index="${i}"></div>
                        <div class="drp__rolling-list" data-list="months" data-month-index="${i}"></div>
                    </div>
                    <div class="drp__weekdays"></div>
                    <div class="drp__days" data-month-index="${i}"></div>
                </div>
            `;
            monthsContainer.appendChild(monthCalendar);
        }

        // Time picker DOM (built once, placed differently depending on mode).
        // Four display strategies share the same wrapper logic: rolls (default, v1.14),
        // clock (Material face, v1.15), wheel (iOS barrel, v1.15), and compact (iOS pills,
        // v1.15). The inner skeleton differs but mount placement (no wrapper for time-only,
        // __main for datetime) is identical.
        let timePicker: HTMLDivElement | null = null;
        if (this.options.pickerMode === 'time' || this.options.pickerMode === 'datetime') {
            timePicker = document.createElement('div');
            const is12h = this.options.hourCycle === 'h12';
            const isSecondsShown = !!this.options.isSecondsShown;
            if (this.options.timeDisplay === 'clock') {
                timePicker.className = 'drp__clock-picker';
                // Renderer fills .clock-header and .clock-face on every renderCalendar().
                // AM/PM toggle only emitted for h12 — h24 encodes the half in the hour itself.
                timePicker.innerHTML = `
                    <div class="drp__clock-header"></div>
                    <div class="drp__clock-face"></div>
                    ${is12h ? '<div class="drp__clock-ampm"></div>' : ''}
                `;
            } else if (this.options.timeDisplay === 'wheel') {
                timePicker.className = 'drp__wheel-picker';
                // iOS-style barrel: each column is a snap-scrolling list. The center band
                // and the top/bottom fade gradients are pure CSS pseudo-elements on the
                // .wheel-rolls wrapper. Renderer fills .wheel-column[data-wheel-list] on
                // every renderCalendar() and scrolls the focus item to center.
                const wheelColumn = (key: string, headerText: string, extraClass: string = '') => `
                    <div class="drp__wheel-column-wrapper">
                        <div class="drp__wheel-column-header">${headerText}</div>
                        <div class="drp__wheel-column ${extraClass}" data-wheel-list="${key}"></div>
                    </div>
                `;
                timePicker.innerHTML = `
                    <div class="drp__time-label">${this.labels.time}</div>
                    <div class="drp__wheel-rolls">
                        <div class="drp__wheel-band" aria-hidden="true"></div>
                        ${wheelColumn('hours', this.labels.hours)}
                        ${wheelColumn('minutes', this.labels.minutes)}
                        ${isSecondsShown ? wheelColumn('seconds', this.labels.seconds) : ''}
                        ${is12h ? wheelColumn('ampm', `${this.labels.am}/${this.labels.pm}`, 'drp__wheel-column--ampm') : ''}
                    </div>
                `;
            } else if (this.options.timeDisplay === 'compact') {
                timePicker.className = 'drp__compact-picker';
                // iOS 14+ pills: HH : MM [: SS] [AM/PM]. Each pill is a single button that
                // becomes contentEditable on click; the renderer just updates the displayed
                // value (no DOM rebuild per render).
                const sep = `<span class="drp__compact-sep">:</span>`;
                timePicker.innerHTML = `
                    <div class="drp__time-label">${this.labels.time}</div>
                    <div class="drp__compact-row">
                        <button type="button" class="drp__compact-pill" data-compact-field="hours">--</button>
                        ${sep}
                        <button type="button" class="drp__compact-pill" data-compact-field="minutes">--</button>
                        ${isSecondsShown ? sep + `<button type="button" class="drp__compact-pill" data-compact-field="seconds">--</button>` : ''}
                        ${is12h ? `
                            <div class="drp__compact-ampm">
                                <button type="button" class="drp__compact-ampm-button" data-compact-ampm="am">${this.labels.am}</button>
                                <button type="button" class="drp__compact-ampm-button" data-compact-ampm="pm">${this.labels.pm}</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                timePicker.className = 'drp__time-picker';
                // Layout: section label, then a row of columns. Each column has a
                // header (Hours / Minutes / Seconds / AM/PM) above its roll list.
                const column = (key: string, headerText: string, extraRollClass: string = '') => `
                    <div class="drp__time-column">
                        <div class="drp__time-column-header">${headerText}</div>
                        <div class="drp__rolling-list drp__time-roll ${extraRollClass}" data-time-list="${key}"></div>
                    </div>
                `;
                timePicker.innerHTML = `
                    <div class="drp__time-label">${this.labels.time}</div>
                    <div class="drp__time-rolls">
                        ${column('hours', this.labels.hours)}
                        ${column('minutes', this.labels.minutes)}
                        ${isSecondsShown ? column('seconds', this.labels.seconds) : ''}
                        ${is12h ? column('ampm', `${this.labels.am}/${this.labels.pm}`, 'drp__time-roll--ampm') : ''}
                    </div>
                `;
            }
        }

        // Mount strategy by mode:
        //   date     -> monthsContainer is the direct flex-column child (unchanged).
        //   time     -> timePicker is the direct child; no wrapper, no months.
        //   datetime -> .drp__main wraps months + timePicker side by side.
        if (this.options.pickerMode === 'datetime') {
            const main = document.createElement('div');
            main.className = 'drp__main';
            main.appendChild(monthsContainer);
            main.appendChild(timePicker!);
            this.calendar.appendChild(main);
        } else if (this.options.pickerMode === 'time') {
            this.calendar.appendChild(timePicker!);
        } else {
            this.calendar.appendChild(monthsContainer);
        }

        // Add message area (for validation feedback, errors, etc.)
        this.messageElement = document.createElement('div');
        this.messageElement.className = 'drp__message';
        this.messageElement.innerHTML = `
            <span class="drp__message-text"></span>
            <button class="drp__message-close" data-drp-action="hide-message" aria-label="${escapeHtml(this.labels.close)}">&times;</button>
        `;
        this.calendar.appendChild(this.messageElement);

        // Add selection summary (for range mode)
        if (this.options.selectionMode === 'range' && this.options.isSummaryShown !== false) {
            const summary = document.createElement('div');
            summary.className = 'drp__summary drp__summary--hidden';
            this.calendar.appendChild(summary);
            this.summaryElement = summary;
        }

        // Add actions at the bottom (only if there are buttons to show)
        const actions = document.createElement('div');
        actions.className = 'drp__actions';
        this.renderButtons(actions);
        // Only append if there are actual buttons rendered
        if (actions.children.length > 0) {
            this.calendar.appendChild(actions);
        }

        this.containerElement.appendChild(this.calendar);
        drpLogger.debug('Calendar appended to container:', this.calendar);

        // Create tooltip for Floating UI
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'drp__tooltip';
        this.tooltipArrow = document.createElement('div');
        this.tooltipArrow.className = 'drp__tooltip-arrow';
        this.tooltip.appendChild(this.tooltipArrow);
        this.containerElement.appendChild(this.tooltip);

        this.attachCalendarListeners();

        // Initialize rolling selector states for each month
        this.rollingSelectorOpenByColumn = new Array(this.options.visibleMonthCount).fill(false);

        // Re-apply any active lock to the freshly built DOM (classes + input.readOnly).
        Lock.syncLockUI(this);
    }

    attachInputListeners() {
        if (!this.input) return;

        drpLogger.debug('Attaching input listeners');

        // A fresh controller for this build's listeners (a rebuild makes a new
        // instance; the prior one was already aborted in destroy()).
        this.inputListenersAbort = new AbortController();
        const signal = this.inputListenersAbort.signal;

        // Calendar trigger modes
        const triggerMode = this.options.calendarOpenTrigger || 'focus'; // default to 'focus' for backward compatibility

        if (triggerMode === 'focus') {
            // Open on focus (initial focus from tab-in or first click)
            this.input.addEventListener('focus', () => {
                drpLogger.debug('Input focused - opening calendar');
                this.open();
            }, { signal });
            // Also re-open when the input is clicked while already focused but the
            // calendar got closed (e.g., by scroll, Escape, outside-click). The focus
            // event won't fire if focus didn't change. Both mousedown and click are
            // wired up because some pointer/touch sequences and accessibility tools
            // skip one or the other; open() is now idempotent so doubled calls are
            // harmless.
            // Pointerdown is the modern unified pointer event. It fires even when
            // mousedown/click are suppressed (e.g., the first click after a window
            // regains focus — the browser uses that click to activate the window
            // and swallows the synthesized mouse events, but pointerdown still
            // dispatches). This is the most reliable trigger for "user pressed
            // the input".
            this.input.addEventListener('pointerdown', () => {
                drpLogger.debug('Input pointerdown - ensuring calendar open');
                this.openViaPointer = true; // a trailing "ghost" click may hit a modal/fullscreen overlay
                this.open();
            }, { signal });
            this.input.addEventListener('mousedown', () => {
                drpLogger.debug('Input mousedown - ensuring calendar open');
                this.openViaPointer = true;
                this.open();
            }, { signal });
            this.input.addEventListener('click', () => {
                drpLogger.debug('Input click - ensuring calendar open');
                this.openViaPointer = true;
                this.open();
            }, { signal });
            // Diagnose: log when the input loses focus and when window focus changes.
        } else if (triggerMode === 'typing') {
            // Open when user starts typing
            this.input.addEventListener('input', (e) => {
                if (!this.calendar.classList.contains('drp__picker--visible') && this.input && this.input.value.length > 0) {
                    drpLogger.debug('User started typing - opening calendar');
                    this.open();
                }
            }, { signal });
        }
        // 'manual' mode: no automatic trigger, calendar only opens via .open()/.toggle() methods

        // Input masking handlers (always attached regardless of trigger mode)
        this.input.addEventListener('input', (e) => this.handleInputMask(e), { signal });
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e), { signal });
        this.input.addEventListener('paste', (e) => this.handlePaste(e), { signal });
    }

    attachCalendarListeners() {
        // Delegate focusin for compact pills so Tab into a pill auto-enters edit
        // mode. Without this, Tab moves focus to the next pill (a plain <button>)
        // and typing does nothing until the user also clicks. focusin bubbles
        // (unlike focus), so a single root-level listener catches every pill.
        this.calendar.addEventListener('focusin', (e) => {
            const target = e.target as HTMLElement;
            if (target && target.matches && target.matches('[data-compact-field]')) {
                if (!target.isContentEditable) {
                    this.beginCompactEdit(target);
                }
            }
        });

        // Delegate all click events
        this.calendar.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            // Stop propagation to prevent "close on outside click" from firing
            e.stopPropagation();

            // Touch badge tooltips: on hover-less devices (phone full-screen sheet,
            // tablets) a badge's tooltip can't show on hover, so a tap toggles it.
            // Gated on `!supportsHover()` so desktop keeps the mouseenter/leave path
            // untouched. A tap on the same badge (or an empty badge) closes it; a tap
            // anywhere else in the calendar dismisses an open badge tooltip before the
            // tap's own action runs. Badge cells drive nothing else, so we return.
            if (!this.supportsHover()) {
                const badgeCell = target.closest('.drp__badge-cell') as HTMLElement | null;
                if (badgeCell) {
                    const tip = badgeCell.dataset.tooltip;
                    if (tip && this.currentTooltipTarget !== badgeCell) {
                        this.showTooltip(badgeCell, tip);
                    } else {
                        this.hideTooltip();
                    }
                    return;
                }
                if (this.currentTooltipTarget) this.hideTooltip();
            }

            // Action items: footer buttons and consumer HTML (message / summary / custom
            // renderers) carrying `data-action`. Internal controls use `data-drp-action`.
            const actionTrigger = target.closest('[data-action]') as HTMLElement | null;
            if (actionTrigger && this.calendar.contains(actionTrigger)) {
                await this.activateAction(actionTrigger, e);
                return;
            }

            const action = target.dataset.drpAction;
            const monthIndexAttr = target.dataset.monthIndex;
            const monthIndex = monthIndexAttr ? parseInt(monthIndexAttr) : 0;

            // Check if navigation button is disabled (respects rollingYearRange/rollingMonthRange boundaries)
            if (action === 'prev' || action === 'next' || action === 'unified-prev' || action === 'unified-next') {
                const button = target as HTMLButtonElement;
                if (button.disabled || button.classList.contains('drp__nav--disabled')) {
                    return;
                }
            }

            // === Lock gating (user clicks only; the programmatic API bypasses locks) ===
            // Bucket the click by the interaction family it drives and drop it if that
            // family is locked. Action items were already handled (and gated) above.
            const NAV_ACTIONS = ['prev', 'next', 'unified-prev', 'unified-next', 'toggle-rolling', 'toggle-unified-rolling'];
            const isTimeTarget = !!target.closest('[data-hour],[data-hour12],[data-minute],[data-second],[data-ampm],[data-clock-hour],[data-clock-hour12],[data-clock-minute],[data-clock-step],[data-clock-ampm],[data-wheel-value],[data-compact-field],[data-compact-ampm]');
            const isDayTarget = !!target.closest('.drp__day:not(.drp__day--disabled)');
            const isRollingTarget = !!target.closest('[data-year],[data-month]');
            if (this.isAspectLocked('navigation') && ((action && NAV_ACTIONS.includes(action)) || isRollingTarget)) return;
            if (this.isAspectLocked('selection') && (isTimeTarget || isDayTarget)) return;

            if (action === 'prev') this.prevMonth(monthIndex);
            else if (action === 'next') this.nextMonth(monthIndex);
            else if (action === 'unified-prev') this.unifiedPrevMonth();
            else if (action === 'unified-next') this.unifiedNextMonth();
            else if (action === 'toggle-rolling') this.toggleRollingSelector(monthIndex);
            else if (action === 'toggle-unified-rolling') this.toggleUnifiedRollingSelector();
            else if (action === 'hide-message') this.hideMessage();
            else if (target.closest('[data-hour], [data-hour12]')) {
                const el = target.closest('[data-hour], [data-hour12]') as HTMLElement;
                if (el.dataset.hour !== undefined) {
                    this.selectHour(parseInt(el.dataset.hour, 10), false);
                } else if (el.dataset.hour12 !== undefined) {
                    this.selectHour(parseInt(el.dataset.hour12, 10), true);
                }
            }
            else if (target.closest('[data-minute]')) {
                const el = target.closest('[data-minute]') as HTMLElement;
                if (el.dataset.minute !== undefined) {
                    this.selectMinute(parseInt(el.dataset.minute, 10));
                }
            }
            else if (target.closest('[data-second]')) {
                const el = target.closest('[data-second]') as HTMLElement;
                if (el.dataset.second !== undefined) {
                    this.selectSecond(parseInt(el.dataset.second, 10));
                }
            }
            else if (target.closest('[data-ampm]')) {
                const el = target.closest('[data-ampm]') as HTMLElement;
                if (el.dataset.ampm === 'am' || el.dataset.ampm === 'pm') {
                    this.selectAmpm(el.dataset.ampm);
                }
            }
            // Clock picker (timeDisplay: 'clock') — Material-style face dispatches
            // through dedicated data attributes so the rolls handlers above stay
            // independent. Mirrors the rolls' camelCased dataset reads.
            else if (target.closest('[data-clock-hour], [data-clock-hour12]')) {
                const el = target.closest('[data-clock-hour], [data-clock-hour12]') as HTMLElement;
                if (el.dataset.clockHour !== undefined) {
                    this.selectClockHour(parseInt(el.dataset.clockHour, 10), false);
                } else if (el.dataset.clockHour12 !== undefined) {
                    this.selectClockHour(parseInt(el.dataset.clockHour12, 10), true);
                }
            }
            else if (target.closest('[data-clock-minute]')) {
                const el = target.closest('[data-clock-minute]') as HTMLElement;
                if (el.dataset.clockMinute !== undefined) {
                    this.selectClockMinute(parseInt(el.dataset.clockMinute, 10));
                }
            }
            else if (target.closest('[data-clock-step]')) {
                const el = target.closest('[data-clock-step]') as HTMLElement;
                const step = el.dataset.clockStep;
                if (step === 'hours' || step === 'minutes') {
                    this.setClockStep(step);
                }
            }
            else if (target.closest('[data-clock-ampm]')) {
                const el = target.closest('[data-clock-ampm]') as HTMLElement;
                if (el.dataset.clockAmpm === 'am' || el.dataset.clockAmpm === 'pm') {
                    this.selectAmpm(el.dataset.clockAmpm);
                }
            }
            // Wheel picker (timeDisplay: 'wheel') — click on any visible row scrolls
            // it to the center band. The wheel renderer is what actually commits
            // values when the scroll settles, so these clicks only need to scroll.
            // Hours / minutes / seconds / am-pm are all the same code path.
            else if (target.closest('[data-wheel-value]')) {
                const el = target.closest('[data-wheel-value]') as HTMLElement;
                this.scrollWheelItemToCenter(el);
            }
            // Compact picker (timeDisplay: 'compact') — clicking a pill enters edit
            // mode; clicking an AM/PM button commits a half. Both routes are thin
            // wrappers that ultimately call selectHour / selectMinute / selectSecond.
            else if (target.closest('[data-compact-field]')) {
                const el = target.closest('[data-compact-field]') as HTMLElement;
                this.beginCompactEdit(el);
            }
            else if (target.closest('[data-compact-ampm]')) {
                const el = target.closest('[data-compact-ampm]') as HTMLElement;
                if (el.dataset.compactAmpm === 'am' || el.dataset.compactAmpm === 'pm') {
                    this.selectAmpm(el.dataset.compactAmpm);
                }
            }
            else if (target.closest('.drp__day:not(.drp__day--disabled)')) {
                await this.selectDay(target.closest('.drp__day') as HTMLElement);
            }
            else if (target.closest('[data-year]')) {
                const yearElement = target.closest('[data-year]') as HTMLElement;
                // Ignore clicks on disabled years
                if (yearElement.classList.contains('drp__rolling-item--disabled')) {
                    return;
                }
                const year = yearElement.dataset.year;

                // Check if this is unified navigation
                if (yearElement.dataset.unified === 'true') {
                    if (year) {
                        this.setUnifiedYear(parseInt(year));
                    }
                } else {
                    const monthIdx = yearElement.dataset.monthIndex;
                    if (year && monthIdx) {
                        this.selectYear(parseInt(year), parseInt(monthIdx));
                    }
                }
            }
            else if (target.closest('[data-month]')) {
                const monthElement = target.closest('[data-month]') as HTMLElement;
                // Ignore clicks on disabled months
                if (monthElement.classList.contains('drp__rolling-item--disabled')) {
                    return;
                }
                const month = monthElement.dataset.month;

                // Check if this is unified navigation
                if (monthElement.dataset.unified === 'true') {
                    if (month) {
                        this.setUnifiedMonth(parseInt(month));
                    }
                } else {
                    const monthIdx = monthElement.dataset.monthIndex;
                    if (month && monthIdx) {
                        this.selectMonth(parseInt(month), parseInt(monthIdx));
                    }
                }
            }
            else {
                // Clicked somewhere else in calendar (not a handled element)
                // Check if click was outside rolling selector elements
                if (!target.closest('.drp__rolling-selector') &&
                    !target.closest('.drp__unified-rolling-selector')) {

                    let needsRender = false;

                    // Close any open individual selectors
                    for (let i = 0; i < this.rollingSelectorOpenByColumn.length; i++) {
                        if (this.rollingSelectorOpenByColumn[i]) {
                            this.rollingSelectorOpenByColumn[i] = false;
                            needsRender = true;
                        }
                    }

                    // Close unified selector if open
                    if (this.isUnifiedRollingSelectorOpen) {
                        this.isUnifiedRollingSelectorOpen = false;
                        needsRender = true;
                    }

                    // Re-render to apply closed state
                    if (needsRender) {
                        this.renderCalendar();
                    }
                }
            }
        });

        // Tooltip event delegation (for both days and badge cells). Hover-only:
        // touch devices report `(hover: none)` and get tap-to-toggle tooltips in the
        // click handler instead. Bailing here also avoids the synthesized mouseenter
        // that a tap fires from showing a tooltip the same tap would then toggle off.
        this.calendar.addEventListener('mouseenter', (e) => {
            if (!this.supportsHover()) return;
            const target = e.target as HTMLElement;
            const day = target.closest('.drp__day');
            const badgeCell = target.closest('.drp__badge-cell');

            const element = day || badgeCell;
            if (element && element instanceof HTMLElement) {
                const tooltip = element.dataset.tooltip;
                if (tooltip) {
                    this.showTooltip(element, tooltip);
                }
            }
        }, true); // Use capture phase to catch events on child elements

        this.calendar.addEventListener('mouseleave', (e) => {
            if (!this.supportsHover()) return;
            const target = e.target as HTMLElement;
            const day = target.closest('.drp__day');
            const badgeCell = target.closest('.drp__badge-cell');

            const element = day || badgeCell;
            if (element && this.currentTooltipTarget === element) {
                this.hideTooltip();
            }
        }, true);

        // Hover preview: paint the would-be range while the user is in the
        // half-selected state (start clicked, end pending). Drag has its own
        // preview, so suppress this when isDragging.
        this.calendar.addEventListener('mouseover', (e) => {
            if (this.options.selectionMode !== 'range') return;
            if (!this._selectedStartDate || this._selectedEndDate) return;
            if (this.isDragging) return;

            const target = e.target as HTMLElement;
            const day = target.closest('.drp__day') as HTMLElement | null;
            if (!day) return;

            const dateAttr = day.dataset.date;
            if (!dateAttr) return;

            const [year, month, dayNum] = dateAttr.split('-').map(Number);
            const hoveredDate = new Date(year, month - 1, dayNum);

            this.hoverPreviewEnd = hoveredDate;
            this.updateHoverPreview();
        });

        this.calendar.addEventListener('mouseleave', () => {
            if (this.hoverPreviewEnd) {
                this.hoverPreviewEnd = null;
                this.updateHoverPreview();
            }
        });

        // Track calendar focus for keyboard navigation (especially important for inline mode)
        // Note: Calendar click tracking is also handled by clickEvents manager
        this.calendar.addEventListener('focusin', () => {
            this.setCalendarActive();
        });

        // Note: Outside click deactivation is now handled by the clickEvents manager

        // Keyboard navigation (document-level; a named field so destroy() /
        // deactivate() can detach it)
        this.onDocumentKeydown = (e: KeyboardEvent) => {
            // Only respond if calendar is visible AND active (has focus)
            if (!this.calendar.classList.contains('drp__picker--visible')) return;
            if (!this.isCalendarActive) return;

            drpLogger.debug('Keydown', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey, 'Shift:', e.shiftKey, 'Alt:', e.altKey);

            // Time mode has no calendar grid — allow Escape but skip every grid-relative key.
            // Arrow-keys-step-time is out of scope for v1; revisit later.
            if (this.options.pickerMode === 'time' && e.key !== 'Escape') {
                return;
            }

            // Lock gating: block month-navigation keys when navigation is locked.
            // 't'/Ctrl+Home/End mutate the month view directly here (not via the guarded
            // navigation module), so they must be caught at the keyboard layer. Selection
            // commit (Enter) routes through the guarded day-click branch; plain arrows /
            // Home / End / Tab only move the focus highlight and are left alone. Escape
            // (close) stays allowed so a locked picker is never a keyboard trap.
            const isNavKey = e.key === 'PageUp' || e.key === 'PageDown' || e.key === 't' || e.key === 'T'
                || ((e.ctrlKey || e.metaKey) && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key));
            if (isNavKey && this.isAspectLocked('navigation')) {
                e.preventDefault();
                return;
            }

            // Plain Home/End belong to the caret while a typed input holds text and
            // the caret isn't at the boundary (esp. the show-fullscreen-input header
            // field) — don't hijack them for month/year navigation.
            if (Interaction.inputOwnsCaretKey(e)) return;

            // WAI-ARIA grid: the horizontal arrows follow the VISUAL direction. In RTL
            // the grid runs right-to-left, so ArrowLeft is "next" (day, or month with Ctrl).
            let key = e.key;
            if ((key === 'ArrowLeft' || key === 'ArrowRight') && this.isRtl()) {
                key = key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
            }

            // Escape is the core overlay tree's (calendarPopover: one level per press).
            if (e.key === 'ArrowUp') {
                this.moveFocus(-7);
                e.preventDefault();
            }
            else if (e.key === 'ArrowDown') {
                this.moveFocus(7);
                e.preventDefault();
            }
            else if (key === 'ArrowLeft') {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Left (Ctrl+Right in RTL): Previous month (same as PageUp - maintain day position)
                    navigationLogger.debug('Ctrl+Left: Navigate to previous month');
                    const currentDayIndex = this.focusedDayIndex;
                    this.prevMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                        if (newDays) {
                            // Try to maintain same day index, or use last day if month is shorter
                            this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                            this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                            newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                            UI.revealDay(newDays[this.focusedDayIndex]);
                        }
                    }, 0);
                } else {
                    this.moveFocus(-1);
                }
                e.preventDefault();
            }
            else if (key === 'ArrowRight') {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Right (Ctrl+Left in RTL): Next month (same as PageDown - maintain day position)
                    navigationLogger.debug('Ctrl+Right: Navigate to next month');
                    const currentDayIndex = this.focusedDayIndex;
                    this.nextMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                        if (newDays) {
                            // Try to maintain same day index, or use last day if month is shorter
                            this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                            this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                            newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                            UI.revealDay(newDays[this.focusedDayIndex]);
                        }
                    }, 0);
                } else {
                    this.moveFocus(1);
                }
                e.preventDefault();
            }
            else if (e.key === 'Enter') {
                if (this.focusedDayIndex !== null) {
                    // Select the focused day
                    const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                    const day = days?.[this.focusedDayIndex];
                    if (day) {
                        (day as HTMLElement).click();
                    }
                } else {
                    // No focused day - close calendar as confirmation
                    this.close();
                }
                e.preventDefault();
            }
            else if (e.key === 'Tab') {
                // Switch between columns in multi-month mode
                if (this.options.visibleMonthCount > 1) {
                    const direction = e.shiftKey ? -1 : 1;
                    const newMonthIndex = this.activeMonthIndex + direction;

                    // Clamp to valid range
                    if (newMonthIndex >= 0 && newMonthIndex < this._monthDates.length) {
                        navigationLogger.debug(`Tab: switching from Col${this.activeMonthIndex} to Col${newMonthIndex}`);

                        // Get current focused day index before switching
                        const currentFocusedIndex = this.focusedDayIndex ?? 0;

                        // Switch to new column
                        this.activeMonthIndex = newMonthIndex;

                        // Try to maintain same day index, or clamp to valid range
                        const newDaysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                        if (newDaysContainer) {
                            const newDays = newDaysContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                            this.focusedDayIndex = Math.min(currentFocusedIndex, newDays.length - 1);
                            navigationLogger.debug(`Col${this.activeMonthIndex} Tab: set focusedDayIndex to ${this.focusedDayIndex}`);
                        }

                        // Re-render to show new focus
                        this.renderCalendar();
                    }
                    e.preventDefault();
                }
            }
            else if (e.key === 't' || e.key === 'T') {
                // Jump to today in the active month column
                this._monthDates[this.activeMonthIndex] = new Date();
                Navigation.checkAndResolveCollisions(this, this.activeMonthIndex);
                this.renderCalendar();
                // Focus on today's day in the active month
                setTimeout(() => {
                    const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                    if (days) {
                        const todayIndex = Array.from(days).findIndex(day => day.classList.contains('drp__day--today'));
                        if (todayIndex !== -1) {
                            this.focusedDayIndex = todayIndex;
                            this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                            days[todayIndex].classList.add('drp__day--focused');
                            UI.revealDay(days[todayIndex]);
                        }
                    }
                }, 0);
                e.preventDefault();
            }
            else if (e.key === 'PageUp') {
                // Go to previous month in active column, same day position
                const currentDayIndex = this.focusedDayIndex;
                this.prevMonth(this.activeMonthIndex);
                setTimeout(() => {
                    const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                    const newDays = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                    if (newDays) {
                        // Try to maintain same day index, or use last day if month is shorter
                        this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                        this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                        newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                        UI.revealDay(newDays[this.focusedDayIndex]);
                    }
                }, 0);
                e.preventDefault();
            }
            else if (e.key === 'PageDown') {
                // Go to next month in active column, same day position
                const currentDayIndex = this.focusedDayIndex;
                this.nextMonth(this.activeMonthIndex);
                setTimeout(() => {
                    const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                    const newDays = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                    if (newDays) {
                        // Try to maintain same day index, or use last day if month is shorter
                        this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                        this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                        newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                        UI.revealDay(newDays[this.focusedDayIndex]);
                    }
                }, 0);
                e.preventDefault();
            }
            else if (e.key === 'Home') {
                navigationLogger.debug('Home key pressed, Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
                const currentYear = this._monthDates[this.activeMonthIndex].getFullYear();
                const currentMonth = this._monthDates[this.activeMonthIndex].getMonth();

                if (e.ctrlKey || e.metaKey) {
                    navigationLogger.debug('Ctrl+Home: Navigate to year start');
                    // Ctrl+Home: Go to January 1st of current year
                    // If already there, go to January 1st of previous year
                    const yearRange = this.getAvailableYearRange();
                    const monthRange = this.getAvailableMonthRange();
                    const isJanuary = currentMonth === 0;
                    const isFirstDay = this.focusedDayIndex === 0;

                    let targetYear = currentYear;
                    let targetMonth = Math.max(0, monthRange.min - 1); // Use first allowed month (monthRange is 1-based)

                    if (isJanuary && isFirstDay) {
                        // Already at Jan 1 - try to go to previous year
                        targetYear = currentYear - 1;
                    }

                    // Clamp to allowed year range
                    if (targetYear < yearRange.min) {
                        navigationLogger.debug('Ctrl+Home: Target year below min, clamping to', yearRange.min);
                        targetYear = yearRange.min;
                    }

                    // Only navigate if not already at the boundary
                    const newDate = new Date(targetYear, targetMonth, 1);
                    const currentDate = this._monthDates[this.activeMonthIndex];
                    if (newDate.getFullYear() !== currentDate.getFullYear() || newDate.getMonth() !== currentDate.getMonth() || this.focusedDayIndex !== 0) {
                        navigationLogger.debug('Going to', targetMonth + 1, '/', targetYear);
                        this._monthDates[this.activeMonthIndex] = newDate;
                        this.renderCalendar();
                        setTimeout(() => {
                            const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                            const days = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                            if (days) {
                                this.focusedDayIndex = 0;
                                this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                                days[0]?.classList.add('drp__day--focused');
                                UI.revealDay(days[0]);
                            }
                        }, 0);
                    }
                } else {
                    navigationLogger.debug('Home: Navigate to first day (cycles to previous month if already there)');
                    // Home: Go to first day of current month
                    // If already on first day, go to first day of previous month
                    const isFirstDay = this.focusedDayIndex === 0;

                    if (isFirstDay) {
                        // Already on first day - go to previous month, first day
                        navigationLogger.debug('Already on first day, going to previous month');
                        this.prevMonth(this.activeMonthIndex);
                        setTimeout(() => {
                            const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                            const days = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                            if (days) {
                                this.focusedDayIndex = 0;
                                this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                                days[0]?.classList.add('drp__day--focused');
                                UI.revealDay(days[0]);
                            }
                        }, 0);
                    } else {
                        // Go to first day of current month
                        this.focusedDayIndex = 0;
                        const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                        const days = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                        if (days) {
                            this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                            days[0]?.classList.add('drp__day--focused');
                            UI.revealDay(days[0]);
                        }
                    }
                }
                e.preventDefault();
            }
            else if (e.key === 'End') {
                navigationLogger.debug('End key pressed, Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
                const currentYear = this._monthDates[this.activeMonthIndex].getFullYear();
                const currentMonth = this._monthDates[this.activeMonthIndex].getMonth();

                if (e.ctrlKey || e.metaKey) {
                    navigationLogger.debug('Ctrl+End: Navigate to year end');
                    // Ctrl+End: Go to December 31st of current year
                    // If already there, go to December 31st of next year
                    const yearRange = this.getAvailableYearRange();
                    const monthRange = this.getAvailableMonthRange();
                    const isDecember = currentMonth === 11;

                    // Check if we're at the last day
                    const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                    const isLastDay = days && this.focusedDayIndex === days.length - 1;

                    let targetYear = currentYear;
                    let targetMonth = Math.min(11, monthRange.max - 1); // Use last allowed month (monthRange is 1-based)

                    if (isDecember && isLastDay) {
                        // Already at Dec 31 - try to go to next year
                        targetYear = currentYear + 1;
                    }

                    // Clamp to allowed year range
                    if (targetYear > yearRange.max) {
                        navigationLogger.debug('Ctrl+End: Target year above max, clamping to', yearRange.max);
                        targetYear = yearRange.max;
                    }

                    // Only navigate if not already at the boundary
                    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate(); // Get last day of target month
                    const newDate = new Date(targetYear, targetMonth, lastDayOfMonth);
                    const currentDate = this._monthDates[this.activeMonthIndex];
                    if (newDate.getFullYear() !== currentDate.getFullYear() || newDate.getMonth() !== currentDate.getMonth() || !isLastDay) {
                        navigationLogger.debug('Going to', targetMonth + 1, '/', targetYear);
                        this._monthDates[this.activeMonthIndex] = newDate;
                        this.renderCalendar();
                        setTimeout(() => {
                            const newContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                            const newDays = newContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                            if (newDays) {
                                this.focusedDayIndex = newDays.length - 1;
                                this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                                newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                                UI.revealDay(newDays[this.focusedDayIndex]);
                            }
                        }, 0);
                    }
                } else {
                    navigationLogger.debug('End: Navigate to last day (cycles to next month if already there)');
                    // End: Go to last day of current month
                    // If already on last day, go to last day of next month
                    const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                    const days = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                    if (!days) return;

                    const isLastDay = this.focusedDayIndex === days.length - 1;

                    if (isLastDay) {
                        // Already on last day - go to next month, last day
                        navigationLogger.debug('Already on last day, going to next month');
                        this.nextMonth(this.activeMonthIndex);
                        setTimeout(() => {
                            const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                            const days = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                            if (days) {
                                this.focusedDayIndex = days.length - 1;
                                this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                                days[this.focusedDayIndex]?.classList.add('drp__day--focused');
                                UI.revealDay(days[this.focusedDayIndex]);
                            }
                        }, 0);
                    } else {
                        // Go to last day of current month
                        this.focusedDayIndex = days.length - 1;
                        this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                        days[this.focusedDayIndex]?.classList.add('drp__day--focused');
                        UI.revealDay(days[this.focusedDayIndex]);
                    }
                }
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', this.onDocumentKeydown);

        // Note: Outside click handling is now managed by the clickEvents manager (see setupEventSubscriptions)
    }

    /**
     * Parse a time format mask into a TimeFormatOptions. Tokens: HH/H (24h hours),
     * hh/h (12h hours), mm/m, ss/s, a (am/pm). Separators between fields are
     * preserved literally (typically `:`). The `a` token, when present, switches
     * 12-hour mode on regardless of the hour token used.
     */
    parseTimeFormat(formatString: string): TimeFormatOptions {
        const parts: TimeFormatOptions['parts'] = {};
        let separator = ':';
        if (formatString.includes(':')) separator = ':';
        else if (formatString.includes('.')) separator = '.';

        // Detect tokens by regex scan over the format string. Ampm is a separate
        // suffix token after a space; we treat the time tokens as the rest.
        const trimmed = formatString.trim();

        // Hours
        let is12Hour = false;
        const hh = trimmed.match(/HH|hh|H(?!H)|h(?!h)/);
        if (hh) {
            const len = hh[0].length;
            parts.hours = { index: 0, length: len };
            is12Hour = hh[0] === 'h' || hh[0] === 'hh';
        }

        // Minutes
        const mm = trimmed.match(/mm|m(?!m)/);
        if (mm) {
            parts.minutes = { index: 1, length: mm[0].length };
        }

        // Seconds
        let hasSeconds = false;
        const ss = trimmed.match(/ss|s(?!s)/);
        if (ss) {
            parts.seconds = { index: 2, length: ss[0].length };
            hasSeconds = true;
        }

        // AM/PM marker
        if (/\ba\b/.test(trimmed)) {
            parts.ampm = { index: 3 };
            is12Hour = true;
        }

        return { format: formatString, separator, parts, is12Hour, hasSeconds };
    }

    // Helper methods
    parseFormat(formatString: string): FormatOptions {
        // Parse format string like "YYYY-MM-DD" or "DD.MM.YYYY"
        // Returns structure with positions and separator
        const parts: FormatOptions['parts'] = {};
        let separator = '';

        // Detect separator
        if (formatString.includes('-')) separator = '-';
        else if (formatString.includes('/')) separator = '/';
        else if (formatString.includes('.')) separator = '.';

        // Split by separator
        const segments = formatString.split(separator);

        segments.forEach((segment, index) => {
            if (segment === 'YYYY' || segment === 'YY') {
                parts.year = { index, length: segment.length };
            } else if (segment === 'MM' || segment === 'M') {
                parts.month = { index, length: 2 }; // Always 2 digits for consistency
            } else if (segment === 'DD' || segment === 'D') {
                parts.day = { index, length: 2 }; // Always 2 digits for consistency
            }
        });

        return {
            format: formatString,
            separator,
            parts,
            maxLength: formatString.length
        };
    }

    /**
     * Parse one date written in the configured `dateFormatMask` (e.g. `10.06.2026`)
     * or as ISO `YYYY-MM-DD`. Strict: every part present and the date real.
     */
    parseDateText(text: string): Date | null {
        const t = text.trim();
        const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
        const build = (y: number, m: number, d: number): Date | null => {
            const date = new Date(y, m - 1, d);
            return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
        };
        const { separator, parts } = this.formatInfo;
        if (separator && parts.year && parts.month && parts.day) {
            const segs = t.split(separator);
            if (segs.length === 3 && segs.every((s) => /^\d+$/.test(s))) {
                const ys = segs[parts.year.index];
                const isYearComplete = ys.length === parts.year.length;
                const y = parts.year.length === 2 ? 2000 + Number(ys) : Number(ys);
                const date = isYearComplete ? build(y, Number(segs[parts.month.index]), Number(segs[parts.day.index])) : null;
                if (date) return date;
            }
        }
        return iso ? build(Number(iso[1]), Number(iso[2]), Number(iso[3])) : null;
    }

    /**
     * Lenient range text: find exactly two dates (each in the `dateFormatMask` form
     * or ISO) and ignore whatever separates them — `" - "`, `"/"`, an en dash,
     * `"to"`, `"bis"`, … The separator may not contain digits, and nothing but
     * whitespace may surround the pair. Returns the two dates in written order.
     */
    findDatePair(text: string): [Date, Date] | null {
        // A date token: three digit groups joined by one repeated separator, so
        // `2026-06-10/2026-06-14` splits into two tokens at the `/`.
        const tokens = [...text.matchAll(/\d+([-./])\d+\1\d+/g)];
        if (tokens.length !== 2) return null;
        const [t1, t2] = tokens;
        const before = text.slice(0, t1.index);
        const between = text.slice(t1.index! + t1[0].length, t2.index);
        const after = text.slice(t2.index! + t2[0].length);
        if (before.trim() || after.trim() || /\d/.test(between) || !between.length) return null;
        const a = this.parseDateText(t1[0]);
        const b = this.parseDateText(t2[0]);
        return a && b ? [a, b] : null;
    }

    /**
     * Parse a time — `HH:mm`, `HH:mm:ss` (`:` or `.`), optionally with an am/pm
     * marker (`am`/`pm` or the locale's labels).
     */
    parseTimeText(text: string): SelectedTime | null {
        const m = /^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:\s*(\S+))?$/.exec(text.trim());
        if (!m) return null;
        let hour = Number(m[1]);
        const minute = Number(m[2]);
        const second = m[3] != null ? Number(m[3]) : 0;
        if (minute > 59 || second > 59) return null;
        if (m[4] != null) {
            const marker = m[4].toLowerCase();
            const isPm = marker === 'pm' || marker === String(this.labels.pm).toLowerCase();
            const isAm = marker === 'am' || marker === String(this.labels.am).toLowerCase();
            if ((!isPm && !isAm) || hour < 1 || hour > 12) return null;
            hour = (hour % 12) + (isPm ? 12 : 0);
        }
        if (hour > 23) return null;
        return { hour, minute, second, ampm: hour >= 12 ? 'pm' : 'am' };
    }

    /**
     * Set the committed selection from a value string — the `value` attribute
     * (also the `form.reset()` default) and the `value` property. Accepts what the
     * picker writes into its input (the `dateFormatMask` / `timeFormatMask` form)
     * and the ISO form it submits:
     * - single: `2026-06-10`; datetime: `2026-06-10 14:30` / `2026-06-10T14:30`; time: `14:30`
     * - range: two dates with anything (no digits) between — `start - end`, `start/end`,
     *   `start – end`, `start to end`; several ranges joined by `, `
     * - multiple: dates and ranges joined by `,`
     *
     * Synchronous; runs no callbacks and fires no events. `''` clears. An
     * unparseable value clears the selection and returns `false` (the caller warns).
     */
    setSelectionFromText(text: string): boolean {
        const value = (text ?? '').trim();
        const pm = this.options.pickerMode;
        const sm = this.options.selectionMode;
        const parseRange = (s: string): DateRange | null => {
            const pair = this.findDatePair(s);
            if (!pair) return null;
            const [a, b] = pair;
            return a <= b ? { start: a, end: b } : { start: b, end: a };
        };

        let date: Date | null = null;
        let time: SelectedTime | null = null;
        let ranges: DateRange[] = [];
        const dates: Date[] = [];
        let isValid = true;
        if (value) {
            if (pm === 'time') {
                time = this.parseTimeText(value);
                isValid = !!time;
            } else if (pm === 'datetime') {
                const m = /^(\S+)[T\s]+(.+)$/.exec(value);
                date = m ? this.parseDateText(m[1]) : null;
                time = m ? this.parseTimeText(m[2]) : null;
                isValid = !!date && !!time;
            } else if (sm === 'range') {
                const pieces = value.split(',').map((s) => parseRange(s.trim()));
                isValid = pieces.every((r) => r !== null);
                ranges = pieces as DateRange[];
            } else if (sm === 'multiple') {
                for (const piece of value.split(',').map((s) => s.trim())) {
                    const d = this.parseDateText(piece);
                    const r = d ? null : parseRange(piece);
                    if (r) ranges.push(r);
                    else if (d) dates.push(d);
                    else isValid = false;
                }
            } else {
                date = this.parseDateText(value);
                isValid = !!date;
            }
        }

        Selection.clearSelection(this);
        if (isValid && value) {
            if (pm === 'time') this._selectedTime = time;
            else if (pm === 'datetime') { this._selectedDate = date; this._selectedTime = time; }
            else if (sm === 'range') {
                this._selectedStartDate = new Date(ranges[0].start);
                this._selectedEndDate = new Date(ranges[ranges.length - 1].end);
                this._selectedRanges = ranges.length > 1 ? ranges.map((r) => ({ start: new Date(r.start), end: new Date(r.end) })) : [];
            } else if (sm === 'multiple') { this._selectedRanges = ranges; this._selectedDates = dates; }
            else this._selectedDate = date;
            // Show the month of the (first) selected date.
            const anchor = date ?? ranges[0]?.start ?? dates[0] ?? null;
            if (anchor && pm !== 'time') {
                this._monthDates = this._monthDates.map((_, i) => new Date(anchor.getFullYear(), anchor.getMonth() + i, 1));
            }
        }
        Selection.storeCommittedSnapshot(this);
        this.syncInputFromSelection();
        this.summaryOverride = null;
        // Silent, month-change included: callers are the app's own `value` assignment and
        // a form reset (a native form.reset() fires nothing). The render re-baselines.
        this.isMonthChangeSilent = true;
        try {
            this.renderCalendar();
        } finally {
            this.isMonthChangeSilent = false;
        }
        this.updateSummary();
        return isValid;
    }

    formatDate(date: Date | null): string {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Use configured format
        const { separator, parts } = this.formatInfo;
        const values: (string | number)[] = [];

        // Build array in correct order
        for (let i = 0; i < 3; i++) {
            if (parts.year && parts.year.index === i) {
                values.push(parts.year.length === 2 ? String(year).slice(-2) : year);
            } else if (parts.month && parts.month.index === i) {
                values.push(month);
            } else if (parts.day && parts.day.index === i) {
                values.push(day);
            }
        }

        const datePart = values.join(separator);

        // Time mode: time only. Datetime mode: date + space + time. Date mode: date only.
        // Time portion is sourced from this._selectedTime — `date` only supplies Y/M/D.
        if (this.options.pickerMode === 'time') {
            return this.formatTime(this._selectedTime);
        }
        if (this.options.pickerMode === 'datetime') {
            return `${datePart} ${this.formatTime(this._selectedTime)}`;
        }
        return datePart;
    }

    /**
     * Format `selectedTime` parts using `timeFormatOptions`. Null fields render as 00
     * (or 12 for the hours roll in h12 mode, since the hour token is 1-12 there).
     * Only used when pickerMode is 'time' or 'datetime'.
     */
    formatTime(time: SelectedTime | null): string {
        const info = this.timeFormatOptions;
        const h24 = time?.hour ?? 0;
        const m = time?.minute ?? 0;
        const s = time?.second ?? 0;

        const pad = (n: number, len: number) => String(n).padStart(len, '0');

        let formatted = info.format;

        if (info.parts.hours) {
            const len = info.parts.hours.length;
            const value = info.is12Hour ? this.toDisplayHour(h24) : h24;
            formatted = formatted.replace(len === 2 ? /HH|hh/ : /H|h/, pad(value, len));
        }
        if (info.parts.minutes) {
            const len = info.parts.minutes.length;
            formatted = formatted.replace(len === 2 ? /mm/ : /m/, pad(m, len));
        }
        if (info.parts.seconds) {
            const len = info.parts.seconds.length;
            formatted = formatted.replace(len === 2 ? /ss/ : /s/, pad(s, len));
        }
        if (info.parts.ampm) {
            const label = h24 >= 12 ? this.labels.pm : this.labels.am;
            formatted = formatted.replace(/a/, label);
        }

        return formatted;
    }

    /** Convert 0-23 hour to 1-12 display hour (12-hour clock). */
    toDisplayHour(h24: number): number {
        const mod = h24 % 12;
        return mod === 0 ? 12 : mod;
    }

    // Reactive getters/setters for programmatic control

    /**
     * Get calendar open state (floating mode only)
     */
    get isOpen(): boolean {
        return this.calendar.classList.contains('drp__picker--visible');
    }

    /**
     * Set calendar open state (floating/modal modes only)
     */
    set isOpen(value: boolean) {
        if (this.options.positioningMode === 'inline') {
            drpLogger.warn('isOpen property does not apply to inline mode');
            return;
        }
        if (value) {
            this.open();
        } else {
            this.close();
        }
    }

    /**
     * The selection as ranges. Range mode: always the committed selection — the
     * independent ranges when several were committed (callback `adjustedRanges` or
     * an assigned array), the enabled pieces under `disabledDatesHandling: 'split'`,
     * otherwise the plain `[{ start, end }]`; `[]` when nothing is selected.
     * Multiple mode: its independent ranges (single dates are in `selectedDates`).
     * Assigning replaces the selection — what you assign reads back.
     */
    get selectedRanges(): DateRange[] {
        if (this._selectedRanges.length > 0) return this.independentRanges;
        if (this.options.selectionMode === 'range' && this._selectedStartDate && this._selectedEndDate) {
            if (this.options.disabledDatesHandling === 'split') {
                return this.splitRangeByDisabled(this._selectedStartDate, this._selectedEndDate);
            }
            return [{ start: new Date(this._selectedStartDate), end: new Date(this._selectedEndDate) }];
        }
        return [];
    }

    /**
     * The independently committed ranges only (`[]` for a plain start..end range).
     * @internal Selection snapshot for a rebuild — the envelope is snapshotted
     * separately so a plain / split range is restored as one range, not as pieces.
     */
    get independentRanges(): DateRange[] {
        return this._selectedRanges.map(r => ({ start: new Date(r.start), end: new Date(r.end) }));
    }

    set selectedRanges(ranges: DateRange[]) {
        // Programmatic selection change supersedes any pinned summary override.
        this.summaryOverride = null;
        // For multiple mode: store in selectedRanges array
        this._selectedRanges = ranges.map(r => ({
            start: new Date(r.start),
            end: new Date(r.end)
        }));

        // Clear invalid range state (programmatic selection clears any previous invalid state)
        this.invalidRangeStart = null;
        this.invalidRangeEnd = null;

        // Clear focus state (programmatic selection should clear keyboard focus)
        this.focusedDayIndex = null;

        // For range mode: derive the envelope (first start .. last end) so the
        // read-only selectedStartDate/selectedEndDate and the input stay correct
        // whether one range or many were assigned.
        if (this.options.selectionMode === 'range' && this._selectedRanges.length > 0) {
            const first = this._selectedRanges[0];
            const last = this._selectedRanges[this._selectedRanges.length - 1];
            this._selectedStartDate = new Date(first.start);
            this._selectedEndDate = new Date(last.end);

            // Update input value for range mode
            if (this.input && !this.stagesSelection()) {
                this.input.value = this._selectedRanges.length > 1
                    ? this._selectedRanges.map(r => `${this.formatDate(r.start)} - ${this.formatDate(r.end)}`).join(', ')
                    : `${this.formatDate(this._selectedStartDate)} - ${this.formatDate(this._selectedEndDate)}`;
            }
        } else if (this.options.selectionMode === 'multiple') {
            // Multiple mode: the input carries the selection count (as a pick does);
            // leaving it empty made the next open() re-sync from '' and wipe the
            // assigned selection (FINDINGS #25).
            this.writeMultipleInputText();
        } else if (this.input && !this.stagesSelection()) {
            // Clear input if no ranges or not in range mode
            this.input.value = '';
        }

        this.renderCalendar();
        this.updateSummary();
    }

    /** Multiple mode: write the committed selection count ("N selection(s)", '' when none) into the input. */
    private writeMultipleInputText() {
        if (!this.input) return;
        const count = this._selectedDates.length + this._selectedRanges.length;
        this.input.value = count > 0 ? formatLabel(this.labels.selectionCount, { count }) : '';
    }

    /**
     * Write the committed selection into the input as the current mode formats it
     * ('' when nothing is committed) — so the input always shows what the picker
     * holds. Used after a selection/picker-mode flip, where the old text was
     * formatted for the old mode.
     */
    syncInputFromSelection(): void {
        if (!this.input) return;
        const pm = this.options.pickerMode;
        const sm = this.options.selectionMode;
        if (pm === 'time') {
            this.input.value = this._selectedTime ? this.formatTime(this._selectedTime) : '';
        } else if (sm === 'multiple') {
            this.writeMultipleInputText();
        } else if (sm === 'range') {
            this.input.value = this._selectedStartDate && this._selectedEndDate ? Selection.formatRangeInput(this) : '';
        } else {
            this.input.value = this._selectedDate ? this.formatDate(this._selectedDate) : '';
        }
    }

    /**
     * Get/set selected individual dates (for multiple mode)
     */
    get selectedDates(): Date[] {
        return this._selectedDates.map(d => new Date(d));
    }

    set selectedDates(dates: Date[]) {
        this.summaryOverride = null;
        this._selectedDates = dates.map(d => new Date(d));
        // Write the input text like a pick does, so the next open() (which re-syncs
        // from the input) keeps the assigned dates (FINDINGS #25).
        if (this.options.selectionMode === 'multiple') this.writeMultipleInputText();
        this.renderCalendar();
        this.updateSummary();
    }

    /**
     * Get/set single selected date (single mode)
     */
    get selectedDate(): Date | null {
        return this._selectedDate ? new Date(this._selectedDate) : null;
    }

    set selectedDate(date: Date | null) {
        this.summaryOverride = null;
        this._selectedDate = date ? new Date(date) : null;
        if (this.input && date) {
            this.input.value = this.formatDate(date);
        } else if (this.input) {
            this.input.value = '';
        }
        this.renderCalendar();
        this.updateSummary();
    }

    /** True while a selection is staged but not yet committed (Apply-button mode). */
    get hasPendingSelection(): boolean {
        return this.pendingSelection != null;
    }

    /** Committed range start (read-only; set a range via `selectedRanges`). */
    get selectedStartDate(): Date | null {
        return this._selectedStartDate ? new Date(this._selectedStartDate) : null;
    }

    /** Committed range end (read-only; set a range via `selectedRanges`). */
    get selectedEndDate(): Date | null {
        return this._selectedEndDate ? new Date(this._selectedEndDate) : null;
    }

    /** Committed time parts (time / datetime modes). */
    get selectedTime(): SelectedTime | null {
        return this._selectedTime ? { ...this._selectedTime } : null;
    }

    set selectedTime(time: SelectedTime | null) {
        this.summaryOverride = null;
        this._selectedTime = time ? { ...time } : null;
        if (this.input) {
            const composed = this.selectedDatetime;
            this.input.value = composed ? this.formatDate(composed) : '';
        }
        this.renderCalendar();
        this.updateSummary();
    }

    /**
     * Composed date+time value, derived from `selectedDate` (Y/M/D) and
     * `selectedTime` (H/M/S). Returns null in date mode (use `selectedDate`
     * instead) and in datetime mode when no date has been committed yet.
     *
     * In `time` mode the date portion is anchored to today.
     */
    get selectedDatetime(): Date | null {
        const mode = this.options.pickerMode;
        if (mode === 'date') return this._selectedDate ? new Date(this._selectedDate) : null;
        const t = this._selectedTime;
        const h = t?.hour ?? 0;
        const m = t?.minute ?? 0;
        const s = t?.second ?? 0;
        if (mode === 'time') {
            const d = new Date();
            d.setHours(h, m, s, 0);
            return d;
        }
        // datetime — both parts required (date drives the anchor)
        if (!this._selectedDate) return null;
        const d = new Date(this._selectedDate);
        d.setHours(h, m, s, 0);
        return d;
    }

    /**
     * Set the composed value from a full datetime (Date or ISO string) — the shape
     * you get back from an API/DB. Splits internally: the Y/M/D drives `_selectedDate`
     * (ignored in `time` mode), the H/M/S drives `_selectedTime` (ignored in `date`
     * mode). Pass null to clear both.
     */
    set selectedDatetime(value: Date | string | null) {
        this.summaryOverride = null;
        if (value === null) {
            this._selectedDate = null;
            this._selectedTime = null;
        } else {
            const d = Validation.normalizeDate(value, true); // preserveTime
            if (d) {
                const mode = this.options.pickerMode;
                if (mode !== 'time') {
                    this._selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                }
                if (mode !== 'date') {
                    const h = d.getHours();
                    this._selectedTime = {
                        hour: h,
                        minute: d.getMinutes(),
                        second: d.getSeconds(),
                        ampm: h >= 12 ? 'pm' : 'am',
                    };
                }
            }
        }
        if (this.input) {
            const composed = this.selectedDatetime;
            this.input.value = composed ? this.formatDate(composed) : '';
        }
        this.renderCalendar();
        this.updateSummary();
    }

    /**
     * Run one action-item activation through core `runAction` (SPEC §12.12):
     * `beforeActionCallback` → item `onClick` → built-in behaviour → `action`
     * event (`onAction`) — a notification after the fact. A footer button maps back to its item; consumer HTML
     * (`data-action="custom" data-id="…"` in a message / summary / custom render)
     * gets a synthetic item. `data-action` may also name a built-in (`today`, …).
     */
    private async activateAction(trigger: HTMLElement, sourceEvent?: Event): Promise<void> {
        const configured = this.actionButtonItems.get(trigger);
        const action = (configured?.action ?? trigger.dataset.action ?? 'custom') as DateRangePickerAction | 'custom';
        // Locks: every action is an 'actions' interaction; the selection built-ins
        // additionally respect the 'selection' lock.
        if (this.isAspectLocked('actions')) return;
        if ((action === 'today' || action === 'now' || action === 'clear') && this.isAspectLocked('selection')) return;

        const id = configured?.id ?? trigger.dataset.id;
        const item: DateRangePickerActionItem = configured ?? { action, id, text: trigger.textContent?.trim() ?? '' };
        const source: ActionSource = configured ? 'action-buttons'
            : trigger.closest('.drp__message') ? 'message'
            : trigger.closest('.drp__summary') ? 'summary'
            : 'calendar';
        const detail = this.ctx({
            action, id, item, source, sourceEvent, triggerElement: trigger,
            // Configured buttons carry no consumer data-*; HTML triggers bring their own.
            dataset: configured ? {} : readActionDataset(trigger),
        }) as DateRangePickerActionEventDetail;

        await runAction({
            detail,
            beforeActionCallback: this.options.beforeActionCallback,
            emitAction: (d) => this.options.onAction?.(d),
            runBuiltIn: (d) => this.runBuiltInAction(d.action),
        });
    }

    /** The built-in behaviour of a footer action (no-op for custom actions). */
    private runBuiltInAction(action: DateRangePickerAction | 'custom'): void {
        if (action === 'today') this.selectToday();
        else if (action === 'now') this.selectNow();
        else if (action === 'clear') this.clearSelection();
        else if (action === 'apply') this.commit();
    }

    /**
     * Mark this picker as the keyboard-active one. Broadcasts to other pickers
     * on the page so they deactivate — only one picker responds to arrow keys
     * at a time, even though the keydown listener lives on `document`.
     */
    setCalendarActive() {
        if (this.isCalendarActive) return; // already active, don't re-broadcast
        this.isCalendarActive = true;
        document.dispatchEvent(new CustomEvent(DateRangePickerEngine.ACTIVE_EVENT, { detail: this }));
    }

    static readonly ACTIVE_EVENT = 'drp-picker-activated';

    /**
     * Deactivate while the host element is out of the DOM (a DOM move, or a removal
     * that may be followed by re-insertion). Stops every document/window-level
     * resource — outside-click / scroll / keydown listeners, the overlay-group
     * registration, the floating autoUpdate anchor, an open sheet's body scroll lock
     * and Back trap — but keeps ALL state: selection, staged picks, displayed months
     * and the open flag. {@link activate} restarts them. Idempotent.
     */
    deactivate() {
        if (this.isSuspended) return;
        this.isSuspended = true;

        this.clickEvents.suspend();
        document.removeEventListener(DateRangePickerEngine.ACTIVE_EVENT, this.onAnotherPickerActivated);
        if (this.onDocumentKeydown) document.removeEventListener('keydown', this.onDocumentKeydown);
        this.hideTooltip();

        // Park the Back trap WITHOUT popping history (a move must not navigate), then
        // tear down the open chrome while keeping the --visible flag.
        this.suspendedOverlayHistory = this.overlayHistoryActive;
        if (this.overlayHistoryActive) {
            this.overlayHistoryActive = false;
            if (typeof window !== 'undefined' && this.onOverlayPopstate) {
                window.removeEventListener('popstate', this.onOverlayPopstate);
            }
        }
        this.suspendedModalRestoreFocus = !!(this as any).modalRestoreFocus;
        const openOverlay = this.options.positioningMode !== 'inline' &&
            this.calendar.classList.contains('drp__picker--visible');
        if (openOverlay) {
            (this as any).modalRestoreFocus = false; // detached — nothing to refocus
            UI.teardownPresentationChrome(this);
        } else {
            UI.cleanupPositioning(this);
        }
    }

    /** Re-activate after {@link deactivate} (the host is back in the DOM). Idempotent. */
    activate() {
        if (!this.isSuspended) return;
        this.isSuspended = false;

        this.clickEvents.resume();
        document.addEventListener(DateRangePickerEngine.ACTIVE_EVENT, this.onAnotherPickerActivated);
        if (this.onDocumentKeydown) document.addEventListener('keydown', this.onDocumentKeydown);

        const isOpen = this.options.positioningMode !== 'inline' &&
            this.calendar.classList.contains('drp__picker--visible');
        if (isOpen) {
            // Re-arm the parked Back trap first so the chrome doesn't push a second entry.
            if (this.suspendedOverlayHistory && typeof window !== 'undefined' && this.onOverlayPopstate) {
                this.overlayHistoryActive = true;
                window.addEventListener('popstate', this.onOverlayPopstate);
            }
            // Re-opens the calendar popover too (anchor, overlay tree — dismissing the
            // group's other overlays — and the scroll / resize close).
            UI.applyPresentationChrome(this);
            (this as any).modalRestoreFocus = this.suspendedModalRestoreFocus;
        } else if (this.suspendedOverlayHistory) {
            // Parked trap but no longer open — drop it (the entry is harmless).
            this.overlayHistoryActive = false;
        }
        this.suspendedOverlayHistory = false;
        this.suspendedModalRestoreFocus = false;
    }

    destroy() {
        // Unsubscribe from all event subscriptions
        this.clickSubscriptions.forEach(sub => sub.unsubscribe());
        this.clickSubscriptions = [];

        // Remove active loaders (runs a render hook's cleanup)
        for (const target of Object.keys(this.loaders) as LoaderTarget[]) UI.hideLoader(this, target);

        // Destroy the click event manager
        this.clickEvents.destroy();

        // Stop listening for cross-picker activation broadcasts + keyboard navigation
        document.removeEventListener(DateRangePickerEngine.ACTIVE_EVENT, this.onAnotherPickerActivated);
        if (this.onDocumentKeydown) document.removeEventListener('keydown', this.onDocumentKeydown);
        this.onDocumentKeydown = null;

        // Drop every input-element listener at once. The input is reused across a
        // rebuild, so leaving these attached would let a destroyed picker's open()
        // and mask/keydown handlers keep firing on the shared input (a zombie
        // floating picker reopening after a positioning-mode flip).
        this.inputListenersAbort.abort();

        // Destroy action button tooltips
        this.destroyAllActionButtonTooltips();

        // Tear down positioning/overlay chrome BEFORE removing the calendar. If a
        // modal/full-screen sheet is open we must run its full exit (unlock body
        // scroll, drop the header, pop the Back-trap history entry, detach keyboard
        // tracking) — but ONLY when open, or exitModal/exitFullscreen would unlock a
        // scroll lock that was never taken and corrupt the ref count. When closed,
        // cleanupPositioning alone stops any floating autoUpdate leaking onto the
        // detached calendar (the rebuild-while-open drift guard).
        // Detach Back-gesture handling WITHOUT popping history — a teardown (attribute
        // rebuild, DOM move) must not trigger navigation. Any same-URL entry we pushed
        // is harmless. Done before teardownPresentationChrome() so exitFullscreen's
        // popOverlayHistory() no-ops. (Kept parallel with web-multiselect's destroy().)
        if (this.overlayHistoryActive) {
            this.overlayHistoryActive = false;
            if (typeof window !== 'undefined' && this.onOverlayPopstate) {
                window.removeEventListener('popstate', this.onOverlayPopstate);
            }
        }
        // A deactivated picker already tore its chrome down (running it again would
        // double-release the body scroll lock).
        const openOverlay = !this.isSuspended && this.options.positioningMode !== 'inline' &&
            this.calendar.classList.contains('drp__picker--visible');
        if (openOverlay) UI.teardownPresentationChrome(this);
        else UI.cleanupPositioning(this);
        this.isSuspended = false;

        this.calendar.remove();
        if (this.tooltip) {
            this.tooltip.remove();
        }
        if ((this as any).modalBackdrop) {
            (this as any).modalBackdrop.remove();
            (this as any).modalBackdrop = null;
        }
    }

    // UI methods - wrappers for pure functions
    open() { return UI.open(this); }
    close() { return UI.close(this); }
    /**
     * Swap the runtime presentation (`floating` | `modal` | `fullscreen`) in place —
     * no rebuild, selection preserved. Driven by the web component's device
     * environment hook; a no-op for inline pickers and when unchanged.
     */
    setPresentation(next: 'floating' | 'modal' | 'fullscreen') { return UI.setPresentation(this, next); }
    /**
     * Presentation render-context flags (core `createPresentationContext`, rc08) spread
     * into every render-facing callback context so a single callback can vary its
     * output between the desktop popover and the phone full-screen sheet — e.g.
     * `renderDayCallback: ({ isFullscreen }) => …`. Reflects the OPEN chrome.
     */
    presentationCtx(): PresentationContext { return createPresentationContext(this.presentation); }

    /**
     * Attach the picker context (core interaction model) to `fields`: `controller` +
     * `element` (non-enumerable — `JSON.stringify` / logs see only the data) and the
     * presentation flags. Every callback ctx and event detail goes through here.
     */
    ctx<T extends object>(fields: T): T & PickerContext {
        const element = this.options.hostElement ?? this.input ?? this.calendar;
        const controller = this.options.controller ?? this.getController();
        return withComponentContext(fields, controller, element, this.presentationCtx()) as T & PickerContext;
    }
    /**
     * True on pointing devices that can hover (desktop mouse). Touch-primary
     * devices — phones in the full-screen sheet, tablets — report `(hover: none)`;
     * there day/badge tooltips can't appear on mouseenter, so they toggle on tap
     * instead (see the badge branch in `attachCalendarListeners`). Core's environment
     * snapshot (`canHover`), the same signal the presentation ladder reads.
     */
    supportsHover(): boolean {
        return getEnvironment().canHover;
    }
    toggle() { return UI.toggle(this); }
    position() { return UI.position(this); }
    showTooltip(element: HTMLElement, content: string) { return UI.showTooltip(this, element, content); }
    hideTooltip() { return UI.hideTooltip(this); }
    /** Bumped by every public showMessage — lets beforeSelectCallback detect a message the consumer showed. */
    messageSeq = 0;
    /** Show a message; `opts.type` styles it (omit for raw-HTML content), `opts.autoHideMs` hides it after that many ms. */
    showMessage(content: string, opts?: ShowMessageOptions) { this.messageSeq++; return UI.showMessage(this, content, opts?.type, opts?.autoHideMs); }
    hideMessage() { return UI.hideMessage(this); }
    showSummary(content: string) { return UI.showSummary(this, content); }
    hideSummary() { return UI.hideSummary(this); }
    refreshSummary() { return Rendering.updateSummary(this); }
    showLoader(target?: LoaderTarget) { return UI.showLoader(this, target); }
    hideLoader(target?: LoaderTarget) { return UI.hideLoader(this, target); }

    // Lock methods - scoped read-only. lock()/unlock() with no arg act on every aspect.
    lock(aspects?: LockAspect | LockAspect[]) { return Lock.lock(this, aspects); }
    unlock(aspects?: LockAspect | LockAspect[]) { return Lock.unlock(this, aspects); }
    toggleLock(aspects?: LockAspect | LockAspect[]) {
        // No-arg toggles the whole lock (on if anything is locked → off, else on).
        // With an argument, toggles exactly the named aspect(s).
        const list = aspects === undefined ? Lock.ALL_LOCK_ASPECTS : (Array.isArray(aspects) ? aspects : [aspects]);
        const anyLocked = list.some(a => this._lockedAspects.has(a));
        return anyLocked ? Lock.unlock(this, aspects) : Lock.lock(this, aspects);
    }
    isAspectLocked(aspect: LockAspect): boolean { return Lock.isAspectLocked(this, aspect); }
    /** The currently locked aspects (read-only snapshot). */
    get lockedAspects(): LockAspect[] { return Array.from(this._lockedAspects); }
    /** Full-lock convenience: `true` when every aspect is locked; setting it locks/unlocks all. */
    get readonly(): boolean { return Lock.ALL_LOCK_ASPECTS.every(a => this._lockedAspects.has(a)); }
    set readonly(value: boolean) { if (value) Lock.lock(this); else Lock.unlock(this); }

    // Rendering methods - wrappers for pure functions
    renderCalendar() {
        const result = Rendering.renderCalendar(this);
        this.notifyMonthChange();
        return result;
    }

    /** Visible months at the last `month-change` check (`null` until the first render). */
    private lastVisibleMonthsKey: string | null = null;
    /** While set, a render records the new visible months as the baseline without firing `onMonthChange`. */
    private isMonthChangeSilent = false;

    /**
     * Fire `onMonthChange` when the visible months differ from the last render.
     * Every navigation path (buttons, keyboard, rolling selectors, unified nav,
     * programmatic) ends in a render, so detecting it here can't miss one. The
     * first render only records the baseline.
     */
    private notifyMonthChange(): void {
        const months: Date[] = this._monthDates ?? [];
        const key = months.map((m) => `${m.getFullYear()}-${m.getMonth()}`).join('|');
        const previous = this.lastVisibleMonthsKey;
        this.lastVisibleMonthsKey = key;
        if (previous === null || previous === key || this.isMonthChangeSilent || !this.options.onMonthChange) return;
        const before = previous.split('|');
        const changed = Math.max(0, months.findIndex((m, i) => before[i] !== `${m.getFullYear()}-${m.getMonth()}`));
        const monthIndex = this.options.isUnifiedNavigationEnabled ? (this.options.unifiedNavigationAnchorIndex ?? 0) : changed;
        const column = months[monthIndex] ?? months[0];
        if (!column) return;
        this.options.onMonthChange(this.ctx({
            monthIndex,
            year: column.getFullYear(),
            month: column.getMonth(),
            visibleMonths: months.map((m) => ({ year: m.getFullYear(), month: m.getMonth() })),
        }));
    }
    renderNormalView(monthIndex: number) { return Rendering.renderNormalView(this, monthIndex); }
    renderDays(monthIndex: number, date: Date) { return Rendering.renderDays(this, monthIndex, date); }
    renderRollingSelector(monthIndex: number) { return Rendering.renderRollingSelector(this, monthIndex); }
    updateSummary() { return Rendering.updateSummary(this); }
    updateSummaryWithPreview() { return Rendering.updateSummaryWithPreview(this); }
    updateDragPreview() { return Rendering.updateDragPreview(this); }
    updateHoverPreview() { return Rendering.updateHoverPreview(this); }

    // Navigation methods - wrappers for pure functions
    toggleRollingSelector(monthIndex: number) { return Navigation.toggleRollingSelector(this, monthIndex); }
    selectYear(year: number, monthIndex: number) { return Navigation.selectYear(this, year, monthIndex); }
    selectMonth(month: number, monthIndex: number) { return Navigation.selectMonth(this, month, monthIndex); }
    checkAndResolveCollisions(changedIdx: number) { return Navigation.checkAndResolveCollisions(this, changedIdx); }
    prevMonth(monthIndex: number) { return Navigation.prevMonth(this, monthIndex); }
    nextMonth(monthIndex: number) { return Navigation.nextMonth(this, monthIndex); }

    // Unified navigation methods
    unifiedPrevMonth() { return Navigation.unifiedPrevMonth(this); }
    unifiedNextMonth() { return Navigation.unifiedNextMonth(this); }
    toggleUnifiedRollingSelector() { return Navigation.toggleUnifiedRollingSelector(this); }
    setUnifiedMonth(month: number) { return Navigation.setUnifiedMonth(this, month); }
    setUnifiedYear(year: number) { return Navigation.setUnifiedYear(this, year); }

    findNextEnabledDayIndex(startIndex: number, offset: number, days: NodeListOf<Element>, monthIndex: number) { return Navigation.findNextEnabledDayIndex(this, startIndex, offset, days, monthIndex); }
    moveFocus(offset: number) { return Navigation.moveFocus(this, offset); }

    // Selection methods - wrappers for pure functions
    async selectDay(dayElement: HTMLElement) { return await Selection.selectDay(this, dayElement); }
    selectToday() { return Selection.selectToday(this); }
    clearSelection() { return Selection.clearSelection(this); }
    /** Commit the staged selection (what the Apply button / `commit-mode="manual"` app does). */
    commit() { return Selection.commit(this); }

    /**
     * The engine's own facade (see {@link DateRangePickerController}), memoized.
     * Contexts use the host's controller when one was passed (`options.controller`,
     * set by `<web-daterangepicker>` so it survives rebuilds); this is the fallback
     * for a standalone engine.
     */
    getController(): DateRangePickerController {
        const picker = this;
        return (this._controller ??= {
            get selectedDate() { return picker.selectedDate; },
            get selectedDates() { return picker.selectedDates; },
            get selectedRanges() { return picker.selectedRanges; },
            get selectedStartDate() { return picker.selectedStartDate; },
            get selectedEndDate() { return picker.selectedEndDate; },
            get selectedTime() { return picker.selectedTime; },
            get selectedDatetime() { return picker.selectedDatetime; },
            get isOpen() { return picker.isOpen; },
            selectToday: () => { picker.selectToday(); },
            selectNow: () => { picker.selectNow(); },
            clearSelection: () => { picker.clearSelection(); },
            commit: () => { picker.commit(); },
            open: () => { picker.open(); },
            close: () => { picker.close(); },
            toggle: () => { picker.toggle(); },
            setPresentation: (next) => { picker.setPresentation(next); },
            prevMonth: (monthIndex = picker.activeMonthIndex) => { picker.prevMonth(monthIndex); },
            nextMonth: (monthIndex = picker.activeMonthIndex) => { picker.nextMonth(monthIndex); },
            lock: (aspects) => { picker.lock(aspects); },
            unlock: (aspects) => { picker.unlock(aspects); },
            showMessage: (content, opts) => { picker.showMessage(content, opts); },
            hideMessage: () => { picker.hideMessage(); },
            showSummary: (content) => { picker.showSummary(content); },
            hideSummary: () => { picker.hideSummary(); },
            showLoader: (target) => { picker.showLoader(target); },
            reloadMonthData: () => picker.reloadMonthData(),
            hideLoader: (target) => { picker.hideLoader(target); },
        });
    }
    selectHour(hour: number, is12Hour: boolean) { return Selection.selectHour(this, hour, is12Hour); }
    selectMinute(minute: number) { return Selection.selectMinute(this, minute); }
    selectSecond(second: number) { return Selection.selectSecond(this, second); }
    selectAmpm(ampm: 'am' | 'pm') { return Selection.selectAmpm(this, ampm); }
    selectClockHour(hour: number, is12Hour: boolean) { return Selection.selectClockHour(this, hour, is12Hour); }
    selectClockMinute(minute: number) { return Selection.selectClockMinute(this, minute); }
    setClockStep(step: 'hours' | 'minutes') { return Selection.setClockStep(this, step); }
    scrollWheelItemToCenter(el: HTMLElement) { return Selection.scrollWheelItemToCenter(this, el); }
    commitWheelScroll(col: HTMLElement, listKey: string) { return Selection.commitWheelScroll(this, col, listKey); }
    beginCompactEdit(el: HTMLElement) { return Selection.beginCompactEdit(this, el); }
    selectNow() { return Selection.selectNow(this); }

    // Interaction methods - wrappers for pure functions
    initDragListeners() { return Interaction.initDragListeners(this); }
    handleStartDrag(event: PointerEvent, type: 'start' | 'end', dayElement: HTMLElement) { return Interaction.startDrag(this, event, type, dayElement); }
    handleDragMove(event: PointerEvent) { return Interaction.onDragMove(this, event); }
    async onDragEnd(event: PointerEvent) { return await Interaction.onDragEnd(this, event); }
    findNearestEnabledDate(targetDate: Date, preferredDirection: string = 'forward') { return Interaction.findNearestEnabledDate(this, targetDate, preferredDirection); }
    handleInputMask(event: Event) { return Interaction.handleInputMask(this, event); }
    applyMask(value: string) { return Interaction.applyMask(this, value); }
    applyRangeMask(value: string) { return Interaction.applyRangeMask(this, value); }
    handleKeydown(event: KeyboardEvent) { return Interaction.handleKeydown(this, event); }
    handlePaste(event: ClipboardEvent) { return Interaction.handlePaste(this, event); }
    updateCalendarFromInput() { return Interaction.updateCalendarFromInput(this); }
    parseAndUpdateSingleDate(value: string, dateType: string = 'single') { return Interaction.parseAndUpdateSingleDate(this, value, dateType); }

    /**
     * Inject global styles for the date picker
     *
     * This is a helper method for when you're using the DateRangePicker class directly
     * (not the web component). The web component automatically injects styles into its
     * Shadow DOM, but the base class expects global CSS to be loaded.
     *
     * Call this once before creating any DateRangePicker instances if you want to
     * inject styles programmatically instead of importing the CSS file.
     *
     * @param _force - Ignored (kept for the signature): adopting is idempotent
     *
     * @example
     * ```typescript
     * import { DateRangePicker } from '@keenmate/web-daterangepicker';
     *
     * // Inject styles once
     * DateRangePicker.injectGlobalStyles();
     *
     * // Then create pickers
     * const picker = new DateRangePicker(inputElement, options);
     * ```
     */
    static injectGlobalStyles(_force: boolean = false): void {
        // Core adoptStyles(): one cached, shared constructable sheet on the document
        // (a <style> fallback where unsupported); idempotent, so `force` is moot.
        adoptStyles(document, styles);
        drpLogger.info('Global styles adopted');
    }

    /**
     * Check if styles appear to be loaded
     *
     * This is a helper method that attempts to detect if date picker styles are loaded
     * by checking if the CSS custom property --drp-accent-color is defined.
     *
     * Note: This is a best-effort check and may not be 100% accurate.
     *
     * @returns true if styles appear to be loaded, false otherwise
     */
    static areStylesLoaded(): boolean {
        // Check if our custom property exists
        const testElement = document.createElement('div');
        testElement.className = 'drp__picker';
        testElement.style.display = 'none';
        document.body.appendChild(testElement);

        const styles = window.getComputedStyle(testElement);
        const accentColor = styles.getPropertyValue('--drp-accent-color');

        document.body.removeChild(testElement);

        return accentColor !== '';
    }
}

// Export the class
export { DateRangePickerEngine };
