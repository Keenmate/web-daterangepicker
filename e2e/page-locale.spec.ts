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

// Page-wide labels (core /locale createLabels): instance `labels` → the flat window.components.locale.labels['web-daterangepicker.<key>'] → English.
test('page-wide labels apply live; the instance labels win key by key', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).components.locale = { locale: 'cs-CZ', labels: { 'web-daterangepicker.buttons.today': 'Dnes', 'web-daterangepicker.buttons.clear': 'Vymazat' } };
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

test('translateCallback formats a label and gets the context raw (params.ctx.count a number)', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).components.locale = {
            locale: 'cs-CZ',
            translateCallback: ({ component, key, params }: any) =>
                key === 'web-daterangepicker.labels.selectionCount' ? `${component}:${typeof params.ctx.count}:${params.ctx.count}:${params.ctx.dateCount}:${params.ctx.rangeCount}` : undefined,
        };
    });
    const p = pickerById(page, 'multi');
    await p.evaluate((el: any) => { el.selectedDates = [new Date(2026, 5, 10), new Date(2026, 5, 12)]; });
    await expect(p.locator('input').first()).toHaveValue('web-daterangepicker:number:2:2:0');
});

// The element's own translateCallback (core createLabels reads host.translateCallback): asked before the page-wide
// one; `null` passes the key on; the instance `labels` beat both. A change re-renders the labels.
test('the element translateCallback beats the page one; null passes on; instance labels win', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).components.locale = {
            locale: 'cs-CZ',
            translateCallback: ({ key }: any) => key.startsWith('web-daterangepicker.buttons.') ? `Page:${key.slice(20)}` : undefined,
        };
    });
    const el = pickerById(page, 'mine');
    // null for everything → the page callback decides; buttons.today is the instance labels' (Mine)
    await el.evaluate((e: any) => { e.translateCallback = () => null; return e.whenSettled(); });
    const p = await open(page, 'mine');
    await expect(p.locator('.drp__button--clear')).toHaveText('Page:buttons.clear');
    await expect(p.locator('.drp__button--today')).toHaveText('Mine');

    // the element answers buttons.clear (and buttons.today — never asked, the instance set it): it wins, live
    await el.evaluate((e: any) => {
        e.translateCallback = ({ component, key }: any) =>
            key === `${component}.buttons.clear` || key === `${component}.buttons.today` ? 'Element' : null;
        return e.whenSettled();
    });
    await expect(p.locator('.drp__button--clear')).toHaveText('Element');
    await expect(p.locator('.drp__button--today')).toHaveText('Mine');
});

// A callback context's ctx.labels is core createLabelsView: only { text, html } over the full chain — the element's
// translateCallback, the page-wide one, numbers locale-formatted (cs-CZ), the instance labels win.
test('renderSummaryCallback ctx.labels: element + page translateCallback, locale numbers, instance labels win', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).components.locale = {
            locale: 'cs-CZ',
            translateCallback: ({ key, params }: any) => key === 'web-daterangepicker.labels.nights' ? `Page ${params.ctx.count} nocí` : undefined,
        };
    });
    const el = pickerById(page, 'summary');
    await el.evaluate((e: any) => {
        e.translateCallback = ({ key, params }: any) => key === 'web-daterangepicker.labels.days' ? `Element ${params.ctx.count} dní` : null;
        e.renderSummaryCallback = (ctx: any) => {
            (window as any).__labelsKeys = Object.keys(ctx.labels).sort();
            (window as any).__labelsFrozen = Object.isFrozen(ctx.labels);
            return `<span class="x-days">${ctx.labels.html('labels.days', { ctx: { ...ctx, count: ctx.days } })}</span>`
                + `<span class="x-nights">${ctx.labels.html('labels.nights', { ctx: { ...ctx, count: ctx.nights } })}</span>`
                + `<span class="x-count">${ctx.labels.text('labels.selectionCount', { ctx: { count: 1500 } })}</span>`;
        };
        return e.whenSettled();
    });
    const p = await open(page, 'summary');
    await p.locator('.drp__day[data-date="2026-06-10"]').click();
    await p.locator('.drp__day[data-date="2026-06-13"]').click();
    const summary = p.locator('.drp__summary');
    await expect(summary.locator('.x-days')).toHaveText('Element 4 dní');
    await expect(summary.locator('.x-nights')).toHaveText('Page 3 nocí');
    // the default {ctx.count} formatting goes through the locale (cs-CZ groups with a (narrow) no-break space)
    await expect(summary.locator('.x-count')).toHaveText(/^1\s500 selected$/);
    expect(await page.evaluate(() => (window as any).__labelsKeys)).toEqual(['html', 'text']);
    expect(await page.evaluate(() => (window as any).__labelsFrozen)).toBe(true);

    // the instance labels win over both callbacks
    await el.evaluate((e: any) => { e.labels = { 'labels.days': 'Mine {ctx.count}' }; return e.whenSettled(); });
    await el.evaluate((e: any) => e.open());
    await expect(summary.locator('.x-days')).toHaveText('Mine 4');
    await expect(summary.locator('.x-nights')).toHaveText('Page 3 nocí');
});

// C-CA-38: `locale` is unset by default (null), `'auto'` is the same as unset (core resolveLocale), and an
// unset element follows window.components.locale.locale — also after its own locale is cleared again.
test('locale: unset (null) by default, "auto" = unset, both follow the page locale', async ({ page }) => {
    const el = pickerById(page, 'page');
    expect(await el.evaluate((e: any) => e.locale)).toBeNull();
    expect(await el.evaluate((e: any) => e.hasAttribute('locale'))).toBe(false);

    const auto = await open(page, 'auto-attr');
    await expect(auto.locator('.drp__month-year').first()).toContainText(/červen/i);
    await page.keyboard.press('Escape');

    // own locale wins; clearing it (null) falls back to the page again
    await el.evaluate((e: any) => { e.locale = 'de'; return e.whenSettled(); });
    let p = await open(page, 'page');
    await expect(p.locator('.drp__month-year').first()).toContainText('Juni 2026');
    await page.keyboard.press('Escape');
    await el.evaluate((e: any) => { e.locale = null; return e.whenSettled(); });
    expect(await el.evaluate((e: any) => e.locale)).toBeNull();
    p = await open(page, 'page');
    await expect(p.locator('.drp__month-year').first()).toContainText(/červen/i);
});
