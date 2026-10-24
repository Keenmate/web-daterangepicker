import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, inputOf, open } from './fixtures';

/**
 * Disable strategies: min-date / max-date bounds, disabled-weekdays, the
 * initial-date opening month, and the rolling year range that constrains
 * the year-list in the month/year selector.
 *
 * Fixture: test/date-restrictions.html
 */

const PAGE = '/test/date-restrictions.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// min-date / max-date
// =============================================================================

test.describe('min-date / max-date', () => {
    test('a day inside the [min, max] window has the --selectable class set', async ({ page }) => {
        const p = await open(page, 'minmax');
        // June 15 is between 10 and 20.
        await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--disabled/);
    });

    test('a day before min-date is marked --disabled', async ({ page }) => {
        const p = await open(page, 'minmax');
        await expect(dayByDate(p, '2026-06-05')).toHaveClass(/drp__day--disabled/);
    });

    test('a day after max-date is marked --disabled', async ({ page }) => {
        const p = await open(page, 'minmax');
        await expect(dayByDate(p, '2026-06-25')).toHaveClass(/drp__day--disabled/);
    });

    test('clicking a disabled day does not commit a selection', async ({ page }) => {
        const p = await open(page, 'minmax');
        await dayByDate(p, '2026-06-05').click();
        await expect(inputOf(p)).toHaveValue('');
        // And calendar stays open.
        await expect(calendarOf(p)).toBeVisible();
    });

    test('clicking an enabled day commits normally', async ({ page }) => {
        const p = await open(page, 'minmax');
        await dayByDate(p, '2026-06-15').click();
        await expect(inputOf(p)).toHaveValue('2026-06-15');
    });
});

// =============================================================================
// disabled-weekdays
// =============================================================================

test.describe('disabled-weekdays', () => {
    test('Saturday and Sunday cells render with --disabled', async ({ page }) => {
        const p = await open(page, 'weekdays');
        // June 2026: 6 = Sat, 7 = Sun
        await expect(dayByDate(p, '2026-06-06')).toHaveClass(/drp__day--disabled/);
        await expect(dayByDate(p, '2026-06-07')).toHaveClass(/drp__day--disabled/);
    });

    test('weekdays Mon-Fri remain enabled', async ({ page }) => {
        const p = await open(page, 'weekdays');
        await expect(dayByDate(p, '2026-06-08')).not.toHaveClass(/drp__day--disabled/);
        await expect(dayByDate(p, '2026-06-12')).not.toHaveClass(/drp__day--disabled/);
    });
});

// =============================================================================
// initial-date
// =============================================================================

test('initial-date controls the month/year shown on first open', async ({ page }) => {
    const p = await open(page, 'initial');
    await expect(p.locator('.drp__month-year').first()).toContainText(/March\s+2027/);
});

// =============================================================================
// rolling-year-range
// =============================================================================

// =============================================================================
// disabled-dates (HTML attribute + property setter, with precedence)
// =============================================================================

test.describe('disabled-dates', () => {
    test('declarative disabled-dates="..." attribute disables each listed date', async ({ page }) => {
        const p = await open(page, 'disabled-dates-attr');
        for (const iso of ['2026-06-11', '2026-06-12', '2026-06-15']) {
            await expect(dayByDate(p, iso)).toHaveClass(/drp__day--disabled/);
        }
        // A non-listed day stays enabled.
        await expect(dayByDate(p, '2026-06-10')).not.toHaveClass(/drp__day--disabled/);
    });

    test('disabledDates property wins when both attribute and property are set', async ({ page }) => {
        const p = await open(page, 'disabled-dates-prop');
        // Property listed 06-17 (string) and 06-18 (Date) — those are disabled.
        await expect(dayByDate(p, '2026-06-17')).toHaveClass(/drp__day--disabled/);
        await expect(dayByDate(p, '2026-06-18')).toHaveClass(/drp__day--disabled/);
        // Attribute listed 06-11 — but property wins, so it's enabled.
        await expect(dayByDate(p, '2026-06-11')).not.toHaveClass(/drp__day--disabled/);
    });
});

// =============================================================================
// rolling-year-range
// =============================================================================

test('rolling-year-range="2025-2027" limits the year list to exactly those years', async ({ page }) => {
    const p = await open(page, 'rolling');

    // Open the rolling selector via the month-year header.
    await p.locator('.drp__month-year').first().click();
    const yearList = p.locator('.drp__rolling-list[data-list="years"]');
    await expect(yearList).toBeVisible();

    const items = yearList.locator('.drp__rolling-item');
    await expect(items).toHaveCount(3);

    // First and last are 2025 and 2027.
    await expect(items.first()).toHaveText('2025');
    await expect(items.last()).toHaveText('2027');
});
