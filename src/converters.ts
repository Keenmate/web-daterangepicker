/**
 * web-daterangepicker-specific `Converter`s.
 *
 * Everything the picker needs that a stock core converter (`toEnum`/`toInt`/
 * `toBool`/`toText`/…) already expresses lives inline in the `static inputs`
 * table (`web-component.ts`). This file holds only the handful of parsers whose
 * semantics are genuinely component-specific — the sanctioned "a converter can
 * be created anywhere" extension point (SPEC §4), so these stay OUT of core.
 *
 * All four share the dual-path shape: an HTML-attribute string form (CSV, pipe
 * list, `'auto'|0..6`) parsed by `fromAttribute`, and a richer JS property form
 * (`string[]`, `(Date|string)[]`) guarded by `validate`. Absent / malformed →
 * `undefined`, so the picker falls back to its own default (its options read
 * `x !== undefined ? x : default`).
 */
import { toCustom } from '@keenmate/web-components-core';
import type { Converter } from '@keenmate/web-components-core';
import { drpLogger } from './logger';
import { parseYearRangeSpec } from './date-picker-validation';

type WeekStart = 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** `'auto'` or a weekday index 0..6 (Sunday..Saturday). Anything else → undefined. */
export function toWeekStartDay(): Converter<WeekStart | undefined> {
  const isValid = (v: unknown): v is WeekStart =>
    v === 'auto' || (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6);
  return toCustom<WeekStart | undefined>(
    (raw) => {
      if (raw === null || raw === '') return undefined;
      if (raw === 'auto') return 'auto';
      const day = Number.parseInt(raw, 10);
      return !Number.isNaN(day) && day >= 0 && day <= 6 ? (day as WeekStart) : undefined;
    },
    { validate: (v): v is WeekStart | undefined => v === undefined || isValid(v), toAttribute: (v) => (v == null ? null : String(v)) },
  );
}

/**
 * CSV of weekday indices, each `0..6`. Out-of-range / non-numeric segments are
 * dropped silently; an empty result → undefined (attribute ignored). Property
 * form is a `number[]`.
 */
export function toDisabledWeekdays(): Converter<number[] | undefined> {
  const isValid = (v: unknown): v is number[] =>
    Array.isArray(v) && v.every((d) => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6);
  return toCustom<number[] | undefined>(
    (raw) => {
      if (!raw) return undefined;
      const parsed = raw
        .split(',')
        .map((d) => Number.parseInt(d.trim(), 10))
        .filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
      return parsed.length ? parsed : undefined;
    },
    { validate: (v): v is number[] | undefined => v === undefined || isValid(v), toAttribute: (v) => (Array.isArray(v) ? v.join(',') : null) },
  );
}

/**
 * Comma-separated ISO date strings (whitespace tolerated; empty segments
 * dropped). The core `normalizeDate()` validates each string at picker-init
 * time. Property form is the richer `(Date | string)[]`.
 */
export function toDisabledDates(): Converter<(Date | string)[] | undefined> {
  return toCustom<(Date | string)[] | undefined>(
    (raw) => {
      if (!raw) return undefined;
      const parsed = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return parsed.length ? parsed : undefined;
    },
    // Property path: any array (of Date or string) is accepted as-is.
    { validate: (v): v is (Date | string)[] | undefined => v === undefined || Array.isArray(v) },
  );
}

/**
 * `rolling-year-range`: `2024`, `2022-2026`, relative `-5:+5` (signed sides are
 * relative to today's year) or mixed `2020:+2`. A malformed spec is reported as
 * invalid (core warns and keeps the previous value). Absent → `null` (unset).
 */
export function toYearRange(): Converter<string | null> {
  const isValid = (v: unknown): v is string | null =>
    v == null || (typeof v === 'string' && parseYearRangeSpec(v, new Date().getFullYear()) !== null);
  return toCustom<string | null>(
    (raw, reportInvalid) => {
      if (raw === null || raw.trim() === '') return null;
      if (parseYearRangeSpec(raw, new Date().getFullYear()) === null) {
        reportInvalid?.('expected "2024", "2022-2026", "-5:+5" or "2020:+2"');
        return null;
      }
      return raw.trim();
    },
    { validate: isValid, toAttribute: (v) => v ?? null },
  );
}

/**
 * Pipe-delimited list of exactly `count` non-empty, position-indexed strings:
 *   month-names="Leden|Únor|…"  → [0]=January … [11]=December (12 items)
 *   weekday-names="Ne|Po|…"      → [0]=Sunday   … [6]=Saturday  (7 items)
 * The index is a fixed month/day number — week-start-day only rotates the
 * on-screen order, never this mapping. A wrong count or any empty segment
 * yields undefined (attribute ignored, locale names used). Property form is a
 * `string[]`.
 */
export function toPipeList(count: number): Converter<string[] | undefined> {
  const isValid = (v: unknown): v is string[] =>
    Array.isArray(v) && v.length === count && v.every((s) => typeof s === 'string' && s !== '');
  return toCustom<string[] | undefined>(
    (raw) => {
      if (!raw) return undefined;
      const parts = raw.split('|').map((s) => s.trim());
      if (parts.length !== count) {
        drpLogger.warn(`list ignored: expected exactly ${count} pipe-delimited segments, got ${parts.length}. Falling back to locale names.`);
        return undefined;
      }
      if (!parts.every(Boolean)) {
        drpLogger.warn('list ignored: one or more segments are empty. Falling back to locale names.');
        return undefined;
      }
      return parts;
    },
    { validate: (v): v is string[] | undefined => v === undefined || isValid(v), toAttribute: (v) => (Array.isArray(v) ? v.join('|') : null) },
  );
}
