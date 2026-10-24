import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, inputOf } from './fixtures';

/**
 * Programmatic property setters: selectedDate, selectedRanges. Message API:
 * showMessage / hideMessage. displayFormatMask vs dateFormatMask.
 *
 * Fixture: test/api-extras.html
 */

const PAGE = '/test/api-extras.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// selectedDate setter
// =============================================================================

test('selectedDate setter populates the input and marks the day --selected', async ({ page }) => {
    const p = pickerById(page, 'single-setter');

    await p.evaluate((el: any) => { el.selectedDate = new Date(2026, 5, 18); });

    await expect(inputOf(p)).toHaveValue('2026-06-18');

    await inputOf(p).click();
    await expect(dayByDate(p, '2026-06-18')).toHaveClass(/drp__day--selected/);
});

// =============================================================================
// selectedRanges setter
// =============================================================================

test('selectedRanges setter populates a range and applies range-start / range-end classes', async ({ page }) => {
    const p = pickerById(page, 'range-setter');

    await p.evaluate((el: any) => {
        el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 14) }];
    });

    await inputOf(p).click();
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-14')).toHaveClass(/drp__day--range-end/);
});

// =============================================================================
// showMessage / hideMessage
// =============================================================================

test('showMessage renders the message element with the configured type class', async ({ page }) => {
    const p = pickerById(page, 'messages');

    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();

    await p.evaluate((el: any) => el.showMessage('Heads up', 'warning'));

    const msg = p.locator('.drp__message');
    await expect(msg).toHaveClass(/drp__message--visible/);
    await expect(msg).toHaveClass(/drp__message--warning/);
    await expect(msg).toContainText('Heads up');
});

test('hideMessage removes the --visible modifier', async ({ page }) => {
    const p = pickerById(page, 'messages');

    await inputOf(p).click();
    await p.evaluate((el: any) => el.showMessage('Heads up', 'info'));
    const msg = p.locator('.drp__message');
    await expect(msg).toHaveClass(/drp__message--visible/);

    await p.evaluate((el: any) => el.hideMessage());
    await expect(msg).not.toHaveClass(/drp__message--visible/);
});

test('showMessage auto-hides after the supplied timeout', async ({ page }) => {
    const p = pickerById(page, 'messages');

    await inputOf(p).click();
    await p.evaluate((el: any) => el.showMessage('Brief', 'info', 200));

    const msg = p.locator('.drp__message');
    await expect(msg).toHaveClass(/drp__message--visible/);
    await expect(msg).not.toHaveClass(/drp__message--visible/, { timeout: 2000 });
});

// =============================================================================
// display-format-mask as auto-placeholder hint
// =============================================================================

test('display-format-mask becomes the input placeholder when no explicit placeholder is set', async ({ page }) => {
    const p = pickerById(page, 'display-mask-hint');
    // The Czech-style localized hint ("dd.mm.rrrr") surfaces in the input
    // even though date-format-mask uses English tokens (DD.MM.YYYY).
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'dd.mm.rrrr');
});

test('an explicit placeholder attribute wins over display-format-mask', async ({ page }) => {
    const p = pickerById(page, 'placeholder-wins');
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'Vyberte datum');
});

// a plain single date picker auto-derives the format hint from date-format-mask
// (no explicit placeholder / display-format-mask needed).
test('single mode: placeholder auto-derives from the default date-format-mask', async ({ page }) => {
    const p = pickerById(page, 'single-default');
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'YYYY-MM-DD');
});

// range mode doubles the format hint around " - " so the placeholder shows the
// user must type BOTH a start and an end date.
test('range mode: placeholder doubles the default date-format-mask hint', async ({ page }) => {
    const p = pickerById(page, 'range-hint-default');
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'YYYY-MM-DD - YYYY-MM-DD');
});

test('range mode: placeholder doubles the localized display-format-mask hint', async ({ page }) => {
    const p = pickerById(page, 'range-hint-display');
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'dd.mm.rrrr - dd.mm.rrrr');
});

test('range mode: an explicit placeholder wins verbatim (not doubled)', async ({ page }) => {
    const p = pickerById(page, 'range-placeholder-wins');
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'Vyberte rozsah');
});

// =============================================================================
// v2.0.0 state-accessor alignment — DISPLAYED getters + settable selectedDatetime
// =============================================================================

const isoOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('visibleMonths / visibleMonthDates reflect the two displayed columns', async ({ page }) => {
    const p = pickerById(page, 'range-setter'); // range mode, initial 2026-06-15 → June + July 2026
    const info = await p.evaluate((el: any) => ({
        count: el.visibleMonths.length,
        months: el.visibleMonths.map((m: any) => ({ month: m.month, year: m.year })),
        dates: el.visibleMonthDates.map((d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`),
    }));
    expect(info.count).toBe(2);
    expect(info.months).toEqual([{ month: 5, year: 2026 }, { month: 6, year: 2026 }]);
    expect(info.dates).toEqual(['2026-06-01', '2026-07-01']);
});

test('visibleMonths carries per-column firstDate / lastDate (month own boundaries)', async ({ page }) => {
    const p = pickerById(page, 'range-setter');
    const m0 = await p.evaluate((el: any) => {
        const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const m = el.visibleMonths[0];
        return { first: iso(m.firstDate), last: iso(m.lastDate) };
    });
    expect(m0.first).toBe('2026-06-01');
    expect(m0.last).toBe('2026-06-30');
});

test('visibleDateRange envelopes the first column start through the last column end', async ({ page }) => {
    const p = pickerById(page, 'range-setter');
    const r = await p.evaluate((el: any) => {
        const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const { start, end } = el.visibleDateRange;
        return { start: iso(start), end: iso(end) };
    });
    // ISO strings sort chronologically: grid start is on/before June 1, grid end on/after July 31.
    expect(r.start <= '2026-06-01').toBe(true);
    expect(r.end >= '2026-07-31').toBe(true);
});

test('today getter returns the (clock-fixed) date normalized to midnight', async ({ page }) => {
    const p = pickerById(page, 'single-setter');
    const t = await p.evaluate((el: any) => {
        const d = el.today;
        return {
            iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(),
        };
    });
    expect(t.iso).toBe('2026-05-22');
    expect([t.h, t.m, t.s]).toEqual([0, 0, 0]);
});

test('selectedDatetime setter accepts an ISO string and sets the date + input', async ({ page }) => {
    const p = pickerById(page, 'single-setter');
    await p.evaluate((el: any) => { el.selectedDatetime = '2026-06-20T09:30:00'; });
    await expect(inputOf(p)).toHaveValue('2026-06-20');
    const got = await p.evaluate((el: any) => (el.selectedDate ? el.selectedDate.getDate() : null));
    expect(got).toBe(20);
});

test('selectedStartDate / selectedEndDate are readable after a selectedRanges set', async ({ page }) => {
    const p = pickerById(page, 'range-setter');
    const got = await p.evaluate((el: any) => {
        el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 14) }];
        const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
        return { start: iso(el.selectedStartDate), end: iso(el.selectedEndDate) };
    });
    expect(got).toEqual({ start: '2026-06-10', end: '2026-06-14' });
});
