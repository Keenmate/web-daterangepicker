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

test('close-on-scroll ignores the scroll that opening causes (focus scrolls the input into view)', async ({ page }) => {
    // WebKit fires `focus` (which opens the calendar) BEFORE it scrolls the input into
    // view (asynchronously, a frame later); core's scroll close takes a scroll in the
    // first frames after open as the new baseline, so the calendar stays open.
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

// =============================================================================
// the calendar is a core createPopover (overlay tree, scroll / resize close)
// =============================================================================

test('a window resize closes the open floating calendar; a later picker still closes on resize (no leaked handler)', async ({ page }) => {
    const below = await open(page, 'below');
    await page.setViewportSize({ width: 1300, height: 1000 });
    await expect(calendarOf(below)).toBeHidden();

    const top = await open(page, 'top');
    await page.setViewportSize({ width: 1440, height: 1024 });
    await expect(calendarOf(top)).toBeHidden();
    // The first picker stays closed (its resize close was released with it).
    await expect(calendarOf(below)).toBeHidden();
});

test('a page button that calls open() keeps the open calendar open through its click', async ({ page }) => {
    const p = await open(page, 'below');
    await page.evaluate(() => {
        const btn = document.createElement('button');
        btn.id = 'page-open';
        btn.textContent = 'open';
        btn.style.cssText = 'position: fixed; right: 8px; bottom: 8px;';
        btn.addEventListener('click', () => (document.getElementById('below') as any).open());
        document.body.appendChild(btn);
    });
    await page.locator('#page-open').click();
    await page.waitForTimeout(100);
    await expect(calendarOf(p)).toBeVisible();
    // A plain outside click still closes it.
    await page.mouse.click(5, 5);
    await expect(calendarOf(p)).toBeHidden();
});

test('a scroll of an unrelated scroller does not close the calendar; a page scroll that moves the input does', async ({ page }) => {
    await page.evaluate(() => {
        const spacer = document.createElement('div');
        spacer.style.height = '3000px';
        document.body.append(spacer);
    });
    const p = await open(page, 'below');
    // #scrollbox-stay is elsewhere on the page — scrolling it doesn't move this input.
    await page.locator('#scrollbox-stay').evaluate((el) => { el.scrollTop = 80; });
    await page.waitForTimeout(150);
    await expect(calendarOf(p)).toBeVisible();
    await page.evaluate(() => window.scrollBy(0, 60));
    await expect(calendarOf(p)).toBeHidden();
});
