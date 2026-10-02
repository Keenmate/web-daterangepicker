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

import type { DatePickerOptions, DateRange, FormatOptions, TimeFormatOptions, SelectedTime, MonthDisplay, DecoratedDate, DayMetadata, LocaleStrings, ActionButton, ActionButtonContext, LoaderTarget, LockAspect, CustomActionEventDetail, SelectEventDetail, DateRangePickerController } from './types';
import * as Validation from './date-picker-validation';
import * as Rendering from './date-picker-rendering';
import * as Navigation from './date-picker-navigation';
import * as Selection from './date-picker-selection';
import * as Interaction from './date-picker-interaction';
import * as UI from './date-picker-ui';
import * as Lock from './date-picker-lock';
import { resolveLocale, getLocaleStrings, getWeekdayNames, getMonthNames } from './date-picker-locales';
import { drpLogger, navigationLogger, enableLogging, disableLogging } from './logger';
import { createTooltip, type TooltipHandle } from '@keenmate/web-components-core/positioning';
import { presentationContext, registerOverlay, type PresentationContext, type OverlayHandle } from '@keenmate/web-components-core';
import { createScrollEventManager, createClickEventManager, type ScrollEventManager, type ClickEventManager, type ScrollSubscription, type ClickSubscription } from './modules';
// Import styles for static injection (only used when injectGlobalStyles is called)
import styles from './css/main.css?inline';


class DateRangePicker {
    // Static flag to track if styles have been injected
    private static stylesInjected: boolean = false;
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
    // Cross-component "one overlay open at a time" coordination (core). activate() on
    // open() dismisses every OTHER participating overlay (other datepickers, multiselects,
    // external popovers); our onDismiss closes this popover when another opens. This
    // supersedes the popover-closing that `drp-picker-activated` used to do — that event
    // now only carries the inline keyboard-active tracking below. Torn down in destroy().
    private overlayCoord: OverlayHandle | null = null;
    private readonly onAnotherPickerActivated = (e: Event) => {
        if ((e as CustomEvent).detail === this) return;
        // Inline keyboard-active tracking only: exactly one inline picker responds to
        // arrow keys at a time. Popover dismissal is handled by the core coordination
        // (see overlayCoord), which also crosses component types.
        this.isCalendarActive = false;
    };

    // Scoped read-only lock state. Empty = fully interactive. See date-picker-lock.ts.
    private _lockedAspects: Set<LockAspect> = new Set();

    // Async validation state
    private isValidating: boolean = false;
    // Active loaders keyed by target ('calendar' | 'message' | 'summary'); single instance per target.
    loaders: Partial<Record<LoaderTarget, HTMLElement | undefined>> = {};

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

    // Event managers (Pub/Sub pattern)
    scrollEvents: ScrollEventManager;
    clickEvents: ClickEventManager;
    private scrollSubscriptions: ScrollSubscription[] = [];
    private clickSubscriptions: ClickSubscription[] = [];
    /**
     * The concrete presentation of the OPEN calendar chrome (non-inline pickers):
     * `floating` popover, centered `modal`, or phone `fullscreen` overlay. Set from
     * the configured positioning mode and swapped in place by {@link setPresentation}
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

    // Week start and date restrictions
    private weekStartDay: number = 0; // 0 = Sunday, 1 = Monday, etc.
    private normalizedMinDate: Date | null = null;
    private normalizedMaxDate: Date | null = null;
    private normalizedDisabledDates: Set<string> = new Set(); // Store as 'YYYY-MM-DD' strings
    private normalizedSpecialDates: Map<string, DecoratedDate> = new Map(); // Store as 'YYYY-MM-DD' -> DecoratedDate

    // Internationalization
    locale: string = 'en';
    localeStrings: LocaleStrings;
    weekdayNames: string[] = [];
    monthNames: string[] = [];

    constructor(inputElement: HTMLInputElement | null, options: DatePickerOptions = {}) {
        this.input = inputElement;
        this.containerElement = options.container || document.body;
        this.options = {
            selectionMode: options.selectionMode || 'single',
            calendarPlacement: options.calendarPlacement || (options.monthLayout === 'grid' ? 'bottom' : 'bottom-start'),
            visibleMonthsCount: options.visibleMonthsCount || (options.selectionMode === 'range' ? 2 : 1),
            dateFormatMask: options.dateFormatMask || 'YYYY-MM-DD',
            calendarOpenTrigger: options.calendarOpenTrigger || 'focus',
            overlayGroup: options.overlayGroup || undefined,
            onSelect: options.onSelect || undefined,
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
            shouldHighlightDisabledInRange: options.shouldHighlightDisabledInRange !== undefined ? options.shouldHighlightDisabledInRange : true,
            locale: options.locale || 'auto',
            displayFormatMask: options.displayFormatMask,
            customStrings: options.customStrings,
            monthNames: options.monthNames,
            weekdayNames: options.weekdayNames,
            formatSummaryCallback: options.formatSummaryCallback,
            beforeDateSelectCallback: options.beforeDateSelectCallback,
            beforeMonthChangedCallback: options.beforeMonthChangedCallback,
            showDebugInfo: options.showDebugInfo || false,
            rollingYearRange: options.rollingYearRange,
            rollingMonthRange: options.rollingMonthRange,
            customStylesCallback: options.customStylesCallback,
            renderDayCallback: options.renderDayCallback,
            renderDayContentCallback: options.renderDayContentCallback,
            badgeTooltipCallback: options.badgeTooltipCallback,
            dayTooltipCallback: options.dayTooltipCallback,
            dateMember: options.dateMember,
            badgeTextMember: options.badgeTextMember,
            badgeClassMember: options.badgeClassMember,
            dayClassMember: options.dayClassMember,
            badgeTooltipMember: options.badgeTooltipMember,
            dayTooltipMember: options.dayTooltipMember,
            isDisabledMember: options.isDisabledMember,
            commitMode: options.commitMode || 'selection',
            shouldCloseOnScroll: options.shouldCloseOnScroll !== undefined ? options.shouldCloseOnScroll : true,
            actionButtons: options.actionButtons,
            isTodayButtonShown: options.isTodayButtonShown !== undefined ? options.isTodayButtonShown : true,
            isClearButtonShown: options.isClearButtonShown !== undefined ? options.isClearButtonShown : true,
            isSummaryShown: options.isSummaryShown !== undefined ? options.isSummaryShown : true,
            pickerMode: options.pickerMode || 'date',
            timeFormatMask: options.timeFormatMask || 'HH:mm',
            displayTimeFormatMask: options.displayTimeFormatMask,
            timeStep: options.timeStep && options.timeStep > 0 ? options.timeStep : 1,
            hourCycle: options.hourCycle,
            isSecondsShown: options.isSecondsShown,
            isNowButtonShown: options.isNowButtonShown !== undefined ? options.isNowButtonShown : true,
            timeDisplay: options.timeDisplay || 'rolls',
            fullscreenAutofocus: options.fullscreenAutofocus || false,
            fullscreenInput: options.fullscreenInput || false,
            fullscreenTitle: options.fullscreenTitle
        };

        // Runtime presentation of the OPEN calendar chrome, for non-inline pickers.
        // Defaults from the configured positioning mode; the web component may swap
        // it in place via setPresentation() as the device environment changes
        // (floating popover ⇄ centered modal ⇄ phone full-screen overlay).
        this.presentation = this.options.positioningMode === 'modal' ? 'modal' : 'floating';

        // Mode fallback enforcement — keep downstream code free of defensive checks.
        // pickerMode 'time'/'datetime' only support selectionMode 'single' in v1.
        if (this.options.pickerMode !== 'date' &&
            (this.options.selectionMode === 'range' || this.options.selectionMode === 'multiple')) {
            console.warn(`[web-daterangepicker] pickerMode="${this.options.pickerMode}" does not support selectionMode="${this.options.selectionMode}" yet. Falling back to "single".`);
            this.options.selectionMode = 'single';
            this.options.visibleMonthsCount = 1;
        }
        // pickerMode 'datetime' + monthLayout 'grid' — the time picker fights the grid for width.
        if (this.options.pickerMode === 'datetime' && this.options.monthLayout === 'grid') {
            console.warn('[web-daterangepicker] pickerMode="datetime" is incompatible with monthLayout="grid". Falling back to "horizontal".');
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
            console.warn(`[web-daterangepicker] timeDisplay="clock" requires (60 % timeStep === 0). Got timeStep=${this.options.timeStep}. Falling back to 1.`);
            this.options.timeStep = 1;
        }
        if (clockActive && this.options.isSecondsShown) {
            console.warn('[web-daterangepicker] timeDisplay="clock" does not support isSecondsShown; seconds will always be 00. Set timeDisplay="rolls" to pick seconds.');
            this.options.isSecondsShown = false;
        }
        // Multiple mode collects several dates, so it can't commit-and-close on each
        // pick — default it to `apply` (the Apply button is its commit path) unless the
        // caller set commitMode explicitly.
        if (this.options.selectionMode === 'multiple' && options.commitMode === undefined) {
            this.options.commitMode = 'apply';
        }
        // Time/datetime default to `apply` too, so each roll-click doesn't auto-commit
        // and close; honors an explicit caller value. `apply` renders the Apply button,
        // which is the only commit path once selection is staged.
        if (this.options.pickerMode !== 'date' && options.commitMode === undefined) {
            this.options.commitMode = 'apply';
        }

        // Enable/disable logging based on showDebugInfo option
        if (this.options.showDebugInfo) {
            enableLogging();
        } else {
            disableLogging();
        }

        // Validate anchor index is within bounds
        if (this.options.isUnifiedNavigationEnabled && this.options.unifiedNavigationAnchorIndex !== undefined) {
            const maxIndex = this.options.visibleMonthsCount - 1;
            if (this.options.unifiedNavigationAnchorIndex < 0 || this.options.unifiedNavigationAnchorIndex > maxIndex) {
                console.warn(`unifiedNavigationAnchorIndex (${this.options.unifiedNavigationAnchorIndex}) out of bounds. Using 0.`);
                this.options.unifiedNavigationAnchorIndex = 0;
            }
        }

        // Detect/set week start day
        this.weekStartDay = Validation.detectWeekStartDay(this.options.weekStartDay);
        drpLogger.debug('Week starts on day:', this.weekStartDay);
        drpLogger.debug('disabledDatesHandling:', this.options.disabledDatesHandling);

        // Initialize internationalization
        this.locale = resolveLocale(this.options.locale);
        this.localeStrings = getLocaleStrings(this.locale, this.options.customStrings);
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
        if (this.options.hourCycle === undefined) {
            this.options.hourCycle = this.timeFormatOptions.is12Hour ? 'h12' : 'h24';
        }
        if (this.options.isSecondsShown === undefined) {
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
        for (let i = 0; i < this.options.visibleMonthsCount; i++) {
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
        for (let i = 0; i < this.options.visibleMonthsCount; i++) {
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

        // Initialize event managers
        this.scrollEvents = createScrollEventManager();
        this.clickEvents = createClickEventManager();

        this.init();
    }

    init() {
        drpLogger.debug('Init called');
        this.createCalendar();

        // Initialize event managers
        this.scrollEvents.init();
        this.clickEvents.init(this.calendar, this.input);

        // Subscribe to events
        this.setupEventSubscriptions();

        // Listen for sibling pickers becoming active so this one can deactivate.
        // (The keydown listener lives on document, so without this, every picker
        // on the page would respond to arrow keys at once.)
        document.addEventListener(DateRangePicker.ACTIVE_EVENT, this.onAnotherPickerActivated);

        // Join the single-active-overlay group (scoped by `overlay-group`, default ungrouped):
        // when another KM overlay in the same group (or an external popover) opens, close this
        // calendar. open() broadcasts the reverse.
        this.overlayCoord = registerOverlay(() => this.close(), this.options.overlayGroup || undefined);

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

            // Call beforeMonthChangedCallback for initial month load
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
        // Subscribe to window scroll - close calendar when scrolling the page (floating mode only)
        const windowScrollSub = this.scrollEvents.subscribe('window', () => {
            if (this.presentation === 'floating' && this.isOpen) {
                // Check if scroll close is disabled globally
                if (this.options.shouldCloseOnScroll === false) {
                    return;
                }

                // Time/datetime modes have internal scroll inside the time rolls;
                // scrolling there must not slam the popover shut.
                if (this.options.pickerMode === 'time' || this.options.pickerMode === 'datetime') {
                    return;
                }

                // Don't close if Apply button is required (user needs to explicitly apply/cancel)
                if (this.requiresApplyButton()) {
                    drpLogger.debug('Window scroll detected - NOT closing (Apply button required)');
                    return;
                }

                // Don't close if a message is visible (user needs to see it)
                if (this.messageElement?.classList.contains('drp__message--visible')) {
                    drpLogger.debug('Window scroll detected - NOT closing (message visible)');
                    return;
                }

                drpLogger.debug('Window scroll detected - closing calendar');
                this.close();
            }
        });
        this.scrollSubscriptions.push(windowScrollSub);

        // Subscribe to outside clicks - close calendar or rolling selectors
        const outsideClickSub = this.clickEvents.subscribe('outsideClick', (ctx) => {
            drpLogger.debug('Outside click detected', ctx.target);

            // Modal handles "outside click" via the backdrop element; fullscreen is
            // edge-to-edge (no document-level "outside" to click). Both ignore the
            // outside-click stream here.
            if (this.presentation === 'modal' || this.presentation === 'fullscreen') {
                return;
            }

            if (this.presentation === 'floating') {
                // Floating mode: close entire calendar
                this.close();
            } else {
                // Inline/fixed/absolute mode: close only rolling selectors
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
            'visibleMonthsCount',
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
        ];
        const has = (k: keyof DatePickerOptions) => Object.prototype.hasOwnProperty.call(partial, k);
        const changed = (k: keyof DatePickerOptions) => has(k) && (partial as any)[k] !== (this.options as any)[k];

        // Bail out for structural changes — caller (web component) does a full rebuild.
        if (STRUCTURAL_KEYS.some(changed)) {
            return false;
        }

        // Merge partial into options (only keys present on partial — preserves untouched ones).
        for (const key of Object.keys(partial) as (keyof DatePickerOptions)[]) {
            (this.options as any)[key] = (partial as any)[key];
        }

        // Refresh derived state where touched.
        if (has('weekStartDay')) {
            this.weekStartDay = Validation.detectWeekStartDay(this.options.weekStartDay);
        }
        if (has('locale') || has('customStrings') || has('monthNames') || has('weekdayNames')) {
            this.locale = resolveLocale(this.options.locale);
            this.localeStrings = getLocaleStrings(this.locale, this.options.customStrings);
            this.weekdayNames = this.options.weekdayNames || getWeekdayNames(this.locale);
            this.monthNames = this.options.monthNames || getMonthNames(this.locale);
        }
        if (has('dateFormatMask')) {
            this.formatInfo = this.parseFormat(this.options.dateFormatMask);
        }
        if (has('minDate') || has('maxDate') || has('disabledDates') || has('specialDates') || has('dateMember')) {
            this.initializeDateRestrictions();
        }
        if (has('showDebugInfo')) {
            if (this.options.showDebugInfo) enableLogging(); else disableLogging();
        }

        // Re-render is the universal post-step. Calendar DOM structure is unchanged,
        // so this just updates content/classes/inline styles.
        this.renderCalendar();
        return true;
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
     * Render action buttons based on configuration
     * Implements priority system matching web-multiselect:
     * - Visibility: isVisibleCallback → isVisible → true (default visible)
     * - Disabled: isDisabledCallback → isDisabled → false (default enabled)
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

        // Use custom action buttons if provided, otherwise use default buttons
        const buttons: ActionButton[] = this.options.actionButtons || this.getDefaultButtons();

        buttons.forEach(button => {
            // One context object per button, shared by all of this button's callbacks
            const ctx: ActionButtonContext = { picker: this, controller: this.getController(), action: button.action, button };

            // Priority 1: Check dynamic visibility callback
            if (button.isVisibleCallback !== undefined) {
                if (!button.isVisibleCallback(ctx)) {
                    return; // Skip this button
                }
            }
            // Priority 2: Check static visibility flag
            else if (button.isVisible !== undefined) {
                if (!button.isVisible) {
                    return; // Skip this button
                }
            }
            // Priority 3: Default to visible (no check needed)

            const buttonEl = document.createElement('button');
            buttonEl.className = `drp__button drp__button--${button.action}`;

            // Apply CSS classes (priority: callback → static → none)
            const cssClasses = button.getClassCallback
                ? button.getClassCallback(ctx)
                : button.cssClass;
            if (cssClasses) {
                if (Array.isArray(cssClasses)) {
                    buttonEl.classList.add(...cssClasses);
                } else {
                    buttonEl.classList.add(cssClasses);
                }
            }

            // Apply text (priority: callback → static)
            const buttonText = button.getTextCallback
                ? button.getTextCallback(ctx)
                : button.text;
            buttonEl.innerHTML = buttonText;

            // Tooltip will be handled by attachActionButtonTooltips() after rendering

            // Apply disabled state (priority: callback → static → false)
            const isDisabled = button.isDisabledCallback
                ? button.isDisabledCallback(ctx)
                : (button.isDisabled ?? false);
            if (isDisabled) {
                buttonEl.disabled = true;
            }

            buttonEl.dataset.action = button.action;

            // Store custom onClick handler + config if provided (config is needed to
            // build the ActionButtonContext when the click fires later)
            if (button.onClick) {
                (buttonEl as any)._customOnClick = button.onClick;
                (buttonEl as any)._buttonConfig = button;
            }

            container.appendChild(buttonEl);
        });

        // Attach Floating UI tooltips after rendering
        this.attachActionButtonTooltips();
    }

    /**
     * Get default buttons based on options
     */
    private getDefaultButtons(): ActionButton[] {
        const buttons: ActionButton[] = [];

        // Today button — date and datetime modes only. Time-only has no day to navigate to.
        if (this.options.isTodayButtonShown && this.options.pickerMode !== 'time') {
            buttons.push({
                action: 'today',
                text: this.localeStrings.today
            });
        }

        // Now button — time and datetime modes only.
        if (this.options.isNowButtonShown && this.options.pickerMode !== 'date') {
            buttons.push({
                action: 'now',
                text: this.localeStrings.now
            });
        }

        // Clear button
        if (this.options.isClearButtonShown) {
            buttons.push({
                action: 'clear',
                text: this.localeStrings.clear
            });
        }

        // Apply button — only in `apply` commit mode (the staged-selection commit path).
        if (this.options.commitMode === 'apply') {
            buttons.push({
                action: 'apply',
                text: this.localeStrings.apply
            });
        }

        return buttons;
    }

    /**
     * Attach Floating UI tooltips to action buttons.
     * Each tooltip is a self-contained Tooltip instance owning its element,
     * hover delays, and autoUpdate cleanup. `destroyAllActionButtonTooltips`
     * disposes them all.
     */
    private attachActionButtonTooltips(): void {
        if (!this.actionsContainer) return;

        const buttons: ActionButton[] = this.options.actionButtons || this.getDefaultButtons();
        const container = this.options.container || document.body;
        const renderedButtons = this.actionsContainer.querySelectorAll('.drp__button');

        renderedButtons.forEach((button: Element, index: number) => {
            const buttonElement = button as HTMLElement;
            const action = buttonElement.dataset.action;
            if (!action) return;

            const actionConfig = buttons.find(btn => btn.action === action);
            if (!actionConfig) return;

            const tooltipText = actionConfig.getTooltipCallback
                ? actionConfig.getTooltipCallback({ picker: this, controller: this.getController(), action: actionConfig.action, button: actionConfig })
                : actionConfig.tooltip;
            if (!tooltipText) return;

            buttonElement.dataset.tooltipId = `action-${index}`;
            // Core createTooltip (SPEC §12.2): per-trigger hover tooltip with delay.
            // Behaviour-equivalent to the former local Tooltip class — same 'drp__tooltip'
            // styling, 300/100ms show/hide delays, top placement, floating-ui default platform.
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

        // 1. Check bulk metadata cache FIRST (highest priority - from beforeMonthChangedCallback)
        if (this.bulkMetadataCache && this.bulkMetadataCache.has(dateKey)) {
            const cachedInfo = this.bulkMetadataCache.get(dateKey)!;
            return {
                ...cachedInfo,
                isDisabled: cachedInfo.isDisabled !== undefined ? cachedInfo.isDisabled : this.isDateDisabled(date)
            };
        }

        // 2. Check callback SECOND (per-day callback)
        if (this.options.getDateMetadataCallback) {
            const customInfo = this.options.getDateMetadataCallback({
                picker: this,
                ...this.presentationCtx(),
                date,
                dateString: dateKey,
                dayNumber: date.getDate(),
                isDisabled: this.isDateDisabled(date),
                isToday: Validation.isToday(date),
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            });
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
     * Build the standardized {@link SelectEventDetail} for a selection — the
     * payload handed to `onSelect` as its second argument and mirrored by the web
     * component's `date-select`/`change` events. Centralizing it here means a
     * core-class consumer (`new DateRangePicker(el, { onSelect })`) gets the same
     * rich breakdown (`enabledDates`/`disabledDates`/`dateRanges`/`dates` per
     * `disabledDatesHandling`) that a web-component listener gets, instead of only
     * the bare positional selection. `formattedValue` is composed from
     * {@link formatDate}; the web component overrides it with the input's display
     * string when it re-emits.
     */
    buildSelectDetail(selection: Date | DateRange | DateRange[] | Date[]): SelectEventDetail {
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
        const detail: SelectEventDetail = { dateRange: selection, formattedValue: formatRange(selection) };
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

    /**
     * Determine if events/callbacks should be deferred until Apply button click
     * @returns true if Apply button is required and events should be deferred
     */
    requiresApplyButton(): boolean {
        // Only defer selection commitment in `apply` commit mode.
        return this.options.commitMode === 'apply';
    }

    /**
     * Determine if calendar should auto-close after selection
     * @returns true if calendar should auto-close
     */
    shouldAutoClose(): boolean {
        // Multiple mode never auto-closes on selection (inherently requires Apply or manual close)
        if (this.options.selectionMode === 'multiple') return false;

        return this.options.commitMode === 'selection';
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
            const rangeAction = this.options.isUnifiedHeaderInteractive ? ' data-action="toggle-unified-rolling"' : '';

            this.unifiedHeader.innerHTML = `
                <button class="drp__nav drp__nav--prev" data-action="unified-prev"></button>
                <div class="drp__unified-range${rangeClass}"${rangeAction}></div>
                <button class="drp__nav drp__nav--next" data-action="unified-next"></button>
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
        for (let i = 0; !skipMonths && i < this.options.visibleMonthsCount; i++) {
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
                    <button class="drp__nav drp__nav--prev" data-action="prev" data-month-index="${i}"></button>
                    <div class="drp__month-year" data-action="toggle-rolling" data-month-index="${i}"></div>
                    <button class="drp__nav drp__nav--next" data-action="next" data-month-index="${i}"></button>
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
                    <div class="drp__time-label">${this.localeStrings.time}</div>
                    <div class="drp__wheel-rolls">
                        <div class="drp__wheel-band" aria-hidden="true"></div>
                        ${wheelColumn('hours', this.localeStrings.hours)}
                        ${wheelColumn('minutes', this.localeStrings.minutes)}
                        ${isSecondsShown ? wheelColumn('seconds', this.localeStrings.seconds) : ''}
                        ${is12h ? wheelColumn('ampm', `${this.localeStrings.am}/${this.localeStrings.pm}`, 'drp__wheel-column--ampm') : ''}
                    </div>
                `;
            } else if (this.options.timeDisplay === 'compact') {
                timePicker.className = 'drp__compact-picker';
                // iOS 14+ pills: HH : MM [: SS] [AM/PM]. Each pill is a single button that
                // becomes contentEditable on click; the renderer just updates the displayed
                // value (no DOM rebuild per render).
                const sep = `<span class="drp__compact-sep">:</span>`;
                timePicker.innerHTML = `
                    <div class="drp__time-label">${this.localeStrings.time}</div>
                    <div class="drp__compact-row">
                        <button type="button" class="drp__compact-pill" data-compact-field="hours">--</button>
                        ${sep}
                        <button type="button" class="drp__compact-pill" data-compact-field="minutes">--</button>
                        ${isSecondsShown ? sep + `<button type="button" class="drp__compact-pill" data-compact-field="seconds">--</button>` : ''}
                        ${is12h ? `
                            <div class="drp__compact-ampm">
                                <button type="button" class="drp__compact-ampm-button" data-compact-ampm="am">${this.localeStrings.am}</button>
                                <button type="button" class="drp__compact-ampm-button" data-compact-ampm="pm">${this.localeStrings.pm}</button>
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
                    <div class="drp__time-label">${this.localeStrings.time}</div>
                    <div class="drp__time-rolls">
                        ${column('hours', this.localeStrings.hours)}
                        ${column('minutes', this.localeStrings.minutes)}
                        ${isSecondsShown ? column('seconds', this.localeStrings.seconds) : ''}
                        ${is12h ? column('ampm', `${this.localeStrings.am}/${this.localeStrings.pm}`, 'drp__time-roll--ampm') : ''}
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
            <button class="drp__message-close" data-action="close-message">&times;</button>
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
        this.rollingSelectorOpenByColumn = new Array(this.options.visibleMonthsCount).fill(false);

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

            const action = target.dataset.action;
            const monthIndexAttr = target.dataset.monthIndex;
            const monthIndex = monthIndexAttr ? parseInt(monthIndexAttr) : 0;

            // Check for custom action first (using closest to handle clicks on child elements)
            const customActionBtn = target.closest('[data-action="custom"]') as HTMLElement | null;
            if (customActionBtn) {
                // Custom / preset buttons are an 'actions' interaction — drop when locked.
                if (this.isAspectLocked('actions')) return;
                // Collect all data-* attributes (except data-action)
                const dataAttributes: Record<string, string> = {};
                for (const [key, value] of Object.entries(customActionBtn.dataset)) {
                    if (key !== 'action') {
                        dataAttributes[key] = value;
                    }
                }

                // Fire custom-action event
                this.fireCustomActionEvent(dataAttributes);

                // Still call onClick callback if provided
                const customOnClick = (customActionBtn as any)._customOnClick;
                if (customOnClick) {
                    const buttonConfig: ActionButton = (customActionBtn as any)._buttonConfig
                        || { action: 'custom', text: '' };
                    await Promise.resolve(customOnClick({
                        picker: this,
                        controller: this.getController(),
                        action: buttonConfig.action,
                        button: buttonConfig,
                        data: dataAttributes
                    }));
                }
                return;
            }

            // Check if navigation button is disabled (respects rollingYearRange/rollingMonthRange boundaries)
            if (action === 'prev' || action === 'next' || action === 'unified-prev' || action === 'unified-next') {
                const button = target as HTMLButtonElement;
                if (button.disabled || button.classList.contains('drp__nav--disabled')) {
                    return;
                }
            }

            // === Lock gating (user clicks only; the programmatic API bypasses locks) ===
            // Bucket the click by the interaction family it drives and drop it if that
            // family is locked. Custom action buttons were already handled (and gated) above.
            const NAV_ACTIONS = ['prev', 'next', 'unified-prev', 'unified-next', 'toggle-rolling', 'toggle-unified-rolling'];
            const SEL_ACTIONS = ['today', 'now', 'clear'];
            const isTimeTarget = !!target.closest('[data-hour],[data-hour12],[data-minute],[data-second],[data-ampm],[data-clock-hour],[data-clock-hour12],[data-clock-minute],[data-clock-step],[data-clock-ampm],[data-wheel-value],[data-compact-field],[data-compact-ampm]');
            const isDayTarget = !!target.closest('.drp__day:not(.drp__day--disabled)');
            const isRollingTarget = !!target.closest('[data-year],[data-month]');
            if (this.isAspectLocked('navigation') && ((action && NAV_ACTIONS.includes(action)) || isRollingTarget)) return;
            if (this.isAspectLocked('selection') && ((action && SEL_ACTIONS.includes(action)) || isTimeTarget || isDayTarget)) return;
            if (this.isAspectLocked('actions') && action === 'apply') return;

            if (action === 'prev') this.prevMonth(monthIndex);
            else if (action === 'next') this.nextMonth(monthIndex);
            else if (action === 'unified-prev') this.unifiedPrevMonth();
            else if (action === 'unified-next') this.unifiedNextMonth();
            else if (action === 'toggle-rolling') this.toggleRollingSelector(monthIndex);
            else if (action === 'toggle-unified-rolling') this.toggleUnifiedRollingSelector();
            else if (action === 'today') this.selectToday();
            else if (action === 'now') this.selectNow();
            else if (action === 'clear') this.clearSelection();
            else if (action === 'apply') this.apply();
            else if (action === 'close-message') this.hideMessage();
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

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
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
            // the caret isn't at the boundary (esp. the fullscreen-input header
            // field) — don't hijack them for month/year navigation.
            if (Interaction.inputOwnsCaretKey(e)) return;

            if (e.key === 'Escape') {
                this.close();
                e.preventDefault();
            }
            else if (e.key === 'ArrowUp') {
                this.moveFocus(-7);
                e.preventDefault();
            }
            else if (e.key === 'ArrowDown') {
                this.moveFocus(7);
                e.preventDefault();
            }
            else if (e.key === 'ArrowLeft') {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Left: Previous month (same as PageUp - maintain day position)
                    navigationLogger.debug('Ctrl+Left: Navigate to previous month');
                    const currentDayIndex = this.focusedDayIndex;
                    this.prevMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                        if (newDays) {
                            // Try to maintain same day index, or use last day if month is shorter
                            this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                            newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                        }
                    }, 0);
                } else {
                    this.moveFocus(-1);
                }
                e.preventDefault();
            }
            else if (e.key === 'ArrowRight') {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Right: Next month (same as PageDown - maintain day position)
                    navigationLogger.debug('Ctrl+Right: Navigate to next month');
                    const currentDayIndex = this.focusedDayIndex;
                    this.nextMonth(this.activeMonthIndex);
                    setTimeout(() => {
                        const daysContainer = this.calendar.querySelector(`.drp__days[data-month-index="${this.activeMonthIndex}"]`);
                        const newDays = daysContainer?.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                        if (newDays) {
                            // Try to maintain same day index, or use last day if month is shorter
                            this.focusedDayIndex = Math.min(currentDayIndex !== null ? currentDayIndex : 0, newDays.length - 1);
                            newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                            newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
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
                if (this.options.visibleMonthsCount > 1) {
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
                            days[todayIndex].classList.add('drp__day--focused');
                            days[todayIndex].scrollIntoView({ block: 'nearest' });
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
                        newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                        newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
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
                        newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                        newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
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
                                days[0]?.classList.add('drp__day--focused');
                                days[0]?.scrollIntoView({ block: 'nearest' });
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
                                days[0]?.scrollIntoView({ block: 'nearest' });
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
                            days[0]?.scrollIntoView({ block: 'nearest' });
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
                                newDays[this.focusedDayIndex]?.classList.add('drp__day--focused');
                                newDays[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
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
                                days[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                            }
                        }, 0);
                    } else {
                        // Go to last day of current month
                        this.focusedDayIndex = days.length - 1;
                        this.calendar.querySelectorAll('.drp__day--focused').forEach(d => d.classList.remove('drp__day--focused'));
                        days[this.focusedDayIndex]?.classList.add('drp__day--focused');
                        days[this.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }
                }
                e.preventDefault();
            }
        });

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
            const label = h24 >= 12 ? this.localeStrings.pm : this.localeStrings.am;
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
            console.warn('isOpen property does not apply to inline mode');
            return;
        }
        if (value) {
            this.open();
        } else {
            this.close();
        }
    }

    /**
     * Get/set selected ranges (for multiple mode or programmatic multi-range selection)
     */
    get selectedRanges(): DateRange[] {
        return [...this._selectedRanges];
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
            if (this.input && !this.requiresApplyButton()) {
                this.input.value = this._selectedRanges.length > 1
                    ? this._selectedRanges.map(r => `${this.formatDate(r.start)} - ${this.formatDate(r.end)}`).join(', ')
                    : `${this.formatDate(this._selectedStartDate)} - ${this.formatDate(this._selectedEndDate)}`;
            }
        } else if (this.input && !this.requiresApplyButton()) {
            // Clear input if no ranges or not in range mode
            this.input.value = '';
        }

        this.renderCalendar();
        this.updateSummary();
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
     * Fire a custom-action event with the provided data attributes
     */
    private fireCustomActionEvent(data: Record<string, string>): void {
        // Fire on calendar element (internal). Detail wraps the data-* map under `data`
        // and carries the picker instance, matching CustomActionEventDetail.
        const detail: CustomActionEventDetail = { data, picker: this };
        this.calendar.dispatchEvent(new CustomEvent('custom-action', {
            detail,
            bubbles: true,
            composed: true  // Cross shadow DOM boundary
        }));
    }

    /**
     * Mark this picker as the keyboard-active one. Broadcasts to other pickers
     * on the page so they deactivate — only one picker responds to arrow keys
     * at a time, even though the keydown listener lives on `document`.
     */
    setCalendarActive() {
        if (this.isCalendarActive) return; // already active, don't re-broadcast
        this.isCalendarActive = true;
        document.dispatchEvent(new CustomEvent(DateRangePicker.ACTIVE_EVENT, { detail: this }));
    }

    static readonly ACTIVE_EVENT = 'drp-picker-activated';

    destroy() {
        // Unsubscribe from all event subscriptions
        this.scrollSubscriptions.forEach(sub => sub.unsubscribe());
        this.scrollSubscriptions = [];
        this.clickSubscriptions.forEach(sub => sub.unsubscribe());
        this.clickSubscriptions = [];

        // Destroy event managers
        this.scrollEvents.destroy();
        this.clickEvents.destroy();

        // Stop listening for cross-picker activation broadcasts
        document.removeEventListener(DateRangePicker.ACTIVE_EVENT, this.onAnotherPickerActivated);

        // Leave the single-active-overlay group.
        this.overlayCoord?.dispose();
        this.overlayCoord = null;

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
        const openOverlay = this.options.positioningMode !== 'inline' &&
            this.calendar.classList.contains('drp__picker--visible');
        if (openOverlay) UI.teardownPresentationChrome(this);
        else UI.cleanupPositioning(this);

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
     * Presentation render-context flags (core `presentationContext`, rc08) spread
     * into every render-facing callback context so a single callback can vary its
     * output between the desktop popover and the phone full-screen sheet — e.g.
     * `renderDayCallback: ({ isFullscreen }) => …`. Reflects the OPEN chrome.
     */
    presentationCtx(): PresentationContext { return presentationContext(this.presentation); }
    /**
     * True on pointing devices that can hover (desktop mouse). Touch-primary
     * devices — phones in the full-screen sheet, tablets — report `(hover: none)`;
     * there day/badge tooltips can't appear on mouseenter, so they toggle on tap
     * instead (see the badge branch in `attachCalendarListeners`). Guarded for
     * non-DOM/SSR environments where `matchMedia` is absent.
     */
    supportsHover(): boolean {
        return typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(hover: hover)').matches;
    }
    toggle() { return UI.toggle(this); }
    position() { return UI.position(this); }
    showTooltip(element: HTMLElement, content: string) { return UI.showTooltip(this, element, content); }
    hideTooltip() { return UI.hideTooltip(this); }
    showMessage(content: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number) { return UI.showMessage(this, content, type, autoHide); }
    hideMessage() { return UI.hideMessage(this); }
    toggleMessage(content?: string, type?: 'error' | 'warning' | 'info' | 'success', autoHide?: number) { return UI.toggleMessage(this, content, type, autoHide); }
    showSummary(content: string) { return UI.showSummary(this, content); }
    hideSummary() { return UI.hideSummary(this); }
    refreshSummary() { return Rendering.updateSummary(this); }
    showLoader(target?: LoaderTarget) { return UI.showLoader(this, target); }
    hideLoader(target?: LoaderTarget) { return UI.hideLoader(this, target); }
    toggleLoader(target?: LoaderTarget) { return UI.toggleLoader(this, target); }

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
    renderCalendar() { return Rendering.renderCalendar(this); }
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
    apply() { return Selection.apply(this); }

    /**
     * The typed, curated imperative facade handed to callbacks via
     * `context.controller` (see {@link DateRangePickerController}). Memoized so its
     * identity is stable across calls. The raw instance stays reachable via
     * `context.picker` for anything not on the facade.
     */
    getController(): DateRangePickerController {
        const picker = this;
        return (this._controller ??= {
            getSelectedDate: () => picker.selectedDate,
            getSelectedRange: () => {
                const start = picker.selectedStartDate;
                const end = picker.selectedEndDate;
                return start && end ? { start, end } : null;
            },
            getSelectedRanges: () => picker.selectedRanges,
            getSelectedDates: () => picker.selectedDates,
            getSelectedDatetime: () => picker.selectedDatetime,
            get isOpen() { return picker.isOpen; },
            selectToday: () => { picker.selectToday(); },
            clearSelection: () => { picker.clearSelection(); },
            apply: () => { picker.apply(); },
            open: () => { picker.open(); },
            close: () => { picker.close(); },
            toggle: () => { picker.toggle(); },
            setPresentation: (next) => { picker.setPresentation(next); },
            prevMonth: (monthIndex = picker.activeMonthIndex) => { picker.prevMonth(monthIndex); },
            nextMonth: (monthIndex = picker.activeMonthIndex) => { picker.nextMonth(monthIndex); },
            lock: (aspects) => { picker.lock(aspects); },
            unlock: (aspects) => { picker.unlock(aspects); },
            showMessage: (content, type, autoHide) => { picker.showMessage(content, type, autoHide); },
            hideMessage: () => { picker.hideMessage(); },
            showSummary: (content) => { picker.showSummary(content); },
            hideSummary: () => { picker.hideSummary(); },
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
     * @param force - Force re-injection even if styles were already injected
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
    static injectGlobalStyles(force: boolean = false): void {
        // Only inject once unless forced
        if (DateRangePicker.stylesInjected && !force) {
            drpLogger.debug('Styles already injected, skipping');
            return;
        }

        // Create a style element
        const styleElement = document.createElement('style');
        styleElement.setAttribute('data-source', 'web-daterangepicker');
        styleElement.textContent = styles;

        // Inject into document head
        document.head.appendChild(styleElement);

        DateRangePicker.stylesInjected = true;
        drpLogger.info('Global styles injected successfully');
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
export { DateRangePicker };
