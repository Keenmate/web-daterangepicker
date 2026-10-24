import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, open } from './fixtures';

/**
 * Class modifiers on day cells: today / other-month / range positions.
 * Selected and disabled classes already get coverage in selection-modes
 * and date-restrictions, respectively.
 *
 * Fixture: test/visual-states.html
 */

const PAGE = '/test/visual-states.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// today
// =============================================================================

test('today (2026-05-22) gets the --today class even when calendar opens on a different month', async ({ page }) => {
    const p = await open(page, 'single');

    // Navigate to May 2026 so today is visible.
    await p.locator('.drp__nav--prev[data-month-index="0"]').click();
    await expect(dayByDate(p, '2026-05-22')).toHaveClass(/drp__day--today/);
});

// =============================================================================
// other-month (leading / trailing greyed cells)
// =============================================================================

test('June 2026 grid renders trailing July days with --other-month', async ({ page }) => {
    const p = await open(page, 'single');

    // June 2026 ends on Tuesday June 30. The grid keeps 6 weeks (modal default
    // doesn't apply here — but the picker still renders leading/trailing days
    // from adjacent months in the visible grid). July 1 should appear in the
    // June grid as an other-month cell.
    await expect(dayByDate(p, '2026-07-01')).toHaveClass(/drp__day--other-month/);
});

test('June 2026 grid renders leading May days with --other-month', async ({ page }) => {
    const p = await open(page, 'single');

    // June 1 2026 is a Monday with default weekStartDay=auto (usually Monday
    // in en-US). If weekStart is Sunday, May 31 (Sun) is the leading cell.
    // Either way at least one May day should be present with other-month.
    const leadingMayDay = p.locator('.drp__day[data-date^="2026-05"].drp__day--other-month');
    await expect(leadingMayDay.first()).toBeVisible();
});

// =============================================================================
// range visual state
// =============================================================================

test.describe('range visual classes', () => {
    test('committed range applies --range-start, --range-end, and --in-range correctly', async ({ page }) => {
        const p = await open(page, 'range');

        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-15').click();

        // Reopen to verify post-commit class state on next render.
        await p.locator('input').click();
        await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
        await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--range-end/);
        // Middle days
        await expect(dayByDate(p, '2026-06-11')).toHaveClass(/drp__day--in-range/);
        await expect(dayByDate(p, '2026-06-14')).toHaveClass(/drp__day--in-range/);
    });

    test('range endpoints are NOT also tagged with the generic --in-range class', async ({ page }) => {
        const p = await open(page, 'range');

        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-15').click();
        await p.locator('input').click();

        await expect(dayByDate(p, '2026-06-10')).not.toHaveClass(/drp__day--in-range/);
        await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--in-range/);
    });

    test('a day outside the range carries none of the range classes', async ({ page }) => {
        const p = await open(page, 'range');

        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-15').click();
        await p.locator('input').click();

        const outsideDay = dayByDate(p, '2026-06-20');
        await expect(outsideDay).not.toHaveClass(/drp__day--range-start/);
        await expect(outsideDay).not.toHaveClass(/drp__day--range-end/);
        await expect(outsideDay).not.toHaveClass(/drp__day--in-range/);
    });
});

// =============================================================================
// weekend hooks (CSS-only theming for Saturday / Sunday)
// =============================================================================

test('Saturday and Sunday cells get the --weekend modifier', async ({ page }) => {
    const p = await open(page, 'single');

    // 2026-06-06 is a Saturday, 2026-06-07 is a Sunday.
    await expect(dayByDate(p, '2026-06-06')).toHaveClass(/drp__day--weekend/);
    await expect(dayByDate(p, '2026-06-07')).toHaveClass(/drp__day--weekend/);
});

test('Monday through Friday cells do NOT get the --weekend modifier', async ({ page }) => {
    const p = await open(page, 'single');

    // 2026-06-08..2026-06-12 are Mon..Fri.
    for (const iso of ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12']) {
        await expect(dayByDate(p, iso)).not.toHaveClass(/drp__day--weekend/);
    }
});

test('every day cell carries a data-weekday attribute matching getDay()', async ({ page }) => {
    const p = await open(page, 'single');

    // Sun=0, Mon=1, ... Sat=6. Spot-check a handful across June 2026.
    const expected: Array<[string, string]> = [
        ['2026-06-07', '0'], // Sun
        ['2026-06-08', '1'], // Mon
        ['2026-06-10', '3'], // Wed
        ['2026-06-12', '5'], // Fri
        ['2026-06-06', '6'], // Sat
    ];
    for (const [iso, weekday] of expected) {
        await expect(dayByDate(p, iso)).toHaveAttribute('data-weekday', weekday);
    }
});
