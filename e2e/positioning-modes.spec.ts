import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate } from './fixtures';

/**
 * inline and modal positioning modes (floating mode lives in the other
 * positioning specs).
 *
 * Fixture: test/positioning-modes.html
 */

const PAGE = '/test/positioning-modes.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// inline mode
// =============================================================================

test.describe('inline mode', () => {
    test('calendar is visible immediately on page load (no input click needed)', async ({ page }) => {
        const p = pickerById(page, 'inline');
        await expect(calendarOf(p)).toBeVisible();
    });

    test('inline mode renders no visible input (only a hidden form-value field)', async ({ page }) => {
        const p = pickerById(page, 'inline');
        // No visible text input to anchor a popover to...
        await expect(p.locator('input:not([type="hidden"])')).toHaveCount(0);
        // ...but a hidden input carries the selection into form submission.
        await expect(p.locator('input[type="hidden"]')).toHaveCount(1);
    });

    test('calendar root carries the --inline modifier class', async ({ page }) => {
        const p = pickerById(page, 'inline');
        await expect(calendarOf(p)).toHaveClass(/drp__picker--inline/);
    });

    test('selecting a day in inline mode still updates internal state (single mode)', async ({ page }) => {
        const p = pickerById(page, 'inline');

        await dayByDate(p, '2026-06-20').click();
        await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--selected/);
    });
});

// =============================================================================
// modal mode
// =============================================================================

test.describe('modal mode', () => {
    test('clicking the input opens a modal calendar with --modal class', async ({ page }) => {
        const p = pickerById(page, 'modal');

        await p.locator('input').click();
        await expect(calendarOf(p)).toBeVisible();
        await expect(calendarOf(p)).toHaveClass(/drp__picker--modal/);
    });

    test('modal renders a backdrop element when open', async ({ page }) => {
        const p = pickerById(page, 'modal');

        await p.locator('input').click();
        await expect(p.locator('.drp__backdrop')).toBeVisible();
    });

    test('clicking the backdrop closes the modal', async ({ page }) => {
        const p = pickerById(page, 'modal');

        await p.locator('input').click();
        const backdrop = p.locator('.drp__backdrop');
        await expect(backdrop).toBeVisible();

        // Backdrop is behind the calendar; click on it directly (not via the
        // calendar) by targeting the top-left corner.
        await backdrop.click({ position: { x: 5, y: 5 } });
        await expect(calendarOf(p)).toBeHidden();
    });

    test('body scroll is locked while modal is open, restored on close', async ({ page }) => {
        const p = pickerById(page, 'modal');

        const before = await page.evaluate(() => document.body.style.overflow);

        await p.locator('input').click();
        const duringOpen = await page.evaluate(() => document.body.style.overflow);
        expect(duringOpen).toBe('hidden');

        // Close via backdrop.
        await p.locator('.drp__backdrop').click({ position: { x: 5, y: 5 } });
        await expect(calendarOf(p)).toBeHidden();
        const afterClose = await page.evaluate(() => document.body.style.overflow);
        expect(afterClose).toBe(before);
    });

    test('calendar uses position: fixed (centered via CSS, not Floating UI)', async ({ page }) => {
        const p = pickerById(page, 'modal');

        await p.locator('input').click();
        const position = await calendarOf(p).evaluate(el => getComputedStyle(el).position);
        expect(position).toBe('fixed');
    });
});

test.describe('modal mode extras', () => {
    test('opening from the input blurs it (suppresses the mobile keyboard)', async ({ page }) => {
        test.fail(true, 'FINDINGS.md #29');
        const p = pickerById(page, 'modal');
        await p.locator('input').click();
        await expect(calendarOf(p)).toHaveClass(/drp__picker--visible/);
        const inputFocused = await p.evaluate((el) =>
            el.shadowRoot!.activeElement === el.shadowRoot!.querySelector('input'));
        expect(inputFocused).toBe(false);
    });

    test('the grid always renders 6 weeks (42 cells), even for a 5-week month', async ({ page }) => {
        const p = pickerById(page, 'modal');
        await p.locator('input').click();
        // June 2026 needs only 5 rows (Mon 1st … Tue 30th); padding fills to 42.
        await expect(p.locator('.drp__days .drp__day')).toHaveCount(42);
        await expect(p.locator('.drp__days .drp__day--other-month')).toHaveCount(12);
    });
});
