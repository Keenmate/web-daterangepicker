import { describe, expect, it } from 'vitest';
import {
  defaultValueSeparator,
  formatWithMask,
  isoDate,
  isoDateTime,
  isoTime,
  parseWithMask,
  serializeFormValue,
  toEngineValueText,
  type FormValueSelection,
} from '../../src/form-value';

describe('ISO atoms', () => {
  it('writes the local clock, never UTC', () => {
    // 00:30 local on 1 Jun is still 31 May in UTC.
    expect(isoDate(new Date(2026, 5, 1, 0, 30))).toBe('2026-06-01');
    expect(isoDateTime(new Date(2026, 5, 1, 0, 30, 5), false)).toBe('2026-06-01T00:30');
    expect(isoDateTime(new Date(2026, 5, 1, 0, 30, 5), true)).toBe('2026-06-01T00:30:05');
  });

  it('isoTime defaults missing fields to 0', () => {
    expect(isoTime({ hour: 9, minute: 5, second: null, ampm: null }, false)).toBe('09:05');
    expect(isoTime({ hour: 9, minute: null, second: null, ampm: null }, true)).toBe('09:00:00');
  });
});

describe('formatWithMask', () => {
  it('writes date tokens', () => {
    expect(formatWithMask('2026-06-05', 'DD.MM.YYYY')).toBe('05.06.2026');
    expect(formatWithMask('2026-06-05', 'D/M/YY')).toBe('5/6/26');
  });

  it('writes 24h and 12h time tokens', () => {
    expect(formatWithMask('2026-06-05T14:07:09', 'YYYY-MM-DD HH:mm:ss')).toBe('2026-06-05 14:07:09');
    expect(formatWithMask('14:07', 'h:mm a')).toBe('2:07 PM');
    expect(formatWithMask('00:15', 'hh:mm a')).toBe('12:15 AM');
    expect(formatWithMask('12:00', 'h:mm a')).toBe('12:00 PM');
  });

  it('passes a non-ISO atom through', () => {
    expect(formatWithMask('garbage', 'DD.MM.YYYY')).toBe('garbage');
  });
});

describe('parseWithMask', () => {
  it('round-trips formatWithMask', () => {
    for (const [iso, mask, mode] of [
      ['2026-06-05', 'DD.MM.YYYY', 'date'],
      ['2026-06-05T14:07:09', 'DD.MM.YYYY HH:mm:ss', 'datetime'],
      ['14:07:00', 'h:mm a', 'time'],
      ['00:15:00', 'hh:mm a', 'time'],
    ] as const) {
      expect(parseWithMask(formatWithMask(iso, mask), mask, mode), `${iso} ${mask}`).toBe(iso);
    }
  });

  it('is strict about the whole text and real dates', () => {
    expect(parseWithMask('05.06.2026x', 'DD.MM.YYYY', 'date')).toBeNull();
    expect(parseWithMask('31.04.2026', 'DD.MM.YYYY', 'date')).toBeNull();
    expect(parseWithMask('29.02.2026', 'DD.MM.YYYY', 'date')).toBeNull();
    expect(parseWithMask('25:00', 'HH:mm', 'time')).toBeNull();
    expect(parseWithMask('13:00 PM', 'h:mm a', 'time')).toBeNull();
    expect(parseWithMask('0:30 AM', 'h:mm a', 'time')).toBeNull();
  });

  it('needs the parts the picker mode needs', () => {
    expect(parseWithMask('05.06.2026', 'DD.MM.YYYY', 'datetime')).toBeNull();
    expect(parseWithMask('14:07', 'HH:mm', 'date')).toBeNull();
  });

  it('escapes regex characters in literals', () => {
    expect(parseWithMask('2026.06.05', 'YYYY.MM.DD', 'date')).toBe('2026-06-05');
    expect(parseWithMask('2026x06x05', 'YYYY.MM.DD', 'date')).toBeNull();
  });
});

describe('serializeFormValue', () => {
  const sel = (selectionMode: FormValueSelection['selectionMode'], items: FormValueSelection['items']): FormValueSelection =>
    ({ selectionMode, pickerMode: 'date', items });

  it('default separators', () => {
    expect(defaultValueSeparator('range')).toBe('/');
    expect(defaultValueSeparator('multiple')).toBe(',');
  });

  it('single', () => {
    expect(serializeFormValue(sel('single', ['2026-06-10']), 'text')).toEqual(['2026-06-10']);
    expect(serializeFormValue(sel('single', ['2026-06-10']), 'json')).toEqual(['"2026-06-10"']);
    expect(serializeFormValue(sel('single', ['2026-06-10']), 'array')).toEqual(['2026-06-10']);
    expect(serializeFormValue(sel('single', []), 'text')).toEqual(['']);
    expect(serializeFormValue(sel('single', []), 'array')).toEqual([]);
  });

  it('range is always a list of ranges', () => {
    const one = sel('range', [{ start: '2026-06-10', end: '2026-06-14' }]);
    expect(serializeFormValue(one, 'text')).toEqual(['2026-06-10/2026-06-14']);
    expect(serializeFormValue(one, 'json')).toEqual(['[{"start":"2026-06-10","end":"2026-06-14"}]']);
    expect(serializeFormValue(one, 'array')).toEqual(['2026-06-10/2026-06-14']);

    const split = sel('range', [{ start: '2026-06-10', end: '2026-06-11' }, '2026-06-14']);
    expect(serializeFormValue(split, 'text')).toEqual(['2026-06-10/2026-06-11,2026-06-14/2026-06-14']);
    expect(serializeFormValue(sel('range', []), 'json')).toEqual(['']);
  });

  it('multiple mixes dates and ranges', () => {
    const multi = sel('multiple', ['2026-06-01', { start: '2026-06-10', end: '2026-06-12' }]);
    expect(serializeFormValue(multi, 'text')).toEqual(['2026-06-01,2026-06-10/2026-06-12']);
    expect(serializeFormValue(multi, 'json')).toEqual(['["2026-06-01",{"start":"2026-06-10","end":"2026-06-12"}]']);
    expect(serializeFormValue(multi, 'array')).toEqual(['2026-06-01', '2026-06-10', '2026-06-12']);
  });

  it('applies the value mask and separator', () => {
    const one = sel('range', [{ start: '2026-06-10', end: '2026-06-14' }]);
    expect(serializeFormValue(one, 'text', undefined, { mask: 'DD.MM.YYYY', separator: ' - ' })).toEqual(['10.06.2026 - 14.06.2026']);
  });

  it('a callback wins', () => {
    expect(serializeFormValue(sel('single', ['2026-06-10']), 'json', (s) => `cb:${s.items.length}`)).toEqual(['cb:1']);
  });
});

describe('toEngineValueText', () => {
  it('reads each value-format back', () => {
    expect(toEngineValueText('2026-06-10/2026-06-14', 'range', 'date')).toBe('2026-06-10/2026-06-14');
    expect(toEngineValueText('[{"start":"2026-06-10","end":"2026-06-14"}]', 'range', 'date')).toBe('2026-06-10/2026-06-14');
    expect(toEngineValueText(['2026-06-01', '2026-06-03'], 'multiple', 'date')).toBe('2026-06-01,2026-06-03');
    expect(toEngineValueText('"2026-06-10"', 'single', 'date')).toBe('2026-06-10');
    expect(toEngineValueText('', 'single', 'date')).toBe('');
  });

  it('round-trips serializeFormValue through a custom mask + separator', () => {
    const write = { mask: 'DD.MM.YYYY', separator: ' - ' };
    const [text] = serializeFormValue(
      { selectionMode: 'range', pickerMode: 'date', items: [{ start: '2026-06-10', end: '2026-06-14' }, { start: '2026-07-01', end: '2026-07-02' }] },
      'text', undefined, write);
    expect(toEngineValueText(text, 'range', 'date', write)).toBe('2026-06-10/2026-06-14,2026-07-01/2026-07-02');
  });

  it('passes atoms the mask does not match through unchanged', () => {
    expect(toEngineValueText('2026-06-10', 'single', 'date', { mask: 'DD.MM.YYYY' })).toBe('2026-06-10');
  });

  it('null when the input is not in the value-format form', () => {
    expect(toEngineValueText('2026-06-10 - 2026-06-14', 'range', 'date')).toBeNull();
    expect(toEngineValueText(['a', 'b'], 'single', 'date')).toBeNull();
    expect(toEngineValueText('[{"start":1}]', 'range', 'date')).toBeNull();
  });
});
