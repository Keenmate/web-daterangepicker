import { test, expect, Page, Locator } from './fixtures';

/**
 * Cross-component "one overlay open at a time" — opening a calendar dismisses any other
 * open one (core `registerOverlay` coordination). This replaces the old drp-only
 * `drp-picker-activated` popover-closing; the same event now only carries inline
 * keyboard-active tracking.
 *
 * Fixture: test/single-active.html — two floating single-date pickers side by side.
 */

const PAGE = '/test/single-active.html';

const calendarOf = (p: Locator): Locator => p.locator('.drp__picker');
const inputOf = (p: Locator): Locator => p.locator('input');

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('opening a second datepicker closes the first', async ({ page }) => {
    const a = page.locator('#drp-a');
    const b = page.locator('#drp-b');

    await inputOf(a).click();
    await expect(calendarOf(a)).toBeVisible();

    await inputOf(b).click();
    await expect(calendarOf(b)).toBeVisible();
    await expect(calendarOf(a)).toBeHidden(); // A dismissed when B opened
});

test('an external km-overlay-activated event (no core import) closes an open datepicker', async ({ page }) => {
    // Proves the framework-agnostic path: a Svelte / plain-DOM popover that never imported
    // core just dispatches the document event, and the calendar dismisses.
    const a = page.locator('#drp-a');
    await inputOf(a).click();
    await expect(calendarOf(a)).toBeVisible();

    await page.evaluate(() =>
        document.dispatchEvent(
            new CustomEvent('km-overlay-activated', { detail: { source: 'external-popover' } }),
        ),
    );
    await expect(calendarOf(a)).toBeHidden();
});
