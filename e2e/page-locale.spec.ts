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

// Page-wide labels (core /locale createLabels): instance `labels` → window.components.locale.labels['web-daterangepicker'] → English.
test('page-wide labels apply live; the instance labels win key by key', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).components.locale = { locale: 'cs-CZ', labels: { 'web-daterangepicker': { today: 'Dnes', clear: 'Vymazat' } } };
    });
    const p = await open(page, 'page');
    await expect(p.locator('.drp__button--today')).toHaveText('Dnes');
    await expect(p.locator('.drp__button--clear')).toHaveText('Vymazat');
    await page.keyboard.press('Escape');

    const mine = await open(page, 'mine');
    await expect(mine.locator('.drp__button--today')).toHaveText('Mine');
    await expect(mine.locator('.drp__button--clear')).toHaveText('Vymazat');

    // assigned while open: the open calendar re-renders (core localeChanged())
    await page.evaluate(() => { (window as any).components.locale = { locale: 'cs-CZ' }; });
    await expect(mine.locator('.drp__button--clear')).toHaveText('Clear');
    await expect(mine.locator('.drp__button--today')).toHaveText('Mine');
});

test('formatLabelCallback formats a label and gets {count} as a raw number', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).components.locale = {
            locale: 'cs-CZ',
            formatLabelCallback: ({ component, key, params }: any) =>
                key === 'selectionCount' ? `${component}:${typeof params.count}:${params.count}` : undefined,
        };
    });
    const p = pickerById(page, 'multi');
    await p.evaluate((el: any) => { el.selectedDates = [new Date(2026, 5, 10), new Date(2026, 5, 12)]; });
    await expect(p.locator('input').first()).toHaveValue('web-daterangepicker:number:2');
});
