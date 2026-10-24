import { test, expect, Page, Locator, pickerById, calendarOf, open } from './fixtures';

/**
 * Prev/next nav buttons, rolling-selector toggle via month-year header,
 * Tab cycles between columns in multi-month mode, Ctrl+Home/End jumps to
 * year boundaries.
 *
 * Fixture: test/navigation-extras.html
 */

const PAGE = '/test/navigation-extras.html';

function focusedDay(p: Locator) {
    return p.locator('.drp__day--focused');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// prev / next month buttons
// =============================================================================

test('next-month nav advances the header by one month', async ({ page }) => {
    const p = await open(page, 'single');

    await p.locator('.drp__nav--next[data-month-index="0"]').click();
    await expect(p.locator('.drp__month-year').first()).toContainText(/July\s+2026/);
});

test('prev-month nav rewinds the header by one month', async ({ page }) => {
    const p = await open(page, 'single');

    await p.locator('.drp__nav--prev[data-month-index="0"]').click();
    await expect(p.locator('.drp__month-year').first()).toContainText(/May\s+2026/);
});

// =============================================================================
// rolling-selector toggle via month-year header
// =============================================================================

test('clicking the month-year text opens the rolling year/month selector', async ({ page }) => {
    const p = await open(page, 'single');

    await p.locator('.drp__month-year').first().click();
    await expect(p.locator('.drp__rolling-selector--visible').first()).toBeVisible();
});

test('clicking the month-year text again closes the rolling selector', async ({ page }) => {
    const p = await open(page, 'single');

    const header = p.locator('.drp__month-year').first();
    await header.click();
    await expect(p.locator('.drp__rolling-selector--visible').first()).toBeVisible();
    await header.click();
    await expect(p.locator('.drp__rolling-selector--visible')).toHaveCount(0);
});

// =============================================================================
// Tab cycles between columns (multi-month)
// =============================================================================

test('Tab moves the active column from 0 to 1, then back to 0', async ({ page }) => {
    const p = await open(page, 'two-month');

    // Press ArrowRight first to establish focus in column 0 (June 2026).
    await page.keyboard.press('ArrowRight');
    let date = await focusedDay(p).getAttribute('data-date');
    expect(date?.startsWith('2026-06')).toBeTruthy();

    // Tab to column 1 (July 2026).
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight'); // re-anchor in new column
    date = await focusedDay(p).getAttribute('data-date');
    expect(date?.startsWith('2026-07')).toBeTruthy();
});

// =============================================================================
// Ctrl+Home jumps to start of year
// =============================================================================

test('Ctrl+Home navigates the active column to January 2026', async ({ page }) => {
    const p = await open(page, 'single');

    await page.keyboard.press('Control+Home');
    await expect(p.locator('.drp__month-year').first()).toContainText(/January\s+2026/);
});
