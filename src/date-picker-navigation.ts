/**
 * Date Picker Navigation Methods
 *
 * Functions for navigation logic including month/year navigation,
 * rolling selector, and keyboard focus movement.
 */

import { runBeforeCallback } from '@keenmate/web-components-core';
import type { MonthChangeContext, MonthData } from './types';
import { navigationLogger } from './logger';
import { showLoader, hideLoader } from './date-picker-ui';

/**
 * Check if a given month has any enabled (non-disabled) days
 * Used to determine if navigation buttons should be disabled
 */
export function hasEnabledDaysInMonth(picker: any, year: number, month: number): boolean {
    // Check each day of the month (1-31)
    // We check up to 31 even though not all months have 31 days
    // Invalid dates (e.g., Feb 31) will be handled by Date constructor
    for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);

        // Skip if this day doesn't exist in this month (e.g., day 31 in Feb)
        if (date.getMonth() !== month) continue;

        // If we find at least one enabled day, the month is navigable
        if (!picker.isDateDisabled(date)) {
            return true;
        }
    }

    // All days in this month are disabled
    return false;
}

/** First / last date of the 6-week grid of one month column. */
function visibleRangeForMonth(picker: any, year: number, month: number): { firstVisibleDate: Date; lastVisibleDate: Date } {
    const firstDayWeekday = new Date(year, month, 1).getDay();
    const offset = (firstDayWeekday - picker.weekStartDay + 7) % 7;
    const firstVisibleDate = new Date(year, month, 1 - offset);
    const lastVisibleDate = new Date(firstVisibleDate);
    lastVisibleDate.setDate(firstVisibleDate.getDate() + 41);
    return { firstVisibleDate, lastVisibleDate };
}

/** First / last visible date across ALL columns (unified navigation). */
function visibleRangeUnified(picker: any): { firstVisibleDate: Date; lastVisibleDate: Date } {
    let earliestYear = Infinity;
    let earliestMonth = Infinity;
    let latestYear = -Infinity;
    let latestMonth = -Infinity;
    for (const monthDate of picker._monthDates as Date[]) {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        if (year < earliestYear || (year === earliestYear && month < earliestMonth)) {
            earliestYear = year;
            earliestMonth = month;
        }
        if (year > latestYear || (year === latestYear && month > latestMonth)) {
            latestYear = year;
            latestMonth = month;
        }
    }
    const firstDayWeekday = new Date(earliestYear, earliestMonth, 1).getDay();
    const offset = (firstDayWeekday - picker.weekStartDay + 7) % 7;
    const firstVisibleDate = new Date(earliestYear, earliestMonth, 1 - offset);
    // Last visible date: the latest month's last day, extended to the end of its week.
    const lastDayOfLastMonth = new Date(latestYear, latestMonth + 1, 0).getDate();
    const lastDayWeekday = new Date(latestYear, latestMonth, lastDayOfLastMonth).getDay();
    const daysToAdd = (picker.weekStartDay + 6 - lastDayWeekday) % 7;
    const lastVisibleDate = new Date(latestYear, latestMonth, lastDayOfLastMonth + daysToAdd);
    return { firstVisibleDate, lastVisibleDate };
}

function monthChangeContext(picker: any, year: number, month: number, monthIndex: number, range: { firstVisibleDate: Date; lastVisibleDate: Date }): MonthChangeContext {
    return picker.ctx({ year, month, monthIndex, ...range });
}

/** Wrap a callback so a returned Promise shows the calendar loader (hidden by the caller). */
function withLoader<A, R>(picker: any, fn: (arg: A) => R, state: { isLoading: boolean }): (arg: A) => R {
    return (arg: A) => {
        const result = fn(arg);
        if (result instanceof Promise && !state.isLoading) {
            state.isLoading = true;
            showLoader(picker);
        }
        return result;
    };
}

/** Run `getMonthDataCallback(ctx)` (sync or async); a throw is logged and yields no data. */
async function loadMonthData(picker: any, ctx: MonthChangeContext, state: { isLoading: boolean }): Promise<MonthData | null> {
    const fn = picker.options.getMonthDataCallback;
    if (!fn) return null;
    try {
        return (await withLoader(picker, fn, state)(ctx)) ?? null;
    } catch (error) {
        console.error('[web-daterangepicker] getMonthDataCallback threw:', error);
        return null;
    }
}

/**
 * Load month data for the initial open (no `beforeMonthChangeCallback` — nothing
 * is navigating). Unified navigation: one call for the whole grid; otherwise one
 * call per visible column, merged. Replaces the caches.
 */
export async function handleInitialMonthLoad(picker: any): Promise<void> {
    if (!picker.options.getMonthDataCallback) {
        return;
    }

    // Prevent concurrent month changes
    if (picker.isMonthChanging) {
        navigationLogger.debug('handleInitialMonthLoad() - already changing month, skipping');
        return;
    }

    const loader = { isLoading: false };
    try {
        picker.isMonthChanging = true;

        const combinedMetadata = new Map<string, any>();
        const combinedMonthHeaders = new Map<string, string>();
        const merge = (data: MonthData | null) => {
            data?.metadata?.forEach((value, key) => combinedMetadata.set(key, value));
            data?.monthHeaders?.forEach((value, key) => combinedMonthHeaders.set(key, value));
        };

        if (picker.options.isUnifiedNavigationEnabled) {
            const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
            const anchorMonth: Date = picker._monthDates[anchorIndex];
            const ctx = monthChangeContext(picker, anchorMonth.getFullYear(), anchorMonth.getMonth(), anchorIndex, visibleRangeUnified(picker));
            merge(await loadMonthData(picker, ctx, loader));
        } else {
            for (let i = 0; i < picker._monthDates.length; i++) {
                const monthDate: Date = picker._monthDates[i];
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth();
                const ctx = monthChangeContext(picker, year, month, i, visibleRangeForMonth(picker, year, month));
                merge(await loadMonthData(picker, ctx, loader));
            }
        }

        navigationLogger.debug(`handleInitialMonthLoad() - metadata items: ${combinedMetadata.size}, monthHeaders: ${combinedMonthHeaders.size}`);
        if (combinedMetadata.size > 0) picker.bulkMetadataCache = combinedMetadata;
        if (combinedMonthHeaders.size > 0) picker.monthHeadersCache = combinedMonthHeaders;
        if (combinedMetadata.size > 0 || combinedMonthHeaders.size > 0) picker.renderCalendar();
    } finally {
        if (loader.isLoading) hideLoader(picker);
        picker.isMonthChanging = false;
    }
}

/**
 * Before month navigation: `beforeMonthChangeCallback` (`false` blocks), then
 * `getMonthDataCallback` for the target range (merged into the caches).
 * Returns true if navigation should proceed.
 */
export async function handleBeforeMonthChange(
    picker: any,
    targetYear: number,
    targetMonth: number, // 0-11
    monthIndex: number
): Promise<boolean> {
    const beforeFn = picker.options.beforeMonthChangeCallback;
    if (!beforeFn && !picker.options.getMonthDataCallback) {
        return true;
    }

    // Prevent concurrent month changes
    if (picker.isMonthChanging) {
        navigationLogger.debug('handleBeforeMonthChange() - already changing month, ignoring');
        return false;
    }

    const loader = { isLoading: false };
    try {
        picker.isMonthChanging = true;

        const range = picker.options.isUnifiedNavigationEnabled
            ? visibleRangeUnified(picker)
            : visibleRangeForMonth(picker, targetYear, targetMonth);
        const ctx = monthChangeContext(picker, targetYear, targetMonth, monthIndex, range);

        if (beforeFn) {
            const gate = await runBeforeCallback(withLoader(picker, beforeFn, loader), ctx, 'beforeMonthChangeCallback');
            if (gate.isCancelled) {
                navigationLogger.debug(`handleBeforeMonthChange() - navigation blocked for ${targetYear}-${targetMonth + 1}`);
                return false;
            }
        }

        const data = await loadMonthData(picker, ctx, loader);
        if (picker.options.getMonthDataCallback) {
            if (data?.metadata) {
                if (!picker.bulkMetadataCache) picker.bulkMetadataCache = data.metadata;
                else data.metadata.forEach((value, key) => picker.bulkMetadataCache.set(key, value));
            } else {
                // The data source returned nothing for this range — drop stale entries.
                picker.bulkMetadataCache = null;
            }
            if (data?.monthHeaders) {
                if (!picker.monthHeadersCache) picker.monthHeadersCache = data.monthHeaders;
                else data.monthHeaders.forEach((value, key) => picker.monthHeadersCache.set(key, value));
            }
        }
        return true;
    } finally {
        if (loader.isLoading) hideLoader(picker);
        picker.isMonthChanging = false;
    }
}

export function toggleRollingSelector(picker: any, monthIndex: number) {
    if (picker.isAspectLocked('navigation')) return;
    picker.rollingSelectorOpenByColumn[monthIndex] = !picker.rollingSelectorOpenByColumn[monthIndex];
    picker.renderCalendar();
}

export async function selectYear(picker: any, year: number, monthIndex: number) {
    if (picker.isAspectLocked('navigation')) return;
    // Get current month to preserve it
    const currentMonth = picker._monthDates[monthIndex].getMonth();

    // Run beforeMonthChangeCallback + getMonthDataCallback
    const shouldProceed = await handleBeforeMonthChange(picker, year, currentMonth, monthIndex);
    if (!shouldProceed) {
        navigationLogger.debug(`selectYear() Col${monthIndex} - navigation blocked by callback`);
        return; // Navigation blocked
    }

    // Update only this specific month's year
    const oldYear = picker._monthDates[monthIndex].getFullYear();
    picker._monthDates[monthIndex].setFullYear(year);
    navigationLogger.debug(`selectYear() Col${monthIndex} - changed from ${oldYear} to ${year}`);

    // Check for collisions with adjacent columns
    checkAndResolveCollisions(picker, monthIndex);

    picker.rollingSelectorOpenByColumn[monthIndex] = false;
    picker.renderCalendar();
}

export async function selectMonth(picker: any, month: number, monthIndex: number) {
    if (picker.isAspectLocked('navigation')) return;
    // Get current year to preserve it
    const currentYear = picker._monthDates[monthIndex].getFullYear();

    // Run beforeMonthChangeCallback + getMonthDataCallback
    const shouldProceed = await handleBeforeMonthChange(picker, currentYear, month, monthIndex);
    if (!shouldProceed) {
        navigationLogger.debug(`selectMonth() Col${monthIndex} - navigation blocked by callback`);
        return; // Navigation blocked
    }

    // Update only this specific month's month
    const oldMonth = picker._monthDates[monthIndex].getMonth();
    picker._monthDates[monthIndex].setMonth(month);
    navigationLogger.debug(`selectMonth() Col${monthIndex} - changed from ${oldMonth+1} to ${month+1}`);

    // Check for collisions with adjacent columns
    checkAndResolveCollisions(picker, monthIndex);

    picker.rollingSelectorOpenByColumn[monthIndex] = false;
    picker.renderCalendar();
}

// Check and resolve collisions after changing a column's date
export function checkAndResolveCollisions(picker: any, changedIdx: number) {
    const changedDate = picker._monthDates[changedIdx];

    // Check collision with next column (if exists)
    if (changedIdx < picker._monthDates.length - 1) {
        const nextDate = picker._monthDates[changedIdx + 1];
        if (isSameOrAfterMonth(changedDate, nextDate)) {
            navigationLogger.debug(`checkAndResolveCollisions() Col${changedIdx} - collision with Col${changedIdx+1}, shifting forward`);
            // Move next column to be 1 month after changed column
            const newNextDate = new Date(changedDate.getFullYear(), changedDate.getMonth() + 1, 1);
            picker._monthDates[changedIdx + 1] = newNextDate;
            // Recursively check next column
            checkAndResolveCollisions(picker, changedIdx + 1);
        }
    }

    // Check collision with previous column (if exists)
    if (changedIdx > 0) {
        const prevDate = picker._monthDates[changedIdx - 1];
        if (isSameOrAfterMonth(prevDate, changedDate)) {
            navigationLogger.debug(`checkAndResolveCollisions() Col${changedIdx} - collision with Col${changedIdx-1}, shifting backward`);
            // Move previous column to be 1 month before changed column
            const newPrevDate = new Date(changedDate.getFullYear(), changedDate.getMonth() - 1, 1);
            picker._monthDates[changedIdx - 1] = newPrevDate;
            // Recursively check previous column
            checkAndResolveCollisions(picker, changedIdx - 1);
        }
    }
}

// Helper: Compare if date1 >= date2 (by year-month only)
// This is a pure function - no picker needed
export function isSameOrAfterMonth(date1: Date, date2: Date): boolean {
    const year1 = date1.getFullYear();
    const month1 = date1.getMonth();
    const year2 = date2.getFullYear();
    const month2 = date2.getMonth();

    if (year1 > year2) return true;
    if (year1 === year2 && month1 >= month2) return true;
    return false;
}

/**
 * Step a single month column by `offset` (+1 = next, -1 = previous).
 * Handles enabled-month boundary check, beforeMonthChangeCallback,
 * and collision propagation against the appropriate neighbour column.
 */
async function changeMonth(picker: any, monthIndex: number, offset: -1 | 1): Promise<void> {
    // Navigation lock: block every month step (< > buttons, PageUp/Down, keyboard
    // focus crossing a month edge, and the drag-over-nav auto-advance all funnel here).
    if (picker.isAspectLocked('navigation')) return;
    const idx = !isNaN(monthIndex) ? monthIndex : picker.activeMonthIndex;
    const dir = offset > 0 ? 'nextMonth' : 'prevMonth';

    if (picker.rollingSelectorOpenByColumn[idx]) {
        picker.rollingSelectorOpenByColumn[idx] = false;
    }

    const oldDate = picker._monthDates[idx];
    const newDate = new Date(oldDate.getFullYear(), oldDate.getMonth() + offset, 1);

    if (!hasEnabledDaysInMonth(picker, newDate.getFullYear(), newDate.getMonth())) {
        navigationLogger.debug(`${dir}() Col${idx} - navigation blocked: target month has no enabled days`);
        return;
    }

    const shouldProceed = await handleBeforeMonthChange(picker, newDate.getFullYear(), newDate.getMonth(), idx);
    if (!shouldProceed) {
        navigationLogger.debug(`${dir}() Col${idx} - navigation blocked by callback`);
        return;
    }

    picker._monthDates[idx] = newDate;
    navigationLogger.debug(`${dir}() Col${idx} - changed from ${oldDate.getFullYear()}-${oldDate.getMonth()+1} to ${newDate.getFullYear()}-${newDate.getMonth()+1}`);

    // Collision propagation: if the moved column overlaps its same-direction neighbour,
    // recursively shift that neighbour the same direction.
    const neighbourIdx = idx + offset;
    const neighbourInBounds = offset > 0
        ? neighbourIdx < picker._monthDates.length
        : neighbourIdx >= 0;
    if (neighbourInBounds) {
        const neighbourDate = picker._monthDates[neighbourIdx];
        const collides = offset > 0
            ? isSameOrAfterMonth(newDate, neighbourDate)       // moved forward into next
            : isSameOrAfterMonth(neighbourDate, newDate);      // moved back into prev
        if (collides) {
            navigationLogger.debug(`${dir}() Col${idx} - collision detected with Col${neighbourIdx}, shifting`);
            await changeMonth(picker, neighbourIdx, offset);
        }
    }

    picker.renderCalendar();
}

export const prevMonth = (picker: any, monthIndex: number) => changeMonth(picker, monthIndex, -1);
export const nextMonth = (picker: any, monthIndex: number) => changeMonth(picker, monthIndex, +1);

/**
 * Find next enabled day index starting from given index, moving in direction
 * Returns null if no enabled day found within reasonable range (60 days)
 */
export function findNextEnabledDayIndex(picker: any, startIndex: number, offset: number, days: NodeListOf<Element>, monthIndex: number) {
    let currentIndex = startIndex;
    let attempts = 0;
    const maxAttempts = 60; // Safety limit

    while (attempts < maxAttempts) {
        // Check if current index is within bounds of current month
        if (currentIndex >= 0 && currentIndex < days.length) {
            const dayElement = days[currentIndex] as HTMLElement;
            const dateAttr = dayElement.dataset.date;
            if (dateAttr) {
                const [year, month, day] = dateAttr.split('-').map(Number);
                const date = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based

                // Check if this date is enabled
                if (!picker.isDateDisabled(date)) {
                    return { index: currentIndex, monthChanged: false };
                }
            }
        }

        // Move to next position
        currentIndex += offset;
        attempts++;

        // If we've gone out of bounds, we need to check next/prev month
        if (currentIndex < 0 || currentIndex >= days.length) {
            // Need to search in adjacent month
            return { index: null, monthChanged: true, direction: offset > 0 ? 'next' : 'prev' };
        }
    }

    // No enabled day found
    return { index: null, monthChanged: false };
}

export function moveFocus(picker: any, offset: number) {
    // Only get days from the active month column
    navigationLogger.debug(`moveFocus(${offset}) Col${picker.activeMonthIndex} - focusedDayIndex:`, picker.focusedDayIndex);
    const daysContainer = picker.calendar.querySelector(`.drp__days[data-month-index="${picker.activeMonthIndex}"]`);
    if (!daysContainer) {
        navigationLogger.debug(`moveFocus() Col${picker.activeMonthIndex} - ERROR: daysContainer not found!`);
        return;
    }

    const days = daysContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');
    navigationLogger.debug(`moveFocus() Col${picker.activeMonthIndex} - found ${days.length} days in column`);
    if (days.length === 0) return;

    // Initialize focus if not set
    if (picker.focusedDayIndex === null) {
        // Find today's day in the calendar as the starting point
        const todayIndex = Array.from(days).findIndex(day => (day as Element).classList.contains('drp__day--today'));
        picker.focusedDayIndex = todayIndex !== -1 ? todayIndex : 0;
        navigationLogger.debug(`moveFocus() Col${picker.activeMonthIndex} - initialized focusedDayIndex to ${picker.focusedDayIndex} (today or first day), will move by offset ${offset}`);
    }

    // Remove old focus (if any)
    days[picker.focusedDayIndex]?.classList.remove('drp__day--focused');

    // Calculate new index
    const newIndex = picker.focusedDayIndex + offset;

    // Check if we need to change months
    if (newIndex < 0) {
        const savedMonthIndex = picker.activeMonthIndex;

        // For left arrow (offset -1), just go to last enabled day of previous month
        // For up arrow (offset -7), maintain weekday column
        if (offset === -1) {
            navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - edge navigation LEFT: going to last enabled day of prev month`);
            prevMonth(picker, picker.activeMonthIndex);
            setTimeout(() => {
                const newContainer = picker.calendar.querySelector(`.drp__month[data-month-index="${savedMonthIndex}"] .drp__days`);
                if (!newContainer) return;
                const newDays = newContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');

                // Find last enabled day
                const result = findNextEnabledDayIndex(picker, newDays.length - 1, -1, newDays, savedMonthIndex);
                if (result.index !== null) {
                    picker.focusedDayIndex = result.index;
                    newDays[picker.focusedDayIndex]?.classList.add('drp__day--focused');
                    newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                }
            }, 0);
        } else {
            // Up arrow - maintain same weekday column
            const currentDay = days[picker.focusedDayIndex] as HTMLElement;
            const dateAttr = currentDay.dataset.date;
            if (dateAttr) {
                const [year, month, day] = dateAttr.split('-').map(Number);
                const currentDate = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based
                const targetWeekday = currentDate.getDay();

                navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - edge navigation UP: current day ${day} is weekday ${targetWeekday}, going to prev month`);
                prevMonth(picker, picker.activeMonthIndex);
                setTimeout(() => {
                    const newContainer = picker.calendar.querySelector(`.drp__month[data-month-index="${savedMonthIndex}"] .drp__days`);
                    if (!newContainer) return;
                    const newDays = newContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');

                    const lastDayElement = newDays[newDays.length - 1] as HTMLElement;
                    const lastDateAttr = lastDayElement.dataset.date;
                    if (lastDateAttr) {
                        const [lastYear, lastMonth, lastDayNum] = lastDateAttr.split('-').map(Number);
                        const lastDay = new Date(lastYear, lastMonth - 1, lastDayNum); // month is 1-based in data-date, but Date constructor expects 0-based
                        const lastWeekday = lastDay.getDay();
                        const offsetDays = (lastWeekday - targetWeekday + 7) % 7;
                        picker.focusedDayIndex = newDays.length - 1 - offsetDays;

                        navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - last day weekday ${lastWeekday}, target ${targetWeekday}, focusing on day ${picker.focusedDayIndex+1}`);
                        newDays[picker.focusedDayIndex]?.classList.add('drp__day--focused');
                        newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }
                }, 0);
            }
        }
        return;
    } else if (newIndex >= days.length) {
        const savedMonthIndex = picker.activeMonthIndex;

        // For right arrow (offset +1), just go to first enabled day of next month
        // For down arrow (offset +7), maintain weekday column
        if (offset === 1) {
            navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - edge navigation RIGHT: going to first enabled day of next month`);
            nextMonth(picker, picker.activeMonthIndex);
            setTimeout(() => {
                const newContainer = picker.calendar.querySelector(`.drp__month[data-month-index="${savedMonthIndex}"] .drp__days`);
                if (!newContainer) return;
                const newDays = newContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');

                // Find first enabled day
                const result = findNextEnabledDayIndex(picker, 0, 1, newDays, savedMonthIndex);
                if (result.index !== null) {
                    picker.focusedDayIndex = result.index;
                    newDays[picker.focusedDayIndex]?.classList.add('drp__day--focused');
                    newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                }
            }, 0);
        } else {
            // Down arrow - maintain same weekday column
            const currentDay = days[picker.focusedDayIndex] as HTMLElement;
            const dateAttr = currentDay.dataset.date;
            if (dateAttr) {
                const [year, month, day] = dateAttr.split('-').map(Number);
                const currentDate = new Date(year, month - 1, day); // month is 1-based in data-date, but Date constructor expects 0-based
                const targetWeekday = currentDate.getDay();

                navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - edge navigation DOWN: current day ${day} is weekday ${targetWeekday}, going to next month`);
                nextMonth(picker, picker.activeMonthIndex);
                setTimeout(() => {
                    const newContainer = picker.calendar.querySelector(`.drp__month[data-month-index="${savedMonthIndex}"] .drp__days`);
                    if (!newContainer) return;
                    const newDays = newContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');

                    const firstDayElement = newDays[0] as HTMLElement;
                    const firstDateAttr = firstDayElement.dataset.date;
                    if (firstDateAttr) {
                        const [firstYear, firstMonth, firstDayNum] = firstDateAttr.split('-').map(Number);
                        const firstDay = new Date(firstYear, firstMonth - 1, firstDayNum); // month is 1-based in data-date, but Date constructor expects 0-based
                        const firstWeekday = firstDay.getDay();
                        const offsetDays = (targetWeekday - firstWeekday + 7) % 7;
                        picker.focusedDayIndex = offsetDays;

                        navigationLogger.debug(`moveFocus() Col${savedMonthIndex} - first day weekday ${firstWeekday}, target ${targetWeekday}, focusing on day ${picker.focusedDayIndex+1}`);
                        newDays[picker.focusedDayIndex]?.classList.add('drp__day--focused');
                        newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
                    }
                }, 0);
            }
        }
        return;
    }

    // Normal movement within current month
    // Check if the target day is enabled, if not find next enabled day
    const result = findNextEnabledDayIndex(picker, newIndex, offset, days, picker.activeMonthIndex);

    if (result.monthChanged) {
        // Need to navigate to next/prev month to find enabled day
        const savedMonthIndex = picker.activeMonthIndex;
        if (result.direction === 'next') {
            nextMonth(picker, picker.activeMonthIndex);
        } else {
            prevMonth(picker, picker.activeMonthIndex);
        }

        setTimeout(() => {
            const newContainer = picker.calendar.querySelector(`.drp__month[data-month-index="${savedMonthIndex}"] .drp__days`);
            if (!newContainer) return;
            const newDays = newContainer.querySelectorAll('.drp__day:not(.drp__day--other-month)');

            // Find first/last enabled day in new month
            const searchResult = findNextEnabledDayIndex(
                picker,
                result.direction === 'next' ? 0 : newDays.length - 1,
                offset,
                newDays,
                savedMonthIndex
            );

            if (searchResult.index !== null) {
                picker.focusedDayIndex = searchResult.index;
                newDays[picker.focusedDayIndex]?.classList.add('drp__day--focused');
                newDays[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
            }
        }, 0);
        return;
    }

    if (result.index !== null) {
        picker.focusedDayIndex = result.index;
        days[picker.focusedDayIndex]?.classList.add('drp__day--focused');
        days[picker.focusedDayIndex]?.scrollIntoView({ block: 'nearest' });
    } else {
        // No enabled day found, don't move
        navigationLogger.debug('moveFocus() - no enabled day found in search range');
        days[picker.focusedDayIndex]?.classList.add('drp__day--focused');
    }
}

/**
 * Unified Navigation Functions
 * For multi-month calendars with unified navigation enabled
 */

/**
 * Navigate forward one month in unified mode (affects all visible months)
 */
export async function unifiedNextMonth(picker: any) {
    if (picker.isAspectLocked('navigation')) return;
    if (!picker.options.isUnifiedNavigationEnabled) return;

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const anchorMonth = picker._monthDates[anchorIndex];
    const newAnchorMonth = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 1, 1);

    navigationLogger.debug(`unifiedNextMonth() - anchor index: ${anchorIndex}, current: ${anchorMonth.getFullYear()}-${anchorMonth.getMonth()+1}, new: ${newAnchorMonth.getFullYear()}-${newAnchorMonth.getMonth()+1}`);

    // Check if target month is within boundaries (has any enabled days)
    if (!hasEnabledDaysInMonth(picker, newAnchorMonth.getFullYear(), newAnchorMonth.getMonth())) {
        navigationLogger.debug(`unifiedNextMonth() - navigation blocked: target month has no enabled days`);
        return; // Navigation blocked
    }

    const shouldProceed = await handleBeforeMonthChange(picker, newAnchorMonth.getFullYear(), newAnchorMonth.getMonth(), anchorIndex);
    if (!shouldProceed) return;

    // Update ALL months relative to the anchor
    for (let i = 0; i < picker._monthDates.length; i++) {
        const offset = i - anchorIndex;
        picker._monthDates[i] = new Date(newAnchorMonth.getFullYear(), newAnchorMonth.getMonth() + offset, 1);
    }
    picker.renderCalendar();
}

/**
 * Navigate backward one month in unified mode (affects all visible months)
 */
export async function unifiedPrevMonth(picker: any) {
    if (picker.isAspectLocked('navigation')) return;
    if (!picker.options.isUnifiedNavigationEnabled) return;

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const anchorMonth = picker._monthDates[anchorIndex];
    const newAnchorMonth = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() - 1, 1);

    navigationLogger.debug(`unifiedPrevMonth() - anchor index: ${anchorIndex}, current: ${anchorMonth.getFullYear()}-${anchorMonth.getMonth()+1}, new: ${newAnchorMonth.getFullYear()}-${newAnchorMonth.getMonth()+1}`);

    // Check if target month is within boundaries (has any enabled days)
    if (!hasEnabledDaysInMonth(picker, newAnchorMonth.getFullYear(), newAnchorMonth.getMonth())) {
        navigationLogger.debug(`unifiedPrevMonth() - navigation blocked: target month has no enabled days`);
        return; // Navigation blocked
    }

    const shouldProceed = await handleBeforeMonthChange(picker, newAnchorMonth.getFullYear(), newAnchorMonth.getMonth(), anchorIndex);
    if (!shouldProceed) return;

    // Update ALL months relative to the anchor
    for (let i = 0; i < picker._monthDates.length; i++) {
        const offset = i - anchorIndex;
        picker._monthDates[i] = new Date(newAnchorMonth.getFullYear(), newAnchorMonth.getMonth() + offset, 1);
    }
    picker.renderCalendar();
}

/**
 * Sets the month for unified navigation via rolling selector
 * Updates the anchor month to the selected month, all others follow
 */
export async function setUnifiedMonth(picker: any, month: number) {
    if (picker.isAspectLocked('navigation')) return;
    if (!picker.options.isUnifiedNavigationEnabled) return;

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const currentYear = picker._monthDates[anchorIndex].getFullYear();

    navigationLogger.debug(`setUnifiedMonth(${month}) - anchor index: ${anchorIndex}, year: ${currentYear}`);

    const shouldProceed = await handleBeforeMonthChange(picker, currentYear, month, anchorIndex);
    if (!shouldProceed) return;

    // Update ALL months relative to the new anchor month
    for (let i = 0; i < picker._monthDates.length; i++) {
        const offset = i - anchorIndex;
        picker._monthDates[i] = new Date(currentYear, month + offset, 1);
    }

    // Close the unified rolling selector (like normal selectMonth does)
    picker.isUnifiedRollingSelectorOpen = false;
    picker.renderCalendar();
}

/**
 * Toggle unified rolling selector visibility
 */
export function toggleUnifiedRollingSelector(picker: any) {
    if (picker.isAspectLocked('navigation')) return;
    if (!picker.options.isUnifiedNavigationEnabled) {
        return;
    }

    picker.isUnifiedRollingSelectorOpen = !picker.isUnifiedRollingSelectorOpen;
    navigationLogger.debug(`toggleUnifiedRollingSelector() - now ${picker.isUnifiedRollingSelectorOpen ? 'visible' : 'hidden'}`);
    picker.renderCalendar();
}

/**
 * Sets the year for unified navigation
 * Updates the anchor month to the selected year, keeping the same month
 */
export async function setUnifiedYear(picker: any, year: number) {
    if (picker.isAspectLocked('navigation')) return;
    if (!picker.options.isUnifiedNavigationEnabled) return;

    const anchorIndex = picker.options.unifiedNavigationAnchorIndex ?? 0;
    const currentMonth = picker._monthDates[anchorIndex].getMonth();

    navigationLogger.debug(`setUnifiedYear(${year}) - anchor index: ${anchorIndex}, month: ${currentMonth}`);

    const shouldProceed = await handleBeforeMonthChange(picker, year, currentMonth, anchorIndex);
    if (!shouldProceed) return;

    // Update ALL months relative to the new anchor
    for (let i = 0; i < picker._monthDates.length; i++) {
        const offset = i - anchorIndex;
        picker._monthDates[i] = new Date(year, currentMonth + offset, 1);
    }

    // Close the unified rolling selector (like normal selectYear does)
    picker.isUnifiedRollingSelectorOpen = false;
    picker.renderCalendar();
}
