import { test, expect, Page, Locator, pickerById, calendarOf, open } from './fixtures';

/**
 * Default placement (below input), explicit calendar-placement, and the
 * should-close-on-scroll behavior (default true / explicit false).
 *
 * Fixture: test/floating-placement.html
 */

const PAGE = '/test/floating-placement.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// default placement (bottom-start)
// =============================================================================

test('default placement: calendar top is below the input bottom (opens downward)', async ({ page }) => {
    const p = await open(page, 'below');

    const inputBox = await p.locator('input').boundingBox();
    const calBox = await calendarOf(p).boundingBox();
    expect(inputBox).not.toBeNull();
    expect(calBox).not.toBeNull();

    // Allow ~10px overlap tolerance for offset+border rounding.
    expect(calBox!.y).toBeGreaterThanOrEqual(inputBox!.y + inputBox!.height - 10);
});

// =============================================================================
// explicit calendar-placement
// =============================================================================

test('calendar-placement="top-start" places the calendar above the input', async ({ page }) => {
    const p = await open(page, 'top');

    const inputBox = await p.locator('input').boundingBox();
    const calBox = await calendarOf(p).boundingBox();
    expect(inputBox).not.toBeNull();
    expect(calBox).not.toBeNull();

    // Calendar bottom should be at/above the input top.
    expect(calBox!.y + calBox!.height).toBeLessThanOrEqual(inputBox!.y + 10);
});

// =============================================================================
// should-close-on-scroll
// =============================================================================

test('default should-close-on-scroll: scrolling the ancestor closes the picker', async ({ page }) => {
    const p = await open(page, 'scroll-default');

    await expect(calendarOf(p)).toBeVisible();
    await page.locator('#scrollbox-default').evaluate(el => { el.scrollTop = 100; });
    await expect(calendarOf(p)).toBeHidden();
});

test('should-close-on-scroll="false": scrolling the ancestor keeps the picker open', async ({ page }) => {
    const p = await open(page, 'scroll-stay');

    await expect(calendarOf(p)).toBeVisible();
    await page.locator('#scrollbox-stay').evaluate(el => { el.scrollTop = 100; });
    // Picker should NOT have closed.
    await expect(calendarOf(p)).toBeVisible();
});
