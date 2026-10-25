import { test, expect, calendarOf, open } from './fixtures';
import type { Locator, Page } from './fixtures';

/**
 * Right-to-left layout: in a `dir="rtl"` context the "previous month" control
 * sits on the right and its chevron points right (outward); the day grid runs
 * right-to-left, so ArrowLeft moves to the NEXT day.
 *
 * The component has no RTL handling yet (FINDINGS.md #28) — the layout mirrors
 * through flexbox/grid, but the chevrons and the arrow keys don't.
 *
 * Fixture: test/rtl.html (#rtl inside dir="rtl", #ltr control).
 */

const PAGE = '/test/rtl.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

/** The rendered `transform` of a nav button's chevron (::before). */
function chevronTransform(p: Locator, cls: 'prev' | 'next'): Promise<string> {
    return p.evaluate((el, c) => {
        const btn = el.shadowRoot!.querySelector(`.drp__nav--${c}`)!;
        return getComputedStyle(btn, '::before').transform;
    }, cls);
}

async function navX(p: Locator, cls: 'prev' | 'next'): Promise<number> {
    return (await p.locator(`.drp__nav--${cls}`).first().boundingBox())!.x;
}

const focused = (p: Locator) => p.locator('.drp__day--focused');

async function focusFirstDay(page: Page, id: string): Promise<Locator> {
    const p = await open(page, id);
    await page.keyboard.press('ArrowDown');   // June 8 (index 7)
    await expect(focused(p)).toHaveAttribute('data-date', '2026-06-08');
    return p;
}

test('ltr control: prev on the left pointing left, ArrowLeft goes back a day', async ({ page }) => {
    const p = await focusFirstDay(page, 'ltr');
    expect(await navX(p, 'prev')).toBeLessThan(await navX(p, 'next'));
    expect(await chevronTransform(p, 'prev')).toMatch(/^matrix\(-1,/);
    await page.keyboard.press('ArrowLeft');
    await expect(focused(p)).toHaveAttribute('data-date', '2026-06-07');
});

test('rtl: the header mirrors — prev sits on the right', async ({ page }) => {
    const p = await open(page, 'rtl');
    await expect(calendarOf(p)).toBeVisible();
    expect(await navX(p, 'prev')).toBeGreaterThan(await navX(p, 'next'));
});

test('rtl: the prev chevron points right (outward), next points left', async ({ page }) => {
    test.fail(true, 'FINDINGS.md #28');
    const p = await open(page, 'rtl');
    expect(await chevronTransform(p, 'prev')).toMatch(/^matrix\(1,/);
    expect(await chevronTransform(p, 'next')).toMatch(/^matrix\(-1,/);
});

test('rtl: ArrowLeft moves to the next day (visual direction)', async ({ page }) => {
    test.fail(true, 'FINDINGS.md #28');
    const p = await focusFirstDay(page, 'rtl');
    await page.keyboard.press('ArrowLeft');
    await expect(focused(p)).toHaveAttribute('data-date', '2026-06-09');
});
