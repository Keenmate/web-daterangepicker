import { test, expect, pickerById, calendarOf } from './fixtures';

/**
 * Custom CSS through core createCustomStyles() (rulebook C-CA-15): the page layer
 * `window.components['web-daterangepicker'].customStyles` / `.getCustomStylesCallback`
 * styles every picker; an instance's own `custom-styles` / `getCustomStylesCallback`
 * sits after it and wins; the instance callback wins over the attribute.
 *
 * Fixture: test/custom-styles.html
 */

const PAGE = '/test/custom-styles.html';
const PAGE_CSS = '.drp__picker { outline: 3px solid rgb(255, 0, 0); }';

const outlineColor = (id: string) => (page: import('@playwright/test').Page) =>
    calendarOf(pickerById(page, id)).evaluate((el) => getComputedStyle(el).outlineColor);

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(async () => {
        await customElements.whenDefined('web-daterangepicker');
        for (const el of document.querySelectorAll('web-daterangepicker')) await (el as any).whenReady();
    });
});

test('the page-wide customStyles styles every picker; an instance custom-styles overrides it', async ({ page }) => {
    await page.evaluate((css) => { (window as any).components['web-daterangepicker'].customStyles = css; }, PAGE_CSS);
    await expect.poll(() => outlineColor('a')(page)).toBe('rgb(255, 0, 0)');
    await expect.poll(() => outlineColor('b')(page)).toBe('rgb(255, 0, 0)');
    // C keeps the page rule's outline but its own layer (later) recolours it.
    await expect.poll(() => outlineColor('c')(page)).toBe('rgb(0, 128, 0)');
    // Two style elements in each root: the page slot first, then the instance slot.
    const classes = await pickerById(page, 'c').evaluate((el) =>
        [...el.shadowRoot!.querySelectorAll('style.drp-custom-styles--page, style.drp-custom-styles')].map((s) => s.className));
    expect(classes).toEqual(['drp-custom-styles--page', 'drp-custom-styles']);
});

test('the page-wide getCustomStylesCallback runs per picker with its context', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).components['web-daterangepicker'].getCustomStylesCallback = (ctx: any) =>
            ctx.element.id === 'a' ? '.drp__picker { outline: 2px solid rgb(0, 0, 255); }' : null;
    });
    await expect.poll(() => outlineColor('a')(page)).toBe('rgb(0, 0, 255)');
    const bStyle = await calendarOf(pickerById(page, 'b')).evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(bStyle).toBe('none');
});

test('the instance getCustomStylesCallback wins over custom-styles; clearing both falls back to the page layer', async ({ page }) => {
    await page.evaluate((css) => { (window as any).components['web-daterangepicker'].customStyles = css; }, PAGE_CSS);
    const c = pickerById(page, 'c');
    await c.evaluate(async (el: any) => {
        el.getCustomStylesCallback = () => '.drp__picker { outline-color: rgb(1, 2, 3); }';
        await el.whenSettled();
    });
    await expect.poll(() => outlineColor('c')(page)).toBe('rgb(1, 2, 3)');
    await c.evaluate(async (el: any) => {
        el.getCustomStylesCallback = null;
        el.removeAttribute('custom-styles');
        await el.whenSettled();
    });
    await expect.poll(() => outlineColor('c')(page)).toBe('rgb(255, 0, 0)');
});
