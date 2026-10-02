/**
 * Date Picker Interaction Methods
 *
 * Functions for interaction logic including drag functionality
 * and input masking.
 */

import { validateRangeAsync, commitInputValue, applyValidatedRangeSelection, formatRangeInput } from './date-picker-selection';
import { hideMessage } from './date-picker-ui';
import { dragLogger, interactionLogger } from './logger';
import log from './logger';

// === DRAG FUNCTIONALITY ===

export function initDragListeners(picker: any) {
    // For range mode, add pointerdown listeners to ALL enabled days. Pointer events
    // unify mouse, touch, and pen, so drag-to-adjust works with a finger too.
    // This allows drawing a range from scratch (mouse/pen) or adjusting an endpoint,
    // detecting an actual drag vs a click/tap via a small movement threshold.
    if (picker.options.selectionMode === 'range') {
        const allDays = picker.calendar.querySelectorAll('.drp__day:not(.drp__day--disabled)');

        allDays.forEach(day => {
            day.addEventListener('pointerdown', (e) => {
                // Selection lock: a drag adjusts the range, so freeze it here (the
                // click fallback is separately gated in the calendar click handler).
                if (picker.isAspectLocked('selection')) return;
                const pe = e as PointerEvent;
                const dayElement = day as HTMLElement;

                // Determine drag type based on what's grabbed and what's selected.
                const isRangeStart = dayElement.classList.contains('drp__day--range-start');
                const isRangeEnd = dayElement.classList.contains('drp__day--range-end');
                const isEndpoint = isRangeStart || isRangeEnd;

                // On TOUCH, only an existing range endpoint starts a drag — otherwise a
                // swipe on a day must stay free to scroll the month list (modal/full-
                // screen), and tap-tap still creates ranges. The endpoint cells carry
                // `touch-action: none` (see calendar-grid.css) so their drag doesn't
                // scroll. Mouse/pen keep the draw-from-scratch behaviour on any day.
                if (pe.pointerType === 'touch' && !(isEndpoint && picker._selectedStartDate && picker._selectedEndDate)) {
                    return;
                }

                // Store initial position to detect actual dragging
                const startX = pe.clientX;
                const startY = pe.clientY;
                const pointerId = pe.pointerId;
                const dragThreshold = 5; // pixels

                let hasMoved = false;
                let dragStarted = false;

                let dragType: 'start' | 'end';
                if (isRangeStart && picker._selectedStartDate && picker._selectedEndDate) {
                    dragType = 'start';
                } else if (isRangeEnd && picker._selectedStartDate && picker._selectedEndDate) {
                    dragType = 'end';
                } else {
                    // Drawing from scratch - set as start point
                    dragType = 'start';
                }

                // Listen for pointer movement (same pointer only)
                const onPointerMove = (moveEvent: PointerEvent) => {
                    if (moveEvent.pointerId !== pointerId) return;
                    const deltaX = Math.abs(moveEvent.clientX - startX);
                    const deltaY = Math.abs(moveEvent.clientY - startY);

                    // Check if moved beyond threshold
                    if (!hasMoved && (deltaX > dragThreshold || deltaY > dragThreshold)) {
                        hasMoved = true;
                    }

                    // Start dragging if we've moved and haven't started yet
                    if (hasMoved && !dragStarted) {
                        dragStarted = true;
                        // Now start the drag (this will add its own move/up listeners)
                        // Pass the dayElement we have in scope instead of relying on event.currentTarget
                        startDrag(picker, moveEvent, dragType, dayElement);
                        cleanup();
                    }
                };

                const onPointerUp = () => {
                    // Released without movement - this is a click/tap, not a drag.
                    // Clean up and let the click event handler in date-picker.ts run.
                    cleanup();
                };

                const cleanup = () => {
                    document.removeEventListener('pointermove', onPointerMove);
                    document.removeEventListener('pointerup', onPointerUp);
                    document.removeEventListener('pointercancel', onPointerUp);
                };

                // Add temporary listeners to detect movement
                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
                document.addEventListener('pointercancel', onPointerUp);
            });
        });
    }
}

export function startDrag(picker: any, event: PointerEvent, type: 'start' | 'end', dayElement: HTMLElement) {
    event.preventDefault();
    event.stopPropagation();

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

    // Take explicit pointer capture on the STABLE calendar element. A touch pointer
    // gets an *implicit* capture on the day cell under the finger; once the drag
    // starts (and preview classes churn on that cell) it stops delivering moves
    // reliably, so onDragMove would fire only once. Re-capturing to the calendar —
    // which never leaves the DOM mid-drag — keeps pointermove/up/cancel flowing.
    // Captured events still bubble to document, so the listeners below cover mouse
    // (no capture, events land on document) and touch/pen alike; elementFromPoint is
    // geometric, so day-under-finger detection is unaffected.
    picker.dragPointerId = event.pointerId;
    try { picker.calendar.setPointerCapture?.(event.pointerId); } catch { /* older engines */ }

    // Add document-level pointer listeners (mouse, touch, and pen). pointercancel
    // (e.g. the OS interrupting a touch) finalizes like a release.
    picker.onDragMoveBound = (e: PointerEvent) => onDragMove(picker, e);
    picker.onDragEndBound = async (e: PointerEvent) => await onDragEnd(picker, e);
    document.addEventListener('pointermove', picker.onDragMoveBound);
    document.addEventListener('pointerup', picker.onDragEndBound);
    document.addEventListener('pointercancel', picker.onDragEndBound);

    // Change body cursor
    document.body.style.cursor = 'grabbing';
}

export function onDragMove(picker: any, event: PointerEvent) {
    if (!picker.isDragging) return;

    // Hit-test the point under the pointer. We scan the WHOLE stack (elementsFromPoint)
    // rather than trusting the topmost element: a shadow <slot> (and other overlays)
    // can paint above the day cells, so `elements[0]` is often the slot — searching
    // the stack for the day/nav is what makes drag detection reliable (this also fixed
    // intermittent mouse drags that happened to land on the slot pixel).
    const canShadowHitTest = picker.containerElement instanceof ShadowRoot && 'elementsFromPoint' in picker.containerElement;
    const stack: Element[] = canShadowHitTest
        ? (picker.containerElement as any).elementsFromPoint(event.clientX, event.clientY)
        : document.elementsFromPoint(event.clientX, event.clientY);
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

export async function onDragEnd(picker: any, event: PointerEvent) {
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
            const selection = applyValidatedRangeSelection(picker, validation, startDate, endDate);
            validationSucceeded = true;

            // Clear any previous error message on successful selection (if no adjustment message)
            if (!validation.message) {
                hideMessage(picker);
            }

            commitInputValue(picker, formatRangeInput(picker));

            // Defer onSelect callback if Apply button is required. A multi-range
            // result is delivered as the DateRange[] array; a plain range as {start,end}.
            if (picker.requiresApplyButton()) {
                picker.pendingSelection = selection;
            } else {
                if (picker.options.onSelect) {
                    picker.options.onSelect(selection, picker.buildSelectDetail(selection));
                }
            }
        }
    }

    // Clean up
    picker.isDragging = false;
    picker.draggingType = null;
    picker.dragPreviewStart = null;
    picker.dragPreviewEnd = null;

    // Remove dragging class
    picker.calendar.querySelectorAll('.drp__day--dragging').forEach(day => {
        day.classList.remove('drp__day--dragging');
    });

    // Release the calendar's pointer capture taken in startDrag.
    if (picker.dragPointerId != null) {
        try { picker.calendar.releasePointerCapture?.(picker.dragPointerId); } catch { /* already released */ }
        picker.dragPointerId = null;
    }

    // Remove document-level listeners
    if (picker.onDragMoveBound) {
        document.removeEventListener('pointermove', picker.onDragMoveBound);
    }
    if (picker.onDragEndBound) {
        document.removeEventListener('pointerup', picker.onDragEndBound);
        document.removeEventListener('pointercancel', picker.onDragEndBound);
    }

    // Clear navigation interval
    if (picker.navInterval) {
        clearInterval(picker.navInterval);
        picker.navInterval = null;
    }

    // Reset body cursor
    document.body.style.cursor = '';

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

export function handleInputMask(picker: any, event: Event) {
    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const currentCursorPos = input.selectionStart || 0;

    // Get previous value (stored before this input event)
    const previousValue = picker._previousInputValue || '';
    const wasDeleting = currentValue.length < previousValue.length;

    const { separator } = picker.formatInfo;

    // For range mode, handle " - " separator
    if (picker.options.selectionMode === 'range') {
        // Keep digits, date separators, and allow '-' with spaces
        const cleanValue = currentValue.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\- ]`, 'g'), '');

        // Apply range mask
        const formatted = applyRangeMask(picker, cleanValue);

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
        // Single date mode - original logic
        const cleanValue = currentValue.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), '');
        const formatted = applyMask(picker, cleanValue);

        if (formatted !== currentValue) {
            input.value = formatted;

            let newCursorPos = currentCursorPos;

            if (wasDeleting) {
                newCursorPos = currentCursorPos;
            } else if (formatted.length > currentValue.length && formatted[currentCursorPos] === separator) {
                newCursorPos = currentCursorPos + 1;
            } else if (formatted.length > currentValue.length) {
                const oldSeparatorsBefore = (currentValue.substring(0, currentCursorPos).match(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                const newSeparatorsBefore = (formatted.substring(0, currentCursorPos).match(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                const separatorDiff = newSeparatorsBefore - oldSeparatorsBefore;
                newCursorPos = currentCursorPos + separatorDiff;
            }

            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    }

    // Store current value for next time
    picker._previousInputValue = input.value;

    // Update calendar if a valid date was typed
    updateCalendarFromInput(picker);
}

export function applyMask(picker: any, value: string): string {
    const { separator, parts, maxLength } = picker.formatInfo;

    // Remove existing separators for clean processing
    const digitsOnly = value.replace(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');

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

        result += segmentValue;
        digitIndex += segmentValue.length;

        // Add separator after this segment (except after last segment)
        if (i < segments.length - 1 && segmentValue.length === segment.length) {
            result += separator;
        }
    }

    // Limit to max length
    return result.substring(0, maxLength);
}

export function applyRangeMask(picker: any, value: string): string {
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

    const formattedStart = applyMask(picker, startPart);

    if (formattedStart.length === maxLength) {
        if (!hasExplicitSep) {
            return formattedStart + RANGE_SEP;
        }
        const formattedEnd = applyMask(picker, endPart);
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
 * Matters most for the `fullscreen-input` header field, where the user is typing
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
    const { key, ctrlKey, metaKey } = event;
    const { separator } = picker.formatInfo;

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
            if (currentValue[i] === separator || currentValue[i] === ' ') {
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
        if (!/^\d$/.test(key) && key !== separator && key !== ' ' && key !== '-') {
            event.preventDefault();
        }
    } else {
        // For single mode, allow only digits and separator
        if (!/^\d$/.test(key) && key !== separator) {
            event.preventDefault();
        }
    }
}

export function handlePaste(picker: any, event: ClipboardEvent) {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') || '';
    const { separator } = picker.formatInfo;

    // Clean pasted content: keep only digits and separators
    const cleaned = pastedText.replace(new RegExp(`[^0-9${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), '');

    // Apply mask to cleaned content
    const formatted = applyMask(picker, cleaned);

    // Insert formatted text at cursor position
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = input.value;

    const newValue = currentValue.substring(0, start) + formatted + currentValue.substring(end);
    input.value = applyMask(picker, newValue);

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
        // Input is empty - clear selection to sync with empty input
        picker.clearSelection();
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
            const startComplete = parseAndUpdateSingleDate(picker, startValue, 'start');
            let endComplete = false;
            if (endValue) {
                endComplete = parseAndUpdateSingleDate(picker, endValue, 'end');
            } else {
                picker._selectedEndDate = null;
            }
            // Both endpoints fully typed → run the validation gate (callback +
            // adjustedRanges), matching the click / drag commit paths.
            if (startComplete && endComplete && picker._selectedStartDate && picker._selectedEndDate) {
                void commitTypedRange(picker);
            }
            return;
        }
    }

    // Single mode or range without separator yet
    // Use helper to parse and update
    const dateType = picker.options.selectionMode === 'range' ? 'start' : 'single';
    parseAndUpdateSingleDate(picker, value, dateType);
}

export function parseAndUpdateSingleDate(picker: any, value: string, dateType: string = 'single'): boolean {
    // Helper to parse a single date string and update calendar.
    // dateType: 'single', 'start', or 'end'.
    // Returns true when a COMPLETE, valid date was parsed and applied.
    const { separator, parts, maxLength } = picker.formatInfo;

    const segments = value.split(separator);
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
            for (let i = 0; i < picker.options.visibleMonthsCount; i++) {
                const date = new Date(newYear, newMonth + i, 1);
                picker._monthDates.push(date);
            }
        } else if (picker.options.selectionMode === 'range') {
            // For start date or first date typed, rebuild the month anchor for
            // ALL configured slots (not just 1–2, which crashed on 3+ month
            // layouts like a 2×3 grid → 6 columns).
            if (dateType === 'start' || !picker._selectedStartDate) {
                picker._monthDates = [];
                for (let i = 0; i < picker.options.visibleMonthsCount; i++) {
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
 * A typed range just became complete — run the same validation gate as click /
 * drag so beforeDateSelectCallback fires and its result (adjustedRanges, adjust,
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

        const selection = applyValidatedRangeSelection(picker, validation, startDate, endDate);
        if (!validation.message) hideMessage(picker);
        commitInputValue(picker, formatRangeInput(picker));

        if (picker.requiresApplyButton()) {
            picker.pendingSelection = selection;
        } else if (picker.options.onSelect) {
            picker.options.onSelect(selection, picker.buildSelectDetail(selection));
        }

        picker.renderCalendar();
        picker.updateSummary();
    } finally {
        picker._committingTypedRange = false;
    }
}
