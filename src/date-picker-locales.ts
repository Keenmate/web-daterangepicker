/**
 * Date Picker Locales
 *
 * UI labels (`labels`, English defaults). The locale itself, the week start and the
 * month / weekday names come from core `/locale` (instance `locale` → page-wide
 * `window.components.locale` → the browser language) — see `DatePicker#applyLocale`.
 */

import type { DateRangePickerLabels } from './types';
import { escapeHtml } from '@keenmate/web-components-core';

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
