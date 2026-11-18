/**
 * Date Picker Locales
 *
 * UI labels (`labels`, English defaults; resolved through core `createLabels`). The locale itself, the week start and the
 * month / weekday names come from core `/locale` (instance `locale` → page-wide
 * `window.components.locale` → the browser language) — see `DatePicker#applyLocale`.
 */

import type { DateRangePickerLabels } from './types';

/** Built-in English UI labels. Resolved and `{count}`-interpolated by core `createLabels` (`DateRangePickerEngine#labels`):
 *  instance `labels` → page-wide `window.components.locale.labels['web-daterangepicker']` → these. */
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
