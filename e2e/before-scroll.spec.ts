import { test, expect, pickerById, calendarOf, open } from './fixtures';

/**
 * beforeScrollCallback (rulebook D-CA-5 / C-CA-6): every scroll the picker does on its
 * own — a keyboard move bringing the focused day into view, a time roll centring its
 * value on open — runs the callback first: `false` skips it, an options object
 * replaces the defaults.
 *
 * Fixture: test/before-scroll.html (clock pinned to 2026-05-22 10:00:00).
 */

const PAGE = '/test/before-scroll.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

/** Activate the inline calendar's keyboard handling, then walk the focus down 5 weeks. */
async function walkDown(page: import('@playwright/test').Page): Promise<void> {
    const p = pickerById(page, 'days');
    await p.locator('.drp__weekday').first().click();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
    await expect(p.locator('.drp__day--focused')).toHaveCount(1);
}

test('a keyboard move reveals the focused day through the callback (ctx: day, date, keyboard, container, options)', async ({ page }) => {
    const p = pickerById(page, 'days');
    await p.evaluate((el: any) => {
        (window as any).__scrolls = [];
        el.beforeScrollCallback = (ctx: any) => {
            (window as any).__scrolls.push({
                target: ctx.target, source: ctx.source, date: ctx.date ? ctx.date.getDate() : null,
                isItemDay: ctx.item.classList.contains('drp__day'), containerId: ctx.container?.id ?? null,
                options: ctx.options, hasController: !!ctx.controller, isElement: ctx.element === el,
            });
        };
        return el.whenSettled();
    });
    await walkDown(page);
    const scrolls = await page.evaluate(() => (window as any).__scrolls);
    expect(scrolls.length).toBeGreaterThan(0);
    const last = scrolls[scrolls.length - 1];
    expect(last).toMatchObject({
        target: 'day', source: 'keyboard', isItemDay: true, containerId: 'box',
        hasController: true, isElement: true,
    });
    expect(last.options.block).toBe('nearest');
    expect(typeof last.date).toBe('number');
    // The focused day sits below the 150px box: it was scrolled into view.
    expect(await page.locator('#box').evaluate((b) => b.scrollTop)).toBeGreaterThan(0);
});

test('returning false skips the day reveal (the box does not scroll)', async ({ page }) => {
    const p = pickerById(page, 'days');
    await p.evaluate((el: any) => { el.beforeScrollCallback = () => false; return el.whenSettled(); });
    await walkDown(page);
    expect(await page.locator('#box').evaluate((b) => b.scrollTop)).toBe(0);
});

test('returned options replace the defaults (block: start puts the focused day at the top)', async ({ page }) => {
    const p = pickerById(page, 'days');
    await p.evaluate((el: any) => { el.beforeScrollCallback = () => ({ block: 'start', behavior: 'instant' }); return el.whenSettled(); });
    await walkDown(page);
    const delta = await page.evaluate(() => {
        const box = document.getElementById('box')!;
        const day = (document.getElementById('days') as any).shadowRoot.querySelector('.drp__day--focused');
        return day.getBoundingClientRect().top - box.getBoundingClientRect().top;
    });
    expect(Math.abs(delta)).toBeLessThan(2);
});

test('opening a time picker centres each roll through the callback (source open, timeField, timeValue)', async ({ page }) => {
    const p = pickerById(page, 'time');
    await p.evaluate((el: any) => {
        (window as any).__scrolls = [];
        el.beforeScrollCallback = (ctx: any) => {
            (window as any).__scrolls.push({ target: ctx.target, source: ctx.source, field: ctx.timeField, value: ctx.timeValue, block: ctx.options.block, containerIsRoll: ctx.container?.dataset?.timeList ?? null });
        };
        return el.whenSettled();
    });
    await open(page, 'time');
    await expect.poll(() => page.evaluate(() => (window as any).__scrolls.length)).toBeGreaterThanOrEqual(2);
    const scrolls = await page.evaluate(() => (window as any).__scrolls);
    expect(scrolls).toContainEqual({ target: 'time', source: 'open', field: 'hours', value: 10, block: 'center', containerIsRoll: 'hours' });
    expect(scrolls).toContainEqual({ target: 'time', source: 'open', field: 'minutes', value: 0, block: 'center', containerIsRoll: 'minutes' });
    expect(await p.locator('[data-time-list="hours"]').evaluate((l) => l.scrollTop)).toBeGreaterThan(0);
});

test('returning false leaves the time rolls where they are', async ({ page }) => {
    const p = pickerById(page, 'time');
    await p.evaluate((el: any) => { el.beforeScrollCallback = () => false; return el.whenSettled(); });
    await open(page, 'time');
    await expect(calendarOf(p)).toBeVisible();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await p.locator('[data-time-list="hours"]').evaluate((l) => l.scrollTop)).toBe(0);
});
