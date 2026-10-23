import { test, expect, Page, Locator } from './fixtures';

/**
 * Dark / light signals from the page (signal #4) and on the host (signal #5).
 *
 * @keenmate/web-components-core detects data-theme / data-bs-theme / .dark /
 * .light on <html> (then <body>) once per page and mirrors it onto every host
 * as `data-context-theme`; dark-mode.css reads that instead of :host-context(),
 * so these hold in Firefox and WebKit too.
 *
 * Fixture: test/dark-mode.html — #drp-dark-auto has no colour overrides.
 */

const PAGE = '/test/dark-mode.html';
const DARK = { colorScheme: 'dark', lightText: true };
const LIGHT = { colorScheme: 'light', lightText: false };

function autoPicker(page: Page): Locator {
    return page.locator('#drp-dark-auto');
}

/** The host's color-scheme, and whether the input's RESOLVED text colour is light
 *  (dark mode) — a custom property's computed value keeps light-dark() unresolved,
 *  so read a real colour instead. */
async function scheme(host: Locator): Promise<{ colorScheme: string; lightText: boolean }> {
    const colorScheme = await host.evaluate((el) => getComputedStyle(el).colorScheme);
    const color = await host.locator('input').evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return { colorScheme, lightText: (r + g + b) / 3 > 128 };
}

async function open(page: Page): Promise<void> {
    await page.goto(PAGE);
    await expect(autoPicker(page).locator('input')).toBeAttached();
}

const pageSignals: [string, string][] = [
    ['<html data-theme="dark">', `document.documentElement.setAttribute('data-theme', 'dark')`],
    ['<html data-bs-theme="dark">', `document.documentElement.setAttribute('data-bs-theme', 'dark')`],
    ['<html class="dark">', `document.documentElement.classList.add('dark')`],
];

for (const [label, script] of pageSignals) {
    test(`page ${label} flips a picker with no signal of its own to dark`, async ({ page }) => {
        await open(page);
        await page.evaluate(script);
        const host = autoPicker(page);
        await expect(host).toHaveAttribute('data-context-theme', 'dark');
        await expect.poll(() => scheme(host)).toEqual(DARK);
    });
}

test('page data-theme="light" beats an OS set to dark', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await open(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await expect.poll(() => scheme(autoPicker(page))).toEqual(LIGHT);
    await context.close();
});

test('per-instance data-theme="light" wins over a dark page', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const host = autoPicker(page);
    await host.evaluate((el) => el.setAttribute('data-theme', 'light'));
    await expect.poll(() => scheme(host)).toEqual(LIGHT);
});

test('per-instance data-theme="dark" wins over a light page', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    const host = autoPicker(page);
    await host.evaluate((el) => el.setAttribute('data-theme', 'dark'));
    await expect.poll(() => scheme(host)).toEqual(DARK);
});

test('a themed wrapper is followed with theme-source="closest"', async ({ page }) => {
    await open(page);
    const host = autoPicker(page);
    await host.evaluate((el) => {
        el.parentElement!.setAttribute('data-theme', 'dark');
        el.setAttribute('theme-source', 'closest');
    });
    await expect(host).toHaveAttribute('data-context-theme', 'dark');
    await expect.poll(() => scheme(host)).toEqual(DARK);
});
