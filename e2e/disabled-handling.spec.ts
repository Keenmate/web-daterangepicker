import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, inputOf } from './fixtures';

/**
 * The five `disabledDatesHandling` strategies. Each picker has
 * 2026-06-12 + 13 disabled. We pick across the gap and verify what the
 * picker does with the selection (commit / reject / snap / split / flatten).
 *
 * 'split' and 'individual' surface their results only via the change event
 * detail — the picker still commits a range to the input visually but the
 * extra arrays (dateRanges, dates) come through on `change.detail`.
 *
 * Fixture: test/disabled-handling.html
 */

const PAGE = '/test/disabled-handling.html';

async function captureChange(p: Locator) {
    await p.evaluate((el: any) => {
        el.__lastChange = null;
        el.addEventListener('change', (e: any) => { el.__lastChange = e.detail; });
    });
}

async function getLastChange(p: Locator) {
    return p.evaluate((el: any) => el.__lastChange);
}

async function open(page: Page, id: string) {
    const p = pickerById(page, id);
    await captureChange(p);
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
    return p;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// shared sanity: disabled days are marked
// =============================================================================

test('disabledDates property: configured days render with --disabled in every strategy', async ({ page }) => {
    const p = await open(page, 'allow');
    await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--disabled/);
    await expect(dayByDate(p, '2026-06-13')).toHaveClass(/drp__day--disabled/);
});

// =============================================================================
// 'allow'
// =============================================================================

test('allow: range spans the disabled gap and commits both sides', async ({ page }) => {
    const p = await open(page, 'allow');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();

    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');

    const detail = await getLastChange(p);
    // allow-mode enriches detail with enabled/disabled arrays.
    expect(detail.enabledDates?.length).toBe(4); // 10, 11, 14, 15
    expect(detail.disabledDates?.length).toBe(2); // 12, 13
});

// =============================================================================
// 'prevent'
// =============================================================================

test('prevent: clicking an end-date across a disabled gap does NOT commit a complete range', async ({ page }) => {
    const p = await open(page, 'prevent');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();

    // The picker keeps the pending start visible ("2026-06-10 - ...") and
    // refuses to commit an end that would cross 12/13. The full "start - end"
    // form would mean the range was accepted.
    const value = await inputOf(p).inputValue();
    expect(value).not.toMatch(/2026-06-15/);
    // Picker remains open waiting for a valid second pick.
    await expect(calendarOf(p)).toBeVisible();
});

test('prevent: a range that does not cross any disabled day still commits', async ({ page }) => {
    const p = await open(page, 'prevent');

    await dayByDate(p, '2026-06-14').click();
    await dayByDate(p, '2026-06-16').click();
    await expect(inputOf(p)).toHaveValue('2026-06-14 - 2026-06-16');
});

// =============================================================================
// 'block'
// =============================================================================

test('block: clicking an end past a disabled gap snaps the range end to the last enabled day before the gap', async ({ page }) => {
    const p = await open(page, 'block');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();

    // The end snaps from 06-15 back to 06-11 (the last enabled day before
    // the 12/13 gap).
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-11');
});

// =============================================================================
// highlight-disabled-in-range
// =============================================================================

test('highlight-disabled-in-range="false": disabled days inside a range stay un-highlighted', async ({ page }) => {
    const p = await open(page, 'no-highlight');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();
    await inputOf(p).click();

    // Disabled days inside the range carry --disabled but NOT --in-range.
    await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--disabled/);
    await expect(dayByDate(p, '2026-06-12')).not.toHaveClass(/drp__day--in-range/);
});

// =============================================================================
// 'split'
// =============================================================================

test('split: change.detail.dateRanges yields two sub-ranges around the disabled gap', async ({ page }) => {
    const p = await open(page, 'split');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();

    const detail = await getLastChange(p);
    expect(detail.dateRanges?.length).toBe(2);
    // First sub-range: 10..11 (before the 12/13 gap).
    // Second sub-range: 14..15 (after the gap).
});

test('split: change.detail.formattedValue lists both sub-ranges (the picker\'s input itself shows the original range only)', async ({ page }) => {
    const p = await open(page, 'split');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();

    const detail = await getLastChange(p);
    expect(detail.formattedValue).toContain('2026-06-10 - 2026-06-11');
    expect(detail.formattedValue).toContain('2026-06-14 - 2026-06-15');
});

// =============================================================================
// 'individual'
// =============================================================================

test('individual: change.detail.dates is a flat list of enabled dates inside the range', async ({ page }) => {
    const p = await open(page, 'individual');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();

    const detail = await getLastChange(p);
    // 10, 11, 14, 15 — four enabled dates, 12+13 excluded.
    expect(detail.dates?.length).toBe(4);
});

// =============================================================================
// selectedRanges always returns the selection (range mode)
// =============================================================================

const dayPairs = (p: Locator) => p.evaluate((el: any) =>
    el.selectedRanges.map((r: any) => [r.start.getDate(), r.end.getDate()]));

test('selectedRanges: a plain click range reads [{ start, end }]; nothing selected reads []', async ({ page }) => {
    const p = await open(page, 'allow');
    expect(await dayPairs(p)).toEqual([]);
    await dayByDate(p, '2026-06-16').click();
    await dayByDate(p, '2026-06-19').click();
    expect(await dayPairs(p)).toEqual([[16, 19]]);
    // The envelope accessors agree.
    expect(await p.evaluate((el: any) => [el.selectedStartDate.getDate(), el.selectedEndDate.getDate()])).toEqual([16, 19]);
});

test('selectedRanges: split handling reads every enabled piece; the envelope stays start..end', async ({ page }) => {
    const p = await open(page, 'split');
    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();
    expect(await dayPairs(p)).toEqual([[10, 11], [14, 15]]);
    expect(await p.evaluate((el: any) => [el.selectedStartDate.getDate(), el.selectedEndDate.getDate()])).toEqual([10, 15]);
});

test('selectedRanges: getter and setter agree (one range and several)', async ({ page }) => {
    const p = pickerById(page, 'allow');
    await p.evaluate((el: any) => { el.selectedRanges = [{ start: new Date(2026, 5, 2), end: new Date(2026, 5, 4) }]; });
    expect(await dayPairs(p)).toEqual([[2, 4]]);
    await p.evaluate((el: any) => {
        el.selectedRanges = [
            { start: new Date(2026, 5, 2), end: new Date(2026, 5, 4) },
            { start: new Date(2026, 5, 20), end: new Date(2026, 5, 22) },
        ];
    });
    expect(await dayPairs(p)).toEqual([[2, 4], [20, 22]]);
    expect(await p.evaluate((el: any) => [el.selectedStartDate.getDate(), el.selectedEndDate.getDate()])).toEqual([2, 22]);
    // Round-trip.
    await p.evaluate((el: any) => { el.selectedRanges = el.selectedRanges; });
    expect(await dayPairs(p)).toEqual([[2, 4], [20, 22]]);
});
