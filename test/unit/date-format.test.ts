import { describe, expect, it } from 'vitest';
import { findDatePair, parseDateFormat, parseDateText } from '../../src/date-format';

const ymd = (d: Date | null) => (d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()] : null);

describe('parseDateFormat', () => {
  it('reads the ISO mask', () => {
    const f = parseDateFormat('YYYY-MM-DD');
    expect(f.parts).toEqual({ year: { index: 0, length: 4 }, month: { index: 1, length: 2 }, day: { index: 2, length: 2 } });
    expect(f.literals).toEqual(['', '-', '-', '']);
    expect(f.separator).toBe('-');
    expect(f.maxLength).toBe(10);
  });

  it('reads any part order', () => {
    expect(parseDateFormat('DD.MM.YYYY').parts).toEqual({ day: { index: 0, length: 2 }, month: { index: 1, length: 2 }, year: { index: 2, length: 4 } });
    expect(parseDateFormat('MM/DD/YYYY').parts).toEqual({ month: { index: 0, length: 2 }, day: { index: 1, length: 2 }, year: { index: 2, length: 4 } });
  });

  it('keeps multi-character and trailing literals verbatim', () => {
    const cz = parseDateFormat('DD. MM. YYYY');
    expect(cz.literals).toEqual(['', '. ', '. ', '']);
    expect(cz.separator).toBe('.');
    expect(cz.maxLength).toBe(12);

    const hu = parseDateFormat('YYYY. MM. DD.');
    expect(hu.literals).toEqual(['', '. ', '. ', '.']);
    expect(hu.maxLength).toBe(13);
  });

  it('skips bidi marks when picking the separator key', () => {
    expect(parseDateFormat('DD‏/MM‏/YYYY').separator).toBe('/');
  });

  it('pads single-letter month / day tokens to two digits; YY is two', () => {
    const f = parseDateFormat('D.M.YY');
    expect(f.parts.day!.length).toBe(2);
    expect(f.parts.month!.length).toBe(2);
    expect(f.parts.year!.length).toBe(2);
    expect(f.maxLength).toBe(8);
  });
});

describe('parseDateText', () => {
  const dmy = parseDateFormat('DD.MM.YYYY');

  it('reads the mask order', () => {
    expect(ymd(parseDateText('10.06.2026', dmy))).toEqual([2026, 6, 10]);
    expect(ymd(parseDateText('06/10/2026', parseDateFormat('MM/DD/YYYY')))).toEqual([2026, 6, 10]);
  });

  it('always accepts ISO', () => {
    expect(ymd(parseDateText('2026-06-10', dmy))).toEqual([2026, 6, 10]);
  });

  it('is lenient on literals, strict on parts', () => {
    expect(ymd(parseDateText('17.11.2026', parseDateFormat('DD. MM. YYYY')))).toEqual([2026, 11, 17]);
    expect(ymd(parseDateText(' 1.2.2026 ', dmy))).toEqual([2026, 2, 1]);
    expect(parseDateText('10.06.26', dmy)).toBeNull(); // year incomplete
    expect(parseDateText('10.06', dmy)).toBeNull();
    expect(parseDateText('', dmy)).toBeNull();
  });

  it('rejects dates that do not exist', () => {
    expect(parseDateText('31.04.2026', dmy)).toBeNull();
    expect(parseDateText('29.02.2026', dmy)).toBeNull();
    expect(ymd(parseDateText('29.02.2028', dmy))).toEqual([2028, 2, 29]);
    expect(parseDateText('2026-13-01', dmy)).toBeNull();
  });

  it('maps a two-digit year to 20YY', () => {
    expect(ymd(parseDateText('10.06.26', parseDateFormat('DD.MM.YY')))).toEqual([2026, 6, 10]);
  });

  it('returns local midnight', () => {
    const d = parseDateText('2026-03-29', dmy)!;
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
  });
});

describe('findDatePair', () => {
  const iso = parseDateFormat('YYYY-MM-DD');
  const pair = (text: string, f = iso) => {
    const p = findDatePair(text, f);
    return p ? p.map(ymd) : null;
  };

  it('accepts any digit-free separator', () => {
    for (const text of ['2026-06-10 - 2026-06-14', '2026-06-10/2026-06-14', '2026-06-10 – 2026-06-14', '2026-06-10 to 2026-06-14']) {
      expect(pair(text), text).toEqual([[2026, 6, 10], [2026, 6, 14]]);
    }
  });

  it('keeps the written order (no swapping)', () => {
    expect(pair('2026-06-14 - 2026-06-10')).toEqual([[2026, 6, 14], [2026, 6, 10]]);
  });

  it('allows the mask’s own leading / trailing literal around the pair', () => {
    const hu = parseDateFormat('YYYY. MM. DD.');
    expect(pair('2026. 11. 17. - 2026. 11. 20.', hu)).toEqual([[2026, 11, 17], [2026, 11, 20]]);
  });

  it('rejects anything but exactly two dates', () => {
    expect(pair('2026-06-10')).toBeNull();
    expect(pair('2026-06-10 - 2026-06-14 - 2026-06-20')).toBeNull();
    expect(pair('from 2026-06-10 - 2026-06-14')).toBeNull();
    expect(pair('2026-06-10 - 2026-06-31')).toBeNull();
  });
});
