import { test, expect, pickerById, inputOf, dayByDate } from './fixtures';

/**
 * Unset `date-format-mask` = the locale's own format through core `/locale`
 * (`resolveLocaleSettings().dateFormat`): the page-wide `window.components.locale.dateFormat`
 * when set, else derived from `Intl` for the effective locale. An explicit mask always
 * wins; the submitted value stays ISO; a locale change re-writes the shown text.
 *
 * Fixture: test/locale-date-format.html
 */

const PAGE = '/test/locale-date-format.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

const valueOf = (page: import('@playwright/test').Page, id: string) =>
    page.evaluate((i) => (document.getElementById(i) as any).value, id);

test('locale="cs" shows the Czech format (DD. MM. YYYY), the value stays ISO', async ({ page }) => {
    const p = pickerById(page, 'cs');
    await expect(inputOf(p)).toHaveValue('17. 11. 2026');
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'DD. MM. YYYY');
    expect(await valueOf(page, 'cs')).toBe('2026-11-17');
});

test('locale="en-US" shows MM/DD/YYYY, en-GB DD/MM/YYYY', async ({ page }) => {
    await expect(inputOf(pickerById(page, 'us'))).toHaveValue('11/17/2026');
    await expect(inputOf(pickerById(page, 'us'))).toHaveAttribute('placeholder', 'MM/DD/YYYY');
    await expect(inputOf(pickerById(page, 'gb'))).toHaveValue('17/11/2026');
    expect(await valueOf(page, 'us')).toBe('2026-11-17');
});

test('range: locale="de" shows DD.MM.YYYY on both ends', async ({ page }) => {
    await expect(inputOf(pickerById(page, 'de-range'))).toHaveValue('17.11.2026 - 20.11.2026');
    await expect(inputOf(pickerById(page, 'de-range'))).toHaveAttribute('placeholder', 'DD.MM.YYYY - DD.MM.YYYY');
});

test('datetime: the derived date mask + the time', async ({ page }) => {
    await expect(inputOf(pickerById(page, 'cs-datetime'))).toHaveValue('17. 11. 2026 14:30');
    // the displayed form reads back through the value property
    await page.evaluate(() => { (document.getElementById('cs-datetime') as any).value = '18. 11. 2026 09:15'; });
    await expect(inputOf(pickerById(page, 'cs-datetime'))).toHaveValue('18. 11. 2026 09:15');
});

test('an explicit date-format-mask wins over the locale', async ({ page }) => {
    await expect(inputOf(pickerById(page, 'explicit'))).toHaveValue('2026-11-17');
    // also over a page-wide dateFormat
    await page.evaluate(() => {
        const w = window as any;
        w.components = w.components || {};
        w.components.locale = { dateFormat: 'DD/MM/YYYY' };
    });
    await expect(inputOf(pickerById(page, 'cs'))).toHaveValue('17/11/2026');
    await expect(inputOf(pickerById(page, 'explicit'))).toHaveValue('2026-11-17');
});

test('a page-wide dateFormat is used by every picker without its own mask', async ({ page }) => {
    await page.evaluate(() => {
        const w = window as any;
        w.components = w.components || {};
        w.components.locale = { dateFormat: 'YYYY/MM/DD' };
    });
    await expect(inputOf(pickerById(page, 'cs'))).toHaveValue('2026/11/17');
    await expect(inputOf(pickerById(page, 'us'))).toHaveValue('2026/11/17');
    await expect(inputOf(pickerById(page, 'de-range'))).toHaveValue('2026/11/17 - 2026/11/20');
    await expect(inputOf(pickerById(page, 'us'))).toHaveAttribute('placeholder', 'YYYY/MM/DD');
    // cleared again → back to the locale's own format
    await page.evaluate(() => { (window as any).components.locale = {}; });
    await expect(inputOf(pickerById(page, 'cs'))).toHaveValue('17. 11. 2026');
});

test('a locale change re-writes the shown text in the new format', async ({ page }) => {
    const input = inputOf(pickerById(page, 'cs'));
    await page.evaluate(() => { (document.getElementById('cs') as any).locale = 'en-US'; });
    await expect(input).toHaveValue('11/17/2026');
    await expect(input).toHaveAttribute('placeholder', 'MM/DD/YYYY');
    await page.evaluate(() => { document.getElementById('cs')!.setAttribute('locale', 'en-GB'); });
    await expect(input).toHaveValue('17/11/2026');
    expect(await valueOf(page, 'cs')).toBe('2026-11-17');
});

test('typing in the derived MM/DD/YYYY format parses (en-US)', async ({ page }) => {
    const input = inputOf(pickerById(page, 'typing'));
    await input.click();
    await input.pressSequentially('11172026');
    await expect(input).toHaveValue('11/17/2026');
    await expect(dayByDate(pickerById(page, 'typing'), '2026-11-17')).toHaveClass(/drp__day--selected/);
});

for (const [locale, typed, shown] of [
    ['cs', '17112026', '17. 11. 2026'],
    ['sk', '17112026', '17. 11. 2026'],
    ['de', '17112026', '17.11.2026'],
    ['hr', '17112026', '17. 11. 2026.'],
    ['ko', '20261117', '2026. 11. 17.'],
    ['nl', '17112026', '17-11-2026'],
] as const) {
    test(`typing in the derived format round-trips (${locale})`, async ({ page }) => {
        await page.evaluate((l) => { (document.getElementById('typing') as any).locale = l; }, locale);
        const input = inputOf(pickerById(page, 'typing'));
        await input.click();
        await input.pressSequentially(typed);
        await expect(input).toHaveValue(shown);
        await expect(dayByDate(pickerById(page, 'typing'), '2026-11-17')).toHaveClass(/drp__day--selected/);
        // the shown text reads back through the value property (displayed form accepted)
        await page.evaluate((t) => { (document.getElementById('typing') as any).value = t; }, shown);
        await expect.poll(() => valueOf(page, 'typing')).toBe('2026-11-17');
        await expect(input).toHaveValue(shown);
    });
}

test('typing the separator key auto-pads in a "DD. MM. YYYY" mask (cs)', async ({ page }) => {
    await page.evaluate(() => { (document.getElementById('typing') as any).locale = 'cs'; });
    const input = inputOf(pickerById(page, 'typing'));
    await input.click();
    await input.pressSequentially('7.1.2026');
    await expect(input).toHaveValue('07. 01. 2026');
    await expect(dayByDate(pickerById(page, 'typing'), '2026-01-07')).toHaveClass(/drp__day--selected/);
});

test('typing a range in the derived cs format parses both ends', async ({ page }) => {
    const input = inputOf(pickerById(page, 'typing-range'));
    await input.click();
    await input.pressSequentially('1711202620112026');
    await expect(input).toHaveValue('17. 11. 2026 - 20. 11. 2026');
    await expect.poll(() => valueOf(page, 'typing-range')).toBe('2026-11-17/2026-11-20');
});
