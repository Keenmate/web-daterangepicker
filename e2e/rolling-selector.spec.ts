import { test, expect, Page } from './fixtures';

/**
 * Verifies the rolling year/month selector overlays its container correctly
 * (no overflow into elements below) and applies `overscroll-behavior: contain`
 * so scrolling the list to its end doesn't chain to the page.
 *
 * Fixture: test/rolling-selector.html — single picker, defaults.
 */

const PAGE = '/test/rolling-selector.html';

function picker(page: Page) {
    return page.locator('#picker');
}

function calendar(page: Page) {
    return picker(page).locator('.drp__picker');
}

function rollingSelector(page: Page) {
    return picker(page).locator('.drp__rolling-selector');
}

function rollingLists(page: Page) {
    return picker(page).locator('.drp__rolling-list');
}

async function openCalendarAndRollingSelector(page: Page) {
    await page.goto(PAGE);
    await picker(page).locator('input').click();
    await expect(calendar(page)).toBeVisible();

    // Clicking the month-year header toggles the rolling year/month picker.
    await picker(page).locator('.drp__month-year').first().click();
    await expect(rollingSelector(page).first()).toBeVisible();
}

test('rolling-list has box-sizing: border-box (so 100% + border does not overflow)', async ({ page }) => {
    await openCalendarAndRollingSelector(page);

    const boxSizing = await rollingLists(page).first().evaluate(el => getComputedStyle(el).boxSizing);
    expect(boxSizing).toBe('border-box');
});

test('rolling-list applies overscroll-behavior to prevent page-scroll chaining', async ({ page }) => {
    await openCalendarAndRollingSelector(page);

    // contain or none both prevent chaining; the fix specifically sets contain.
    const overscroll = await rollingLists(page).first().evaluate(el => getComputedStyle(el).overscrollBehaviorY);
    expect(['contain', 'none']).toContain(overscroll);
});

test('rolling-list does not extend past its parent rolling-selector container', async ({ page }) => {
    await openCalendarAndRollingSelector(page);

    // Compare bottom edges. With the border-box fix the list fits inside.
    // Without it, the 1px top+bottom border pushed the list 2px past the
    // container, visibly overlapping whatever sat below.
    const selectorBox = await rollingSelector(page).first().boundingBox();
    const listBox = await rollingLists(page).first().boundingBox();

    expect(selectorBox).not.toBeNull();
    expect(listBox).not.toBeNull();

    const selectorBottom = selectorBox!.y + selectorBox!.height;
    const listBottom = listBox!.y + listBox!.height;

    // Allow sub-pixel rounding (≤ 0.5px) but no more.
    expect(listBottom).toBeLessThanOrEqual(selectorBottom + 0.5);
});

test('rolling selector is opaque and paints below the sticky month/year header', async ({ page }) => {
    await openCalendarAndRollingSelector(page);

    // Regression: on a panel short enough to scroll, the selector's `inset: 0`
    // box slides up under the sticky `.drp__header`. Two prior bugs made the
    // roller items bleed onto the title: (1) the selector had no background so
    // its border-only lists were transparent, and (2) the header's z-index (2)
    // sat *below* the selector's (10), so the selector painted over the header.
    const selectorBg = await rollingSelector(page).first()
        .evaluate(el => getComputedStyle(el).backgroundColor);

    // Must be a real, fully-opaque fill — not `transparent` / `rgba(...,0)`.
    expect(selectorBg).not.toBe('transparent');
    expect(selectorBg).not.toBe('rgba(0, 0, 0, 0)');
    const alpha = selectorBg.startsWith('rgba')
        ? Number(selectorBg.split(',')[3]?.replace(')', '').trim())
        : 1;
    expect(alpha).toBe(1);

    // The sticky header must outrank the selector so the title stays readable
    // when the shorter-than-content panel is scrolled.
    const headerZ = await picker(page).locator('.drp__month .drp__header').first()
        .evaluate(el => Number(getComputedStyle(el).zIndex));
    const selectorZ = await rollingSelector(page).first()
        .evaluate(el => Number(getComputedStyle(el).zIndex));
    expect(headerZ).toBeGreaterThan(selectorZ);
});

// =============================================================================
// min/max-date + rolling-year-range
// =============================================================================

test.describe('rolling entries vs restrictions', () => {
    async function openRolling(page: Page, id: string) {
        await page.goto(PAGE);
        const p = page.locator(`#${id}`);
        await p.locator('input').click();
        await p.locator('.drp__month-year').first().click();
        await expect(p.locator('.drp__rolling-selector--visible')).toBeVisible();
        return p;
    }
    const years = (p: ReturnType<Page['locator']>) => p.locator('.drp__rolling-list[data-list="years"] .drp__rolling-item');
    const month = (p: ReturnType<Page['locator']>, m: number) => p.locator(`.drp__rolling-list[data-list="months"] [data-month="${m}"]`);

    test('min/max-date bound the year list', async ({ page }) => {
        const p = await openRolling(page, 'minmax');
        await expect(years(p)).toHaveText(['2026', '2027']);
    });

    test('months before min-date are disabled; later months are enabled', async ({ page }) => {
        const p = await openRolling(page, 'minmax');
        await expect(month(p, 0)).toHaveClass(/drp__rolling-item--disabled/);   // January 2026
        await expect(month(p, 1)).toHaveClass(/drp__rolling-item--disabled/);   // February 2026
        await expect(month(p, 2)).not.toHaveClass(/drp__rolling-item--disabled/); // March (min-date month)
        await expect(month(p, 11)).not.toHaveClass(/drp__rolling-item--disabled/);
    });

    test('clicking a disabled month does not navigate', async ({ page }) => {
        const p = await openRolling(page, 'minmax');
        await month(p, 0).dispatchEvent('click');   // pointer-events: none blocks a real click
        await expect(p.locator('.drp__month-year').first()).toContainText(/June\s+2026/);
    });

    test('rolling-year-range relative form "-1:+2" lists the years around the shown year', async ({ page }) => {
        test.fail(true, 'FINDINGS.md #27');
        const p = await openRolling(page, 'relative');
        await expect(years(p)).toHaveText(['2025', '2026', '2027', '2028']);
    });

    test('changing rolling-year-range at runtime re-renders the year list', async ({ page }) => {
        await page.goto(PAGE);
        const p = page.locator('#runtime-range');
        await p.evaluate((el: any) => { el.setAttribute('rolling-year-range', '2023-2026'); return el.whenSettled(); });
        await p.locator('input').click();
        await p.locator('.drp__month-year').first().click();
        await expect(years(p)).toHaveText(['2023', '2024', '2025', '2026']);
    });
});
