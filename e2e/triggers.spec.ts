import { test, expect, Page, Locator, pickerById, calendarOf, inputOf } from './fixtures';

/**
 * `calendar-open-trigger` modes and outside-click / re-open behavior.
 *
 * Fixture: test/triggers.html — three pickers (focus default, typing, manual)
 * and an "outside" div for outside-click tests.
 */

const PAGE = '/test/triggers.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// focus trigger (default)
// =============================================================================

test('focus trigger: clicking the input opens the calendar', async ({ page }) => {
    const p = pickerById(page, 'focus');

    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
});

test('focus trigger: re-clicking the input after outside-click closes it reopens it', async ({ page }) => {
    const p = pickerById(page, 'focus');

    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();

    // Close via outside click.
    await page.locator('#outside').click();
    await expect(calendarOf(p)).toBeHidden();

    // Re-click the (still-focused) input; the pointerdown/click listener must
    // reopen even though the focus event won't fire.
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
});

// =============================================================================
// typing trigger
// =============================================================================

test('typing trigger: clicking the input does NOT open the calendar', async ({ page }) => {
    const p = pickerById(page, 'typing');

    await inputOf(p).click();
    // Give any focus listeners a frame to misfire.
    await page.waitForTimeout(150);
    await expect(calendarOf(p)).toBeHidden();
});

test('typing trigger: pressing a key opens the calendar', async ({ page }) => {
    const p = pickerById(page, 'typing');

    await inputOf(p).click();
    await expect(calendarOf(p)).toBeHidden();

    await inputOf(p).press('2');
    await expect(calendarOf(p)).toBeVisible();
});

// =============================================================================
// manual trigger
// =============================================================================

test('manual trigger: input click + keypress do not open the calendar', async ({ page }) => {
    const p = pickerById(page, 'manual');

    await inputOf(p).click();
    await inputOf(p).press('2');
    await page.waitForTimeout(150);
    await expect(calendarOf(p)).toBeHidden();
});

test('manual trigger: setting picker.isOpen = true opens the calendar', async ({ page }) => {
    const p = pickerById(page, 'manual');

    await p.evaluate((el: any) => { el.isOpen = true; });
    await expect(calendarOf(p)).toBeVisible();

    await p.evaluate((el: any) => { el.isOpen = false; });
    await expect(calendarOf(p)).toBeHidden();
});

// =============================================================================
// outside-click close
// =============================================================================

test('clicking outside the calendar closes it (floating mode)', async ({ page }) => {
    const p = pickerById(page, 'focus');

    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();

    await page.locator('#outside').click();
    await expect(calendarOf(p)).toBeHidden();
});
