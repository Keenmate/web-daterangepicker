/**
 * Form-value serialization — turns the picker's current selection into the
 * string(s) submitted under the control's `name`.
 *
 * This is intentionally a **stable, ISO-8601** view of the selection, independent
 * of `dateFormatMask` / `timeFormatMask` / the placeholder masks (which are for humans). A server sees
 * `2026-06-15`, never `Jun 15, 2026`. The rendering side (light-DOM hidden inputs)
 * lives in `web-component.ts`; everything here is pure so it can be reasoned about
 * and tested in isolation. Mirrors web-multiselect's `value-format` model.
 */
import type { SelectedTime } from './types';

/** How the selection is serialized into the hidden form input(s). */
export type FormValueFormat = 'iso' | 'json' | 'array';

/**
 * One ISO atom of the selection: a point (single date / datetime / time) or a
 * range. All strings are local-clock ISO-8601 (no timezone shift).
 */
export type FormValueItem = string | { start: string; end: string };

/**
 * Normalized, format-mask-independent snapshot of the current selection. Passed
 * verbatim to `getValueFormatCallback` so a consumer can serialize however they
 * like from stable ISO strings.
 */
export interface FormValueSelection {
  selectionMode: 'single' | 'range' | 'multiple';
  pickerMode: 'date' | 'time' | 'datetime';
  /** ISO items; empty when nothing is selected. */
  items: FormValueItem[];
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local-clock ISO date: `YYYY-MM-DD` (never UTC — avoids off-by-one day shifts). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local-clock ISO time: `HH:mm` or `HH:mm:ss`. */
export function isoTime(t: SelectedTime, showSeconds: boolean): string {
  const base = `${pad(t.hour ?? 0)}:${pad(t.minute ?? 0)}`;
  return showSeconds ? `${base}:${pad(t.second ?? 0)}` : base;
}

/** Local-clock ISO datetime: `YYYY-MM-DDTHH:mm[:ss]`. */
export function isoDateTime(d: Date, showSeconds: boolean): string {
  const time = showSeconds
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${isoDate(d)}T${time}`;
}

/** A range item renders as the ISO-8601 interval `start/end`; a point is itself. */
function itemToIso(item: FormValueItem): string {
  return typeof item === 'string' ? item : `${item.start}/${item.end}`;
}

/**
 * Serialize a selection to the value(s) submitted under the control's `name`.
 * Returns a flat list of strings:
 *   - `iso` / `json` / a `callback` → exactly one entry (rendered as one hidden
 *     input named `name`).
 *   - `array` → one entry per ISO atom (rendered as multiple `name[]` inputs); a
 *     range contributes its `start` and `end` as two consecutive atoms.
 *
 * Empty selection: `['']` for the single-input formats (the field submits empty,
 * matching a native control) and `[]` for `array` (no inputs at all).
 */
export function serializeFormValue(
  selection: FormValueSelection,
  format: FormValueFormat,
  callback?: (selection: FormValueSelection) => string,
): string[] {
  if (callback) return [callback(selection)];

  const { items, selectionMode } = selection;

  if (format === 'array') {
    return items.flatMap((item) =>
      typeof item === 'string' ? [item] : [item.start, item.end],
    );
  }

  if (format === 'json') {
    // single/range emit a scalar/object; multiple emits an array.
    if (selectionMode === 'multiple') return [JSON.stringify(items)];
    return [JSON.stringify(items[0] ?? null)];
  }

  // iso (default): one canonical string; ranges as `start/end`, multiple joined by ','.
  return [items.map(itemToIso).join(',')];
}
