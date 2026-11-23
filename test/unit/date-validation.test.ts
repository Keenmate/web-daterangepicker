import { describe, expect, it } from 'vitest';
import {
  countDaysInclusive,
  findLastEnabledBeforeGap,
  formatDateKey,
  getDisabledDatesInRange,
  getEnabledDatesInRange,
  hasDisabledDatesInRange,
  hasEnabledDaysInYear,
  isDateDisabled,
  isInRange,
  isSameDay,
  normalizeDate,
  parseYearRangeSpec,
  splitRangeByDisabled,
} from '../../src/date-picker-validation';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const keys = (dates: Date[]) => dates.map(formatDateKey);

describe('normalizeDate', () => {
  it('parses a date-only string in local time, at midnight', () => {
    const n = normalizeDate('2026-06-10')!;
    expect(formatDateKey(n)).toBe('2026-06-10');
    expect(n.getHours()).toBe(0);
  });

  it('zeroes the time unless preserveTime', () => {
    const src = new Date(2026, 5, 10, 14, 30, 15);
    expect(normalizeDate(src)!.getHours()).toBe(0);
    expect(normalizeDate(src, true)!.getMinutes()).toBe(30);
    expect(normalizeDate('2026-06-10T14:30', true)!.getHours()).toBe(14);
  });

  it('does not mutate a Date argument', () => {
    const src = new Date(2026, 5, 10, 14, 30);
    normalizeDate(src);
    expect(src.getHours()).toBe(14);
  });

  it('returns null for empty or unparseable input', () => {
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate(null as unknown as string)).toBeNull();
    expect(normalizeDate('not a date')).toBeNull();
  });
});

describe('formatDateKey', () => {
  it('pads month and day, uses the local calendar', () => {
    expect(formatDateKey(d(2026, 1, 5))).toBe('2026-01-05');
    expect(formatDateKey(new Date(2026, 9, 25, 23, 59))).toBe('2026-10-25');
  });
});

describe('parseYearRangeSpec', () => {
  it('reads a single year and absolute bounds', () => {
    expect(parseYearRangeSpec('2024', 2026)).toEqual({ min: 2024, max: 2024 });
    expect(parseYearRangeSpec(' 2022 - 2026 ', 2026)).toEqual({ min: 2022, max: 2026 });
  });

  it('reads relative and mixed sides against today’s year', () => {
    expect(parseYearRangeSpec('-5:+5', 2026)).toEqual({ min: 2021, max: 2031 });
    expect(parseYearRangeSpec('+0:+0', 2026)).toEqual({ min: 2026, max: 2026 });
    expect(parseYearRangeSpec('2020:+2', 2026)).toEqual({ min: 2020, max: 2028 });
    expect(parseYearRangeSpec('-1:2030', 2026)).toEqual({ min: 2025, max: 2030 });
  });

  it('rejects malformed specs and min > max', () => {
    for (const spec of ['', 'abc', '24', '2026-2022', '+5:-5', '5:5', '2020:2019', '2020-2022-2024']) {
      expect(parseYearRangeSpec(spec, 2026), spec).toBeNull();
    }
  });
});

describe('isDateDisabled', () => {
  const none = new Set<string>();

  it('honours min / max inclusively', () => {
    const min = d(2026, 6, 10), max = d(2026, 6, 20);
    expect(isDateDisabled(d(2026, 6, 9), min, max, none, undefined)).toBe(true);
    expect(isDateDisabled(d(2026, 6, 10), min, max, none, undefined)).toBe(false);
    expect(isDateDisabled(d(2026, 6, 20), min, max, none, undefined)).toBe(false);
    expect(isDateDisabled(d(2026, 6, 21), min, max, none, undefined)).toBe(true);
  });

  it('honours disabled weekdays and specific dates', () => {
    expect(isDateDisabled(d(2026, 6, 13), null, null, none, [0, 6])).toBe(true); // Saturday
    expect(isDateDisabled(d(2026, 6, 15), null, null, none, [0, 6])).toBe(false); // Monday
    expect(isDateDisabled(d(2026, 6, 15), null, null, new Set(['2026-06-15']), [])).toBe(true);
  });
});

describe('range helpers around disabled days', () => {
  // 12th and 13th disabled.
  const off = new Set(['2026-06-12', '2026-06-13']);
  const isOff = (x: Date) => off.has(formatDateKey(x));
  const start = d(2026, 6, 10), end = d(2026, 6, 15);

  it('detects, lists enabled and disabled days', () => {
    expect(hasDisabledDatesInRange(start, end, isOff)).toBe(true);
    expect(hasDisabledDatesInRange(d(2026, 6, 14), end, isOff)).toBe(false);
    expect(keys(getEnabledDatesInRange(start, end, isOff))).toEqual(['2026-06-10', '2026-06-11', '2026-06-14', '2026-06-15']);
    expect(keys(getDisabledDatesInRange(start, end, isOff))).toEqual(['2026-06-12', '2026-06-13']);
  });

  it('block: stops at the last enabled day before the gap', () => {
    expect(formatDateKey(findLastEnabledBeforeGap(start, end, isOff))).toBe('2026-06-11');
    expect(formatDateKey(findLastEnabledBeforeGap(d(2026, 6, 14), end, isOff))).toBe('2026-06-15');
  });

  it('split: one range per enabled run', () => {
    const ranges = splitRangeByDisabled(start, end, isOff).map((r) => [formatDateKey(r.start), formatDateKey(r.end)]);
    expect(ranges).toEqual([['2026-06-10', '2026-06-11'], ['2026-06-14', '2026-06-15']]);
    expect(splitRangeByDisabled(d(2026, 6, 12), d(2026, 6, 13), isOff)).toEqual([]);
  });

  it('walks day by day across a DST change', () => {
    // 29 Mar 2026 is the spring-forward day in Europe/Prague (vitest.config.ts pins TZ).
    expect(getEnabledDatesInRange(d(2026, 3, 28), d(2026, 3, 31), () => false)).toHaveLength(4);
    expect(getEnabledDatesInRange(d(2026, 10, 24), d(2026, 10, 26), () => false)).toHaveLength(3);
  });
});

describe('countDaysInclusive', () => {
  it('runs in a DST zone (vitest.config.ts pins TZ) — else the DST cases prove nothing', () => {
    expect(d(2026, 1, 15).getTimezoneOffset()).not.toBe(d(2026, 7, 15).getTimezoneOffset());
  });

  it('counts both ends', () => {
    expect(countDaysInclusive(d(2026, 6, 10), d(2026, 6, 10))).toBe(1);
    expect(countDaysInclusive(d(2026, 6, 10), d(2026, 6, 14))).toBe(5);
    expect(countDaysInclusive(d(2026, 12, 30), d(2027, 1, 2))).toBe(4);
  });

  it('is not thrown off by DST (23h / 25h days)', () => {
    expect(countDaysInclusive(d(2026, 3, 28), d(2026, 3, 30))).toBe(3);
    expect(countDaysInclusive(d(2026, 10, 24), d(2026, 10, 26))).toBe(3);
  });

  it('ignores the time of day', () => {
    expect(countDaysInclusive(new Date(2026, 5, 10, 23, 0), new Date(2026, 5, 11, 1, 0))).toBe(2);
  });

  it('is 0 for a reversed range', () => {
    expect(countDaysInclusive(d(2026, 6, 14), d(2026, 6, 10))).toBe(0);
  });
});

describe('day comparisons', () => {
  it('isSameDay ignores time, rejects null', () => {
    expect(isSameDay(new Date(2026, 5, 10, 1), new Date(2026, 5, 10, 23))).toBe(true);
    expect(isSameDay(d(2026, 6, 10), d(2026, 6, 11))).toBe(false);
    expect(isSameDay(null, d(2026, 6, 10))).toBe(false);
  });

  it('isInRange excludes both ends', () => {
    expect(isInRange(d(2026, 6, 12), d(2026, 6, 10), d(2026, 6, 14))).toBe(true);
    expect(isInRange(d(2026, 6, 10), d(2026, 6, 10), d(2026, 6, 14))).toBe(false);
    expect(isInRange(d(2026, 6, 14), d(2026, 6, 10), d(2026, 6, 14))).toBe(false);
    expect(isInRange(d(2026, 6, 12), null, d(2026, 6, 14))).toBe(false);
  });
});

describe('hasEnabledDaysInYear', () => {
  it('is false only when every day of the year is disabled', () => {
    const onlyDec31 = { isDateDisabled: (x: Date) => formatDateKey(x) !== '2026-12-31' };
    expect(hasEnabledDaysInYear(onlyDec31, 2026)).toBe(true);
    expect(hasEnabledDaysInYear(onlyDec31, 2025)).toBe(false);
  });
});
