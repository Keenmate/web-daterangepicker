/**
 * Form-value model: turns the picker's current selection into the string(s)
 * submitted under the control's `name` (which is also exactly what `el.value`
 * returns), and turns such a value back into text the engine parses.
 *
 * The submitted value is independent of `dateFormatMask` / `timeFormatMask` / the
 * placeholder masks (those are for humans). Each date is written with
 * `valueFormatMask` (default ISO-8601: `YYYY-MM-DD`, `HH:mm[:ss]`,
 * `YYYY-MM-DDTHH:mm[:ss]`); `valueSeparator` joins the dates in the `text` format.
 * Priority: `getValueFormatCallback` > `value-format-mask` / `value-separator` >
 * `value-format`. The rendering side (light-DOM hidden inputs) lives in
 * `web-component.ts`; everything here is pure.
 */
import type { SelectedTime } from './types';

/** How the selection is serialized into the hidden form input(s). */
export type FormValueFormat = 'text' | 'json' | 'array';

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

/** Date/time fields of one atom (missing parts are `undefined`). */
interface AtomParts {
  year?: number; month?: number; day?: number;
  hour?: number; minute?: number; second?: number;
}

/** Mask tokens (longest first so `YYYY` wins over `YY`, `MM` over `M`). */
const MASK_TOKEN = /YYYY|YY|MM|M|DD|D|HH|H|hh|h|mm|ss|a/g;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The default `valueSeparator`: `/` between a range's dates, `,` between multiple dates. */
export function defaultValueSeparator(selectionMode: FormValueSelection['selectionMode']): string {
  return selectionMode === 'multiple' ? ',' : '/';
}

/** Split an ISO atom (`YYYY-MM-DD`, `HH:mm[:ss]`, `YYYY-MM-DDTHH:mm[:ss]`) into its fields. */
function isoToParts(iso: string): AtomParts | null {
  const m = /^(?:(\d{4})-(\d{2})-(\d{2}))?T?(?:(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(iso);
  if (!m || !iso) return null;
  const n = (v?: string): number | undefined => (v == null ? undefined : Number(v));
  return { year: n(m[1]), month: n(m[2]), day: n(m[3]), hour: n(m[4]), minute: n(m[5]), second: n(m[6]) };
}

/**
 * Write one ISO atom with a mask. Tokens: `YYYY`, `YY`, `MM`, `M`, `DD`, `D`,
 * `HH`, `H`, `hh`, `h`, `mm`, `ss`, `a` (AM/PM); anything else is literal.
 */
export function formatWithMask(iso: string, mask: string): string {
  const p = isoToParts(iso);
  if (!p) return iso;
  const hour = p.hour ?? 0;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return mask.replace(MASK_TOKEN, (t) => {
    switch (t) {
      case 'YYYY': return String(p.year ?? 0).padStart(4, '0');
      case 'YY': return pad((p.year ?? 0) % 100);
      case 'MM': return pad(p.month ?? 0);
      case 'M': return String(p.month ?? 0);
      case 'DD': return pad(p.day ?? 0);
      case 'D': return String(p.day ?? 0);
      case 'HH': return pad(hour);
      case 'H': return String(hour);
      case 'hh': return pad(h12);
      case 'h': return String(h12);
      case 'mm': return pad(p.minute ?? 0);
      case 'ss': return pad(p.second ?? 0);
      default: return hour >= 12 ? 'PM' : 'AM'; // 'a'
    }
  });
}

/**
 * Parse one atom written with a mask back to ISO for the picker mode
 * (`YYYY-MM-DD`, `HH:mm:ss`, `YYYY-MM-DDTHH:mm:ss`). Strict: the whole text must
 * match the mask and the date/time must be real. `null` when it doesn't.
 */
export function parseWithMask(text: string, mask: string, pickerMode: FormValueSelection['pickerMode']): string | null {
  const order: string[] = [];
  let source = '';
  let last = 0;
  for (const m of mask.matchAll(MASK_TOKEN)) {
    source += escapeRegExp(mask.slice(last, m.index));
    last = m.index! + m[0].length;
    order.push(m[0]);
    source += m[0] === 'a' ? '([AaPp][Mm])'
      : m[0] === 'YYYY' ? '(\\d{4})'
      : m[0].length === 2 ? '(\\d{2})'
      : '(\\d{1,2})';
  }
  source += escapeRegExp(mask.slice(last));
  const match = new RegExp(`^${source}$`).exec(text.trim());
  if (!match) return null;
  const p: AtomParts = {};
  let isPm = false;
  let is12 = false;
  order.forEach((t, i) => {
    const v = match[i + 1];
    if (t === 'a') { isPm = v.toLowerCase() === 'pm'; return; }
    const n = Number(v);
    if (t === 'YYYY') p.year = n;
    else if (t === 'YY') p.year = 2000 + n;
    else if (t === 'MM' || t === 'M') p.month = n;
    else if (t === 'DD' || t === 'D') p.day = n;
    else if (t === 'HH' || t === 'H') p.hour = n;
    else if (t === 'hh' || t === 'h') { p.hour = n; is12 = true; }
    else if (t === 'mm') p.minute = n;
    else if (t === 'ss') p.second = n;
  });
  if (is12 && p.hour != null) {
    if (p.hour < 1 || p.hour > 12) return null;
    p.hour = (p.hour % 12) + (isPm ? 12 : 0);
  }
  const needsDate = pickerMode !== 'time';
  const needsTime = pickerMode !== 'date';
  let date = '';
  if (needsDate) {
    if (p.year == null || p.month == null || p.day == null) return null;
    const d = new Date(p.year, p.month - 1, p.day);
    if (d.getFullYear() !== p.year || d.getMonth() !== p.month - 1 || d.getDate() !== p.day) return null;
    date = `${String(p.year).padStart(4, '0')}-${pad(p.month)}-${pad(p.day)}`;
  }
  let time = '';
  if (needsTime) {
    if (p.hour == null) return null;
    const minute = p.minute ?? 0;
    const second = p.second ?? 0;
    if (p.hour > 23 || minute > 59 || second > 59) return null;
    time = `${pad(p.hour)}:${pad(minute)}:${pad(second)}`;
  }
  if (pickerMode === 'datetime') return `${date}T${time}`;
  return needsDate ? date : time;
}

/** How the submitted value is written: the per-date mask + the join separator. */
export interface FormValueWriteOptions {
  /** Per-date mask; `null`/`undefined` = the ISO default (atoms written as-is). */
  mask?: string | null;
  /** Joins the dates in `text`; `null`/`undefined` = the mode's default (`/` range, `,` multiple). */
  separator?: string | null;
}

/**
 * Serialize a selection to the value(s) submitted under the control's `name`
 * (and returned by `el.value`). Returns a flat list of strings:
 *   - `text` / `json` / a `callback` → exactly one entry (one hidden input `name`).
 *   - `array` → one entry per date (multiple `name[]` inputs); a range
 *     contributes its start and end as two consecutive entries.
 *
 * `text`: single — the date; range — `start{separator}end` (several ranges, e.g.
 * split around disabled days, joined by `,`); multiple — the dates joined by the
 * separator (a range item written `start/end`).
 * `json`: single — `"date"`; range — `["start","end", …]` (the same entries as
 * `array`); multiple — an array of `"date"` / `["start","end"]` items.
 *
 * Empty selection: `['']` for the single-input formats (the field submits empty,
 * like a native control) and `[]` for `array` (no inputs at all).
 */
export function serializeFormValue(
  selection: FormValueSelection,
  format: FormValueFormat,
  callback?: (selection: FormValueSelection) => string,
  write: FormValueWriteOptions = {},
): string[] {
  if (callback) return [callback(selection)];

  const { items, selectionMode } = selection;
  const mask = write.mask || null;
  const atom = (iso: string): string => (mask ? formatWithMask(iso, mask) : iso);
  const separator = write.separator || defaultValueSeparator(selectionMode);
  const flat = (): string[] => items.flatMap((item) =>
    typeof item === 'string' ? [atom(item)] : [atom(item.start), atom(item.end)],
  );

  if (format === 'array') return flat();
  if (items.length === 0) return [''];

  if (format === 'json') {
    if (selectionMode === 'single') return [JSON.stringify(flat()[0])];
    if (selectionMode === 'range') return [JSON.stringify(flat())];
    return [JSON.stringify(items.map((item) =>
      typeof item === 'string' ? atom(item) : [atom(item.start), atom(item.end)]))];
  }

  // text (default): one field.
  if (selectionMode === 'multiple') {
    return [items.map((item) =>
      typeof item === 'string' ? atom(item) : `${atom(item.start)}/${atom(item.end)}`).join(separator)];
  }
  if (selectionMode === 'range') {
    return [items.map((item) =>
      typeof item === 'string' ? atom(item) : `${atom(item.start)}${separator}${atom(item.end)}`).join(',')];
  }
  return [flat()[0]];
}

/** What a value in the value-format form splits into: dates and `[start, end]` pairs. */
type ValueAtom = string | [string, string];

/** Split a value given in the `value-format` form into atoms; `null` = not that form. */
function splitValue(
  input: string | readonly string[],
  selectionMode: FormValueSelection['selectionMode'],
  separator: string,
): ValueAtom[] | null {
  const fromList = (list: unknown[]): ValueAtom[] | null => {
    if (selectionMode === 'range') {
      // Flat [start, end, start, end, …] (the array / json form).
      if (list.length % 2 || !list.every((v) => typeof v === 'string')) return null;
      const pairs: ValueAtom[] = [];
      for (let i = 0; i < list.length; i += 2) pairs.push([list[i] as string, list[i + 1] as string]);
      return pairs;
    }
    const atoms: ValueAtom[] = [];
    for (const v of list) {
      if (typeof v === 'string') atoms.push(v);
      else if (Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'string')) atoms.push([v[0], v[1]]);
      else return null;
    }
    return selectionMode === 'single' && atoms.length > 1 ? null : atoms;
  };

  if (typeof input !== 'string') return fromList([...input]);
  const text = input.trim();
  if (!text) return [];
  if (text[0] === '[' || text[0] === '"') {
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === 'string') return [parsed];
      if (Array.isArray(parsed)) return fromList(parsed);
    } catch { /* not JSON — read it as text */ }
  }
  if (selectionMode === 'single') return [text];
  if (selectionMode === 'range') {
    const pieces = separator.includes(',') ? [text] : text.split(',');
    const pairs: ValueAtom[] = [];
    for (const piece of pieces) {
      const parts = piece.split(separator);
      if (parts.length !== 2) return null;
      pairs.push([parts[0].trim(), parts[1].trim()]);
    }
    return pairs;
  }
  return text.split(separator).map((s) => s.trim()).filter(Boolean);
}

/**
 * Turn a value in the `value-format` form (`text` with the mask + separator, a
 * `json` string, an `array` of strings) into text the engine's lenient parser
 * reads (ISO dates, ranges as `start/end`, items joined by `,`). Dates the mask
 * doesn't match pass through unchanged (the engine also reads ISO and the
 * displayed `date-format-mask` form). `null` when the input isn't in the
 * value-format form — the caller then hands the raw text to the lenient parser.
 */
export function toEngineValueText(
  input: string | readonly string[],
  selectionMode: FormValueSelection['selectionMode'],
  pickerMode: FormValueSelection['pickerMode'],
  write: FormValueWriteOptions = {},
): string | null {
  const separator = write.separator || defaultValueSeparator(selectionMode);
  const atoms = splitValue(input, selectionMode, separator);
  if (!atoms) return null;
  const mask = write.mask || null;
  const one = (s: string): string => (mask ? parseWithMask(s, mask, pickerMode) ?? s : s);
  return atoms.map((a) => (typeof a === 'string' ? one(a) : `${one(a[0])}/${one(a[1])}`)).join(',');
}
