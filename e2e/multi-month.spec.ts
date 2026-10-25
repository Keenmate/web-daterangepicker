import { test, expect, Page, Locator, pickerById, calendarOf, open, dayByDate, inputOf } from './fixtures';

/**
 * Multi-month rendering: visible-months-count, horizontal / grid layout,
 * unified navigation, per-column independent navigation, collision-prevention.
 *
 * Fixture: test/multi-month.html
 */

const PAGE = '/test/multi-month.html';

function months(p: Locator) {
    return p.locator('.drp__month');
}

function monthHeaderTextAt(p: Locator, index: number) {
    return p.locator('.drp__month-year').nth(index);
}

function nextNavAt(p: Locator, index: number) {
    return p.locator(`.drp__nav--next[data-month-index="${index}"]`);
}

function prevNavAt(p: Locator, index: number) {
    return p.locator(`.drp__nav--prev[data-month-index="${index}"]`);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// horizontal multi-month
// =============================================================================

test('visible-months-count="2" renders two month columns', async ({ page }) => {
    const p = await open(page, 'two-month');
    await expect(months(p)).toHaveCount(2);
});

test('default multi-month: first column shows the initial month, second shows next', async ({ page }) => {
    const p = await open(page, 'two-month');

    await expect(monthHeaderTextAt(p, 0)).toContainText(/June\s+2026/);
    await expect(monthHeaderTextAt(p, 1)).toContainText(/July\s+2026/);
});

test('horizontal layout uses the non-grid months container', async ({ page }) => {
    const p = await open(page, 'two-month');
    await expect(p.locator('.drp__months')).toBeVisible();
    await expect(p.locator('.drp__months--grid')).toHaveCount(0);
});

// =============================================================================
// per-column independent navigation
// =============================================================================

test('prev on column 0 (no collision) advances only column 0', async ({ page }) => {
    const p = await open(page, 'two-month');

    // Columns start at June, July. Going prev on column 0 (June → May) cannot
    // collide with July, so column 1 stays put.
    await prevNavAt(p, 0).click();

    await expect(monthHeaderTextAt(p, 0)).toContainText(/May\s+2026/);
    await expect(monthHeaderTextAt(p, 1)).toContainText(/July\s+2026/);
});

test('collision prevention: pushing column 0 next into column 1\'s month shifts column 1 forward', async ({ page }) => {
    const p = await open(page, 'two-month');

    // Columns start at June, July. Next on column 0 would land on July, which
    // would collide with column 1 — so column 1 is pushed forward to August.
    await nextNavAt(p, 0).click();

    await expect(monthHeaderTextAt(p, 0)).toContainText(/July\s+2026/);
    await expect(monthHeaderTextAt(p, 1)).toContainText(/August\s+2026/);
});

// =============================================================================
// grid layout
// =============================================================================

test('grid layout: 2×3 renders 6 month columns inside the --grid container', async ({ page }) => {
    const p = await open(page, 'grid');

    await expect(p.locator('.drp__months--grid')).toBeVisible();
    await expect(months(p)).toHaveCount(6);
});

test('grid layout: months span the 6 visible months starting at the initial date', async ({ page }) => {
    const p = await open(page, 'grid');

    // June → November 2026 across columns 0..5.
    await expect(monthHeaderTextAt(p, 0)).toContainText(/June\s+2026/);
    await expect(monthHeaderTextAt(p, 5)).toContainText(/November\s+2026/);
});

// =============================================================================
// unified navigation
// =============================================================================

test('unified navigation: renders a single header row (no per-column prev/next)', async ({ page }) => {
    const p = await open(page, 'unified');

    // Unified header element is present.
    await expect(p.locator('.drp__unified-header')).toBeVisible();
    // Per-column prev/next buttons (those tagged with data-month-index) are
    // suppressed in unified mode; only the unified header carries nav buttons.
    await expect(p.locator('.drp__nav[data-month-index]')).toHaveCount(0);
});

test('unified navigation: month headers are static (no toggle-rolling on individual columns)', async ({ page }) => {
    const p = await open(page, 'unified');

    // Static-header variant has the --static modifier.
    await expect(p.locator('.drp__header--static').first()).toBeVisible();
});

// =============================================================================
// unified-navigation-anchor-index / runtime month-layout
// =============================================================================

test('unified-navigation-anchor-index="1": a month picked in the unified selector lands in column 1', async ({ page }) => {
    const p = await open(page, 'anchor');
    await p.locator('.drp__unified-range').click();
    await expect(p.locator('.drp__unified-rolling-selector--visible')).toBeVisible();
    await p.locator('[data-unified="true"][data-month="8"]').click();   // September (0-based)

    await expect(monthHeaderTextAt(p, 1)).toContainText(/September\s+2026/);
    await expect(monthHeaderTextAt(p, 0)).toContainText(/August\s+2026/);
    await expect(monthHeaderTextAt(p, 2)).toContainText(/October\s+2026/);
});

test("unified-navigation-anchor-index=\"1\": a year picked in the unified selector keeps column 1's month", async ({ page }) => {
    const p = await open(page, 'anchor');
    const before = (await monthHeaderTextAt(p, 1).textContent())?.replace(/\s*\d{4}.*$/, '').trim();
    await p.locator('.drp__unified-range').click();
    await p.locator('[data-unified="true"][data-year="2027"]').click();
    await expect(monthHeaderTextAt(p, 1)).toContainText(new RegExp(`${before}\\s+2027`));
});

test('switching month-layout row → grid at runtime renders the grid and keeps the range', async ({ page }) => {
    const p = await open(page, 'layout');
    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-12').click();
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-12');

    await p.evaluate((el: any) => { el.setAttribute('month-layout', 'grid'); return el.whenSettled(); });
    await inputOf(p).click();
    await expect(p.locator('.drp__months--grid')).toBeVisible();
    await expect(p.locator('.drp__month')).toHaveCount(4);
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-12');
    // A plain clicked range lives in selectedStartDate/EndDate (selectedRanges is only
    // populated for independent multi-ranges).
    const [s, e] = await p.evaluate((el: any) => [el.selectedStartDate?.getDate(), el.selectedEndDate?.getDate()]);
    expect([s, e]).toEqual([10, 12]);
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
});
