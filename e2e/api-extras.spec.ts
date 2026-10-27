import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, inputOf } from './fixtures';

/**
 * Programmatic property setters: selectedDate, selectedRanges. Message API:
 * showMessage / hideMessage. placeholderFormatMask vs dateFormatMask.
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

    await p.evaluate((el: any) => el.showMessage('Heads up', { type: 'warning' }));

    const msg = p.locator('.drp__message');
    await expect(msg).toHaveClass(/drp__message--visible/);
    await expect(msg).toHaveClass(/drp__message--warning/);
    await expect(msg).toContainText('Heads up');
});

test('hideMessage removes the --visible modifier', async ({ page }) => {
    const p = pickerById(page, 'messages');

    await inputOf(p).click();
    await p.evaluate((el: any) => el.showMessage('Heads up', { type: 'info' }));
    const msg = p.locator('.drp__message');
    await expect(msg).toHaveClass(/drp__message--visible/);

    await p.evaluate((el: any) => el.hideMessage());
    await expect(msg).not.toHaveClass(/drp__message--visible/);
});

test('showMessage auto-hides after the supplied timeout', async ({ page }) => {
    const p = pickerById(page, 'messages');

    await inputOf(p).click();
    await p.evaluate((el: any) => el.showMessage('Brief', { type: 'info', autoHideMs: 200 }));

    const msg = p.locator('.drp__message');
    await expect(msg).toHaveClass(/drp__message--visible/);
    await expect(msg).not.toHaveClass(/drp__message--visible/, { timeout: 2000 });
});

// =============================================================================
// placeholder-format-mask as auto-placeholder hint
// =============================================================================

test('placeholder-format-mask becomes the input placeholder when no explicit placeholder is set', async ({ page }) => {
    const p = pickerById(page, 'display-mask-hint');
    // The Czech-style localized hint ("dd.mm.rrrr") surfaces in the input
    // even though date-format-mask uses English tokens (DD.MM.YYYY).
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'dd.mm.rrrr');
});

test('an explicit placeholder attribute wins over placeholder-format-mask', async ({ page }) => {
    const p = pickerById(page, 'placeholder-wins');
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'Vyberte datum');
});

// a plain single date picker auto-derives the format hint from date-format-mask
// (no explicit placeholder / placeholder-format-mask needed).
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

test('range mode: placeholder doubles the localized placeholder-format-mask hint', async ({ page }) => {
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

// =============================================================================
// setters + form value, toggle / clearSelection / open, alignment, value getter
// =============================================================================

test.describe('setters keep the input and the form value in sync', () => {
    /** The visible text input (form-associated pickers also render a light-DOM hidden input). */
    const textInput = (p: Locator) => p.locator('input.drp__input');
    const formValue = (page: Page, name: string) =>
        page.evaluate((n) => new FormData(document.getElementById('api-form') as HTMLFormElement).getAll(n).map(String).join('|'), name);

    test('selectedDate setter → input + --selected class', async ({ page }) => {
        const p = pickerById(page, 'api-single');
        await p.evaluate((el: any) => { el.selectedDate = new Date(2026, 5, 18); });
        await expect(textInput(p)).toHaveValue('2026-06-18');
        await textInput(p).click();
        await expect(dayByDate(p, '2026-06-18')).toHaveClass(/drp__day--selected/);
    });

    test('selectedRanges setter → input + range classes', async ({ page }) => {
        const p = pickerById(page, 'api-range');
        await p.evaluate((el: any) => { el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 12) }]; });
        await expect(textInput(p)).toHaveValue('2026-06-10 - 2026-06-12');
        await textInput(p).click();
        await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
        await expect(dayByDate(p, '2026-06-11')).toHaveClass(/drp__day--in-range/);
        await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--range-end/);
    });

    test('selectedDates setter (multiple) → --selected on each day', async ({ page }) => {
        const p = pickerById(page, 'api-multi');
        await p.evaluate((el: any) => { el.selectedDates = [new Date(2026, 5, 3), new Date(2026, 5, 9)]; });
        await textInput(p).click();
        await expect(dayByDate(p, '2026-06-03')).toHaveClass(/drp__day--selected/);
        await expect(dayByDate(p, '2026-06-09')).toHaveClass(/drp__day--selected/);
    });

    test('selectedDates / selectedRanges setters (multiple) write the count and survive open (FINDINGS #25)', async ({ page }) => {
        const p = pickerById(page, 'api-multi');
        await p.evaluate((el: any) => { el.selectedDates = [new Date(2026, 5, 3), new Date(2026, 5, 9)]; });
        await expect(textInput(p)).toHaveValue('2 selection(s)');
        await p.evaluate((el: any) => { el.selectedRanges = [{ start: new Date(2026, 5, 15), end: new Date(2026, 5, 17) }]; });
        await expect(textInput(p)).toHaveValue('3 selection(s)');
        await textInput(p).click();
        const kept = await p.evaluate((el: any) => [el.selectedDates.length, el.selectedRanges.length]);
        expect(kept).toEqual([2, 1]);
    });

    test('selectedDate / selectedRanges / selectedDates setters refresh the form value', async ({ page }) => {
        await page.evaluate(() => {
            (document.getElementById('api-single') as any).selectedDate = new Date(2026, 5, 18);
            (document.getElementById('api-range') as any).selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 12) }];
            (document.getElementById('api-multi') as any).selectedDates = [new Date(2026, 5, 3), new Date(2026, 5, 9)];
        });
        await expect.poll(() => formValue(page, 'when')).toBe('2026-06-18');
        await expect.poll(() => formValue(page, 'span')).toBe('2026-06-10/2026-06-12');
        await expect.poll(() => formValue(page, 'days')).toBe('2026-06-03,2026-06-09');
    });

    test('value setter → input, selection and form value', async ({ page }) => {
        const p = pickerById(page, 'api-value');
        await p.evaluate((el: any) => { el.value = '2026-06-21'; });
        await expect(textInput(p)).toHaveValue('2026-06-21');
        expect(await p.evaluate((el: any) => el.value)).toBe('2026-06-21');
        await expect.poll(() => formValue(page, 'val')).toBe('2026-06-21');
        await textInput(p).click();
        await expect(dayByDate(p, '2026-06-21')).toHaveClass(/drp__day--selected/);
    });

    test('clearSelection() clears the input, the classes and the form value', async ({ page }) => {
        const p = pickerById(page, 'api-value');
        await p.evaluate((el: any) => { el.selectedDate = new Date(2026, 5, 18); });
        await expect(textInput(p)).toHaveValue('2026-06-18');
        await p.evaluate((el: any) => el.clearSelection());
        await expect(textInput(p)).toHaveValue('');
        expect(await p.evaluate((el: any) => el.selectedDate)).toBeNull();
        await expect.poll(() => formValue(page, 'val')).toBe('');
        await textInput(p).click();
        await expect(p.locator('.drp__day--selected')).toHaveCount(0);
    });

    test('form.reset() restores the declared default value attribute', async ({ page }) => {
        const p = pickerById(page, 'api-default');
        await expect(textInput(p)).toHaveValue('2026-06-10');
        await p.evaluate((el: any) => { el.selectedDate = new Date(2026, 5, 18); });
        await expect(textInput(p)).toHaveValue('2026-06-18');
        await page.evaluate(() => (document.getElementById('api-form') as HTMLFormElement).reset());
        await expect(textInput(p)).toHaveValue('2026-06-10');
        expect(await formValue(page, 'def')).toBe('2026-06-10');
    });

    test('the value getter reads a just-written value attribute synchronously', async ({ page }) => {
        const p = pickerById(page, 'api-value');
        const read = await p.evaluate((el: any) => { el.setAttribute('value', '2026-06-10'); return [el.value, el.value]; });
        expect(read).toEqual(['2026-06-10', '2026-06-10']);
    });
});

test.describe('open / toggle', () => {
    test('toggle() opens a closed picker and closes an open one', async ({ page }) => {
        const p = pickerById(page, 'api-toggle');
        await p.evaluate((el: any) => el.toggle());
        await expect(calendarOf(p)).toHaveClass(/drp__picker--visible/);
        expect(await p.evaluate((el: any) => el.isOpen)).toBe(true);
        await p.evaluate((el: any) => el.toggle());
        await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
    });

    test('open() is idempotent: a second call keeps it open and one close() closes it', async ({ page }) => {
        const p = pickerById(page, 'api-toggle');
        await p.evaluate((el: any) => { el.open(); el.open(); });
        await expect(calendarOf(p)).toHaveClass(/drp__picker--visible/);
        await expect(p.locator('.drp__picker')).toHaveCount(1);
        await p.evaluate((el: any) => el.close());
        await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
    });
});

test.describe('setRollingItemAlignment', () => {
    const justify = (p: Locator) =>
        p.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.drp__picker')!).getPropertyValue('--drp-rolling-item-justify-content').trim());

    test('sets the rolling-item alignment variable', async ({ page }) => {
        const p = pickerById(page, 'api-toggle');
        await p.evaluate((el: any) => el.setRollingItemAlignment('flex-end'));
        expect(await justify(p)).toBe('flex-end');
    });

    test('the alignment survives a structural rebuild', async ({ page }) => {
        const p = pickerById(page, 'api-toggle');
        await p.evaluate((el: any) => el.setRollingItemAlignment('flex-end'));
        await p.evaluate((el: any) => { el.setAttribute('visible-month-count', '2'); return el.whenSettled(); });
        expect(await justify(p)).toBe('flex-end');
    });
});
