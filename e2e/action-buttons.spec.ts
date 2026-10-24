import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, inputOf, open } from './fixtures';

/**
 * Action button visibility toggles (show-today/clear/apply) + action click
 * behavior + summary visibility / custom renderSummaryCallback.
 *
 * Fixture: test/action-buttons.html
 */

const PAGE = '/test/action-buttons.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// default buttons (single mode = Today + Clear)
// =============================================================================

test('default single mode renders Today and Clear buttons', async ({ page }) => {
    const p = await open(page, 'default');

    await expect(p.locator('.drp__button--today')).toBeVisible();
    await expect(p.locator('.drp__button--clear')).toBeVisible();
});

test('clicking Today selects today and closes the picker', async ({ page }) => {
    const p = await open(page, 'default');

    await p.locator('.drp__button--today').click();

    // Today is 2026-05-22 (set by harness).
    await expect(inputOf(p)).toHaveValue('2026-05-22');
    await expect(calendarOf(p)).toBeHidden();
});

test('clicking Clear empties the input', async ({ page }) => {
    const p = await open(page, 'default');

    await dayByDate(p, '2026-06-15').click();
    await expect(inputOf(p)).toHaveValue('2026-06-15');

    // Reopen and clear.
    await inputOf(p).click();
    await p.locator('.drp__button--clear').click();
    await expect(inputOf(p)).toHaveValue('');
});

// =============================================================================
// show-* toggles
// =============================================================================

test('is-today-button-shown="false" omits the Today button', async ({ page }) => {
    const p = await open(page, 'no-today');

    await expect(p.locator('.drp__button--today')).toHaveCount(0);
    await expect(p.locator('.drp__button--clear')).toBeVisible();
});

test('all buttons disabled: the actions container is omitted entirely', async ({ page }) => {
    const p = await open(page, 'no-actions');

    // Per createCalendar(): actions is only appended if it has children.
    await expect(p.locator('.drp__actions')).toHaveCount(0);
});

// =============================================================================
// summary visibility
// =============================================================================

test('is-summary-shown="false" omits the summary block in range mode', async ({ page }) => {
    const p = await open(page, 'no-summary');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();

    // Summary element should NOT be in the calendar.
    await expect(p.locator('.drp__summary')).toHaveCount(0);
});

// =============================================================================
// renderSummaryCallback
// =============================================================================

test('custom renderSummaryCallback overrides the default summary HTML', async ({ page }) => {
    const p = await open(page, 'custom-summary');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();
    // Reopen to inspect summary content (range commit may auto-close).
    await inputOf(p).click();

    const summary = p.locator('.drp__summary');
    await expect(summary).toHaveClass(/drp__summary--visible/);
    await expect(summary).toContainText('CUSTOM: 6d');
});
