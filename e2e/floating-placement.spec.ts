import { test, expect, Page, Locator, pickerById, calendarOf, open } from './fixtures';

/**
 * Default placement (below input), explicit calendar-placement, and the
 * close-on-scroll behavior (default true / explicit false).
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
// close-on-scroll
// =============================================================================

test('default close-on-scroll: scrolling the ancestor closes the picker', async ({ page }) => {
    const p = await open(page, 'scroll-default');

    await expect(calendarOf(p)).toBeVisible();
    await page.locator('#scrollbox-default').evaluate(el => { el.scrollTop = 100; });
    await expect(calendarOf(p)).toBeHidden();
});

test('close-on-scroll="false": scrolling the ancestor keeps the picker open', async ({ page }) => {
    const p = await open(page, 'scroll-stay');

    await expect(calendarOf(p)).toBeVisible();
    await page.locator('#scrollbox-stay').evaluate(el => { el.scrollTop = 100; });
    // Picker should NOT have closed.
    await expect(calendarOf(p)).toBeVisible();
});

test('close-on-scroll ignores the scroll that opening causes (focus scrolls the input into view)', async ({ page, browserName }) => {
    // WebKit fires `focus` (which opens the calendar) BEFORE it scrolls the input into
    // view (asynchronously, a frame later), so the core popover sees the input move after
    // it opened and closes. Known core gap (createPopover scroll close), reported in the
    // core final-alignment pass; expected to fail on WebKit until core settles it.
    test.fail(browserName === 'webkit', 'WebKit scrolls a focused input into view after the focus event (core createPopover scroll-close gap)');
    const p = pickerById(page, 'below');
    // Push the picker below the fold, then focus its input: the browser scrolls it
    // into view (a window scroll) in the same task that opens the calendar.
    await page.evaluate(() => {
        const spacer = document.createElement('div');
        spacer.style.height = '3000px';
        document.body.prepend(spacer);
        window.scrollTo(0, 0);
    });
    await p.locator('input').evaluate((input: HTMLInputElement) => input.focus());
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    await expect(calendarOf(p)).toBeVisible();

    // A real scroll afterwards still closes it.
    await page.evaluate(() => window.scrollBy(0, 50));
    await expect(calendarOf(p)).toBeHidden();
});
