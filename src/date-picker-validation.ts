/**
 * Date Picker Validation Methods
 *
 * Functions for date validation and restriction logic.
 */

import type { DateRange } from './types';

/**
 * Detect week start day from locale or use provided value
 */
export function detectWeekStartDay(weekStartDay: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6): number {
    if (weekStartDay !== 'auto') {
        return weekStartDay;
    }

    // Try modern API first (Chrome 99+, Firefox 105+, Safari 16+)
    try {
        const locale = new Intl.Locale(navigator.language);
        if ('weekInfo' in locale && locale.weekInfo && 'firstDay' in (locale.weekInfo as object)) {
            // weekInfo.firstDay: 1 = Monday, 7 = Sunday
            // We need: 0 = Sunday, 1 = Monday
            const firstDay = (locale.weekInfo as any).firstDay;
            return firstDay === 7 ? 0 : firstDay;
        }
    } catch (e) {
        // Fallback if API not supported
    }

    // Fallback: Locale-based detection
    const locale = navigator.language.toLowerCase();

    // Countries/regions that start week on Sunday
    const sundayCountries = [
        'en-us', 'en-ca', // US, Canada
        'ja', 'ja-jp',    // Japan
        'he', 'he-il',    // Israel
        'ar-sa', 'ar-ae', // Saudi Arabia, UAE
        'ko', 'ko-kr'     // South Korea
    ];

    if (sundayCountries.some(country => locale.startsWith(country))) {
        return 0; // Sunday
    }

    // Default to Monday for most of the world
    return 1;
}

/**
 * Normalize a date input (string or Date) to a Date object.
 *
 * @param preserveTime When false (default), the time component is zeroed to
 * midnight — load-bearing for day-boundary comparisons in disabled-dates /
 * range logic. When true, the time component is kept; used by time/datetime
 * pickerMode where the H/M/S carry meaning. String inputs that lack a time
 * portion accept either `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm[:ss]` ISO forms.
 */
/**
 * Parse a `rollingYearRange` spec into absolute years, or `null` when malformed:
 * - `2024` — one year; `2022-2026` — absolute bounds
 * - `A:B` — each side either signed (`-5`, `+2`, `+0`: relative to `todayYear`) or an
 *   absolute 4-digit year: `-5:+5`, `2020:+2`, `-1:2030`
 * `min > max` is malformed.
 */
export function parseYearRangeSpec(spec: string, todayYear: number): { min: number; max: number } | null {
    const s = spec.trim();
    let m = /^(\d{4})$/.exec(s);
    if (m) return { min: Number(m[1]), max: Number(m[1]) };
    m = /^(\d{4})\s*-\s*(\d{4})$/.exec(s);
    if (m) {
        const min = Number(m[1]), max = Number(m[2]);
        return min <= max ? { min, max } : null;
    }
    m = /^([+-]\d{1,3}|\d{4})\s*:\s*([+-]\d{1,3}|\d{4})$/.exec(s);
    if (m) {
        const side = (v: string) => (/^[+-]/.test(v) ? todayYear + Number(v) : Number(v));
        const min = side(m[1]), max = side(m[2]);
        return min <= max ? { min, max } : null;
    }
    return null;
}

export function normalizeDate(dateInput: Date | string, preserveTime: boolean = false): Date | null {
    if (!dateInput) return null;

    let date: Date;
    if (typeof dateInput === 'string') {
        // Plain date-only string gets a T00:00:00 suffix so it parses in local time.
        // ISO datetime strings already carry their own time portion.
        const hasTime = /T\d{2}:\d{2}/.test(dateInput);
        date = new Date(hasTime ? dateInput : dateInput + 'T00:00:00');
    } else {
        date = new Date(dateInput);
    }

    if (!preserveTime) {
        date.setHours(0, 0, 0, 0);
    }

    return isNaN(date.getTime()) ? null : date;
}

/**
 * Format date as YYYY-MM-DD for use as map/set key
 */
export function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Check if a date should be disabled based on restrictions
 */
export function isDateDisabled(
    date: Date,
    normalizedMinDate: Date | null,
    normalizedMaxDate: Date | null,
    normalizedDisabledDates: Set<string>,
    disabledDays: number[] | undefined
): boolean {
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay();

    // Check min/max dates
    if (normalizedMinDate && date < normalizedMinDate) {
        return true;
    }
    if (normalizedMaxDate && date > normalizedMaxDate) {
        return true;
    }

    // Check disabled days of week
    if (disabledDays && disabledDays.includes(dayOfWeek)) {
        return true;
    }

    // Check specific disabled dates
    if (normalizedDisabledDates.has(dateKey)) {
        return true;
    }

    return false;
}

/**
 * Check if a year has any enabled days (considering all constraints)
 * Used for rolling selector to determine if a year should be disabled
 */
export function hasEnabledDaysInYear(picker: any, year: number): boolean {
    // Check each month in the year
    for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Check if any day in this month is enabled
        for (let day = 1; day <= daysInMonth; day++) {
            const testDate = new Date(year, month, day);
            if (!picker.isDateDisabled(testDate)) {
                return true; // Found at least one enabled day
            }
        }
    }

    return false; // No enabled days in entire year
}

/**
 * Check if there are any disabled dates in a range
 */
export function hasDisabledDatesInRange(
    start: Date,
    end: Date,
    isDateDisabledFn: (date: Date) => boolean
): boolean {
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const current = new Date(startDate);
    while (current <= endDate) {
        if (isDateDisabledFn(current)) {
            return true;
        }
        current.setDate(current.getDate() + 1);
    }
    return false;
}

/**
 * Get all enabled dates in a range
 */
export function getEnabledDatesInRange(
    start: Date,
    end: Date,
    isDateDisabledFn: (date: Date) => boolean
): Date[] {
    const enabledDates: Date[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const current = new Date(startDate);
    while (current <= endDate) {
        if (!isDateDisabledFn(current)) {
            enabledDates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return enabledDates;
}

/**
 * Get all disabled dates in a range
 */
export function getDisabledDatesInRange(
    start: Date,
    end: Date,
    isDateDisabledFn: (date: Date) => boolean
): Date[] {
    const disabledDates: Date[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const current = new Date(startDate);
    while (current <= endDate) {
        if (isDateDisabledFn(current)) {
            disabledDates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return disabledDates;
}

/**
 * For 'block' mode: Find the last enabled date before hitting a disabled date
 */
export function findLastEnabledBeforeGap(
    start: Date,
    end: Date,
    isDateDisabledFn: (date: Date) => boolean
): Date {
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    let lastEnabled = new Date(startDate);
    const current = new Date(startDate);
    current.setDate(current.getDate() + 1); // Start from day after start

    while (current <= endDate) {
        if (isDateDisabledFn(current)) {
            // Hit a disabled date, return the last enabled date
            return lastEnabled;
        }
        lastEnabled = new Date(current);
        current.setDate(current.getDate() + 1);
    }

    return endDate;  // No disabled dates found, return the original end date
}

/**
 * For 'split' mode: Split a range into multiple ranges separated by disabled dates
 */
export function splitRangeByDisabled(
    start: Date,
    end: Date,
    isDateDisabledFn: (date: Date) => boolean
): DateRange[] {
    const ranges: DateRange[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    let rangeStart: Date | null = null;
    const current = new Date(startDate);

    while (current <= endDate) {
        if (!isDateDisabledFn(current)) {
            // This date is enabled
            if (!rangeStart) {
                rangeStart = new Date(current);
            }
        } else {
            // This date is disabled
            if (rangeStart) {
                // End the current range
                const rangeEnd = new Date(current);
                rangeEnd.setDate(rangeEnd.getDate() - 1);
                ranges.push({ start: rangeStart, end: rangeEnd });
                rangeStart = null;
            }
        }
        current.setDate(current.getDate() + 1);
    }

    // Close the last range if still open
    if (rangeStart) {
        ranges.push({ start: rangeStart, end: new Date(endDate) });
    }

    return ranges;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
    const today = new Date();
    return isSameDay(date, today);
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Check if a date is in a range (exclusive of start and end)
 */
export function isInRange(date: Date, start: Date | null, end: Date | null): boolean {
    if (!start || !end) return false;
    return date > start && date < end;
}
