import { test, expect, type Page, type Locator } from './fixtures';

/**
 * The calendar day grid is a WAI-ARIA grid with ONE tab stop (core createRovingFocus): the arrows
 * move REAL focus between days, disabled days are skipped, Left / Right follow the writing
 * direction, PageDown / month-edge arrows switch the month and keep focus in the grid.
 * June 2026 starts on a Monday; weeks start on Monday; 2026-06-03 is disabled.
 *
 * Fixture: test/day-grid.html
 */

const PAGE = '/test/day-grid.html';

/** `data-date` of the deep active element (through shadow roots), or its tag when not a day. */
async function focusedDate(page: Page): Promise<string | null> {
    return page.evaluate(() => {
        let a: Element | null = document.activeElement;
        while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
        return a?.getAttribute('data-date') ?? (a ? `<${a.tagName.toLowerCase()}#${a.id}>` : null);
    });
}

const day = (p: Locator, iso: string) => p.locator(`.drp__day[data-date="${iso}"]`);
const header = (p: Locator) => p.locator('.drp__month-year').first();

async function focusDay(p: Locator, iso: string) {
    await day(p, iso).focus();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('#inline .drp__day').first()).toBeVisible();
});

test('Tab reaches the day grid as ONE stop', async ({ page }) => {
    const p = page.locator('#inline');
    await expect(p.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);

    await page.locator('#before').focus();
    let date: string | null = null;
    for (let i = 0; i < 10 && !/^\d{4}-/.test(date ?? ''); i++) {
        await page.keyboard.press('Tab');
        date = await focusedDate(page);
    }
    expect(date).toMatch(/^2026-06-/);
    await page.keyboard.press('Tab');
    expect(await focusedDate(page)).not.toMatch(/^\d{4}-/);   // one Tab leaves the grid
    await page.keyboard.press('Shift+Tab');
    expect(await focusedDate(page)).toBe(date);               // and comes back to the same day
});

test('arrows move real focus; a disabled day is skipped', async ({ page }) => {
    const p = page.locator('#inline');
    await focusDay(p, '2026-06-02');
    await page.keyboard.press('ArrowRight');                  // 06-03 is disabled
    expect(await focusedDate(page)).toBe('2026-06-04');
    await expect(day(p, '2026-06-04')).toHaveAttribute('tabindex', '0');
    await expect(day(p, '2026-06-02')).toHaveAttribute('tabindex', '-1');
    await page.keyboard.press('ArrowDown');
    expect(await focusedDate(page)).toBe('2026-06-11');
    await page.keyboard.press('ArrowUp');
    expect(await focusedDate(page)).toBe('2026-06-04');
    await page.keyboard.press('ArrowLeft');                   // back over the disabled day
    expect(await focusedDate(page)).toBe('2026-06-02');
    await expect(p.locator('.drp__day--focused')).toHaveCount(1);
});

test('Left / Right wrap the week (Sunday → next Monday)', async ({ page }) => {
    const p = page.locator('#inline');
    await focusDay(p, '2026-06-07');
    await page.keyboard.press('ArrowRight');
    expect(await focusedDate(page)).toBe('2026-06-08');
    await page.keyboard.press('ArrowLeft');
    expect(await focusedDate(page)).toBe('2026-06-07');
});

test('RTL: ArrowLeft is the next day, ArrowRight the previous one', async ({ page }) => {
    const p = page.locator('#rtl');
    await focusDay(p, '2026-06-02');
    await page.keyboard.press('ArrowLeft');                   // skips the disabled 06-03
    expect(await focusedDate(page)).toBe('2026-06-04');
    await page.keyboard.press('ArrowRight');
    expect(await focusedDate(page)).toBe('2026-06-02');
});

test('PageDown / PageUp change the month, focus stays in the grid', async ({ page }) => {
    const p = page.locator('#inline');
    await focusDay(p, '2026-06-15');
    await page.keyboard.press('PageDown');
    await expect(header(p)).toContainText(/July\s+2026/);
    await expect.poll(() => focusedDate(page)).toBe('2026-07-15');
    await page.keyboard.press('PageUp');
    await expect(header(p)).toContainText(/June\s+2026/);
    await expect.poll(() => focusedDate(page)).toBe('2026-06-15');
    await page.keyboard.press('Shift+PageDown');
    await expect(header(p)).toContainText(/June\s+2027/);
    await expect.poll(() => focusedDate(page)).toBe('2027-06-15');
});

test('an arrow at the month edge continues into the next / previous month', async ({ page }) => {
    const p = page.locator('#inline');
    await focusDay(p, '2026-06-30');
    await page.keyboard.press('ArrowRight');
    await expect(header(p)).toContainText(/July\s+2026/);
    await expect.poll(() => focusedDate(page)).toBe('2026-07-01');
    await page.keyboard.press('ArrowLeft');
    await expect(header(p)).toContainText(/June\s+2026/);
    await expect.poll(() => focusedDate(page)).toBe('2026-06-30');
    await page.keyboard.press('ArrowDown');                   // Tue 06-30 → Tue 07-07
    await expect(header(p)).toContainText(/July\s+2026/);
    await expect.poll(() => focusedDate(page)).toBe('2026-07-07');
    await expect(p.locator('.drp__day--focused')).toHaveCount(1);
});

test('Enter / Space on a focused day pick it', async ({ page }) => {
    const p = page.locator('#inline');
    await focusDay(p, '2026-06-15');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press(' ');
    await expect(day(p, '2026-06-16')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => focusedDate(page)).toBe('2026-06-16');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(day(p, '2026-06-17')).toHaveAttribute('aria-selected', 'true');
    await expect(day(p, '2026-06-16')).toHaveAttribute('aria-selected', 'false');
});

test('roles: grid / row / columnheader / gridcell, aria-selected / aria-current / aria-disabled', async ({ page }) => {
    const p = page.locator('#inline');
    const grid = p.locator('[role="grid"]');
    await expect(grid).toHaveCount(1);
    await expect(grid).toHaveAttribute('aria-label', 'June 2026');
    const headers = grid.locator('[role="row"] > [role="columnheader"]');
    await expect(headers).toHaveCount(7);
    await expect(headers.first()).toHaveAttribute('abbr', 'Monday');
    await expect(grid.locator('[role="rowgroup"] > [role="row"]')).toHaveCount(6);
    await expect(grid.locator('[role="row"] > [role="gridcell"]')).toHaveCount(42);
    await expect(day(p, '2026-06-03')).toHaveAttribute('aria-disabled', 'true');
    await expect(day(p, '2026-06-04')).not.toHaveAttribute('aria-disabled', /.*/);
    await expect(p.locator('[aria-selected="true"]')).toHaveCount(0);

    await day(p, '2026-06-15').click();
    await expect(day(p, '2026-06-15')).toHaveAttribute('aria-selected', 'true');
    await expect(p.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(1);

    // a range: the endpoints and the days between are selected
    const r = page.locator('#range');
    await day(r, '2026-06-08').click();
    await day(r, '2026-06-11').click();
    for (const iso of ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11']) {
        await expect(day(r, iso)).toHaveAttribute('aria-selected', 'true');
    }
    await expect(day(r, '2026-06-12')).toHaveAttribute('aria-selected', 'false');

    // today (2026-05-22, pinned) carries aria-current="date"
    const f = page.locator('#floating');
    await f.locator('input').click();
    await expect(day(f, '2026-05-22')).toHaveAttribute('aria-current', 'date');
    await expect(f.locator('[aria-current="date"]')).toHaveCount(1);
});

test('floating: the input keeps focus on open; a day picked from the grid returns focus to the input', async ({ page }) => {
    const f = page.locator('#floating');
    await f.locator('input').click();
    await expect(f.locator('.drp__picker')).toBeVisible();
    expect(await focusedDate(page)).toMatch(/^<input/);       // open-focus unchanged: the input
    // the grid's tab stop is today (no selection yet)
    await expect(day(f, '2026-05-22')).toHaveAttribute('tabindex', '0');
    await focusDay(f, '2026-05-22');
    await page.keyboard.press('ArrowRight');
    expect(await focusedDate(page)).toBe('2026-05-23');
    await page.keyboard.press('Enter');
    await expect(f.locator('input')).toHaveValue('2026-05-23');
    await expect(f.locator('.drp__picker')).toBeHidden();
    expect(await focusedDate(page)).toMatch(/^<input/);
});

test('floating: Escape on a focused day closes and returns focus to the input', async ({ page }) => {
    const f = page.locator('#floating');
    await f.locator('input').click();
    await focusDay(f, '2026-05-22');
    await page.keyboard.press('Escape');
    await expect(f.locator('.drp__picker')).toBeHidden();
    expect(await focusedDate(page)).toMatch(/^<input/);
});
