import { test, expect, pickerById, open } from './fixtures';

/**
 * Page-wide locale through core /locale: `window.components.locale` localizes every
 * picker without its own `locale`; an instance `locale` wins; a runtime change
 * re-renders (core `localeChanged()`).
 *
 * Fixture: test/page-locale.html
 */

const PAGE = '/test/page-locale.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('window.components.locale = cs-CZ localizes a picker without its own locale', async ({ page }) => {
    const p = await open(page, 'page');
    await expect(p.locator('.drp__month-year').first()).toContainText(/červen/i);
    const first = (await p.locator('.drp__weekdays').first().innerText()).trim().split(/\s+/)[0];
    expect(first.toLowerCase()).toBe('po');
});

test('an instance locale wins over the page-wide one', async ({ page }) => {
    const p = await open(page, 'instance');
    await expect(p.locator('.drp__month-year').first()).toContainText('June 2026');
    const first = (await p.locator('.drp__weekdays').first().innerText()).trim().split(/\s+/)[0];
    expect(first.toLowerCase()).toBe('sun');
});

test('changing window.components.locale at runtime re-renders the open calendar', async ({ page }) => {
    const p = await open(page, 'page');
    await page.evaluate(() => { (window as any).components.locale = { locale: 'de-DE' }; });
    await expect(p.locator('.drp__month-year').first()).toContainText('Juni 2026');
    // the instance-locale picker is unaffected
    await expect(pickerById(page, 'instance')).toBeAttached();
});
