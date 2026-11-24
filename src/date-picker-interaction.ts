/**
 * Date Picker Interaction Methods
 *
 * Functions for interaction logic including drag functionality
 * and input masking.
 */

import { validateRangeAsync, commitInputValue, setValidatedRangeSelection, formatRangeInput, callBeforeSelectCallback, clearByUser } from './date-picker-selection';
import { hideMessage } from './date-picker-ui';
import { dragLogger, interactionLogger } from './logger';
import log from './logger';
import { createPointerDrag, isImeEnter, readPasteText, type PointerDrag } from '@keenmate/web-components-core';

// === DRAG FUNCTIONALITY ===

/**
 * Range drag on the day cells (draw a range from scratch, or drag an endpoint) — core
 * `createPointerDrag` on the stable calendar element (SPEC §12.28): mouse, pen and touch,
 * pointer capture on the calendar, the trailing click after a drop swallowed, Escape aborts.
 * Mouse / pen: any enabled day starts a drag after 5 px. Touch: only an endpoint of a complete
 * range drags (it carries `touch-action: none`, see calendar-grid.css) — a swipe on any other
 * day must stay free to scroll the month list, and tap-tap still creates ranges; no long press
 * (`longPressMs: 0`), the finger drags like a mouse past the threshold.
 */
export function createDayDrag(picker: any): PointerDrag {
    return createPointerDrag(picker.calendar, {
        getSource: (target, event) => {
            if (picker.options.selectionMode !== 'range' || picker.isDragging) return null;
            // Selection lock: a drag adjusts the range, so freeze it here (the click
            // fallback is separately gated in the calendar click handler).
            if (picker.isAspectLocked('selection')) return null;
            const day = target.closest?.('.drp__day:not(.drp__day--disabled)') as HTMLElement | null;
            if (!day || !picker.calendar.contains(day)) return null;
            if (event.pointerType === 'touch' && !(isRangeEndpoint(day) && picker._selectedStartDate && picker._selectedEndDate)) {
                return null;
            }
            return day;
        },
        threshold: 5,
        longPressMs: 0,
        autoScroll: false,
        beforeStartCallback: (ctx) => {
            startDrag(picker, ctx.event as PointerEvent | null, getDragType(picker, ctx.source), ctx.source);
        },
        moveCallback: (ctx) => onDragMove(picker, ctx.x, ctx.y),
        dropCallback: () => { void onDragEnd(picker); },
        // pointercancel (the OS interrupting a touch) finalizes like a release; Escape aborts.
        cancelCallback: (ctx) => {
            if (ctx.event?.type === 'pointercancel') void onDragEnd(picker);
            else abortDrag(picker);
        },
    });
}

function isRangeEndpoint(day: HTMLElement): boolean {
    return day.classList.contains('drp__day--range-start') || day.classList.contains('drp__day--range-end');
}

/** Which end the press grabbed: an endpoint of a complete range, else drawing from scratch ('start'). */
function getDragType(picker: any, day: HTMLElement): 'start' | 'end' {
    const hasRange = !!(picker._selectedStartDate && picker._selectedEndDate);
    return hasRange && day.classList.contains('drp__day--range-end') && !day.classList.contains('drp__day--range-start')
        ? 'end'
        : 'start';
}

export function startDrag(picker: any, event: PointerEvent | null, type: 'start' | 'end', dayElement: HTMLElement) {
    event?.preventDefault();
    event?.stopPropagation();

    // What Escape restores (abortDrag): the drag below rewrites the selection as it goes.
    picker.dragRestore = {
        start: picker._selectedStartDate,
        end: picker._selectedEndDate,
        ranges: picker._selectedRanges,
        invalidStart: picker.invalidRangeStart,
        invalidEnd: picker.invalidRangeEnd,
    };

    picker.isDragging = true;
    picker.draggingType = type;

    // Clear any previous invalid range when starting a new drag
    picker.invalidRangeStart = null;
    picker.invalidRangeEnd = null;

    // A drag defines a fresh contiguous span — drop any prior multi-range result
    // so its highlights don't linger through the preview (onDragEnd re-derives it
    // via the callback, which may split the new span again).
    picker._selectedRanges = [];

    // Parse date from the clicked element
    const clickedElement = dayElement;
    const dateAttr = clickedElement.dataset.date;
    let clickedDate: Date | null = null;
    if (dateAttr) {
        const [year, month, day] = dateAttr.split('-').map(Number);
        clickedDate = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based
    }

    // If no selection exists (drawing from scratch), use the clicked day as the start point
    if (!picker._selectedStartDate && !picker._selectedEndDate) {
        if (clickedDate) {
            picker.originalStartDate = clickedDate;
            picker.originalEndDate = null;
            // Set type to 'end' so we're dragging the end point from this start
            picker.draggingType = 'end';
        }
    } else if (clickedDate && picker._selectedStartDate && !picker._selectedEndDate) {
        // Single date selected but dragging from a DIFFERENT date - start new range
        const isSameDate = clickedDate.getTime() === picker._selectedStartDate.getTime();
        if (!isSameDate) {
            // Clear the old selection and start fresh
            picker._selectedStartDate = null;
            picker._selectedEndDate = null;

            // Clear focus state to prevent re-applying focused class during re-render
            picker.focusedDayIndex = null;

            // Remove visual selection classes from ALL previously selected days (across all months)
            picker.calendar.querySelectorAll('.drp__day--range-start, .drp__day--range-end, .drp__day--selected, .drp__day--focused').forEach(day => {
                day.classList.remove('drp__day--range-start', 'drp__day--range-end', 'drp__day--selected', 'drp__day--focused');
            });

            picker.originalStartDate = clickedDate;
            picker.originalEndDate = null;
            picker.draggingType = 'end';
        } else {
            // Dragging from the selected start date - treat as extending range
            picker.originalStartDate = new Date(picker._selectedStartDate);
            picker.originalEndDate = null;
        }
    } else {
        // Existing range - store original positions for drag
        if (picker._selectedStartDate) {
            picker.originalStartDate = new Date(picker._selectedStartDate);
        }
        if (picker._selectedEndDate) {
            picker.originalEndDate = new Date(picker._selectedEndDate);
        }
    }

    // Drag takes over from hover preview — clear it so the two don't fight.
    if (picker.hoverPreviewEnd) {
        picker.hoverPreviewEnd = null;
        picker.updateHoverPreview();
    }

    // Add dragging class to the day being dragged
    clickedElement.classList.add('drp__day--dragging');

    dragLogger.debug(`Started dragging ${type} date`);

    // Change body cursor
    document.body.style.cursor = 'grabbing';
}

export function onDragMove(picker: any, x: number, y: number) {
    if (!picker.isDragging) return;

    // Hit-test the point under the pointer. We scan the WHOLE stack (elementsFromPoint)
    // rather than trusting the topmost element: a shadow <slot> (and other overlays)
    // can paint above the day cells, so `elements[0]` is often the slot — searching
    // the stack for the day/nav is what makes drag detection reliable (this also fixed
    // intermittent mouse drags that happened to land on the slot pixel).
    const canShadowHitTest = picker.containerElement instanceof ShadowRoot && 'elementsFromPoint' in picker.containerElement;
    const stack: Element[] = canShadowHitTest
        ? (picker.containerElement as any).elementsFromPoint(x, y)
        : document.elementsFromPoint(x, y);
    const findClosest = (selector: string): HTMLElement | null =>
        (stack.map(el => (el as HTMLElement).closest?.(selector)).find(Boolean) as HTMLElement | undefined) ?? null;

    // Unified navigation button handling
    const prevButton = findClosest('.drp__nav--prev');
    const nextButton = findClosest('.drp__nav--next');

    if (prevButton || nextButton) {
        // Hovering over a navigation button
        if (!picker.navInterval) {
            // Start navigation interval
            const button = (prevButton || nextButton) as Element;
            const monthContainer = button.closest('.drp__month');
            if (monthContainer && monthContainer instanceof HTMLElement) {
                const monthIndex = parseInt(monthContainer.dataset.monthIndex || '0');
                const isPrev = !!prevButton;

                // Navigate immediately
                if (isPrev) {
                    picker.prevMonth(monthIndex);
                } else {
                    picker.nextMonth(monthIndex);
                }

                // Then continue navigating every 1 second
                picker.navInterval = window.setInterval(() => {
                    if (isPrev) {
                        picker.prevMonth(monthIndex);
                    } else {
                        picker.nextMonth(monthIndex);
                    }
                }, 1000);
            }
        }
        return; // Don't process day hover while over button
    } else {
        // Not over any navigation button - clear interval
        if (picker.navInterval) {
            clearInterval(picker.navInterval);
            picker.navInterval = null;
        }
    }

    // Find the day cell under the pointer (again, search the stack, not just the top).
    const dayElement = findClosest('.drp__day');
    if (!dayElement) return;

    const dateAttr = dayElement.dataset.date;
    if (!dateAttr) return;

    // Parse the date from the day element
    const [year, month, day] = dateAttr.split('-').map(Number);
    let hoveredDate = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based

    // If hovering over a disabled day, snap to nearest enabled date
    if (dayElement.classList.contains('drp__day--disabled')) {
        const direction = picker.draggingType === 'start' ?
            (picker.originalEndDate && hoveredDate > picker.originalEndDate ? 'backward' : 'forward') :
            (picker.originalStartDate && hoveredDate < picker.originalStartDate ? 'forward' : 'backward');
        hoveredDate = findNearestEnabledDate(picker, hoveredDate, direction);
    }

    // Update preview based on what's being dragged
    if (picker.draggingType === 'start' && picker.originalEndDate) {
        picker.dragPreviewStart = hoveredDate;
        picker.dragPreviewEnd = picker.originalEndDate;

        // Swap if start is after end
        if (picker.dragPreviewStart > picker.dragPreviewEnd) {
            [picker.dragPreviewStart, picker.dragPreviewEnd] = [picker.dragPreviewEnd, picker.dragPreviewStart];
            picker.draggingType = 'end'; // Switch which end we're dragging
        }
    } else if (picker.originalStartDate) {
        picker.dragPreviewStart = picker.originalStartDate;
        picker.dragPreviewEnd = hoveredDate;

        // Swap if end is before start
        if (picker.dragPreviewEnd < picker.dragPreviewStart) {
            [picker.dragPreviewStart, picker.dragPreviewEnd] = [picker.dragPreviewEnd, picker.dragPreviewStart];
            picker.draggingType = 'start'; // Switch which end we're dragging
        }
    }

    // Validate drag preview for all modes
    if (picker.dragPreviewStart && picker.dragPreviewEnd) {
        const mode = picker.options.disabledDatesHandling;
        dragLogger.debug('onDragMove - mode:', mode, 'start:', picker.dragPreviewStart, 'end:', picker.dragPreviewEnd);

        if (mode === 'prevent' && picker.hasDisabledDatesInRange(picker.dragPreviewStart, picker.dragPreviewEnd)) {
            dragLogger.debug('PREVENT mode - range contains disabled dates, blocking preview update');
            // Don't update preview if range contains disabled dates
            return;
        }
        // For 'block' mode: Allow preview to span disabled dates (like 'allow' mode)
        // The actual snapping to last enabled date happens in onDragEnd() via validateRangeAsync()
        // For 'allow', 'split', 'individual' modes: no local validation - let preview through
    }

    // Update preview visuals
    picker.updateDragPreview();
}

export async function onDragEnd(picker: any) {
    if (!picker.isDragging) return;

    dragLogger.debug('Ended dragging, finalizing selection');

    // Track whether validation succeeded (for auto-close decision)
    let validationSucceeded = false;

    // Finalize the selection with validation
    if (picker.dragPreviewStart && picker.dragPreviewEnd) {
        // Ensure both dates are enabled (snap if necessary)
        let startDate = findNearestEnabledDate(picker, picker.dragPreviewStart, 'forward');
        let endDate = findNearestEnabledDate(picker, picker.dragPreviewEnd, 'backward');

        // Ensure start is before end after snapping
        if (startDate > endDate) {
            [startDate, endDate] = [endDate, startDate];
        }

        // Validate the range (local + async)
        dragLogger.debug('onDragEnd - calling validateRangeAsync with:', startDate, endDate);
        const validation = await validateRangeAsync(picker, startDate, endDate);
        dragLogger.debug('onDragEnd - validation result:', validation);

        if (!validation.isValid) {
            // Validation failed - restore previous state or clear
            if (validation.message) {
                log.warn('onDragEnd() - drag validation failed:', validation.message);
            }

            // Handle showInvalidRange - keep invalid range visible with error styling
            if (validation.showInvalidRange && validation.invalidStart && validation.invalidEnd) {
                picker.invalidRangeStart = validation.invalidStart;
                picker.invalidRangeEnd = validation.invalidEnd;
                // Clear selected range so blue --in-range styling isn't applied
                picker._selectedStartDate = null;
                picker._selectedEndDate = null;
            }

            // Range was already cleared if action was 'clear'
            validationSucceeded = false;
        } else {
            // Apply validated/adjusted dates (multi-range aware; shared with the
            // click and typed-input commit paths so drag snaps identically).
            const selection = setValidatedRangeSelection(picker, validation, startDate, endDate);
            validationSucceeded = true;

            // Clear any previous error message on successful selection (if no adjustment message)
            if (!validation.message) {
                hideMessage(picker);
            }

            commitInputValue(picker, formatRangeInput(picker));

            // Defer onChange callback if Apply button is required. A multi-range
            // result is delivered as the DateRange[] array; a plain range as {start,end}.
            if (picker.stagesSelection()) {
                picker.pendingSelection = selection;
            } else {
                if (picker.options.onChange) {
                    picker.options.onChange(picker.buildSelectDetail(selection));
                }
            }
        }
    }

    endDragState(picker);

    // Drag commit is a new selection — clear any pinned summary override.
    picker.summaryOverride = null;

    // Re-render to show final selection
    picker.renderCalendar();
    picker.updateSummary();

    // Update focus to the end date after rendering (for drag operations)
    if (picker._selectedEndDate) {
        const finalEndDate = picker._selectedEndDate;
        for (let colIndex = 0; colIndex < picker._monthDates.length; colIndex++) {
            const monthDate = picker._monthDates[colIndex];
            if (finalEndDate.getFullYear() === monthDate.getFullYear() && finalEndDate.getMonth() === monthDate.getMonth()) {
                picker.activeMonthIndex = colIndex;

                const daysContainer = picker.calendar.querySelector(`.drp__days[data-month-index="${colIndex}"]`);
                if (daysContainer) {
                    const days = daysContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');
                    const endDayIndex = Array.from(days).findIndex((day: Element) => {
                        const dateAttr = (day as HTMLElement).dataset.date;
                        if (!dateAttr) return false;
                        const [year, month, dayNum] = dateAttr.split('-').map(Number);
                        const dayDate = new Date(year, month - 1, dayNum); // month is 1-based in data-date, but Date constructor expects 0-based
                        return picker.isSameDay(dayDate, finalEndDate);
                    });
                    if (endDayIndex !== -1) {
                        picker.focusedDayIndex = endDayIndex;
                        // Re-apply the focused class to the correct day
                        days.forEach((day: Element) => day.classList.remove('drp__day--focused'));
                        if (days[endDayIndex]) {
                            (days[endDayIndex] as HTMLElement).classList.add('drp__day--focused');
                        }
                    }
                }
                break;
            }
        }
    }

    // Auto-close after drag if appropriate (but NOT if validation failed - user needs to see error and retry).
    // Applies to floating and modal — inline mode never closes.
    if (picker.options.positioningMode !== 'inline' && picker.shouldAutoClose() && validationSucceeded) {
        picker.close();
    }
}

/** The drag's own state off: flags, previews, the dragging class, the nav repeat, the cursor. */
function endDragState(picker: any) {
    picker.isDragging = false;
    picker.draggingType = null;
    picker.dragPreviewStart = null;
    picker.dragPreviewEnd = null;
    picker.dragRestore = null;

    picker.calendar.querySelectorAll('.drp__day--dragging').forEach((day: Element) => {
        day.classList.remove('drp__day--dragging');
    });

    if (picker.navInterval) {
        clearInterval(picker.navInterval);
        picker.navInterval = null;
    }

    document.body.style.cursor = '';
}

/** Escape during a drag (core `cancelCallback`): drop the preview, the selection goes back to what it was. */
export function abortDrag(picker: any) {
    if (!picker.isDragging) return;
    const restore = picker.dragRestore;
    if (restore) {
        picker._selectedStartDate = restore.start;
        picker._selectedEndDate = restore.end;
        picker._selectedRanges = restore.ranges;
        picker.invalidRangeStart = restore.invalidStart;
        picker.invalidRangeEnd = restore.invalidEnd;
    }
    dragLogger.debug('Drag aborted, selection restored');
    endDragState(picker);
    picker.renderCalendar();
    picker.updateSummary();
}

/**
 * Find nearest enabled date to a given date
 * Searches in preferred direction first, then opposite direction
 */
export function findNearestEnabledDate(picker: any, targetDate: Date, preferredDirection: string = 'forward'): Date {
    const maxDays = 60; // Search up to 60 days in each direction
    let date = new Date(targetDate);
    date.setHours(0, 0, 0, 0);

    // If target date is already enabled, return it
    if (!picker.isDateDisabled(date)) {
        return date;
    }

    // Search in preferred direction
    const primaryOffset = preferredDirection === 'forward' ? 1 : -1;
    for (let i = 1; i <= maxDays; i++) {
        const testDate = new Date(targetDate);
        testDate.setDate(testDate.getDate() + (i * primaryOffset));
        testDate.setHours(0, 0, 0, 0);

        if (!picker.isDateDisabled(testDate)) {
            return testDate;
        }
    }

    // Search in opposite direction
    const secondaryOffset = -primaryOffset;
    for (let i = 1; i <= maxDays; i++) {
        const testDate = new Date(targetDate);
        testDate.setDate(testDate.getDate() + (i * secondaryOffset));
        testDate.setHours(0, 0, 0, 0);

        if (!picker.isDateDisabled(testDate)) {
            return testDate;
        }
    }

    // No enabled date found, return original
    return targetDate;
}

// === INPUT MASKING ===

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every character the shown mask writes around the date parts (`.` and ` ` for `DD. MM. YYYY`). */
function maskLiteralChars(picker: any): string {
    return [...new Set((picker.formatInfo.literals as string[]).join(''))].join('');
}

export function handleInputMask(picker: any, event: Event) {
    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const currentCursorPos = input.selectionStart || 0;

    // Get previous value (stored before this input event)
    const previousValue = picker._previousInputValue || '';
    const wasDeleting = currentValue.length < previousValue.length;

    const literalChars = escapeRegExp(maskLiteralChars(picker));

    // For range mode, handle " - " separator
    if (picker.options.selectionMode === 'range') {
        // Keep digits, the mask's literal characters, and allow '-' with spaces
        const cleanValue = currentValue.replace(new RegExp(`[^0-9${literalChars}\\- ]`, 'g'), '');

        // Apply range mask
        const formatted = computeMaskedRangeValue(picker, cleanValue);

        if (formatted !== currentValue) {
            input.value = formatted;

            // Calculate new cursor position
            let newCursorPos = currentCursorPos;

            if (wasDeleting) {
                newCursorPos = currentCursorPos;
            } else if (formatted.length > currentValue.length) {
                // Check if " - " was just inserted
                if (formatted.includes(' - ') && !currentValue.includes(' - ')) {
                    // " - " was auto-inserted, move cursor after it
                    const dashIndex = formatted.indexOf(' - ');
                    if (currentCursorPos >= dashIndex && currentCursorPos <= dashIndex + 3) {
                        newCursorPos = dashIndex + 3; // Move after " - "
                    } else {
                        newCursorPos = currentCursorPos + (formatted.length - currentValue.length);
                    }
                } else {
                    // Regular separator insertion
                    newCursorPos = currentCursorPos + (formatted.length - currentValue.length);
                }
            }

            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    } else {
        // Single date mode
        const cleanValue = currentValue.replace(new RegExp(`[^0-9${literalChars}]`, 'g'), '');
        const formatted = computeMaskedValue(picker, cleanValue);

        if (formatted !== currentValue) {
            input.value = formatted;

            let newCursorPos = currentCursorPos;

            if (!wasDeleting && formatted.length > currentValue.length) {
                // Keep the caret after the same digit, then step over the literal text
                // the mask just inserted (`17` → `17. ` puts the caret after the space).
                const digitsBefore = currentValue.substring(0, currentCursorPos).replace(/\D/g, '').length;
                let pos = 0;
                for (let seen = 0; pos < formatted.length && seen < digitsBefore; pos++) {
                    if (/\d/.test(formatted[pos])) seen++;
                }
                while (pos < formatted.length && !/\d/.test(formatted[pos])) pos++;
                newCursorPos = pos;
            }

            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    }

    // Store current value for next time
    picker._previousInputValue = input.value;

    // Update calendar if a valid date was typed
    updateCalendarFromInput(picker);
}

export function computeMaskedValue(picker: any, value: string): string {
    const { literals, parts, maxLength } = picker.formatInfo;

    // Remove the literal text for clean processing
    const digitsOnly = value.replace(/\D/g, '');

    // Calculate segment lengths
    const yearLen = parts.year ? parts.year.length : 4;
    const segments = [
        { type: 'year', pos: parts.year?.index ?? 0, length: yearLen },
        { type: 'month', pos: parts.month?.index ?? 1, length: 2 },
        { type: 'day', pos: parts.day?.index ?? 2, length: 2 }
    ].sort((a, b) => a.pos - b.pos);

    let result = '';
    let digitIndex = 0;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentValue = digitsOnly.substring(digitIndex, digitIndex + segment.length);

        if (!segmentValue) break;

        if (i === 0) result += literals[0];
        result += segmentValue;
        digitIndex += segmentValue.length;

        // A complete segment gets the literal after it (the mask's trailing one after the last)
        if (segmentValue.length === segment.length) {
            result += literals[i + 1];
        }
    }

    // Limit to max length
    return result.substring(0, maxLength);
}

export function computeMaskedRangeValue(picker: any, value: string): string {
    const { maxLength } = picker.formatInfo;

    // Canonical range separator is " - " (mirrors the committed value form).
    // We also accept a bare "-" without spaces (e.g. pasted "2026-06-10-2026-06-15"):
    // once the start side reaches maxLength, anything that follows is treated as
    // the end side with any leading dashes/whitespace stripped.
    const RANGE_SEP = ' - ';
    let startPart = '';
    let endPart = '';
    let hasExplicitSep = false;

    const sepIndex = value.indexOf(RANGE_SEP);
    if (sepIndex !== -1) {
        startPart = value.substring(0, sepIndex);
        endPart = value.substring(sepIndex + RANGE_SEP.length);
        hasExplicitSep = true;
    } else if (value.length > maxLength) {
        startPart = value.substring(0, maxLength);
        endPart = value.substring(maxLength).replace(/^[-\s]+/, '');
        hasExplicitSep = true;
    } else {
        startPart = value;
    }

    const formattedStart = computeMaskedValue(picker, startPart);

    if (formattedStart.length === maxLength) {
        if (!hasExplicitSep) {
            return formattedStart + RANGE_SEP;
        }
        const formattedEnd = computeMaskedValue(picker, endPart);
        return formattedStart + RANGE_SEP + formattedEnd;
    }
    return formattedStart;
}

/**
 * True when plain Home/End should move the text caret in an input rather than
 * navigate the calendar: the target is an editable input holding text and the
 * caret is not already at the relevant boundary (or a selection spans, which the
 * browser should collapse). Callers must then NOT preventDefault and NOT
 * navigate — the calendar only takes Home/End once the caret sits at the edge.
 * Matters most for the `show-fullscreen-input` header field, where the user is typing
 * a date. Ctrl/Cmd+Home/End stays calendar year-jump. Mirrors web-multiselect's
 * caret-aware Home/End (core rc08 companion fix).
 */
export function inputOwnsCaretKey(event: KeyboardEvent): boolean {
    const { key, ctrlKey, metaKey, target } = event;
    if (ctrlKey || metaKey) return false;
    if (key !== 'Home' && key !== 'End') return false;
    if (!(target instanceof HTMLInputElement)) return false;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (start !== end) return true;              // a spanning selection — let the browser handle it
    if (target.value.length === 0) return false; // empty field — navigate the calendar
    return key === 'Home' ? start > 0 : end < target.value.length;
}

export function handleKeydown(picker: any, event: KeyboardEvent) {
    if (isImeEnter(event)) return; // the IME confirming / choosing a candidate — not ours
    const { key, ctrlKey, metaKey } = event;
    const { separator } = picker.formatInfo;
    // Enter in the input confirms a staged pick in `commit-mode="apply"` — the Apply
    // button's job (a typed date is staged like a clicked one). `manual` leaves
    // committing to the app's `commit()`.
    if (key === 'Enter' && picker.options.commitMode === 'apply' && picker.hasPendingSelection) {
        event.preventDefault();
        event.stopPropagation();
        picker.commit();
        return;
    }
    // Escape with the calendar closed discards a change staged for Apply / commit() (an open
    // calendar: its own Escape closes it, and closing discards). One level per press.
    if (key === 'Escape' && !picker.calendar.classList.contains('drp__picker--visible') && picker.discardStaged()) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    // Any character the mask writes (`.` / ` ` for `DD. MM. YYYY`) may be typed.
    const isLiteralKey = key.length === 1 && maskLiteralChars(picker).includes(key);

    // If calendar is open, let document handler deal with navigation keys —
    // except plain Home/End that should first move the caret in a typed input.
    if (picker.calendar.classList.contains('drp__picker--visible')) {
        if (inputOwnsCaretKey(event)) {
            return; // let the browser move the caret; don't preventDefault, don't navigate
        }
        const navigationKeys = ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
        if (navigationKeys.includes(key)) {
            event.preventDefault(); // Prevent default input behavior
            return; // Let document handler manage calendar navigation
        }
    }

    // Allow: Backspace, Delete, Tab, Escape, Enter, Arrows, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                         'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

    if (allowedKeys.includes(key) || ctrlKey || metaKey) {
        return; // Allow these keys
    }

    // Auto-pad single digit with leading zero when separator is pressed
    if (key === separator) {
        const input = event.target as HTMLInputElement;
        const cursorPos = input.selectionStart || 0;
        const currentValue = input.value;

        // Find the start of the current segment (after last separator or start of string)
        let segmentStart = 0;
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (!/\d/.test(currentValue[i])) {
                segmentStart = i + 1;
                break;
            }
        }

        // Extract the current segment
        const segment = currentValue.substring(segmentStart, cursorPos);

        // If segment is a single digit, prepend a 0
        if (/^\d$/.test(segment)) {
            event.preventDefault();

            const newValue = currentValue.substring(0, segmentStart) +
                           '0' + segment +
                           separator +
                           currentValue.substring(cursorPos);

            input.value = newValue;

            // Position cursor after the separator
            const newCursorPos = segmentStart + 2 + separator.length; // 0 + digit + separator
            input.setSelectionRange(newCursorPos, newCursorPos);

            // Store updated value for deletion tracking
            picker._previousInputValue = newValue;

            // Trigger input event to apply mask and update calendar
            input.dispatchEvent(new Event('input', { bubbles: true }));

            return;
        }
        // Otherwise allow normal separator insertion (will be handled by input mask)
    }

    // For range mode, also allow space and '-' (for " - ")
    if (picker.options.selectionMode === 'range') {
        if (!/^\d$/.test(key) && !isLiteralKey && key !== ' ' && key !== '-') {
            event.preventDefault();
        }
    } else {
        // For single mode, allow only digits and the mask's literal characters
        if (!/^\d$/.test(key) && !isLiteralKey) {
            event.preventDefault();
        }
    }
}

export function handlePaste(picker: any, event: ClipboardEvent) {
    event.preventDefault();

    const pastedText = readPasteText(event);
    // Clean pasted content: keep only digits and the mask's literal characters
    const cleaned = pastedText.replace(new RegExp(`[^0-9${escapeRegExp(maskLiteralChars(picker))}]`, 'g'), '');

    // Apply mask to cleaned content
    const formatted = computeMaskedValue(picker, cleaned);

    // Insert formatted text at cursor position
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = input.value;

    const newValue = currentValue.substring(0, start) + formatted + currentValue.substring(end);
    input.value = computeMaskedValue(picker, newValue);

    // Set cursor after pasted content
    const newCursorPos = start + formatted.length;
    input.setSelectionRange(newCursorPos, newCursorPos);

    // Trigger input event to ensure any validation runs
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Update calendar if a valid date was pasted
    updateCalendarFromInput(picker);
}

export function updateCalendarFromInput(picker: any) {
    // Parse current input value and update calendar progressively
    if (!picker.input) return;

    // Time/datetime modes do not implement input parsing in v1. The committed
    // selection on the picker is authoritative; bailing out preserves the time
    // component across reopens (date-only parsing would silently zero it).
    if (picker.options.pickerMode !== 'date') {
        return;
    }

    const value = picker.input.value;
    interactionLogger.debug('updateCalendarFromInput - value:', value);

    if (!value) {
        // Input is empty — the user cleared it: a clear is a change (committed / staged).
        clearByUser(picker);
        picker.renderCalendar();
        return;
    }

    const { separator, parts, maxLength } = picker.formatInfo;
    interactionLogger.debug('Format info:', { separator, parts, maxLength });

    // For range mode, split on " - " (canonical) or the position right after the
    // start date when the user used a bare "-" without spaces.
    if (picker.options.selectionMode === 'range') {
        let startValue: string | null = null;
        let endValue = '';

        const sepIndex = value.indexOf(' - ');
        if (sepIndex !== -1) {
            startValue = value.substring(0, sepIndex);
            endValue = value.substring(sepIndex + 3);
        } else if (value.length > maxLength) {
            startValue = value.substring(0, maxLength);
            endValue = value.substring(maxLength).replace(/^[-\s]+/, '');
        }

        if (startValue !== null) {
            interactionLogger.debug('Range parts - start:', startValue, 'end:', endValue);
            const beforeStart: Date | null = picker._selectedStartDate;
            const beforeEnd: Date | null = picker._selectedEndDate;
            const beforeRanges = picker._selectedRanges;
            const isStartComplete = parseAndUpdateSingleDate(picker, startValue, 'start');
            let isEndComplete = false;
            if (endValue) {
                isEndComplete = parseAndUpdateSingleDate(picker, endValue, 'end');
            } else {
                picker._selectedEndDate = null;
            }
            // Both endpoints fully typed → run the validation gate (callback +
            // adjustedRanges), matching the click / drag commit paths.
            if (isStartComplete && isEndComplete && picker._selectedStartDate && picker._selectedEndDate) {
                // The text re-parsed to the range already selected (opening the calendar
                // syncs from the input, a digit past the mask) — no new pick: keep its
                // committed result (multi-range / split) and fire nothing, like the single path.
                if (beforeStart && beforeEnd &&
                    picker.isSameDay(beforeStart, picker._selectedStartDate) &&
                    picker.isSameDay(beforeEnd, picker._selectedEndDate)) {
                    picker._selectedRanges = beforeRanges;
                    picker.renderCalendar();
                    return;
                }
                void commitTypedRange(picker);
            }
            return;
        }
    }

    // Single mode or range without separator yet
    // Use helper to parse and update
    const dateType = picker.options.selectionMode === 'range' ? 'start' : 'single';
    const before: Date | null = picker._selectedDate;
    const isComplete = parseAndUpdateSingleDate(picker, value, dateType);
    // A complete single date is a pick — commit it like a day click (single mode
    // mirrors the typed-range path above). Re-typing the date already selected
    // (or a digit past the mask) is no new pick.
    if (dateType === 'single' && isComplete && !(before && picker.isSameDay(before, picker._selectedDate))) {
        void commitTypedSingle(picker, picker._selectedDate);
    }
}

export function parseAndUpdateSingleDate(picker: any, value: string, dateType: string = 'single'): boolean {
    // Helper to parse a single date string and update calendar.
    // dateType: 'single', 'start', or 'end'.
    // Returns true when a COMPLETE, valid date was parsed and applied.
    const { parts } = picker.formatInfo;

    // The digit groups in written order — the literal text between them may be anything
    // (`17. 11. 2026`, `11/17/2026`, or `17.11.2026` typed without the mask's spaces).
    const segments: string[] = value.match(/\d+/g) ?? [];
    // More than one date's worth of digits (e.g. range text left over after a mode flip) is no single date.
    if (segments.length > 3) return false;
    let year: number | null = null;
    let month: number | null = null;
    let day: number | null = null;

    segments.forEach((segment, index) => {
        if (!segment) return;

        if (parts.year && parts.year.index === index) {
            const yearValue = parseInt(segment, 10);
            if (parts.year.length === 4 && segment.length === 4) {
                year = yearValue;
            } else if (parts.year.length === 2 && segment.length === 2) {
                year = yearValue < 100 ? yearValue + 2000 : yearValue;
            }
        } else if (parts.month && parts.month.index === index) {
            const monthValue = parseInt(segment, 10);
            if (segment.length === 2 && monthValue >= 1 && monthValue <= 12) {
                month = monthValue;
            }
        } else if (parts.day && parts.day.index === index) {
            const dayValue = parseInt(segment, 10);
            if (segment.length === 2 && dayValue >= 1 && dayValue <= 31) {
                day = dayValue;
            }
        }
    });

    interactionLogger.debug(`parseAndUpdateSingleDate(${dateType}) - year:`, year, 'month:', month, 'day:', day);

    // Update calendar display if we have year or month
    if (year !== null || month !== null) {
        const newYear = year || new Date().getFullYear();
        const newMonth = month !== null ? month - 1 : new Date().getMonth();

        if (picker.options.selectionMode === 'single') {
            picker._monthDates = [];
            for (let i = 0; i < picker.options.visibleMonthCount; i++) {
                const date = new Date(newYear, newMonth + i, 1);
                picker._monthDates.push(date);
            }
        } else if (picker.options.selectionMode === 'range') {
            // For start date or first date typed, rebuild the month anchor for
            // ALL configured slots (not just 1–2, which crashed on 3+ month
            // layouts like a 2×3 grid → 6 columns).
            if (dateType === 'start' || !picker._selectedStartDate) {
                picker._monthDates = [];
                for (let i = 0; i < picker.options.visibleMonthCount; i++) {
                    picker._monthDates.push(new Date(newYear, newMonth + i, 1));
                }
            }
        }

        picker.renderCalendar();
    }

    // Update selected date if we have complete date
    if (year !== null && month !== null && day !== null) {
        const date = new Date(year, month - 1, day);
        if (date.getMonth() === month - 1) { // Validates date
            // Typing a new date is a selection change — clear any pinned summary
            // override and any prior multi-range result (typed input doesn't run
            // the select callback, so it can't re-derive a split).
            picker.summaryOverride = null;
            picker._selectedRanges = [];
            if (dateType === 'single') {
                picker._selectedDate = date;
            } else if (dateType === 'start') {
                picker._selectedStartDate = date;
            } else if (dateType === 'end') {
                picker._selectedEndDate = date;
            }
            picker.renderCalendar();

            // Update summary for range mode when both dates are complete
            if (picker.options.selectionMode === 'range') {
                picker.updateSummary();
            }

            interactionLogger.debug(`Set ${dateType} date:`, date);
            return true;
        }
    }
    return false;
}

/**
 * A typed single date just became complete — the same commit as a day click
 * (`selectDay`): beforeSelectCallback (reject / adjust), then written + `change` in
 * `commit-mode="selection"`, or staged for Apply / `commit()` otherwise. The
 * calendar stays open (the user is in the input, like the typed range).
 */
async function commitTypedSingle(picker: any, date: Date) {
    const result = await callBeforeSelectCallback(picker, date);
    // The text moved on while the callback ran — the newer input wins.
    if (!picker._selectedDate || !picker.isSameDay(picker._selectedDate, date)) return;
    if (!result.isValid) {
        picker._selectedDate = null;
        picker.renderCalendar();
        return;
    }
    if (!result.message) hideMessage(picker);

    const finalDate = result.adjustedDate || date;
    picker._selectedDate = finalDate;
    if (!picker.isSameDay(finalDate, date) && picker.input) {
        // The adjusted date replaces the typed text (staged too — it's what's selected).
        picker.input.value = picker.formatDate(finalDate);
        picker._previousInputValue = picker.input.value;
    }

    if (picker.stagesSelection()) {
        picker.pendingSelection = finalDate;
    } else if (picker.options.onChange) {
        picker.options.onChange(picker.buildSelectDetail(finalDate));
    }
    picker.renderCalendar();
}

/**
 * A typed range just became complete — run the same validation gate as click /
 * drag so beforeSelectCallback fires and its result (adjustedRanges, adjust,
 * restore, clear) is honored. Async; guarded against overlapping runs.
 */
async function commitTypedRange(picker: any) {
    if (picker._committingTypedRange) return;
    picker._committingTypedRange = true;

    // Normalize order (the user may type end-before-start).
    let startDate = picker._selectedStartDate;
    let endDate = picker._selectedEndDate;
    if (startDate > endDate) { [startDate, endDate] = [endDate, startDate]; }

    try {
        const validation = await validateRangeAsync(picker, startDate, endDate);

        if (!validation.isValid) {
            if (validation.showInvalidRange && validation.invalidStart && validation.invalidEnd) {
                picker.invalidRangeStart = validation.invalidStart;
                picker.invalidRangeEnd = validation.invalidEnd;
                picker._selectedStartDate = null;
                picker._selectedEndDate = null;
            }
            picker._selectedRanges = [];
            picker.renderCalendar();
            picker.updateSummary();
            return;
        }

        const selection = setValidatedRangeSelection(picker, validation, startDate, endDate);
        if (!validation.message) hideMessage(picker);
        commitInputValue(picker, formatRangeInput(picker));

        if (picker.stagesSelection()) {
            picker.pendingSelection = selection;
        } else if (picker.options.onChange) {
            picker.options.onChange(picker.buildSelectDetail(selection));
        }

        picker.renderCalendar();
        picker.updateSummary();
    } finally {
        picker._committingTypedRange = false;
    }
}
