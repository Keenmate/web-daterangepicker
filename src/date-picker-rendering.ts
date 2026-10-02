/**
 * Date Picker Rendering Methods
 *
 * Functions that handle calendar rendering.
 * Each function accepts the picker instance as the first parameter.
 */

import { hasEnabledDaysInMonth } from './date-picker-navigation';
import { hasEnabledDaysInYear } from './date-picker-validation';
import * as Validation from './date-picker-validation';
import { renderingLogger } from './logger';

/**
 * Parse year range string to min/max values
 * @param range - Examples: "2024" (single year), "2022-2026" (range)
 * @param currentYear - Current year for default range
 * @param picker - Picker instance to check for minDate/maxDate constraints
 * @returns { min: number, max: number }
 */
export function parseYearRange(range: string | undefined, currentYear: number, picker?: any): { min: number, max: number } {
    if (!range) {
        // If no explicit range but minDate/maxDate are set, use those to constrain years
        if (picker?.normalizedMinDate || picker?.normalizedMaxDate) {
            const minYear = picker.normalizedMinDate ? picker.normalizedMinDate.getFullYear() : currentYear - 1;
            const maxYear = picker.normalizedMaxDate ? picker.normalizedMaxDate.getFullYear() : currentYear + 1;
            return { min: minYear, max: maxYear };
        }
        // Default: current year ± 1 year (total 3 years)
        return { min: currentYear - 1, max: currentYear + 1 };
    }

    if (range.includes('-')) {
        // Range format: "2022-2026"
        const [minStr, maxStr] = range.split('-');
        return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
    } else {
        // Single year: "2024"
        const year = parseInt(range, 10);
        return { min: year, max: year };
    }
}

/**
 * Parse month range string to min/max values
 * @param range - Examples: "01-12" (all months), "06-08" (summer), "11-12" (year-end)
 * @returns { min: number, max: number } - Month numbers (1-12)
 */
export function parseMonthRange(range: string | undefined): { min: number, max: number } {
    if (!range) {
        // Default: all months
        return { min: 1, max: 12 };
    }

    const [minStr, maxStr] = range.split('-');
    return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
}

export function renderCalendar(picker: any) {
    renderingLogger.debug(`[DatePicker 18] renderCalendar called, rollingSelectorOpenByColumn:`, picker.rollingSelectorOpenByColumn, `activeCol: ${picker.activeMonthIndex}`);
    renderingLogger.debug('[DatePicker 18] monthDates array:', picker._monthDates.map((d: Date, i: number) => `Col${i}: ${d.getFullYear()}-${d.getMonth()+1}`).join(', '));

    // Handle unified rolling selector (if enabled)
    if (picker.options.isUnifiedNavigationEnabled && picker.isUnifiedRollingSelectorOpen) {
        renderUnifiedRollingSelector(picker);
    }

    // Time picker (time / datetime modes). Lives outside the month loop —
    // datetime mode also runs the loop below to draw the calendar grid.
    // Dispatch on timeDisplay: 'rolls' (default) → renderTimePicker,
    // 'clock' → renderClockPicker (Material-style two-step face, v1.15),
    // 'wheel' → renderWheelPicker (iOS-style barrel, v1.15),
    // 'compact' → renderCompactPicker (iOS 14+ pills, v1.15).
    if (picker.options.pickerMode === 'time' || picker.options.pickerMode === 'datetime') {
        if (picker.options.timeDisplay === 'clock') {
            renderClockPicker(picker);
        } else if (picker.options.timeDisplay === 'wheel') {
            renderWheelPicker(picker);
        } else if (picker.options.timeDisplay === 'compact') {
            renderCompactPicker(picker);
        } else {
            renderTimePicker(picker);
        }
    }

    // Render each month (skipped entirely in time-only mode — no DOM to render)
    if (picker.options.pickerMode !== 'time') {
        for (let i = 0; i < picker.options.visibleMonthsCount; i++) {
            if (picker.rollingSelectorOpenByColumn[i]) {
                renderRollingSelector(picker, i);
            } else {
                renderNormalView(picker, i);
            }
        }
    }

    // Re-apply focused day class after rendering (keyboard navigation state)
    // This is necessary because renderDays() rebuilds the DOM with innerHTML
    if (picker.focusedDayIndex !== null) {
        const daysContainer = picker.calendar.querySelector(`.drp__days[data-month-index="${picker.activeMonthIndex}"]`);
        if (daysContainer) {
            const days = daysContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');
            if (days[picker.focusedDayIndex]) {
                days[picker.focusedDayIndex].classList.add('drp__day--focused');
            }
        }
    }

    // Initialize drag listeners for range mode
    if (picker.options.selectionMode === 'range' && !picker.isDragging) {
        picker.initDragListeners();
    }

    // Re-render action buttons to update dynamic properties (callbacks)
    if (picker.actionsContainer) {
        picker.renderButtons(picker.actionsContainer);
    }
}

export function renderNormalView(picker: any, monthIndex: number) {
    renderingLogger.debug(`[DatePicker Col${monthIndex} 19] renderNormalView called for month`, monthIndex);
    const monthContainer = picker.calendar.querySelector(`.drp__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    // Hide rolling selector for picker month
    const rollingSelector = monthContainer.querySelector('.drp__rolling-selector');
    rollingSelector?.classList.remove('drp__rolling-selector--visible');

    // Get picker month's date
    const date = picker._monthDates[monthIndex];
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = picker.monthNames[month];

    // Update month/year display with custom header support
    const monthYear = monthContainer.querySelector('.drp__month-year');
    if (monthYear) {
        // Priority order:
        // 1. monthHeaders from beforeMonthChangedCallback result
        // 2. getMonthHeaderCallback
        // 3. Default format
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        let headerText: string;

        if (picker.monthHeadersCache?.has(monthKey)) {
            // Use cached header from beforeMonthChangedCallback
            headerText = picker.monthHeadersCache.get(monthKey)!;
        } else if (picker.options.getMonthHeaderCallback) {
            // Use callback to generate header
            headerText = picker.options.getMonthHeaderCallback({
                picker,
                ...picker.presentationCtx(),
                month: date,
                monthIndex: monthIndex,
                monthName: monthName,
                year: year
            });
        } else {
            // Default format
            headerText = `${monthName} ${year}`;
        }

        monthYear.textContent = headerText;
    }

    // Update unified navigation (if enabled and this is the first month change)
    if (picker.options.isUnifiedNavigationEnabled && monthIndex === 0 && picker.unifiedRangeDisplay) {
        // Hide unified rolling selector (only if it's not supposed to be showing)
        if (picker.unifiedRollingSelector && !picker.isUnifiedRollingSelectorOpen) {
            picker.unifiedRollingSelector.classList.remove('drp__unified-rolling-selector--visible');
        }

        // Update unified range display
        const firstMonth = picker._monthDates[0];
        const lastMonth = picker._monthDates[picker._monthDates.length - 1];
        const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
        const anchorMonth = picker._monthDates[anchorIndex];

        // Use callback if provided, otherwise use default format
        if (picker.options.getUnifiedHeaderCallback) {
            const headerText = picker.options.getUnifiedHeaderCallback({
                picker,
                ...picker.presentationCtx(),
                firstMonth,
                lastMonth,
                anchorMonth,
                monthNames: picker.monthNames
            });
            picker.unifiedRangeDisplay.textContent = headerText;
        } else {
            // Default format: "Jan 2025 - Jun 2025" or "Dec 2024 - Jan 2025"
            const firstMonthName = picker.monthNames[firstMonth.getMonth()];
            const lastMonthName = picker.monthNames[lastMonth.getMonth()];
            const firstYear = firstMonth.getFullYear();
            const lastYear = lastMonth.getFullYear();

            if (firstYear === lastYear) {
                picker.unifiedRangeDisplay.textContent = `${firstMonthName} ${firstYear} - ${lastMonthName} ${lastYear}`;
            } else {
                picker.unifiedRangeDisplay.textContent = `${firstMonthName} ${firstYear} - ${lastMonthName} ${lastYear}`;
            }
        }

        // Update unified nav buttons state
        const unifiedHeader = picker.unifiedHeader;
        if (unifiedHeader) {
            // Check if previous month has enabled days
            const prevYear = firstMonth.getMonth() === 0 ? firstMonth.getFullYear() - 1 : firstMonth.getFullYear();
            const prevMonth = firstMonth.getMonth() === 0 ? 11 : firstMonth.getMonth() - 1;
            const prevButton = unifiedHeader.querySelector('.drp__nav--prev');
            if (prevButton) {
                const hasPrevEnabled = hasEnabledDaysInMonth(picker, prevYear, prevMonth);
                if (hasPrevEnabled) {
                    prevButton.removeAttribute('disabled');
                    prevButton.classList.remove('drp__nav--disabled');
                } else {
                    prevButton.setAttribute('disabled', 'true');
                    prevButton.classList.add('drp__nav--disabled');
                }
            }

            // Check if next month has enabled days (check the month after the last visible month)
            const nextYear = lastMonth.getMonth() === 11 ? lastMonth.getFullYear() + 1 : lastMonth.getFullYear();
            const nextMonth = lastMonth.getMonth() === 11 ? 0 : lastMonth.getMonth() + 1;
            const nextButton = unifiedHeader.querySelector('.drp__nav--next');
            if (nextButton) {
                const hasNextEnabled = hasEnabledDaysInMonth(picker, nextYear, nextMonth);
                if (hasNextEnabled) {
                    nextButton.removeAttribute('disabled');
                    nextButton.classList.remove('drp__nav--disabled');
                } else {
                    nextButton.setAttribute('disabled', 'true');
                    nextButton.classList.add('drp__nav--disabled');
                }
            }
        }
    }

    // Update navigation buttons disabled state based on enabled days
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth();

    // Check previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevButton = monthContainer.querySelector('.drp__nav--prev');
    if (prevButton) {
        const hasPrevEnabled = hasEnabledDaysInMonth(picker, prevYear, prevMonth);
        if (hasPrevEnabled) {
            prevButton.removeAttribute('disabled');
            prevButton.classList.remove('drp__nav--disabled');
        } else {
            prevButton.setAttribute('disabled', 'true');
            prevButton.classList.add('drp__nav--disabled');
        }
    }

    // Check next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextButton = monthContainer.querySelector('.drp__nav--next');
    if (nextButton) {
        const hasNextEnabled = hasEnabledDaysInMonth(picker, nextYear, nextMonth);
        if (hasNextEnabled) {
            nextButton.removeAttribute('disabled');
            nextButton.classList.remove('drp__nav--disabled');
        } else {
            nextButton.setAttribute('disabled', 'true');
            nextButton.classList.add('drp__nav--disabled');
        }
    }

    // Render weekdays (respecting week start day)
    const weekdays = monthContainer.querySelector('.drp__weekdays');
    const reorderedWeekdays = [
        ...picker.weekdayNames.slice(picker.weekStartDay),
        ...picker.weekdayNames.slice(0, picker.weekStartDay)
    ];
    if (weekdays) {
        weekdays.innerHTML = reorderedWeekdays
            .map(day => `<div class="drp__weekday">${day}</div>`).join('');
    }

    // Render days
    renderDays(picker, monthIndex, date);
}

export function renderDays(picker: any, monthIndex: number, date: Date) {
    renderingLogger.debug(`[DatePicker Col${monthIndex} 20] renderDays called for month`, monthIndex);
    const monthContainer = picker.calendar.querySelector(`.drp__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    const daysContainer = monthContainer.querySelector('.drp__days');
    const year = date.getFullYear();
    const month = date.getMonth();
    renderingLogger.debug(`[DatePicker Col${monthIndex} 21] Rendering days for:`, year, month + 1);

    // Get first day of month and number of days
    const firstDayRaw = new Date(year, month, 1).getDay();
    // Adjust first day to respect week start day
    const firstDay = (firstDayRaw - picker.weekStartDay + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Calculate previous and next month for data-date attributes
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const nextMonthDate = new Date(year, month + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth();

    // Collect all days with their metadata
    const allDays: Array<{
        date: Date;
        year: number;
        month: number;
        day: number;
        isOtherMonth: boolean;
    }> = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayDate = new Date(prevYear, prevMonth, day);
        allDays.push({
            date: dayDate,
            year: prevYear,
            month: prevMonth,
            day: day,
            isOtherMonth: true
        });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        allDays.push({
            date: dayDate,
            year: year,
            month: month,
            day: day,
            isOtherMonth: false
        });
    }

    // Next month days — always render 6 weeks (42 cells) so every month has
    // identical height. Without this, 5-week months (like October 2026) leave
    // empty space at the bottom when laid out next to 6-week months in a grid
    // (rows equalize to the tallest item), creating a visible "gap" between
    // the day grid and the next element.
    const totalCells = 42;
    const remainingCells = totalCells - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        const dayDate = new Date(nextYear, nextMonth, day);
        allDays.push({
            date: dayDate,
            year: nextYear,
            month: nextMonth,
            day: day,
            isOtherMonth: true
        });
    }

    // Group days into weeks (7 days per week)
    const weeks: typeof allDays[] = [];
    for (let i = 0; i < allDays.length; i += 7) {
        weeks.push(allDays.slice(i, i + 7));
    }

    // Generate HTML for each week (badge row + date row)
    let html = '';
    for (const week of weeks) {
        // Check if any day in picker week has a badge
        const weekBadges = week.map(dayData => {
            const dateInfo = picker.getDayMetadata(dayData.date);

            // Get base tooltip from dateInfo
            let badgeTooltip = dateInfo?.badgeTooltip || '';

            // Override with badgeTooltipCallback if provided
            if (picker.options.badgeTooltipCallback && dateInfo?.badgeText) {
                // Build DayRenderContext for callback (minimal version for badge context)
                const dayRenderData = {
                    ...picker.presentationCtx(),
                    date: dayData.date,
                    dateString: Validation.formatDateKey(dayData.date),
                    dayNumber: dayData.day,
                    isDisabled: picker.isDateDisabled(dayData.date),
                    isSelected: false, // Will be set below
                    isStartDate: false,
                    isEndDate: false,
                    isInRange: false,
                    isToday: Validation.isToday(dayData.date),
                    isWeekend: dayData.date.getDay() === 0 || dayData.date.getDay() === 6,
                    monthIndex: monthIndex,
                    element: null as any, // Not available during string rendering
                    picker: picker
                };

                const callbackTooltip = picker.options.badgeTooltipCallback(dayRenderData);
                if (callbackTooltip !== null) {
                    badgeTooltip = callbackTooltip;
                }
            }

            const badge = {
                text: dateInfo?.badgeText || '',
                tooltip: badgeTooltip,
                class: dateInfo?.badgeClass || ''
            };
            return badge;
        });

        const hasAnyBadge = weekBadges.some(badge => badge.text);

        // Generate badge row if any day has a badge
        if (hasAnyBadge) {
            html += '<div class="drp__badge-row">';
            for (const badge of weekBadges) {
                if (badge.text) {
                    const tooltipAttr = badge.tooltip ? ` data-tooltip="${badge.tooltip.replace(/"/g, '&quot;')}"` : '';
                    const classes = badge.class ? ` ${badge.class}` : '';
                    html += `<div class="drp__badge-cell${classes}"${tooltipAttr}>${badge.text}</div>`;
                } else {
                    html += '<div class="drp__badge-cell"></div>';
                }
            }
            html += '</div>';
        }

        // Generate date row
        html += '<div class="drp__date-row">';
        for (const dayData of week) {
            const classes = ['drp__day'];
            if (dayData.isOtherMonth) classes.push('drp__day--other-month');

            const weekday = dayData.date.getDay();
            if (weekday === 0 || weekday === 6) classes.push('drp__day--weekend');

            // Check for special date info (for styling classes and disabled state)
            const dateInfo = picker.getDayMetadata(dayData.date);

            // Check if date is disabled - use dateInfo.isDisabled if available, otherwise standard validation
            const isDisabled = (dateInfo && dateInfo.isDisabled !== undefined)
                ? dateInfo.isDisabled
                : picker.isDateDisabled(dayData.date);

            if (isDisabled) {
                classes.push('drp__day--disabled');
            }

            // Apply custom day class if available
            if (dateInfo && dateInfo.dayClass) {
                classes.push(dateInfo.dayClass);
            }

            // Today
            if (picker.isToday(dayData.date)) classes.push('drp__day--today');

            // Selected (single mode or multiple mode individual dates)
            let isSelected = false;
            if (picker.options.selectionMode === 'single') {
                isSelected = picker.isSameDay(dayData.date, picker._selectedDate);
            } else if (picker.options.selectionMode === 'multiple') {
                // Check if this date is in selectedDates array
                isSelected = picker._selectedDates.some((d: Date) => picker.isSameDay(dayData.date, d));
            }

            if (isSelected) {
                classes.push('drp__day--selected');
            }

            // Range
            let isStartDate = false;
            let isEndDate = false;
            let isInRange = false;

            if (picker.options.selectionMode === 'range') {
                // Multi-range aware: when a callback committed N ranges these read
                // from _selectedRanges, otherwise from the single start/end envelope.
                isStartDate = picker.isRangeStart(dayData.date);
                isEndDate = picker.isRangeEnd(dayData.date);
                isInRange = picker.isInCommittedRange(dayData.date);

                if (isStartDate) classes.push('drp__day--range-start');
                if (isEndDate) classes.push('drp__day--range-end');
                if (isInRange) {
                    // Only highlight if not disabled, or if shouldHighlightDisabledInRange is true
                    if (!isDisabled || picker.options.shouldHighlightDisabledInRange) {
                        classes.push('drp__day--in-range');
                    }
                }

                // Invalid range highlighting (showInvalidRange feature)
                if (picker.invalidRangeStart && picker.invalidRangeEnd) {
                    const isInvalidStart = picker.isSameDay(dayData.date, picker.invalidRangeStart);
                    const isInvalidEnd = picker.isSameDay(dayData.date, picker.invalidRangeEnd);
                    const isInInvalidRange = dayData.date > picker.invalidRangeStart && dayData.date < picker.invalidRangeEnd;

                    if (isInvalidStart) classes.push('drp__day--invalid-range-start');
                    if (isInvalidEnd) classes.push('drp__day--invalid-range-end');
                    if (isInInvalidRange) classes.push('drp__day--invalid-range');
                }
            } else if (picker.options.selectionMode === 'multiple') {
                // Check if this date is in any of the selectedRanges
                for (const range of picker._selectedRanges) {
                    if (picker.isSameDay(dayData.date, range.start)) {
                        isStartDate = true;
                        classes.push('drp__day--range-start');
                    }
                    if (picker.isSameDay(dayData.date, range.end)) {
                        isEndDate = true;
                        classes.push('drp__day--range-end');
                    }
                    // Strictly between the endpoints (exclusive) — the start/end
                    // cells keep their solid endpoint style instead of the pale
                    // --in-range fill, matching single-range mode. Also keeps the
                    // isInRange flag passed to day callbacks consistent.
                    if (dayData.date > range.start && dayData.date < range.end) {
                        isInRange = true;
                        if (!isDisabled || picker.options.shouldHighlightDisabledInRange) {
                            classes.push('drp__day--in-range');
                        }
                    }
                }
            }

            // Format date as YYYY-MM-DD for slot names and data attributes
            const dateStr = `${dayData.year}-${String(dayData.month + 1).padStart(2, '0')}-${String(dayData.day).padStart(2, '0')}`;

            // Get day tooltip - start with dateInfo, then override with callback if provided
            let dayTooltip = dateInfo?.dayTooltip || '';

            // Override with dayTooltipCallback if provided
            if (picker.options.dayTooltipCallback) {
                // Build DayRenderContext for callback
                const dayRenderData = {
                    ...picker.presentationCtx(),
                    date: dayData.date,
                    dateString: dateStr,
                    dayNumber: dayData.day,
                    isDisabled: isDisabled,
                    isSelected: isSelected,
                    isStartDate: isStartDate,
                    isEndDate: isEndDate,
                    isInRange: isInRange,
                    isToday: picker.isToday(dayData.date),
                    isWeekend: dayData.date.getDay() === 0 || dayData.date.getDay() === 6,
                    monthIndex: monthIndex,
                    element: null as any, // Not available during string rendering
                    picker: picker
                };

                const callbackTooltip = picker.options.dayTooltipCallback(dayRenderData);
                if (callbackTooltip !== null) {
                    dayTooltip = callbackTooltip;
                }
            }

            // Render day cell with slot support
            // Priority: per-day slot > renderDayCallback > renderDayContentCallback > default
            const tooltipAttr = dayTooltip ? ` data-tooltip="${dayTooltip.replace(/"/g, '&quot;')}"` : '';
            html += `<div class="${classes.join(' ')}" data-date="${dateStr}" data-day-number="${dayData.day}" data-weekday="${weekday}"${tooltipAttr}>`;
            html += `<slot name="day-${dateStr}">${dayData.day}</slot>`;
            html += `</div>`;
        }
        html += '</div>';
    }

    if (daysContainer) {
        daysContainer.innerHTML = html;

        // Process render callbacks after DOM is updated
        processRenderCallbacks(picker, monthIndex, daysContainer as HTMLElement);
    }
}

/**
 * Process renderDayCallback and renderDayContentCallback for all day cells
 * Called after HTML is rendered to apply custom rendering
 */
function processRenderCallbacks(picker: any, monthIndex: number, daysContainer: HTMLElement) {
    // Skip if no callbacks are defined
    if (!picker.options.renderDayCallback && !picker.options.renderDayContentCallback) {
        return;
    }

    // Get all day cells (not badge cells)
    const dayCells = daysContainer.querySelectorAll('.drp__day');

    dayCells.forEach((dayCell: Element) => {
        const element = dayCell as HTMLElement;
        const dateStr = element.getAttribute('data-date');
        const dayNumber = parseInt(element.getAttribute('data-day-number') || '0', 10);

        if (!dateStr) return;

        // Parse date from data-date attribute (YYYY-MM-DD format)
        const [yearStr, monthStr, dayStr] = dateStr.split('-');
        const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));

        // Check if per-day slot has content (user provided custom HTML)
        const slot = element.querySelector(`slot[name="day-${dateStr}"]`);
        const hasSlotContent = slot && (slot as HTMLSlotElement).assignedNodes().length > 0;

        // If slot has content, skip callback processing (slot takes priority)
        if (hasSlotContent) {
            return;
        }

        // Build DayRenderContext object
        const isDisabled = picker.isDateDisabled(date);
        const isToday = picker.isToday(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        const isSelected = picker.options.selectionMode === 'single' && picker.isSameDay(date, picker._selectedDate);
        const isStartDate = picker.options.selectionMode === 'range' && picker.isRangeStart(date);
        const isEndDate = picker.options.selectionMode === 'range' && picker.isRangeEnd(date);
        const isInRange = picker.options.selectionMode === 'range' && picker.isInCommittedRange(date);

        const renderData = {
            ...picker.presentationCtx(),
            date: date,
            dateString: dateStr,
            dayNumber: dayNumber,
            isDisabled: isDisabled,
            isSelected: isSelected || isStartDate || isEndDate,
            isStartDate: isStartDate,
            isEndDate: isEndDate,
            isInRange: isInRange,
            isToday: isToday,
            isWeekend: isWeekend,
            monthIndex: monthIndex,
            element: element,
            picker: picker
        };

        // Priority: renderDayCallback (full replacement) > renderDayContentCallback (augmentation)
        if (picker.options.renderDayCallback) {
            try {
                const result = picker.options.renderDayCallback(renderData);
                if (result !== null && result !== undefined) {
                    // Replace slot content with callback result
                    if (typeof result === 'string') {
                        if (slot) {
                            slot.innerHTML = result;
                        }
                    } else if (result instanceof HTMLElement) {
                        if (slot) {
                            slot.innerHTML = '';
                            slot.appendChild(result);
                        }
                    }
                }
            } catch (error) {
                console.error('[DatePicker] Error in renderDayCallback:', error);
            }
        } else if (picker.options.renderDayContentCallback) {
            try {
                const result = picker.options.renderDayContentCallback(renderData);
                if (result !== null && result !== undefined) {
                    // Append to default content (augmentation)
                    if (typeof result === 'string') {
                        if (slot) {
                            slot.innerHTML += result;
                        }
                    } else if (result instanceof HTMLElement) {
                        if (slot) {
                            slot.appendChild(result);
                        }
                    }
                }
            } catch (error) {
                console.error('[DatePicker] Error in renderDayContentCallback:', error);
            }
        }
    });
}

/**
 * Build the HTML for one rolling-selector list (years OR months).
 * `valueAttr` is the data-attribute name (`data-year` or `data-month`),
 * `extraAttrs` is the per-context suffix (`data-month-index="X"` or `data-unified="true"`).
 */
function renderRollingItems(opts: {
    items: { value: number; label: string | number; enabled: boolean }[];
    currentValue: number;
    valueAttr: string;
    extraAttrs: string;
}): string {
    let html = '';
    for (const item of opts.items) {
        const selected = item.value === opts.currentValue ? 'drp__rolling-item--selected' : '';
        const disabled = !item.enabled ? 'drp__rolling-item--disabled' : '';
        html += `<div class="drp__rolling-item ${selected} ${disabled}" ${opts.valueAttr}="${item.value}" ${opts.extraAttrs}><span class="drp__rolling-item-text">${item.label}</span></div>`;
    }
    return html;
}

function renderRollingLists(picker: any, container: Element | null | undefined, opts: {
    yearRange: { min: number; max: number };
    monthRange: { min: number; max: number };
    currentYear: number;
    currentMonth: number;
    extraAttrs: string;
}) {
    if (!container) return;
    const years = [];
    for (let year = opts.yearRange.min; year <= opts.yearRange.max; year++) {
        years.push({ value: year, label: year, enabled: hasEnabledDaysInYear(picker, year) });
    }
    const months = [];
    for (let m = opts.monthRange.min - 1; m <= opts.monthRange.max - 1; m++) {
        months.push({ value: m, label: picker.monthNames[m], enabled: hasEnabledDaysInMonth(picker, opts.currentYear, m) });
    }

    const yearsContainer = container.querySelector('[data-list="years"]');
    if (yearsContainer) {
        yearsContainer.innerHTML = renderRollingItems({
            items: years, currentValue: opts.currentYear, valueAttr: 'data-year', extraAttrs: opts.extraAttrs
        });
    }
    const monthsContainer = container.querySelector('[data-list="months"]');
    if (monthsContainer) {
        monthsContainer.innerHTML = renderRollingItems({
            items: months, currentValue: opts.currentMonth, valueAttr: 'data-month', extraAttrs: opts.extraAttrs
        });
    }
}

export function renderRollingSelector(picker: any, monthIndex: number) {
    const monthContainer = picker.calendar.querySelector(`.drp__month[data-month-index="${monthIndex}"]`);
    if (!monthContainer) return;

    const selector = monthContainer.querySelector('.drp__rolling-selector');
    selector?.classList.add('drp__rolling-selector--visible');

    const date = picker._monthDates[monthIndex];
    renderRollingLists(picker, selector, {
        yearRange: parseYearRange(picker.options.rollingYearRange, date.getFullYear(), picker),
        monthRange: parseMonthRange(picker.options.rollingMonthRange),
        currentYear: date.getFullYear(),
        currentMonth: date.getMonth(),
        extraAttrs: `data-month-index="${monthIndex}"`,
    });
}

export function renderUnifiedRollingSelector(picker: any) {
    if (!picker.options.isUnifiedNavigationEnabled || !picker.unifiedRollingSelector) return;

    picker.unifiedRollingSelector.classList.add('drp__unified-rolling-selector--visible');

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const date = picker._monthDates[anchorIndex];
    renderRollingLists(picker, picker.unifiedRollingSelector, {
        yearRange: picker.getAvailableYearRange(),
        monthRange: picker.getAvailableMonthRange(),
        currentYear: date.getFullYear(),
        currentMonth: date.getMonth(),
        extraAttrs: 'data-unified="true"',
    });
}

/**
 * Populate the four possible time rolls (hours / minutes / [seconds] / [ampm]).
 * The DOM scaffolding is built once in createCalendar; this function only fills
 * the inner `.drp__rolling-list` containers with items.
 *
 * Reads from `picker._selectedTime` — each field is independently nullable. Null
 * fields don't get a highlight (so picking only the hour leaves the minute roll
 * un-marked) and their focus value falls back to wall-clock (so the visual
 * centroid stays useful instead of snapping to 00).
 */
export function renderTimePicker(picker: any) {
    const root = picker.calendar.querySelector('.drp__time-picker');
    if (!root) return;

    const time = picker._selectedTime || { hour: null, minute: null, second: null, ampm: null };
    // Per-field focus: committed value if the user picked it, else the wall-clock
    // SNAPSHOT taken when the picker opened. Using a snapshot (not live `new Date()`)
    // keeps uncommitted rolls still — otherwise real-time-seconds tick forward
    // between renders and the auto-scroll chases the moving target.
    const snapshot: Date = picker.timePickerOpenSnapshot || new Date();
    const focusHour = time.hour !== null ? time.hour : snapshot.getHours();
    const focusMinute = time.minute !== null ? time.minute : snapshot.getMinutes();
    const focusSecond = time.second !== null ? time.second : snapshot.getSeconds();
    const step = picker.options.timeStep || 1;
    const is12h = picker.options.hourCycle === 'h12';

    // Consume the one-shot "force scroll" flag set by open(). Re-opens must
    // re-center even if a stale focus item is technically still in the viewport
    // (the rolls keep their scrollTop across hide/show).
    const forceScroll = !!picker.forceTimePickerScroll;
    picker.forceTimePickerScroll = false;

    const items = (range: number[], focusValue: number, selectedValue: number | null, valueAttr: string) => {
        let html = '';
        for (const v of range) {
            const selected = selectedValue !== null && v === selectedValue ? 'drp__rolling-item--selected' : '';
            const focusMark = v === focusValue ? 'data-time-focus="true"' : '';
            const label = String(v).padStart(2, '0');
            html += `<div class="drp__rolling-item ${selected}" ${valueAttr}="${v}" ${focusMark}><span class="drp__rolling-item-text">${label}</span></div>`;
        }
        return html;
    };

    // Scroll the focus item to vertical center within its own roll container,
    // but only if it's not already fully visible (so clicking an item that's
    // already on screen doesn't shuffle the list).
    //
    // Three things to get right:
    //   - offsetTop is relative to the nearest positioned ancestor (the popover
    //     with `position: fixed`), NOT to the scrolling rolling-list. Use
    //     getBoundingClientRect deltas instead to get the in-container offset.
    //   - Run inside requestAnimationFrame so reads happen after the browser
    //     has laid out the freshly-set innerHTML.
    //   - scrollTo with behavior:'auto' overrides the CSS rule
    //     `scroll-behavior: smooth` so the position lands instantly.
    const scrollFocusIntoView = (container: Element | null) => {
        if (!container) return;
        requestAnimationFrame(() => {
            const focused = container.querySelector('[data-time-focus="true"]') as HTMLElement | null;
            if (!focused) return;
            const c = container as HTMLElement;
            const containerRect = c.getBoundingClientRect();
            const itemRect = focused.getBoundingClientRect();
            const itemTopInContainer = itemRect.top - containerRect.top + c.scrollTop;
            const itemBottomInContainer = itemTopInContainer + focused.offsetHeight;

            // On an open render, always re-center — the roll may show a stale
            // value at the centroid from the previous session. Otherwise skip
            // when the focus item is already fully visible so per-field clicks
            // don't shuffle the other rolls.
            if (!forceScroll && itemTopInContainer >= c.scrollTop && itemBottomInContainer <= c.scrollTop + c.clientHeight) {
                return;
            }

            const target = itemTopInContainer - (c.clientHeight - focused.offsetHeight) / 2;
            c.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
        });
    };

    // Hours
    const hoursContainer = root.querySelector('[data-time-list="hours"]');
    if (hoursContainer) {
        if (is12h) {
            const hours: number[] = [];
            for (let i = 1; i <= 12; i++) hours.push(i);
            const displayHour = picker.toDisplayHour(focusHour);
            const selectedHour = time.hour !== null ? picker.toDisplayHour(time.hour) : null;
            hoursContainer.innerHTML = items(hours, displayHour, selectedHour, 'data-hour12');
        } else {
            const hours: number[] = [];
            for (let i = 0; i < 24; i++) hours.push(i);
            const selectedHour = time.hour;
            hoursContainer.innerHTML = items(hours, focusHour, selectedHour, 'data-hour');
        }
        scrollFocusIntoView(hoursContainer);
    }

    // Minutes
    const minutesContainer = root.querySelector('[data-time-list="minutes"]');
    if (minutesContainer) {
        const minutes: number[] = [];
        for (let i = 0; i < 60; i += step) minutes.push(i);
        const snappedFocusMinute = Math.floor(focusMinute / step) * step;
        const selectedMinute = time.minute !== null ? Math.floor(time.minute / step) * step : null;
        minutesContainer.innerHTML = items(minutes, snappedFocusMinute, selectedMinute, 'data-minute');
        scrollFocusIntoView(minutesContainer);
    }

    // Seconds (optional)
    if (picker.options.isSecondsShown) {
        const secondsContainer = root.querySelector('[data-time-list="seconds"]');
        if (secondsContainer) {
            const seconds: number[] = [];
            for (let i = 0; i < 60; i += step) seconds.push(i);
            const snappedFocusSecond = Math.floor(focusSecond / step) * step;
            const selectedSecond = time.second !== null ? Math.floor(time.second / step) * step : null;
            secondsContainer.innerHTML = items(seconds, snappedFocusSecond, selectedSecond, 'data-second');
            scrollFocusIntoView(secondsContainer);
        }
    }

    // AM/PM (12-hour mode only). Only two items — no scroll needed.
    if (is12h) {
        const ampmContainer = root.querySelector('[data-time-list="ampm"]');
        if (ampmContainer) {
            const amSelected = time.ampm === 'am' ? 'drp__rolling-item--selected' : '';
            const pmSelected = time.ampm === 'pm' ? 'drp__rolling-item--selected' : '';
            ampmContainer.innerHTML = `
                <div class="drp__rolling-item ${amSelected}" data-ampm="am"><span class="drp__rolling-item-text">${picker.localeStrings.am}</span></div>
                <div class="drp__rolling-item ${pmSelected}" data-ampm="pm"><span class="drp__rolling-item-text">${picker.localeStrings.pm}</span></div>
            `;
        }
    }
}

/**
 * Clock-face time picker (timeDisplay: 'clock').
 *
 * Material-style two-step UI: header shows HH:MM big-digit toggle buttons; the
 * dial renders hour numbers (or minute numbers) positioned around a circle by
 * angle, with a rotating hand pointing at the current value. AM/PM toggle below
 * (h12 only).
 *
 * Layout philosophy: numbers are absolutely positioned with inline left/top
 * computed here from angle + radius. The hand uses inline `transform: rotate()`
 * around its bottom-center pivot (which is the dial center). CSS owns colors,
 * sizes, and hover/selected styling.
 */
export function renderClockPicker(picker: any) {
    const root = picker.calendar.querySelector('.drp__clock-picker');
    if (!root) return;

    const time = picker._selectedTime || { hour: null, minute: null, second: null, ampm: null };
    // Focus value semantics match the rolls: committed value if the user picked
    // it, otherwise the wall-clock snapshot taken when the picker opened. Using
    // the snapshot avoids live-seconds chasing across renders.
    const snapshot: Date = picker.timePickerOpenSnapshot || new Date();
    const focusHour = time.hour !== null ? time.hour : snapshot.getHours();
    const focusMinute = time.minute !== null ? time.minute : snapshot.getMinutes();
    const is12h = picker.options.hourCycle === 'h12';
    const step = picker.options.timeStep || 1;
    const clockStep: 'hours' | 'minutes' = picker.clockStep || 'hours';

    // ---- Header (HH : MM [AM/PM]) ----
    const headerEl = root.querySelector('.drp__clock-header');
    if (headerEl) {
        const displayHour = is12h ? picker.toDisplayHour(focusHour) : focusHour;
        const hourLabel = String(displayHour).padStart(2, '0');
        const minuteLabel = String(focusMinute).padStart(2, '0');
        const hoursActive = clockStep === 'hours' ? 'drp__clock-header-digit--active' : '';
        const minutesActive = clockStep === 'minutes' ? 'drp__clock-header-digit--active' : '';
        // h12 only: surface AM/PM next to the digits so the current half is
        // legible from the header alone (the toggle buttons below still drive it).
        // Fall back to focusHour-derived half when the user hasn't committed ampm yet.
        let ampmIndicator = '';
        if (is12h) {
            const ampm = time.ampm ?? (focusHour >= 12 ? 'pm' : 'am');
            ampmIndicator = `<span class="drp__clock-header-ampm">${ampm === 'pm' ? picker.localeStrings.pm : picker.localeStrings.am}</span>`;
        }
        headerEl.innerHTML = `
            <button type="button" class="drp__clock-header-digit ${hoursActive}" data-clock-step="hours">${hourLabel}</button>
            <span class="drp__clock-header-sep">:</span>
            <button type="button" class="drp__clock-header-digit ${minutesActive}" data-clock-step="minutes">${minuteLabel}</button>
            ${ampmIndicator}
        `;
    }

    // ---- Dial face ----
    const faceEl = root.querySelector('.drp__clock-face') as HTMLElement | null;
    if (faceEl) {
        // Read radii as resolved pixel lengths. Important: `getPropertyValue` on
        // an unregistered custom property returns the literal token sequence
        // (e.g. "calc(11 * var(--drp-rem))" or "calc(11 * 15px)"), NOT a
        // calc-resolved px — so `parseFloat` would always return NaN and we'd
        // fall through to a fallback that happens to be correct only at the
        // default --drp-rem. Use a hidden ruler so the browser actually resolves
        // the calc(); the ruler inherits the face's CSS variable scope.
        const cs = getComputedStyle(faceEl);
        const sizePx = parseFloat(cs.width) || 280;
        // Read each ring radius. Strategy:
        //   1. Try a hidden ruler with `width: var(--drp-clock-radius-X)`. This
        //      honors any user override and reads the actually-resolved px.
        //   2. If offsetWidth comes back 0 — typically on initial render before
        //      the browser has run a layout pass for the inline-positioned
        //      pickers — fall back to `sizePx × ratio`, which matches the
        //      default --drp-clock-radius-* definitions (all proportional to
        //      --drp-clock-size). Without this fallback, the numbers would be
        //      placed using stale 110/75 constants and would only line up at
        //      --drp-rem: 10px (the size at which the constants happen to be
        //      correct).
        const ruler = document.createElement('div');
        ruler.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:0';
        faceEl.appendChild(ruler);
        const readPx = (prop: string, ratioOfSize: number) => {
            ruler.style.width = `var(${prop})`;
            const v = ruler.offsetWidth;
            return v > 0 ? v : sizePx * ratioOfSize;
        };
        const outerRadiusPx = readPx('--drp-clock-radius-outer', 11 / 28);
        const innerRadiusPx = readPx('--drp-clock-radius-inner', 7.5 / 28);
        const minuteRadiusPx = readPx('--drp-clock-radius-minute', 11 / 28);
        ruler.remove();
        const outerPct = (outerRadiusPx / sizePx) * 100;
        const innerPct = (innerRadiusPx / sizePx) * 100;
        const minutePct = (minuteRadiusPx / sizePx) * 100;

        // angle = (value × stepDeg − 90°) so position 0 (e.g. 12-o'clock, or
        // minute :00) sits at the top of the dial.
        const pointAt = (radiusPct: number, angleDeg: number) => {
            const rad = (angleDeg * Math.PI) / 180;
            return {
                left: 50 + radiusPct * Math.cos(rad),
                top: 50 + radiusPct * Math.sin(rad),
            };
        };

        let html = '';

        if (clockStep === 'hours') {
            // The selected-circle marker tracks the focus value (committed value
            // if there is one, otherwise the open-time snapshot), not just the
            // committed value — that way the marker and the hand always agree.
            // Without this, first render shows the hand pointing somewhere but
            // no value circled until the user clicks.
            const markerHour = focusHour;
            for (let n = 1; n <= 12; n++) {
                const angle = n * 30 - 90;
                const pos = pointAt(outerPct, angle);
                let selected = false;
                if (is12h) {
                    // 1..12 ring uses display hour (12-hour clock).
                    const dh = picker.toDisplayHour(markerHour);
                    selected = dh === n;
                } else {
                    // Outer ring shows 1..12. Inner ring handles 0/13..23.
                    selected = markerHour === n;
                }
                const sel = selected ? 'drp__clock-number--selected' : '';
                const attr = is12h ? `data-clock-hour12="${n}"` : `data-clock-hour="${n}"`;
                html += `<button type="button" class="drp__clock-number ${sel}" ${attr} style="left:${pos.left}%;top:${pos.top}%">${n}</button>`;
            }

            // Inner ring (h24 only): values 13..24 with 24 at the top (replacing 12).
            // 13 → 1 o'clock, 14 → 2 o'clock, ..., 23 → 11 o'clock, 24 → 12 o'clock.
            // The selected highlight uses the canonical 0-23 hour: 0 maps to "24" label.
            if (!is12h) {
                for (let n = 13; n <= 24; n++) {
                    // n === 24 → angle for 12 (top); otherwise n - 12 maps to outer position.
                    const ringPos = n === 24 ? 12 : n - 12;
                    const angle = ringPos * 30 - 90;
                    const pos = pointAt(innerPct, angle);
                    // Canonical hour-of-day for this label: 24 ↔ 0, 13..23 ↔ themselves.
                    const canonical = n === 24 ? 0 : n;
                    const selected = markerHour === canonical;
                    const sel = selected ? 'drp__clock-number--selected' : '';
                    html += `<button type="button" class="drp__clock-number drp__clock-number--inner ${sel}" data-clock-hour="${canonical}" style="left:${pos.left}%;top:${pos.top}%">${n}</button>`;
                }
            }
        } else {
            // Minutes step. Label set:
            //   - step ∈ {5, 6, 10, 12, 15, 20, 30} → show only valid values (60/step ≤ 12)
            //   - step ∈ {1, 2, 3, 4}              → show 12 labels at 5-min marks; clicks snap
            //
            // Marker uses focus value (not just committed) so the highlighted
            // label and the hand agree even on first render — same rationale as
            // the hours step above.
            const labelStep = step >= 5 ? step : 5;
            const labelCount = 60 / labelStep;
            const snappedMarker = Math.round(focusMinute / labelStep) * labelStep % 60;
            for (let i = 0; i < labelCount; i++) {
                const value = i * labelStep;
                const angle = i * (360 / labelCount) - 90;
                const pos = pointAt(minutePct, angle);
                const selected = snappedMarker === value;
                const sel = selected ? 'drp__clock-number--selected' : '';
                const label = String(value).padStart(2, '0');
                html += `<button type="button" class="drp__clock-number ${sel}" data-clock-minute="${value}" style="left:${pos.left}%;top:${pos.top}%">${label}</button>`;
            }
        }

        // ---- Hand ----
        // Angle reflects the actual selected value (or focus value when nothing
        // is committed) — not the snapped label position — so a :23 selection
        // with step=1 puts the hand between :20 and :25.
        //
        // Length is picked via a modifier class (--outer / --inner / --minute)
        // so the chain stays in CSS. The tip also resizes from --inner so it
        // doesn't overflow the smaller h24 inner-ring buttons.
        let handAngle = 0;
        let handRingClass = 'drp__clock-hand--outer';
        if (clockStep === 'hours') {
            if (is12h) {
                const dh = picker.toDisplayHour(focusHour); // 1..12
                handAngle = (dh % 12) * 30;
            } else {
                // For h24: 1..12 → outer ring angle; 0/13..23 → inner ring angle.
                if (focusHour === 0 || focusHour > 12) {
                    const ringPos = focusHour === 0 ? 12 : focusHour - 12;
                    handAngle = (ringPos % 12) * 30;
                    handRingClass = 'drp__clock-hand--inner';
                } else {
                    handAngle = (focusHour % 12) * 30;
                }
            }
        } else {
            handAngle = focusMinute * 6;
            handRingClass = 'drp__clock-hand--minute';
        }
        // No tip element — the --selected highlight on the number IS the marker.
        // The hand modifier shortens the line by half a button so it terminates
        // at the selection circle's near edge instead of running into its center.
        html += `<div class="drp__clock-hand ${handRingClass}" style="transform:rotate(${handAngle}deg)"></div>`;

        faceEl.innerHTML = html;
        faceEl.dataset.clockMode = clockStep;
    }

    // ---- AM/PM toggle (h12 only) ----
    if (is12h) {
        const ampmEl = root.querySelector('.drp__clock-ampm');
        if (ampmEl) {
            // Same fallback as the header indicator: when ampm isn't committed,
            // derive from focusHour so the highlighted button matches the
            // displayed half. Otherwise the header would read "12:12 PM" while
            // neither button is selected, which looks broken.
            const effectiveAmpm = time.ampm ?? (focusHour >= 12 ? 'pm' : 'am');
            const amSelected = effectiveAmpm === 'am' ? 'drp__clock-ampm-button--selected' : '';
            const pmSelected = effectiveAmpm === 'pm' ? 'drp__clock-ampm-button--selected' : '';
            ampmEl.innerHTML = `
                <button type="button" class="drp__clock-ampm-button ${amSelected}" data-clock-ampm="am">${picker.localeStrings.am}</button>
                <button type="button" class="drp__clock-ampm-button ${pmSelected}" data-clock-ampm="pm">${picker.localeStrings.pm}</button>
            `;
        }
    }
}

/**
 * Wheel-style time picker (timeDisplay: 'wheel').
 *
 * iOS UIPickerView aesthetic: snap-scrolling columns with a center selection band
 * and top/bottom fade gradients (the "barrel" effect). Each column is a vertical
 * list of values; the value currently centered in its column is what's selected.
 *
 * Structure mirrors renderTimePicker (same focus semantics, same per-field reads)
 * but the rendered items are flat divs without rolling-item selected highlights —
 * the center band IS the selection indicator. Click-to-center is handled by the
 * router (scrollWheelItemToCenter) and the scroll listener wired up on first
 * render commits values as the user spins each column.
 */
export function renderWheelPicker(picker: any) {
    const root = picker.calendar.querySelector('.drp__wheel-picker');
    if (!root) return;

    const time = picker._selectedTime || { hour: null, minute: null, second: null, ampm: null };
    const snapshot: Date = picker.timePickerOpenSnapshot || new Date();
    const focusHour = time.hour !== null ? time.hour : snapshot.getHours();
    const focusMinute = time.minute !== null ? time.minute : snapshot.getMinutes();
    const focusSecond = time.second !== null ? time.second : snapshot.getSeconds();
    const focusAmpm: 'am' | 'pm' = time.ampm ?? (focusHour >= 12 ? 'pm' : 'am');
    const step = picker.options.timeStep || 1;
    const is12h = picker.options.hourCycle === 'h12';

    // Consume the one-shot force-scroll flag set by open() / first render. Without
    // this, an already-centered value (preserved scrollTop) would skip recentering
    // and the user would land on a stale row from the previous open.
    const forceScroll = !!picker.forceWheelScroll;
    picker.forceWheelScroll = false;

    // Wire scroll listeners exactly once per column. Each commit attempts are
    // debounced via requestAnimationFrame so we only act on the final settled
    // position rather than every interim scrollTop.
    const wireColumn = (col: HTMLElement, listKey: string) => {
        if ((col as any)._wheelWired) return;
        (col as any)._wheelWired = true;
        let t: number | null = null;
        col.addEventListener('scroll', () => {
            if (picker.wheelScrollLock) return;
            if (t !== null) window.clearTimeout(t);
            t = window.setTimeout(() => {
                t = null;
                picker.commitWheelScroll(col, listKey);
            }, 120);
        }, { passive: true });
    };

    const renderColumn = (
        listKey: string,
        items: Array<{ value: string; label: string; selected: boolean }>,
        focusValue: string
    ) => {
        const col = root.querySelector(`[data-wheel-list="${listKey}"]`) as HTMLElement | null;
        if (!col) return;
        let html = '';
        for (const item of items) {
            const sel = item.selected ? ' drp__wheel-item--selected' : '';
            const focus = item.value === focusValue ? ' data-wheel-focus="true"' : '';
            html += `<div class="drp__wheel-item${sel}" data-wheel-value="${item.value}"${focus}>${item.label}</div>`;
        }
        col.innerHTML = html;
        wireColumn(col, listKey);

        // Center the focus item. Skip if already centered (same logic as the
        // rolls), unless forceScroll is true (open / first render).
        requestAnimationFrame(() => {
            const focused = col.querySelector('[data-wheel-focus="true"]') as HTMLElement | null;
            if (!focused) return;
            const itemH = focused.offsetHeight || 36;
            const target = focused.offsetTop - (col.clientHeight - itemH) / 2;
            const desired = Math.max(0, target);
            const skip = !forceScroll && Math.abs(col.scrollTop - desired) < 2;
            console.log('[wheel] render-center', {
                listKey,
                focusValue,
                focusedOffsetTop: focused.offsetTop,
                focusedOffsetHeight: focused.offsetHeight,
                itemH,
                clientHeight: col.clientHeight,
                target,
                desired,
                currentScrollTop: col.scrollTop,
                forceScroll,
                skip,
            });
            if (skip) return;
            picker.wheelScrollLock = true;
            col.scrollTo({ top: desired, behavior: 'auto' });
            // Release the lock on the next frame — `behavior: 'auto'` is synchronous
            // but the scroll event may still fire after layout settles.
            window.setTimeout(() => { picker.wheelScrollLock = false; }, 50);
        });
    };

    // Hours
    if (is12h) {
        const items: Array<{ value: string; label: string; selected: boolean }> = [];
        const focusDisplay = picker.toDisplayHour(focusHour);
        const selectedDisplay = time.hour !== null ? picker.toDisplayHour(time.hour) : null;
        for (let h = 1; h <= 12; h++) {
            items.push({
                value: String(h),
                label: String(h).padStart(2, '0'),
                selected: selectedDisplay !== null && selectedDisplay === h,
            });
        }
        renderColumn('hours', items, String(focusDisplay));
    } else {
        const items: Array<{ value: string; label: string; selected: boolean }> = [];
        for (let h = 0; h < 24; h++) {
            items.push({
                value: String(h),
                label: String(h).padStart(2, '0'),
                selected: time.hour !== null && time.hour === h,
            });
        }
        renderColumn('hours', items, String(focusHour));
    }

    // Minutes
    {
        const items: Array<{ value: string; label: string; selected: boolean }> = [];
        const snappedFocusMinute = Math.floor(focusMinute / step) * step;
        const selectedMinute = time.minute !== null ? Math.floor(time.minute / step) * step : null;
        for (let m = 0; m < 60; m += step) {
            items.push({
                value: String(m),
                label: String(m).padStart(2, '0'),
                selected: selectedMinute !== null && selectedMinute === m,
            });
        }
        renderColumn('minutes', items, String(snappedFocusMinute));
    }

    // Seconds (optional)
    if (picker.options.isSecondsShown) {
        const items: Array<{ value: string; label: string; selected: boolean }> = [];
        const snappedFocusSecond = Math.floor(focusSecond / step) * step;
        const selectedSecond = time.second !== null ? Math.floor(time.second / step) * step : null;
        for (let s = 0; s < 60; s += step) {
            items.push({
                value: String(s),
                label: String(s).padStart(2, '0'),
                selected: selectedSecond !== null && selectedSecond === s,
            });
        }
        renderColumn('seconds', items, String(snappedFocusSecond));
    }

    // AM/PM (h12 only)
    if (is12h) {
        const items = [
            { value: 'am', label: picker.localeStrings.am, selected: time.ampm === 'am' },
            { value: 'pm', label: picker.localeStrings.pm, selected: time.ampm === 'pm' },
        ];
        renderColumn('ampm', items, focusAmpm);
    }
}

/**
 * Compact pills time picker (timeDisplay: 'compact').
 *
 * iOS 14+ aesthetic: HH : MM [: SS] [AM/PM] with each unit a pill-shaped button
 * that becomes contentEditable when tapped. The DOM skeleton is built once
 * (mount step) — this renderer only updates the displayed values + selected
 * states without rebuilding nodes, so an in-progress contentEditable session
 * isn't blown away by a sibling field's commit triggering a re-render.
 */
export function renderCompactPicker(picker: any) {
    const root = picker.calendar.querySelector('.drp__compact-picker');
    if (!root) return;

    const time = picker._selectedTime || { hour: null, minute: null, second: null, ampm: null };
    const snapshot: Date = picker.timePickerOpenSnapshot || new Date();
    const focusHour = time.hour !== null ? time.hour : snapshot.getHours();
    const focusMinute = time.minute !== null ? time.minute : snapshot.getMinutes();
    const focusSecond = time.second !== null ? time.second : snapshot.getSeconds();
    const is12h = picker.options.hourCycle === 'h12';

    const setPill = (field: 'hours' | 'minutes' | 'seconds', value: number, committed: boolean) => {
        const pill = root.querySelector(`[data-compact-field="${field}"]`) as HTMLElement | null;
        if (!pill) return;
        // Don't clobber a pill the user is currently typing into.
        if (pill.isContentEditable) return;
        const label = String(value).padStart(2, '0');
        if (pill.textContent !== label) pill.textContent = label;
        pill.classList.toggle('drp__compact-pill--committed', committed);
    };

    const displayHour = is12h ? picker.toDisplayHour(focusHour) : focusHour;
    setPill('hours', displayHour, time.hour !== null);
    setPill('minutes', focusMinute, time.minute !== null);
    if (picker.options.isSecondsShown) setPill('seconds', focusSecond, time.second !== null);

    if (is12h) {
        const effectiveAmpm = time.ampm ?? (focusHour >= 12 ? 'pm' : 'am');
        const buttons = root.querySelectorAll('[data-compact-ampm]');
        buttons.forEach((b) => {
            const el = b as HTMLElement;
            const isSel = el.dataset.compactAmpm === effectiveAmpm;
            el.classList.toggle('drp__compact-ampm-button--selected', isSel);
        });
    }
}

/**
 * Re-apply an active in-block summary loader after the summary's className/innerHTML were
 * rewritten by a (re-)render. Without this the spinner is wiped by the very first
 * derivation that follows showLoader('summary') — e.g. the commitSelection() re-render that
 * runs right AFTER a `date-select`/onSelect handler adds it, so the loader never appears.
 * The loader must survive re-derivation exactly like a showSummary() override does.
 * See showLoader() in date-picker-ui.ts.
 */
function reapplySummaryLoader(picker: any, summary: HTMLElement): void {
    const spinner = picker.loaders?.summary;
    if (!spinner) return;
    summary.classList.remove('drp__summary--hidden');
    summary.classList.add('drp__summary--loading', 'drp__summary--visible');
    if (spinner.parentNode !== summary) summary.appendChild(spinner);
}

export function updateSummary(picker: any) {
    if (picker.options.selectionMode !== 'range') return;

    const summary = picker.summaryElement || picker.calendar.querySelector('.drp__summary');
    if (!summary) return;

    // Imperative override (showSummary): pinned content wins over derivation and persists
    // until the next selection change clears picker.summaryOverride.
    if (picker.summaryOverride != null) {
        summary.className = 'drp__summary drp__summary--visible';
        summary.innerHTML = picker.summaryOverride;
        reapplySummaryLoader(picker, summary);
        return;
    }

    if (picker._selectedStartDate && picker._selectedEndDate) {
        // Calculate days and nights
        let days: number;
        let enabledDates: Date[] | undefined;
        let disabledDates: Date[] | undefined;
        let dates: Date[] | undefined;
        let dateRanges: any[] | undefined;

        // A committed multi-range result (from a callback's adjustedRanges) is the
        // authoritative set of pieces — list them directly and count only their
        // enabled days, regardless of disabledDatesHandling.
        if (picker._selectedRanges.length > 0) {
            dateRanges = picker.selectedRanges;
            enabledDates = dateRanges.reduce(
                (acc: Date[], r: any) => acc.concat(picker.getEnabledDatesInRange(r.start, r.end)),
                [] as Date[]
            );
            dates = enabledDates;
            days = enabledDates.length;
        // For individual and split modes, count only enabled dates
        } else if (picker.options.disabledDatesHandling === 'individual' ||
            picker.options.disabledDatesHandling === 'split') {
            enabledDates = picker.getEnabledDatesInRange(
                picker._selectedStartDate,
                picker._selectedEndDate
            );
            days = enabledDates.length;
            dates = enabledDates;

            // For split mode, also get the date ranges
            if (picker.options.disabledDatesHandling === 'split') {
                dateRanges = picker.splitRangeByDisabled(
                    picker._selectedStartDate,
                    picker._selectedEndDate
                );
            }
        } else if (picker.options.disabledDatesHandling === 'allow') {
            // For allow mode, get both enabled and disabled dates
            enabledDates = picker.getEnabledDatesInRange(
                picker._selectedStartDate,
                picker._selectedEndDate
            );
            disabledDates = picker.getDisabledDatesInRange(
                picker._selectedStartDate,
                picker._selectedEndDate
            );
            // Count total days for allow mode
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker._selectedEndDate.getTime() - picker._selectedStartDate.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1;
        } else {
            // For block mode, count total days
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker._selectedEndDate.getTime() - picker._selectedStartDate.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1; // +1 to include both start and end days
        }

        const nights = days > 0 ? days - 1 : 0; // Nights = days - 1

        summary.className = 'drp__summary drp__summary--visible';

        // Check if custom formatter exists
        if (picker.options.formatSummaryCallback) {
            const callbackData: any = {
                picker,
                ...picker.presentationCtx(),
                days,
                nights,
                startDate: picker._selectedStartDate,
                endDate: picker._selectedEndDate,
                selectionMode: picker.options.selectionMode,
                disabledDatesHandling: picker.options.disabledDatesHandling,
                localeStrings: picker.localeStrings,
                isPreview: false
            };

            // Add mode-specific data
            if (enabledDates) callbackData.enabledDates = enabledDates;
            if (disabledDates) callbackData.disabledDates = disabledDates;
            if (dates) callbackData.dates = dates;
            if (dateRanges) callbackData.dateRanges = dateRanges;

            summary.innerHTML = picker.options.formatSummaryCallback(callbackData);
        } else {
            // Default format
            summary.innerHTML = `
                <span class="drp__summary-count">${days} ${days === 1 ? picker.localeStrings.day : picker.localeStrings.days}</span>
                <span>, </span>
                <span class="drp__summary-count">${nights} ${nights === 1 ? picker.localeStrings.night : picker.localeStrings.nights}</span>
            `;
        }
    } else {
        summary.className = 'drp__summary drp__summary--hidden';
        summary.innerHTML = '';
    }

    reapplySummaryLoader(picker, summary);
}

export function updateSummaryWithPreview(picker: any) {
    if (picker.options.selectionMode !== 'range') return;

    const summary = picker.summaryElement || picker.calendar.querySelector('.drp__summary');
    if (!summary) return;

    // An active override suppresses drag/hover preview too (keeps pinned content stable).
    if (picker.summaryOverride != null) {
        summary.className = 'drp__summary drp__summary--visible';
        summary.innerHTML = picker.summaryOverride;
        reapplySummaryLoader(picker, summary);
        return;
    }

    if (picker.dragPreviewStart && picker.dragPreviewEnd) {
        let days: number;
        let enabledDates: Date[] | undefined;
        let disabledDates: Date[] | undefined;
        let dates: Date[] | undefined;
        let dateRanges: any[] | undefined;

        // For individual and split modes, count only enabled dates
        if (picker.options.disabledDatesHandling === 'individual' ||
            picker.options.disabledDatesHandling === 'split') {
            enabledDates = picker.getEnabledDatesInRange(
                picker.dragPreviewStart,
                picker.dragPreviewEnd
            );
            days = enabledDates.length;
            dates = enabledDates;

            // For split mode, also get the date ranges
            if (picker.options.disabledDatesHandling === 'split') {
                dateRanges = picker.splitRangeByDisabled(
                    picker.dragPreviewStart,
                    picker.dragPreviewEnd
                );
            }
        } else if (picker.options.disabledDatesHandling === 'allow') {
            // For allow mode, get both enabled and disabled dates
            enabledDates = picker.getEnabledDatesInRange(
                picker.dragPreviewStart,
                picker.dragPreviewEnd
            );
            disabledDates = picker.getDisabledDatesInRange(
                picker.dragPreviewStart,
                picker.dragPreviewEnd
            );
            // Count total days for allow mode
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker.dragPreviewEnd.getTime() - picker.dragPreviewStart.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1;
        } else {
            // For block mode, count total days
            const msPerDay = 1000 * 60 * 60 * 24;
            const timeDiff = picker.dragPreviewEnd.getTime() - picker.dragPreviewStart.getTime();
            days = Math.floor(timeDiff / msPerDay) + 1;
        }

        const nights = days > 0 ? days - 1 : 0;

        summary.className = 'drp__summary drp__summary--visible';

        // Check if custom formatter exists
        if (picker.options.formatSummaryCallback) {
            const callbackData: any = {
                picker,
                ...picker.presentationCtx(),
                days,
                nights,
                startDate: picker.dragPreviewStart,
                endDate: picker.dragPreviewEnd,
                selectionMode: picker.options.selectionMode,
                disabledDatesHandling: picker.options.disabledDatesHandling,
                localeStrings: picker.localeStrings,
                isPreview: true
            };

            // Add mode-specific data
            if (enabledDates) callbackData.enabledDates = enabledDates;
            if (disabledDates) callbackData.disabledDates = disabledDates;
            if (dates) callbackData.dates = dates;
            if (dateRanges) callbackData.dateRanges = dateRanges;

            summary.innerHTML = picker.options.formatSummaryCallback(callbackData);
        } else {
            // Default format with preview label
            summary.innerHTML = `
                <span style="opacity: 0.7;">${picker.localeStrings.preview}: </span>
                <span class="drp__summary-count">${days} ${days === 1 ? picker.localeStrings.day : picker.localeStrings.days}</span>
                <span>, </span>
                <span class="drp__summary-count">${nights} ${nights === 1 ? picker.localeStrings.night : picker.localeStrings.nights}</span>
            `;
        }
    }

    reapplySummaryLoader(picker, summary);
}

/**
 * Paint the would-be range while the user is in the half-selected state
 * (start clicked, end pending). Mode-aware per the disabled-handling semantics
 * — see FINDINGS.md #6 for the design rationale.
 *
 *   allow       full range → '--hover-preview' on every cell (disabled overlay wins)
 *   prevent     range crosses disabled → '--hover-preview-invalid'; else '--hover-preview'
 *   block       end snaps to last-enabled-before-gap; paint up to snap only
 *   split       paint enabled days only; disabled days remain bare → visual gaps
 *   individual  same as 'allow' (no way to express "discrete dates" in a grid view)
 */
export function updateHoverPreview(picker: any) {
    picker.calendar.querySelectorAll(
        '.drp__day--hover-preview, .drp__day--hover-preview-invalid'
    ).forEach((day: Element) => {
        day.classList.remove(
            'drp__day--hover-preview',
            'drp__day--hover-preview-invalid'
        );
    });

    if (!picker._selectedStartDate || picker._selectedEndDate || !picker.hoverPreviewEnd) return;
    if (picker.isDragging) return;

    let start: Date = picker._selectedStartDate;
    let end: Date = picker.hoverPreviewEnd;
    if (end < start) [start, end] = [end, start];

    const mode = picker.options.disabledDatesHandling;
    let cls = 'drp__day--hover-preview';
    let skipDisabled = false;

    if (mode === 'prevent' && picker.hasDisabledDatesInRange(start, end)) {
        cls = 'drp__day--hover-preview-invalid';
    } else if (mode === 'block' && picker.hasDisabledDatesInRange(start, end)) {
        end = picker.findLastEnabledBeforeGap(start, end);
        if (end < start) return; // snap landed before start — nothing to paint
    } else if (mode === 'split') {
        skipDisabled = true;
    }

    // The committed start day always carries --range-start (solid accent bg
    // + on-accent text). Painting --hover-preview on top would override the
    // solid background with a translucent one and leave the on-accent text
    // visually mismatched (white-on-pale). Skip it.
    const committedStartTime = picker._selectedStartDate.getTime();

    const allDays = picker.calendar.querySelectorAll('.drp__day');
    allDays.forEach((day: Element) => {
        const dateAttr = (day as HTMLElement).dataset.date;
        if (!dateAttr) return;

        const [year, month, dayNum] = dateAttr.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum);

        if (date >= start && date <= end) {
            if (date.getTime() === committedStartTime) return;
            if (skipDisabled && day.classList.contains('drp__day--disabled')) return;
            day.classList.add(cls);
        }
    });
}

export function updateDragPreview(picker: any) {
    // Remove existing preview classes
    picker.calendar.querySelectorAll('.drp__day--drag-preview, .drp__day--drag-invalid').forEach((day: Element) => {
        day.classList.remove('drp__day--drag-preview', 'drp__day--drag-invalid');
    });

    if (!picker.dragPreviewStart || !picker.dragPreviewEnd) return;

    // Check if picker is an invalid range in 'block' mode
    const isBlockMode = picker.options.disabledDatesHandling === 'block';
    const hasDisabledInRange = isBlockMode && picker.hasDisabledDatesInRange(picker.dragPreviewStart, picker.dragPreviewEnd);

    // Add preview classes to days in the preview range (including other-month days)
    const allDays = picker.calendar.querySelectorAll('.drp__day');
    allDays.forEach((day: Element) => {
        const dateAttr = (day as HTMLElement).dataset.date;
        if (!dateAttr) return;

        const [year, month, dayNum] = dateAttr.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum); // month is 1-based in data-date, but Date constructor expects 0-based

        if (date >= picker.dragPreviewStart! && date <= picker.dragPreviewEnd!) {
            day.classList.add('drp__day--drag-preview');
            if (hasDisabledInRange) {
                day.classList.add('drp__day--drag-invalid');
            }
        }
    });

    // Update summary with preview counts
    updateSummaryWithPreview(picker);
}
