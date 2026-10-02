/**
 * Date Picker Selection Methods
 *
 * Functions for date selection logic.
 */

import { showLoader, hideLoader, showMessage, hideMessage } from './date-picker-ui';
import type { BeforeSelectResult, DateRange, SelectionContext } from './types';
import { validationLogger, selectionLogger } from './logger';
import log from './logger';

/**
 * Call beforeDateSelectCallback (supports both single and range modes)
 */
async function callBeforeSelectCallback(
    picker: any,
    selection: Date | DateRange
): Promise<{
    isValid: boolean;
    adjustedDate?: Date;
    adjustedStart?: Date;
    adjustedEnd?: Date;
    adjustedRanges?: DateRange[];
    message?: string;
    showInvalidRange?: boolean;
    invalidStart?: Date;
    invalidEnd?: Date;
}> {
    if (!picker.options.beforeDateSelectCallback) {
        return { isValid: true };
    }

    try {
        picker.isValidating = true;
        showLoader(picker);

        let ctx: SelectionContext;
        if (selection instanceof Date) {
            ctx = { picker, mode: picker.options.selectionMode, date: selection };
        } else {
            ctx = { picker, mode: picker.options.selectionMode, range: selection };
            // Split/individual handling carves the contiguous envelope into
            // enabled-only pieces at summary time. Surface those same pieces here
            // (read-only) so the callback can validate the split without
            // re-deriving it. The return contract stays single-range.
            const handling = picker.options.disabledDatesHandling;
            if (handling === 'split' || handling === 'individual') {
                ctx.enabledDates = picker.getEnabledDatesInRange(selection.start, selection.end);
                if (handling === 'split') {
                    ctx.subRanges = picker.splitRangeByDisabled(selection.start, selection.end);
                }
            }
        }
        const result: BeforeSelectResult = await Promise.resolve(picker.options.beforeDateSelectCallback(ctx));

        hideLoader(picker);
        picker.isValidating = false;

        // A callback may return N independent ranges (range mode only) to replace
        // the single proposed envelope — valid with 'accept' or 'adjust'.
        const isRangeSelection = !(selection instanceof Date);
        const hasAdjustedRanges = isRangeSelection
            && Array.isArray(result.adjustedRanges) && result.adjustedRanges.length > 0;

        switch (result.action) {
            case 'accept':
                // Clear any previous message on successful selection
                hideMessage(picker);
                if (hasAdjustedRanges) {
                    return { isValid: true, adjustedRanges: result.adjustedRanges };
                }
                return { isValid: true };

            case 'adjust':
                if (hasAdjustedRanges) {
                    // Multi-range replacement takes precedence over start/end pair.
                    if (result.message) {
                        showMessage(picker, result.message, 'info');
                    }
                    return { isValid: true, adjustedRanges: result.adjustedRanges, message: result.message };
                }
                if (selection instanceof Date && result.adjustedDate) {
                    // Single mode adjustment - show info message if provided
                    if (result.message) {
                        showMessage(picker, result.message, 'info');
                    }
                    return { isValid: true, adjustedDate: result.adjustedDate, message: result.message };
                } else if (typeof selection === 'object' && 'start' in selection && result.adjustedStartDate && result.adjustedEndDate) {
                    // Range mode adjustment - show info message if provided
                    if (result.message) {
                        showMessage(picker, result.message, 'info');
                    }
                    return {
                        isValid: true,
                        adjustedStart: result.adjustedStartDate,
                        adjustedEnd: result.adjustedEndDate,
                        message: result.message
                    };
                }
                return { isValid: false, message: result.message || 'Invalid adjustment' };

            case 'restore':
                // Handle showInvalidRange - return the proposed range for visual feedback
                if (result.showInvalidRange && typeof selection === 'object' && 'start' in selection) {
                    return {
                        isValid: false,
                        message: result.message,
                        showInvalidRange: true,
                        invalidStart: selection.start,
                        invalidEnd: selection.end
                    };
                }
                return { isValid: false, message: result.message };

            case 'clear':
                picker.clearSelection();
                return { isValid: false, message: result.message };

            default:
                return { isValid: false, message: 'Unknown validation action' };
        }
    } catch (error) {
        hideLoader(picker);
        picker.isValidating = false;
        log.error('beforeDateSelectCallback error:', error);
        return { isValid: false, message: 'Validation error occurred' };
    }
}

/**
 * Re-render calendar + summary after a selection change.
 * Single hook so debounced events / bulk-op callbacks can be added later.
 */
function commitSelection(picker: any) {
    // A new selection supersedes any pinned summary override (showSummary).
    picker.summaryOverride = null;
    picker.renderCalendar();
    picker.updateSummary();
}

/**
 * Write to the input field, but only if there's an input AND we're not waiting
 * on Apply (in which case the value is shown after the user clicks Apply).
 */
export function commitInputValue(picker: any, value: string) {
    if (picker.input && !picker.requiresApplyButton()) {
        picker.input.value = value;
    }
}

/**
 * Walk the rendered month columns, find the one containing `target`, and move
 * keyboard focus (active column index + focused day index + DOM `--focused` class)
 * to that day. Used after a selection commit to keep the focus indicator in sync.
 */
function moveFocusToDate(picker: any, target: Date): void {
    for (let colIndex = 0; colIndex < picker._monthDates.length; colIndex++) {
        const monthDate = picker._monthDates[colIndex];
        if (target.getFullYear() !== monthDate.getFullYear() || target.getMonth() !== monthDate.getMonth()) {
            continue;
        }
        picker.activeMonthIndex = colIndex;

        const daysContainer = picker.calendar.querySelector(
            `.drp__days[data-month-index="${colIndex}"]`
        );
        if (!daysContainer) return;

        const days = daysContainer.querySelectorAll(
            '.drp__day:not(.drp__day--other-month)'
        );
        const dayIndex = Array.from(days).findIndex((day: Element) => {
            const dateAttr = (day as HTMLElement).dataset.date;
            if (!dateAttr) return false;
            const [year, month, dayNum] = dateAttr.split('-').map(Number);
            const dayDate = new Date(year, month - 1, dayNum);
            return picker.isSameDay(dayDate, target);
        });
        if (dayIndex === -1) return;

        picker.focusedDayIndex = dayIndex;
        days.forEach((day: Element) => day.classList.remove('drp__day--focused'));
        (days[dayIndex] as HTMLElement | undefined)?.classList.add('drp__day--focused');
        return;
    }
}

/**
 * Format the current selection for display in the input field.
 * Returns null for selection states that have no canonical input representation.
 */
/**
 * Apply a SUCCESSFUL range validation to picker selection state, multi-range
 * aware. Shared by every range-commit path (click, drag, typed input) so they
 * can't drift: a callback returning `adjustedRanges` replaces the single range
 * with N pieces (start/end become the envelope); otherwise the single
 * (optionally adjusted) range is stored and `_selectedRanges` is cleared.
 * Returns the payload for onSelect / pendingSelection (a DateRange[] for a
 * multi-range result, else a single {start,end}).
 */
export function applyValidatedRangeSelection(
    picker: any,
    validation: { adjustedRanges?: DateRange[]; adjustedStart?: Date; adjustedEnd?: Date },
    startDate: Date,
    endDate: Date
): DateRange[] | DateRange {
    if (validation.adjustedRanges && validation.adjustedRanges.length > 0) {
        picker._selectedRanges = validation.adjustedRanges.map((r: DateRange) => ({
            start: new Date(r.start),
            end: new Date(r.end)
        }));
        picker._selectedStartDate = new Date(picker._selectedRanges[0].start);
        picker._selectedEndDate = new Date(picker._selectedRanges[picker._selectedRanges.length - 1].end);
    } else {
        picker._selectedRanges = [];
        picker._selectedStartDate = validation.adjustedStart || startDate;
        picker._selectedEndDate = validation.adjustedEnd || endDate;
    }
    picker.invalidRangeStart = null;
    picker.invalidRangeEnd = null;
    return picker._selectedRanges.length > 0
        ? picker.selectedRanges
        : { start: picker._selectedStartDate, end: picker._selectedEndDate };
}

/**
 * Format a range-mode selection for the input: a single "start - end", or, when
 * a multi-range result is committed, each piece joined by ", ".
 */
export function formatRangeInput(picker: any): string {
    if (picker._selectedRanges.length > 0) {
        return picker._selectedRanges
            .map((r: DateRange) => `${picker.formatDate(r.start)} - ${picker.formatDate(r.end)}`)
            .join(', ');
    }
    return `${picker.formatDate(picker._selectedStartDate)} - ${picker.formatDate(picker._selectedEndDate)}`;
}

function formatInputValue(picker: any): string | null {
    const mode = picker.options.selectionMode;
    // Time-only mode: selectedDate stays null. Format from selectedTime parts so
    // Apply writes "10:37:50" even though there's no date involved.
    if (picker.options.pickerMode === 'time') {
        const t = picker._selectedTime;
        const anyCommitted = t && (t.hour !== null || t.minute !== null || t.second !== null);
        return anyCommitted ? picker.formatTime(t) : null;
    }
    if (mode === 'range' && picker._selectedStartDate && picker._selectedEndDate) {
        return formatRangeInput(picker);
    }
    if (mode === 'single' && picker._selectedDate) {
        return picker.formatDate(picker._selectedDate);
    }
    if (mode === 'multiple') {
        const count = picker._selectedDates.length + picker._selectedRanges.length;
        return count > 0 ? `${count} selection(s)` : '';
    }
    return null;
}

/**
 * Validate range selection with async callback
 * Runs local validation first, then async callback if provided
 */
export async function validateRangeAsync(
    picker: any,
    startDate: Date,
    endDate: Date
): Promise<{
    isValid: boolean;
    adjustedStart?: Date;
    adjustedEnd?: Date;
    adjustedRanges?: DateRange[];
    message?: string;
    showInvalidRange?: boolean;
    invalidStart?: Date;
    invalidEnd?: Date;
}> {
    validationLogger.debug(' validateRangeAsync called - mode:', picker.options.disabledDatesHandling, 'start:', startDate, 'end:', endDate);

    // 1. Local validation: check for disabled dates if mode requires it
    if (picker.options.disabledDatesHandling === 'prevent') {
        validationLogger.debug(' Checking PREVENT mode');
        if (picker.hasDisabledDatesInRange(startDate, endDate)) {
            validationLogger.debug(' PREVENT mode - range contains disabled dates');
            return { isValid: false, message: 'Range contains disabled dates' };
        }
    } else if (picker.options.disabledDatesHandling === 'block') {
        // 'block' = "yes, but shorter": accept the selection and snap the end to the
        // last enabled date BEFORE the first disabled gap. Not "exclude disabled days
        // from the middle while keeping the original end" — that's `split`/`individual`.
        // See showcase route /features/range-disabled-handling (section RDH04).
        validationLogger.debug(' Checking BLOCK mode');
        if (picker.hasDisabledDatesInRange(startDate, endDate)) {
            validationLogger.debug(' BLOCK mode - range contains disabled dates, adjusting');
            const adjustedEnd = picker.findLastEnabledBeforeGap(startDate, endDate);
            validationLogger.debug(' BLOCK mode - adjusted end:', adjustedEnd);
            return { isValid: true, adjustedStart: startDate, adjustedEnd };
        }
    }

    // 2. Async validation: call beforeDateSelectCallback if provided
    const callbackResult = await callBeforeSelectCallback(picker, { start: startDate, end: endDate });
    if (!callbackResult.isValid) {
        // Pass through showInvalidRange fields if present
        if (callbackResult.showInvalidRange) {
            return {
                isValid: false,
                message: callbackResult.message,
                showInvalidRange: true,
                invalidStart: callbackResult.invalidStart,
                invalidEnd: callbackResult.invalidEnd
            };
        }
        return { isValid: false, message: callbackResult.message };
    }
    // Multi-range replacement wins over the single start/end pair when present.
    if (callbackResult.adjustedRanges) {
        return { isValid: true, adjustedRanges: callbackResult.adjustedRanges, message: callbackResult.message };
    }
    // Partial adjustment is intentional: a callback may adjust only one side of the range.
    // Consumers fall back per-field (`validation.adjustedStart || originalStart`), so leaving
    // one side undefined means "keep the original value for this side."
    if (callbackResult.adjustedStart || callbackResult.adjustedEnd) {
        return {
            isValid: true,
            adjustedStart: callbackResult.adjustedStart,
            adjustedEnd: callbackResult.adjustedEnd,
            message: callbackResult.message
        };
    }

    // No validation issues
    return { isValid: true };
}

export async function selectDay(picker: any, dayElement: HTMLElement) {
    if (dayElement.classList.contains('drp__day--disabled')) return;

    // Validate that we have a valid day element with data-date
    if (!dayElement.dataset || !dayElement.dataset.date) {
        log.warn('selectDay() - called with invalid element:', dayElement);
        return;
    }

    // Parse the date from the element
    const [year, month, day] = dayElement.dataset.date.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based

    // Track if single mode date was adjusted (for focus update after render)
    let singleModeAdjustedDate: Date | null = null;

    // Check if this is an "other month" day
    const isOtherMonth = dayElement.classList.contains('drp__day--other-month');

    // Determine which column this click happened in
    const daysContainer = dayElement.closest('.drp__days');
    if (daysContainer && daysContainer instanceof HTMLElement) {
        picker.activeMonthIndex = parseInt(daysContainer.dataset.monthIndex || '0') || 0;
        selectionLogger.debug(`Col${picker.activeMonthIndex} selectDay - activeMonthIndex:`, picker.activeMonthIndex);
        // For all days (including other-month), set focused index for keyboard navigation
        const days = daysContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');
        picker.focusedDayIndex = Array.from(days).indexOf(dayElement);
        selectionLogger.debug(`Col${picker.activeMonthIndex} selectDay - set focusedDayIndex to:`, picker.focusedDayIndex);
    }

    if (picker.options.selectionMode === 'single') {
        // Call beforeDateSelectCallback if provided
        const callbackResult = await callBeforeSelectCallback(picker, date);
        if (!callbackResult.isValid) {
            selectionLogger.debug('Single mode selection prevented by beforeDateSelectCallback');
            return;
        }

        // Clear any previous message on successful selection (if no adjustment message)
        if (!callbackResult.message) {
            hideMessage(picker);
        }

        // Use adjusted date if provided
        const finalDate = callbackResult.adjustedDate || date;

        // Track if date was adjusted for focus update after render
        if (callbackResult.adjustedDate && !picker.isSameDay(date, finalDate)) {
            singleModeAdjustedDate = finalDate;
        }

        picker._selectedDate = finalDate;
        commitInputValue(picker, picker.formatDate(finalDate));

        // In datetime mode, the payload to onSelect is the composed Date+time.
        const payload = picker.options.pickerMode === 'datetime' ? picker.selectedDatetime : finalDate;

        // Defer onSelect callback if Apply button is required
        if (picker.requiresApplyButton()) {
            picker.pendingSelection = payload;
        } else {
            if (picker.options.onSelect) picker.options.onSelect(payload, picker.buildSelectDetail(payload));
        }

        // Auto-close handling
        if (picker.options.positioningMode !== 'inline' && picker.shouldAutoClose()) {
            picker.close();
        }
    } else if (picker.options.selectionMode === 'multiple') {
        // Multiple mode: toggle individual dates or add ranges
        // For now, we'll implement toggling individual dates
        // Users can use custom buttons to add ranges programmatically

        // Check if date is already selected
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const existingIndex = picker._selectedDates.findIndex((d: Date) => {
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return dStr === dateStr;
        });

        if (existingIndex !== -1) {
            // Remove the date (toggle off)
            picker._selectedDates.splice(existingIndex, 1);
        } else {
            // Add the date
            picker._selectedDates.push(new Date(date));
        }

        // Update input to show count (only if Apply button is NOT required)
        const count = picker._selectedDates.length + picker._selectedRanges.length;
        commitInputValue(picker, count > 0 ? `${count} selection(s)` : '');

        // Multiple mode always defers events (inherently requires Apply button)
        // Store pending selection for onSelect callback
        if (picker._selectedRanges.length > 0 && picker._selectedDates.length > 0) {
            picker.pendingSelection = [...picker._selectedRanges, ...picker._selectedDates];
        } else if (picker._selectedRanges.length > 0) {
            picker.pendingSelection = picker._selectedRanges;
        } else {
            picker.pendingSelection = picker._selectedDates;
        }
    } else { // range
        if (!picker._selectedStartDate || picker._selectedEndDate) {
            // Start new range - clear any previous invalid range
            picker.invalidRangeStart = null;
            picker.invalidRangeEnd = null;
            // Drop any prior multi-range result so the new drag renders as a
            // single contiguous range until (and unless) the callback splits it.
            picker._selectedRanges = [];
            picker._selectedStartDate = date;
            picker._selectedEndDate = null;
            // Show first date in input immediately (only if Apply button is NOT required)
            commitInputValue(picker, `${picker.formatDate(picker._selectedStartDate)} - ...`);
        } else {
            // Complete range - determine start/end order
            let startDate = picker._selectedStartDate;
            let endDate = date;

            if (date < picker._selectedStartDate) {
                endDate = picker._selectedStartDate;
                startDate = date;
            }

            // Validate the range (local + async)
            selectionLogger.debug(' selectDay - calling validateRangeAsync with:', startDate, endDate);
            const validation = await validateRangeAsync(picker, startDate, endDate);
            selectionLogger.debug(' selectDay - validation result:', validation);

            if (!validation.isValid) {
                // Validation failed - restore previous state or clear
                if (validation.message) {
                    log.warn('selectDay() - range validation failed:', validation.message);
                }

                // Handle showInvalidRange - keep invalid range visible with error styling
                if (validation.showInvalidRange && validation.invalidStart && validation.invalidEnd) {
                    picker.invalidRangeStart = validation.invalidStart;
                    picker.invalidRangeEnd = validation.invalidEnd;
                    // Reset selection to start-only state so user can try again
                    picker._selectedStartDate = null;
                    picker._selectedEndDate = null;
                }

                // Range was already cleared if action was 'clear'
                commitSelection(picker);
                return;
            }

            // Apply validated/adjusted dates (multi-range aware; shared with the
            // drag and typed-input commit paths so they can't drift).
            const selection = applyValidatedRangeSelection(picker, validation, startDate, endDate);

            // Clear any previous message on successful selection (if no adjustment message)
            if (!validation.message) {
                hideMessage(picker);
            }

            commitInputValue(picker, formatRangeInput(picker));

            // Defer onSelect callback if Apply button is required. A multi-range
            // result is delivered as the DateRange[] array; a plain range as {start,end}.
            if (picker.requiresApplyButton()) {
                picker.pendingSelection = selection;
            } else {
                if (picker.options.onSelect) picker.options.onSelect(selection, picker.buildSelectDetail(selection));
            }

            // Auto-close handling. Floating closes on range-completion; modal and
            // fullscreen stay open until the user explicitly dismisses (backdrop /
            // ✕ / Apply), matching their heavier, deliberate presentation.
            if (picker.presentation === 'floating' && picker.shouldAutoClose()) {
                picker.close();
            }
        }
    }

    commitSelection(picker);

    // Keep the focus indicator on the date the picker actually committed to:
    // - single mode: the (possibly callback-adjusted) date
    // - range mode: the end of the completed range
    if (singleModeAdjustedDate) {
        moveFocusToDate(picker, singleModeAdjustedDate);
    }
    if (picker.options.selectionMode === 'range' && picker._selectedEndDate) {
        moveFocusToDate(picker, picker._selectedEndDate);
    }
}

export function selectToday(picker: any) {
    // Time mode has no calendar grid to seek to — Today is meaningless there.
    if (picker.options.pickerMode === 'time') return;

    picker._monthDates[picker.activeMonthIndex] = new Date();
    // In datetime mode keep selectedDate as date-only (time lives in selectedTime
    // and is untouched). In date mode the time portion is irrelevant.
    const today = new Date();
    picker._selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const payload = picker.options.pickerMode === 'datetime' ? picker.selectedDatetime : picker._selectedDate;
    commitInputValue(picker, picker.formatDate(picker._selectedDate));

    // Defer onSelect callback if Apply button is required
    if (picker.requiresApplyButton()) {
        picker.pendingSelection = payload;
    } else {
        if (picker.options.onSelect) picker.options.onSelect(payload, picker.buildSelectDetail(payload));
    }

    picker.renderCalendar();

    // Auto-close if appropriate
    if (picker.options.positioningMode !== 'inline' && picker.shouldAutoClose()) {
        picker.close();
    }
}

export function clearSelection(picker: any) {
    picker._selectedDate = null;
    picker._selectedStartDate = null;
    picker._selectedEndDate = null;
    picker._selectedRanges = [];
    picker._selectedDates = [];
    picker.pendingSelection = null;
    picker._selectedTime = null;

    // Clear drag preview state
    picker.dragPreviewStart = null;
    picker.dragPreviewEnd = null;
    picker.hoverPreviewEnd = null;

    // Clear invalid range state
    picker.invalidRangeStart = null;
    picker.invalidRangeEnd = null;

    // Clear focused day state
    picker.focusedDayIndex = null;

    // Clear any message
    hideMessage(picker);

    if (picker.input) {
        picker.input.value = '';
    }
    commitSelection(picker);
}

/**
 * Ensure picker._selectedTime exists with all fields null. Each select* helper
 * then fills in the field the user clicked. Null fields stay null so the
 * renderer knows not to highlight that roll.
 */
function ensureSelectedTime(picker: any) {
    if (!picker._selectedTime) {
        picker._selectedTime = { hour: null, minute: null, second: null, ampm: null };
    }
    return picker._selectedTime;
}

function commitTimeSelection(picker: any) {
    const mode = picker.options.pickerMode;
    let formatted: string;
    if (mode === 'time') {
        formatted = picker.formatTime(picker._selectedTime);
    } else if (mode === 'datetime' && picker._selectedDate) {
        formatted = picker.formatDate(picker._selectedDate);
    } else {
        // datetime mode without a committed date — show just the time so the
        // user sees feedback for their click. Day-click later replaces the input.
        formatted = picker.formatTime(picker._selectedTime);
    }
    commitInputValue(picker, formatted);
    // onSelect receives the composed Date when the picker has time semantics.
    const payload = picker.selectedDatetime;
    if (picker.requiresApplyButton()) {
        picker.pendingSelection = payload;
    } else if (picker.options.onSelect) {
        picker.options.onSelect(payload, picker.buildSelectDetail(payload));
    }
    picker.renderCalendar();
}

export function selectHour(picker: any, hour: number, is12Hour: boolean) {
    const time = ensureSelectedTime(picker);
    let h24 = hour;
    if (is12Hour) {
        // Translate 1-12 + current AM/PM into 0-23. If user hasn't picked AM/PM
        // yet, default to AM (matches old behavior where the seed was 00:00:00).
        const wasPm = time.ampm === 'pm' || (time.ampm === null && (time.hour ?? 0) >= 12);
        if (hour === 12) h24 = wasPm ? 12 : 0;
        else h24 = wasPm ? hour + 12 : hour;
        // Auto-commit ampm so the AM/PM roll highlights the implied half.
        time.ampm = h24 >= 12 ? 'pm' : 'am';
    }
    time.hour = h24;
    commitTimeSelection(picker);
}

export function selectMinute(picker: any, minute: number) {
    const time = ensureSelectedTime(picker);
    time.minute = minute;
    commitTimeSelection(picker);
}

export function selectSecond(picker: any, second: number) {
    const time = ensureSelectedTime(picker);
    time.second = second;
    commitTimeSelection(picker);
}

export function selectAmpm(picker: any, ampm: 'am' | 'pm') {
    const time = ensureSelectedTime(picker);
    // If hour is already set, shift it into the right half.
    if (time.hour !== null) {
        const isPm = time.hour >= 12;
        if (ampm === 'pm' && !isPm) time.hour += 12;
        else if (ampm === 'am' && isPm) time.hour -= 12;
    }
    time.ampm = ampm;
    commitTimeSelection(picker);
}

/**
 * Clock-face hour selection: commits the hour via the shared selectHour path,
 * then auto-advances the dial to the minutes step (Material flow).
 */
export function selectClockHour(picker: any, hour: number, is12Hour: boolean) {
    selectHour(picker, hour, is12Hour);
    picker.clockStep = 'minutes';
    picker.renderCalendar();
}

/**
 * Clock-face minute selection. Labels may sit at 5-minute marks (when
 * `timeStep` is in {1,2,3,4}) even though only multiples of timeStep are valid;
 * snap the clicked label's value to the nearest valid step. Stays on the
 * minutes step — Apply commits the whole selection.
 */
export function selectClockMinute(picker: any, minute: number) {
    const step = picker.options.timeStep || 1;
    const snapped = (Math.round(minute / step) * step) % 60;
    selectMinute(picker, snapped);
}

/**
 * Header digit click → jump the dial to that step.
 */
export function setClockStep(picker: any, step: 'hours' | 'minutes') {
    picker.clockStep = step;
    picker.renderCalendar();
}

/**
 * Wheel picker — center the clicked row in its column. The wheel column listens
 * to its own `scroll` event and commits when the centroid settles, so this
 * function doesn't need to call selectHour/selectMinute directly: it just
 * scrolls, and the existing scroll handler does the rest.
 *
 * `wheelScrollLock` is held across the animation frame so the scroll listener
 * (which would otherwise commit on every intermediate scroll position during a
 * smooth scroll) ignores the programmatic scroll. The lock is released as soon
 * as the user touches the wheel again.
 */
export function scrollWheelItemToCenter(picker: any, el: HTMLElement) {
    const col = el.closest('.drp__wheel-column') as HTMLElement | null;
    if (!col) return;
    const item = el.closest('[data-wheel-value]') as HTMLElement | null;
    if (!item) return;
    const listKey = col.dataset.wheelList;
    const itemH = item.offsetHeight || 36;
    const target = item.offsetTop - (col.clientHeight - itemH) / 2;
    picker.wheelScrollLock = true;
    col.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    // After the scroll settles, run a single commit so the click → commit path
    // works even if the smooth-scroll dampens before crossing a snap point.
    window.setTimeout(() => {
        picker.wheelScrollLock = false;
        if (listKey) commitWheelScroll(picker, col, listKey);
    }, 220);
}

/**
 * Wheel picker — called from the column's scroll listener (and from the click
 * handler above) once a scroll has settled. Reads the row currently centered
 * in the column and commits its value via the same select* helpers the rolls
 * use. No-op if the centered value already matches the committed selection,
 * so cross-render scrollTo() doesn't loop.
 */
export function commitWheelScroll(picker: any, col: HTMLElement, listKey: string) {
    const items = Array.from(col.querySelectorAll('[data-wheel-value]')) as HTMLElement[];
    if (items.length === 0) return;
    const itemH = items[0].offsetHeight || 36;
    // Subtract the column's top padding (encoded in items[0].offsetTop). Without
    // this, idx counts the padding rows as items and commits a value N positions
    // past the one actually centered — N being padding-top / item-height (typically
    // two). Symptom: user scrolls to e.g. minute 33, sees it briefly, then the
    // wheel re-snaps to 35 once the debounce fires.
    const firstItemTop = items[0].offsetTop;
    const centerOffset = col.scrollTop + col.clientHeight / 2;
    const rawIdx = (centerOffset - firstItemTop - itemH / 2) / itemH;
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(rawIdx)));
    console.log('[wheel] commit', {
        listKey,
        scrollTop: col.scrollTop,
        clientHeight: col.clientHeight,
        firstItemTop,
        firstItemOffsetHeight: items[0].offsetHeight,
        itemH,
        itemCount: items.length,
        centerOffset,
        rawIdx: rawIdx.toFixed(4),
        idx,
        centeredValue: items[idx]?.dataset.wheelValue,
    });
    const raw = items[idx].dataset.wheelValue;
    if (raw === undefined) return;
    if (listKey === 'ampm') {
        if (raw === 'am' || raw === 'pm') selectAmpm(picker, raw);
        return;
    }
    const value = parseInt(raw, 10);
    if (isNaN(value)) return;
    const is12h = picker.options.hourCycle === 'h12';
    const time = picker._selectedTime || { hour: null, minute: null, second: null, ampm: null };
    if (listKey === 'hours') {
        if (is12h) {
            const currentDisplay = time.hour !== null ? picker.toDisplayHour(time.hour) : -1;
            if (currentDisplay === value) return;
            selectHour(picker, value, true);
        } else {
            if (time.hour === value) return;
            selectHour(picker, value, false);
        }
    } else if (listKey === 'minutes') {
        if (time.minute === value) return;
        selectMinute(picker, value);
    } else if (listKey === 'seconds') {
        if (time.second === value) return;
        selectSecond(picker, value);
    }
}

/**
 * Compact pills picker — start editing a HH / MM / SS pill. Stores which field
 * is being edited on the picker, switches the pill into contentEditable mode,
 * selects its text so typing replaces, and wires Enter / Escape / blur for
 * commit. The commit clamps to the field's range and snaps minutes/seconds to
 * `timeStep` before routing through selectHour / selectMinute / selectSecond.
 */
export function beginCompactEdit(picker: any, el: HTMLElement) {
    const field = el.dataset.compactField as 'hours' | 'minutes' | 'seconds' | undefined;
    if (!field) return;
    if (el.isContentEditable) return;
    // Stash the original text so Escape can restore it (the next render won't,
    // because it skips pills that are still contentEditable).
    const originalText = el.textContent || '';
    let aborted = false;

    el.contentEditable = 'true';
    el.focus();
    // Select all so a single typed digit replaces the current value.
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
    }

    const teardown = () => {
        el.contentEditable = 'false';
        el.removeEventListener('blur', commit);
        el.removeEventListener('keydown', onKey);
        el.removeEventListener('input', onInput);
    };

    // Find the next pill in tab order (only HH / MM / SS — not the AM/PM
    // buttons, which are toggles, not text inputs). Returns null when this is
    // the last input pill (commit-without-advance behavior).
    const findNextPill = (): HTMLElement | null => {
        const row = el.closest('.drp__compact-row');
        if (!row) return null;
        const pills = Array.from(row.querySelectorAll('[data-compact-field]')) as HTMLElement[];
        const idx = pills.indexOf(el);
        return idx >= 0 && idx + 1 < pills.length ? pills[idx + 1] : null;
    };

    // Field-specific max so we know when a 1-digit value can't possibly grow
    // into a valid 2-digit value (e.g., '3' in hours h12 → no '3X' is valid →
    // commit + advance immediately). Matches the native <input type="time"> UX.
    const is12h = picker.options.hourCycle === 'h12';
    const fieldMax = field === 'hours' ? (is12h ? 12 : 23) : 59;

    // input fires AFTER the character has been inserted, so el.textContent is
    // the post-edit string. Advance when either (a) we have 2 digits, or
    // (b) we have 1 digit and 1×10 > fieldMax (no possible 2-digit value
    // starting with that digit fits in range). Single source of truth for
    // "field is complete enough to commit."
    const onInput = () => {
        const text = (el.textContent || '').replace(/\D/g, '');
        if (text.length === 0) return;
        const first = parseInt(text, 10);
        if (isNaN(first)) return;
        const shouldAdvance = text.length >= 2 || (text.length === 1 && first * 10 > fieldMax);
        if (!shouldAdvance) return;
        const next = findNextPill();
        if (next) {
            // Moving focus to another element synchronously dispatches blur on
            // `el` (which runs commit + teardown, including renderCalendar),
            // then focus on `next` (which the calendar-level focusin listener
            // promotes into edit mode + select-all).
            next.focus();
        } else {
            // Last input pill — just commit. blur triggers the commit handler.
            el.blur();
        }
    };

    const commit = () => {
        if (aborted) { teardown(); picker.renderCalendar(); return; }
        teardown();
        const raw = el.textContent || '';
        const digits = raw.replace(/\D/g, '');
        if (digits === '') {
            // Nothing typed — re-render to restore the displayed value.
            picker.renderCalendar();
            return;
        }
        let value = parseInt(digits, 10);
        if (isNaN(value)) {
            picker.renderCalendar();
            return;
        }
        // is12h is declared once below (used by both this commit path and the
        // auto-advance threshold computation).
        const step = picker.options.timeStep || 1;
        if (field === 'hours') {
            if (is12h) {
                value = Math.max(1, Math.min(12, value));
                selectHour(picker, value, true);
            } else {
                value = Math.max(0, Math.min(23, value));
                selectHour(picker, value, false);
            }
        } else if (field === 'minutes') {
            value = Math.max(0, Math.min(59, value));
            value = (Math.round(value / step) * step) % 60;
            selectMinute(picker, value);
        } else if (field === 'seconds') {
            value = Math.max(0, Math.min(59, value));
            value = (Math.round(value / step) * step) % 60;
            selectSecond(picker, value);
        }
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            el.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            // Revert text, mark aborted, then blur — the blur handler sees the
            // flag and bypasses the commit path. Renderer can repaint normally
            // once contentEditable is back to false.
            el.textContent = originalText;
            aborted = true;
            el.blur();
        } else if (e.key === 'Tab') {
            // Let the browser handle Tab focus movement naturally; blur fires
            // and the commit path runs. The focusin listener on the calendar
            // then promotes the next pill into edit mode (see attachCalendarListeners).
            // No preventDefault — we WANT default Tab behavior.
            return;
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            // Quick increment/decrement: read current digits, bump by step (1 for
            // hours, timeStep for minutes/seconds). Keeps the pill in edit mode
            // for further bumps. No clamping here — commit clamps on blur.
            e.preventDefault();
            const dir = e.key === 'ArrowUp' ? 1 : -1;
            const step = field === 'hours' ? 1 : (picker.options.timeStep || 1);
            const cur = parseInt((el.textContent || '').replace(/\D/g, ''), 10) || 0;
            const next = cur + dir * step;
            el.textContent = String(next);
            const r = document.createRange();
            r.selectNodeContents(el);
            const s = window.getSelection();
            if (s) { s.removeAllRanges(); s.addRange(r); }
        } else if (e.key.length === 1) {
            // Single-character key (printable). Two rules:
            //   1. Non-digit characters are rejected — pills are numeric only.
            //   2. Digits beyond the 2nd are rejected (unless replacing a selection
            //      that's actually inside this pill).
            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
                return;
            }
            const sel = window.getSelection();
            const hasSelectionInPill = !!(
                sel && sel.toString().length > 0 &&
                sel.anchorNode && el.contains(sel.anchorNode)
            );
            const currentLen = (el.textContent || '').length;
            if (!hasSelectionInPill && currentLen >= 2) {
                e.preventDefault();
            }
        }
    };
    el.addEventListener('blur', commit);
    el.addEventListener('keydown', onKey);
    el.addEventListener('input', onInput);
}

export function selectNow(picker: any) {
    const now = new Date();
    if (picker.options.pickerMode === 'datetime') {
        // Set both date and time to now, and re-seek calendar to today.
        picker._selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (picker._monthDates && picker._monthDates.length > 0) {
            picker._monthDates[picker.activeMonthIndex || 0] = new Date(now.getFullYear(), now.getMonth(), 1);
        }
    }
    // "Now" is an explicit commitment of every time field.
    picker._selectedTime = {
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
        ampm: now.getHours() >= 12 ? 'pm' : 'am',
    };
    commitTimeSelection(picker);
}

export function apply(picker: any) {
    // Apply commits the selection — clear any pinned summary override.
    picker.summaryOverride = null;
    // Always update input if dates are selected (handles custom buttons, programmatic setting).
    // Bypasses the requiresApplyButton gate — this is the Apply action itself.
    if (picker.input) {
        const formatted = formatInputValue(picker);
        if (formatted !== null) picker.input.value = formatted;
    }

    // Fire deferred callback if there was a pending selection
    if (picker.pendingSelection) {
        if (picker.options.onSelect) {
            picker.options.onSelect(picker.pendingSelection, picker.buildSelectDetail(picker.pendingSelection));
        }
        picker.pendingSelection = null;
    }

    // Store committed values
    if (picker.options.selectionMode === 'range') {
        picker.committedStartDate = picker._selectedStartDate;
        picker.committedEndDate = picker._selectedEndDate;
        // Snapshot the multi-range result too, so cancel-without-Apply can revert it.
        picker.committedRanges = picker._selectedRanges.map((r: DateRange) => ({
            start: new Date(r.start),
            end: new Date(r.end)
        }));
    } else if (picker.options.selectionMode === 'single') {
        picker.committedDate = picker._selectedDate;
    }
    // Time/datetime modes also commit the time parts so close() can revert.
    if (picker.options.pickerMode !== 'date') {
        picker.committedTime = picker._selectedTime ? { ...picker._selectedTime } : null;
    }

    // Always close on Apply (inline mode never closes; floating and modal both close)
    if (picker.options.positioningMode !== 'inline') {
        picker.close();
    }
}
