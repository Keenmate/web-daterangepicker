import { describe, expect, it } from 'vitest';
import type { Converter } from '@keenmate/web-components-core';
import { toDisabledDates, toDisabledWeekdays, toPipeList, toWeekStartDay, toYearRange } from '../../src/converters';

/** Run the attribute path; `invalid` = the converter called `reportInvalid`. */
function fromAttr<V>(converter: Converter<V>, raw: string | null) {
  let invalid = false;
  const value = converter.fromAttribute!(raw, {} as never, 'attr', () => { invalid = true; });
  return { value, invalid };
}

describe('toWeekStartDay', () => {
  const c = toWeekStartDay();

  it('attribute path', () => {
    expect(fromAttr(c, 'auto')).toEqual({ value: 'auto', invalid: false });
    expect(fromAttr(c, ' 1 ')).toEqual({ value: 1, invalid: false });
    expect(fromAttr(c, null)).toEqual({ value: undefined, invalid: false });
    expect(fromAttr(c, '7').invalid).toBe(true);
    expect(fromAttr(c, 'monday').invalid).toBe(true);
  });

  it('property path and reflection', () => {
    expect(c.validate!(0)).toBe(true);
    expect(c.validate!('auto')).toBe(true);
    expect(c.validate!(1.5)).toBe(false);
    expect(c.toAttribute!(6)).toBe('6');
    expect(c.toAttribute!(undefined)).toBeNull();
  });
});

describe('toDisabledWeekdays', () => {
  const c = toDisabledWeekdays();

  it('reads a CSV of 0..6, whole value invalid on one bad segment', () => {
    expect(fromAttr(c, '0, 6')).toEqual({ value: [0, 6], invalid: false });
    expect(fromAttr(c, '')).toEqual({ value: undefined, invalid: false });
    expect(fromAttr(c, '0,7').invalid).toBe(true);
    expect(fromAttr(c, '0,x').invalid).toBe(true);
  });

  it('property path and reflection', () => {
    expect(c.validate!([1, 2])).toBe(true);
    expect(c.validate!([7])).toBe(false);
    expect(c.toAttribute!([0, 6])).toBe('0,6');
  });
});

describe('toDisabledDates', () => {
  const c = toDisabledDates();

  it('splits the CSV, drops empty segments', () => {
    expect(fromAttr(c, ' 2026-06-10 ,, 2026-06-12 ').value).toEqual(['2026-06-10', '2026-06-12']);
    expect(fromAttr(c, ' , ').value).toBeUndefined();
  });

  it('accepts any array on the property path', () => {
    expect(c.validate!([new Date(), '2026-06-10'])).toBe(true);
    expect(c.validate!('2026-06-10')).toBe(false);
  });
});

describe('toYearRange', () => {
  const c = toYearRange();

  it('keeps a valid spec (trimmed), reports a malformed one', () => {
    expect(fromAttr(c, ' -5:+5 ')).toEqual({ value: '-5:+5', invalid: false });
    expect(fromAttr(c, '2022-2026')).toEqual({ value: '2022-2026', invalid: false });
    expect(fromAttr(c, null)).toEqual({ value: null, invalid: false });
    expect(fromAttr(c, '2026-2022').invalid).toBe(true);
  });

  it('validates the property form the same way', () => {
    expect(c.validate!('2020:+2')).toBe(true);
    expect(c.validate!(null)).toBe(true);
    expect(c.validate!('soon')).toBe(false);
  });
});

describe('toPipeList', () => {
  const c = toPipeList(7);

  it('needs exactly N non-empty names', () => {
    expect(fromAttr(c, 'Ne|Po|Út|St|Čt|Pá|So').value).toEqual(['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']);
    expect(fromAttr(c, 'Ne|Po').invalid).toBe(true);
    expect(fromAttr(c, 'Ne|Po||St|Čt|Pá|So').invalid).toBe(true);
  });

  it('property path and reflection', () => {
    expect(c.validate!(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toBe(true);
    expect(c.validate!(['a'])).toBe(false);
    expect(c.toAttribute!(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toBe('a|b|c|d|e|f|g');
  });
});
