import { describe, expect, it } from 'vitest';
import { computeMaskedValue, computeMaskedRangeValue } from '../../src/date-picker-interaction';
import { parseMonthRange, parseYearRange } from '../../src/date-picker-rendering';
import { isSameOrAfterMonth } from '../../src/date-picker-navigation';
import { parseDateFormat } from '../../src/date-format';

// The mask helpers read only `picker.formatInfo`.
const picker = (mask: string) => ({ formatInfo: parseDateFormat(mask) });

describe('computeMaskedValue (progressive typing)', () => {
  const iso = picker('YYYY-MM-DD');

  it('inserts the literal after each complete segment', () => {
    expect(computeMaskedValue(iso, '2')).toBe('2');
    expect(computeMaskedValue(iso, '2026')).toBe('2026-');
    expect(computeMaskedValue(iso, '20260')).toBe('2026-0');
    expect(computeMaskedValue(iso, '202606')).toBe('2026-06-');
    expect(computeMaskedValue(iso, '20260610')).toBe('2026-06-10');
  });

  it('ignores typed non-digits and caps at maxLength', () => {
    expect(computeMaskedValue(iso, '2026-06-10')).toBe('2026-06-10');
    expect(computeMaskedValue(iso, '2026061099')).toBe('2026-06-10');
  });

  it('follows the mask order and its multi-character literals', () => {
    expect(computeMaskedValue(picker('DD.MM.YYYY'), '1006')).toBe('10.06.');
    expect(computeMaskedValue(picker('DD. MM. YYYY'), '17')).toBe('17. ');
    expect(computeMaskedValue(picker('DD. MM. YYYY'), '17112026')).toBe('17. 11. 2026');
  });

  it('writes the leading literal and the trailing one when complete', () => {
    expect(computeMaskedValue(picker('YYYY. MM. DD.'), '20261117')).toBe('2026. 11. 17.');
    expect(computeMaskedValue(picker('YYYY. MM. DD.'), '2026111')).toBe('2026. 11. 1');
  });

  it('empty stays empty', () => {
    expect(computeMaskedValue(iso, '')).toBe('');
  });
});

describe('computeMaskedRangeValue', () => {
  const iso = picker('YYYY-MM-DD');

  it('adds " - " once the start date is complete', () => {
    expect(computeMaskedRangeValue(iso, '2026061')).toBe('2026-06-1');
    expect(computeMaskedRangeValue(iso, '20260610')).toBe('2026-06-10 - ');
  });

  it('masks the end side after an explicit separator', () => {
    expect(computeMaskedRangeValue(iso, '2026-06-10 - 202606')).toBe('2026-06-10 - 2026-06-');
    expect(computeMaskedRangeValue(iso, '2026-06-10 - 20260614')).toBe('2026-06-10 - 2026-06-14');
  });

  it('splits a pasted run without spaces at maxLength', () => {
    expect(computeMaskedRangeValue(iso, '2026-06-10-2026-06-15')).toBe('2026-06-10 - 2026-06-15');
  });
});

describe('rolling selector ranges', () => {
  it('parseYearRange: spec, else min/max years, else current ± 1', () => {
    const today = new Date(2026, 5, 10);
    expect(parseYearRange('-2:+1', 2030, { today })).toEqual({ min: 2024, max: 2027 });
    expect(parseYearRange(undefined, 2030, { today, normalizedMinDate: new Date(2020, 0, 1) })).toEqual({ min: 2020, max: 2031 });
    expect(parseYearRange(undefined, 2030)).toEqual({ min: 2029, max: 2031 });
    expect(parseYearRange('nonsense', 2030)).toEqual({ min: 2029, max: 2031 });
  });

  it('parseMonthRange: "MM-MM", default all months', () => {
    expect(parseMonthRange(undefined)).toEqual({ min: 1, max: 12 });
    expect(parseMonthRange('06-08')).toEqual({ min: 6, max: 8 });
  });

  it('isSameOrAfterMonth compares year-month only', () => {
    expect(isSameOrAfterMonth(new Date(2026, 5, 1), new Date(2026, 5, 30))).toBe(true);
    expect(isSameOrAfterMonth(new Date(2026, 5, 1), new Date(2026, 6, 1))).toBe(false);
    expect(isSameOrAfterMonth(new Date(2027, 0, 1), new Date(2026, 11, 31))).toBe(true);
  });
});
