/**
 * Date Picker Locales
 *
 * UI labels (`labels`, English defaults) and the Intl helpers for month / weekday
 * names. Month and weekday names, and the resolved locale, come from `Intl` — there
 * are no built-in language tables; translate the UI strings via `labels`.
 */

import type { DateRangePickerLabels } from './types';
import log from './logger';
import { escapeHtml } from '@keenmate/web-components-core/search';

/** Built-in English UI labels. `{count}` is interpolated by {@link formatLabel}. */
export const DEFAULT_LABELS: Readonly<DateRangePickerLabels> = Object.freeze({
  today: 'Today',
  clear: 'Clear',
  apply: 'Apply',
  now: 'Now',
  close: 'Close',
  preview: 'Preview',
  day: '{count} day',
  days: '{count} days',
  night: '{count} night',
  nights: '{count} nights',
  selectionCount: '{count} selection(s)',
  time: 'Time',
  am: 'AM',
  pm: 'PM',
  hours: 'Hours',
  minutes: 'Minutes',
  seconds: 'Seconds',
  fullscreenTitle: '',
  valueFormatError: 'The value could not be formatted.',
  loading: 'Loading…',
});

/**
 * Resolve the effective labels: the instance `labels` (partial) over the English
 * defaults. The single resolution seam — a page-wide source (core `/locale`) slots
 * in between the two later. `''` is a deliberate empty label (renders nothing);
 * `undefined` / a missing key falls back to the English default. Non-string
 * overrides are ignored.
 */
export function resolveLabels(labels?: Partial<DateRangePickerLabels> | null): DateRangePickerLabels {
  const out: DateRangePickerLabels = { ...DEFAULT_LABELS };
  if (labels && typeof labels === 'object') {
    for (const [key, value] of Object.entries(labels)) {
      if (typeof value === 'string' && key in out) (out as unknown as Record<string, string>)[key] = value;
    }
  }
  return out;
}

/**
 * Interpolate `{name}` placeholders in a label (`formatLabel('{count} days', { count: 3 })`).
 * The template may carry HTML (content labels are inserted as-is); the placeholder
 * VALUES are data and are escaped before interpolation.
 */
export function formatLabel(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? escapeHtml(String(params[name])) : match));
}

/**
 * The locale used for `Intl` (month / weekday names): the given BCP-47 tag, or the
 * browser's language for `auto` (`en` when unavailable).
 */
export function resolveLocale(locale: string | 'auto' | null | undefined): string {
  if (locale && locale !== 'auto') return locale;
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en';
}

/**
 * Get weekday names using Intl API (short format: Mo, Tu, We, etc.)
 * Falls back to English if Intl is not available
 */
export function getWeekdayNames(locale: string): string[] {
  const resolvedLocale = resolveLocale(locale);

  try {
    // Use Intl to get localized weekday names
    const formatter = new Intl.DateTimeFormat(resolvedLocale, { weekday: 'short' });

    // Generate dates for each day of the week (starting from Sunday)
    const weekdays: string[] = [];
    // Use a date in 2017 which starts on Sunday (Jan 1, 2017)
    for (let day = 0; day < 7; day++) {
      const date = new Date(2017, 0, day + 1); // Jan 1-7, 2017 (Sun-Sat)
      weekdays.push(formatter.format(date));
    }

    return weekdays;
  } catch (e) {
    // Fallback to English if Intl fails
    log.warn('getWeekdayNames() - Intl.DateTimeFormat failed, using English weekdays', e);
    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  }
}

/**
 * Get month names using Intl API (long format: January, February, etc.)
 * Falls back to English if Intl is not available
 */
export function getMonthNames(locale: string): string[] {
  const resolvedLocale = resolveLocale(locale);

  try {
    // Use Intl to get localized month names
    const formatter = new Intl.DateTimeFormat(resolvedLocale, { month: 'long' });

    // Generate dates for each month
    const months: string[] = [];
    for (let month = 0; month < 12; month++) {
      const date = new Date(2017, month, 1);
      months.push(formatter.format(date));
    }

    return months;
  } catch (e) {
    // Fallback to English if Intl fails
    log.warn('getMonthNames() - Intl.DateTimeFormat failed, using English months', e);
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }
}
