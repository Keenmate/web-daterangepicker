/**
 * Date Format Helpers
 *
 * Pure parsing of the shown `dateFormatMask` and of the text written in it. The
 * engine (`parseFormat` / `parseDateText` / `findDatePair`) delegates here with
 * its cached `formatInfo`.
 */

import type { FormatOptions } from './types';

/**
 * Parse a date mask. Tokens YYYY / YY, MM / M, DD / D in any order; everything
 * around them is literal text kept verbatim ("DD.MM.YYYY", "MM/DD/YYYY",
 * "DD. MM. YYYY", "YYYY. MM. DD.").
 */
export function parseDateFormat(formatString: string): FormatOptions {
    const parts: FormatOptions['parts'] = {};
    const literals: FormatOptions['literals'] = ['', '', '', ''];
    let index = 0;
    let last = 0;
    for (const m of formatString.matchAll(/YYYY|YY|MM|M|DD|D/g)) {
        if (index > 2) break;
        literals[index] = formatString.slice(last, m.index);
        last = m.index! + m[0].length;
        const token = m[0];
        if (token[0] === 'Y') parts.year = { index, length: token.length };
        else if (token[0] === 'M') parts.month = { index, length: 2 }; // Always 2 digits for consistency
        else parts.day = { index, length: 2 };
        index++;
    }
    literals[index] = formatString.slice(last);

    // The typeable separator key: the first visible character between parts 1 and 2
    // (skipping spaces and bidi marks — "DD. MM. YYYY" → ".").
    const separator = [...literals[1]].find((c) => !/[\s\p{Cf}]/u.test(c)) ?? literals[1].charAt(0);
    // A fully typed date: every literal plus the digits of each part.
    const digits = (parts.year?.length ?? 0) + (parts.month ? 2 : 0) + (parts.day ? 2 : 0);
    const maxLength = literals.slice(0, index + 1).join('').length + digits;

    return { format: formatString, separator, literals, parts, maxLength };
}

/**
 * Parse one date written in the mask's part order (e.g. `10.06.2026` for
 * `DD.MM.YYYY`) or as ISO `YYYY-MM-DD`. Strict on the parts (three digit groups, the
 * year complete, the date real); lenient on the literal text between them, so
 * `17.11.2026` reads in a `DD. MM. YYYY` field.
 */
export function parseDateText(text: string, formatInfo: FormatOptions): Date | null {
    const t = text.trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    const build = (y: number, m: number, d: number): Date | null => {
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
    };
    const { parts } = formatInfo;
    if (parts.year && parts.month && parts.day) {
        const segs = /^\D{0,4}(\d+)\D{1,4}(\d+)\D{1,4}(\d+)\D{0,4}$/.exec(t)?.slice(1);
        if (segs) {
            const ys = segs[parts.year.index];
            const isYearComplete = ys.length === parts.year.length;
            const y = parts.year.length === 2 ? 2000 + Number(ys) : Number(ys);
            const date = isYearComplete ? build(y, Number(segs[parts.month.index]), Number(segs[parts.day.index])) : null;
            if (date) return date;
        }
    }
    return iso ? build(Number(iso[1]), Number(iso[2]), Number(iso[3])) : null;
}

/**
 * Lenient range text: find exactly two dates (each in the mask's form or ISO) and
 * ignore whatever separates them — `" - "`, `"/"`, an en dash, `"to"`, `"bis"`, …
 * The separator may not contain digits, and nothing but whitespace (or the mask's
 * own leading / trailing literal) may surround the pair. Returns the two dates in
 * written order.
 */
export function findDatePair(text: string, formatInfo: FormatOptions): [Date, Date] | null {
    // A date token: three digit groups joined by one repeated separator (1–3
    // non-digits: `-`, `.`, `/`, `. `), so `2026-06-10/2026-06-14` splits into two
    // tokens at the `/`; a mask's trailing literal (`2026. 11. 17.`) is left between.
    const tokens = [...text.matchAll(/\d+(\D{1,3}?)\d+\1\d+/g)];
    if (tokens.length !== 2) return null;
    const [t1, t2] = tokens;
    const before = text.slice(0, t1.index);
    const between = text.slice(t1.index! + t1[0].length, t2.index);
    const after = text.slice(t2.index! + t2[0].length);
    // Around the pair: whitespace, or the mask's own leading / trailing literal (`.`, ` г.`).
    const { literals } = formatInfo;
    if (before.trim() && before.trim() !== literals[0].trim()) return null;
    if (after.trim() && after.trim() !== literals[3].trim()) return null;
    if (/\d/.test(between) || !between.length) return null;
    const a = parseDateText(t1[0], formatInfo);
    const b = parseDateText(t2[0], formatInfo);
    return a && b ? [a, b] : null;
}
