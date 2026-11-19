/**
 * Date Picker Locales
 *
 * UI labels (`labels`, English defaults; resolved through core `createLabels`). The locale itself, the week start and the
 * month / weekday names come from core `/locale` (instance `locale` → page-wide
 * `window.components.locale` → the browser language) — see `DatePicker#applyLocale`.
 */

import type { DateRangePickerLabels } from './types';

/** Built-in English UI labels. Resolved and `{count}`-interpolated by core `createLabels` (`DateRangePickerEngine#labels`):
 *  instance `labels` (short `buttons.today` or full `web-daterangepicker.buttons.today` keys) → the page-wide flat
 *  dictionary `window.components.locale.labels['web-daterangepicker.buttons.today']` → these. Keys are flat
 *  `<elementType>.<name>`. */
export const DEFAULT_LABELS: Readonly<DateRangePickerLabels> = Object.freeze({
  'buttons.today': 'Today',
  'buttons.clear': 'Clear',
  'buttons.apply': 'Apply',
  'buttons.now': 'Now',
  'ariaLabels.clear': 'Clear',
  'ariaLabels.close': 'Close',
  'labels.preview': 'Preview',
  'labels.day': '{count} day',
  'labels.days': '{count} days',
  'labels.night': '{count} night',
  'labels.nights': '{count} nights',
  'labels.selectionCount': '{count} selection(s)',
  'labels.time': 'Time',
  'labels.am': 'AM',
  'labels.pm': 'PM',
  'labels.hours': 'Hours',
  'labels.minutes': 'Minutes',
  'labels.seconds': 'Seconds',
  'headers.fullscreen': '',
  'errors.valueFormat': 'The value could not be formatted.',
  'ariaLabels.loading': 'Loading…',
});
