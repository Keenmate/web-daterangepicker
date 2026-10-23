import { test, expect, Page, Locator } from './fixtures';

/**
 * Container-responsive compaction (`compact-below`, core `sizeChanged` hook).
 *
 * The picker collapses to a single month and sheds its Today/Clear buttons when
 * the element's OWN box drops below the threshold — keyed on the element box (a
 * shared ResizeObserver), NOT the viewport, so it reacts to a resizable container
 * without any window resize. The month count is a structural engine option, so a
 * threshold cross rebuilds the picker; the committed selection must survive that.
 *
 * Fixture: test/responsive-compact.html
 */

const PAGE = '/test/responsive-compact.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function monthsOf(picker: Locator) {
    return picker.locator('.drp__month');
}

/** Resize the picker's containing `.box` and let the ~30ms-throttled RO settle. */
async function setBoxWidth(page: Page, boxId: string, px: number) {
    await page.locator(`#${boxId}`).evaluate((el, w) => { (el as HTMLElement).style.width = `${w}px`; }, px);
    // Throttle window is ~30ms leading+trailing; give the rebuild room to run.
    await page.waitForTimeout(120);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('compact-below', () => {
    test('starts wide: two months, Today + Clear present', async ({ page }) => {
        const p = pickerById(page, 'responsive');
        await expect(monthsOf(p)).toHaveCount(2);
        await expect(p.locator('.drp__button--today')).toBeVisible();
        await expect(p.locator('.drp__button--clear')).toBeVisible();
    });

    test('shrinking below 520px collapses to one month and hides Today/Clear', async ({ page }) => {
        const p = pickerById(page, 'responsive');
        await expect(monthsOf(p)).toHaveCount(2);

        await setBoxWidth(page, 'box', 460);

        await expect(monthsOf(p)).toHaveCount(1);
        await expect(p.locator('.drp__button--today')).toHaveCount(0);
        await expect(p.locator('.drp__button--clear')).toHaveCount(0);
    });

    test('widening back above 520px restores two months and the buttons', async ({ page }) => {
        const p = pickerById(page, 'responsive');

        await setBoxWidth(page, 'box', 460);
        await expect(monthsOf(p)).toHaveCount(1);

        await setBoxWidth(page, 'box', 640);
        await expect(monthsOf(p)).toHaveCount(2);
        await expect(p.locator('.drp__button--today')).toBeVisible();
        await expect(p.locator('.drp__button--clear')).toBeVisible();
    });

    test('a committed range survives the compaction rebuild', async ({ page }) => {
        const p = pickerById(page, 'responsive');

        // Commit a range (inline range picker commits on the second click).
        await p.locator('.drp__day[data-date="2026-06-10"]').click();
        await p.locator('.drp__day[data-date="2026-06-15"]').click();

        // Collapse across the threshold — the rebuild must preserve the selection.
        await setBoxWidth(page, 'box', 460);
        await expect(monthsOf(p)).toHaveCount(1);

        // June is still the visible month, and the committed range is intact.
        await expect(p.locator('.drp__day[data-date="2026-06-10"]')).toHaveClass(/drp__day--range-start/);
        await expect(p.locator('.drp__day[data-date="2026-06-15"]')).toHaveClass(/drp__day--range-end/);
        await expect(p.locator('.drp__day[data-date="2026-06-12"]')).toHaveClass(/drp__day--in-range/);
    });

    test('the range survives widening back too (round-trip)', async ({ page }) => {
        const p = pickerById(page, 'responsive');

        await p.locator('.drp__day[data-date="2026-06-10"]').click();
        await p.locator('.drp__day[data-date="2026-06-15"]').click();

        await setBoxWidth(page, 'box', 460);
        await expect(monthsOf(p)).toHaveCount(1);
        await setBoxWidth(page, 'box', 640);
        await expect(monthsOf(p)).toHaveCount(2);

        await expect(p.locator('.drp__day[data-date="2026-06-10"]')).toHaveClass(/drp__day--range-start/);
        await expect(p.locator('.drp__day[data-date="2026-06-15"]')).toHaveClass(/drp__day--range-end/);
    });
});

test.describe('control (no compact-below)', () => {
    test('stays two months even in a 420px box', async ({ page }) => {
        const p = pickerById(page, 'control');
        // Rendered narrow from the start, but with no compact-below it never collapses.
        await expect(monthsOf(p)).toHaveCount(2);
        await expect(p.locator('.drp__button--today')).toBeVisible();
    });
});
