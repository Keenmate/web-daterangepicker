import { test, expect, open, dayByDate } from './fixtures';
import type { ConsoleMessage, Page } from './fixtures';

/**
 * Logging: the core `/logging` category loggers (`DRP:*`) default to `warn`
 * (no debug lines, warnings visible). Debug is turned on through core's logging
 * switches — `window.components['web-daterangepicker'].logging`,
 * `window.components.logging`, or per element `el.enableLogging()`. The old
 * `show-debug-info` attribute is gone.
 *
 * Fixture: test/logging.html.
 */

const PAGE = '/test/logging.html';

/** Collect console output that came from the component's `DRP:*` loggers. */
function captureDrpLogs(page: Page): string[] {
    const lines: string[] = [];
    page.on('console', (m: ConsoleMessage) => {
        if (/DRP/.test(m.text())) lines.push(`${m.type()}: ${m.text()}`);
    });
    return lines;
}

/** Open, pick a range, close — exercises rendering, selection and UI loggers. */
async function interact(page: Page): Promise<void> {
    const p = await open(page, 'picker');
    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-12').click();
    await page.keyboard.press('Escape');
}

test('quiet by default: load + open + select emit no DRP log lines', async ({ page }) => {
    const logs = captureDrpLogs(page);
    await page.goto(PAGE);
    await interact(page);
    expect(logs).toEqual([]);
});

test('the web-daterangepicker logging bundle (window.components) turns the DRP loggers to debug and back', async ({ page }) => {
    const logs = captureDrpLogs(page);
    await page.goto(PAGE);
    await page.evaluate(() => (window as any).components['web-daterangepicker'].logging.enableLogging());
    await interact(page);
    expect(logs.length).toBeGreaterThan(0);

    await page.evaluate(() => (window as any).components['web-daterangepicker'].logging.setLogLevel('warn'));
    logs.length = 0;
    await interact(page);
    expect(logs).toEqual([]);
});

test('the removed show-debug-info attribute has no effect (no debug lines)', async ({ page }) => {
    const logs = captureDrpLogs(page);
    await page.goto(PAGE);
    const p = page.locator('#picker');
    await p.evaluate((el: any) => { el.setAttribute('show-debug-info', ''); return el.whenSettled(); });
    await interact(page);
    expect(logs).toEqual([]);
    expect(await p.evaluate((el: any) => 'showDebugInfo' in el)).toBe(false);
});

test("el.enableLogging() turns on this element's instance logging only", async ({ page }) => {
    await page.goto(PAGE);
    const p = page.locator('#picker');
    expect(await p.evaluate((el: any) => el.isLoggingEnabled)).toBe(false);
    await p.evaluate((el: any) => el.enableLogging());
    expect(await p.evaluate((el: any) => el.isLoggingEnabled)).toBe(true);
    await p.evaluate((el: any) => el.disableLogging());
    expect(await p.evaluate((el: any) => el.isLoggingEnabled)).toBe(false);
});

// Logging alignment with core (default level `warn`, page-wide
// `window.components.logging`): a picker must never silence the bundle.

/** Trigger core's input-validation warning (invalid enum attribute value). */
async function warnInvalid(page: Page): Promise<void> {
    await page.locator('#picker').evaluate((el: any) => { el.setAttribute('selection-mode', 'bogus'); return el.whenSettled(); });
}

test('warnings are visible by default (DRP bundle starts at warn, not silent)', async ({ page }) => {
    const logs = captureDrpLogs(page);
    await page.goto(PAGE);
    await warnInvalid(page);
    expect(logs.some((l) => l.startsWith('warning:') && l.includes('bogus'))).toBe(true);
});

test('building a picker does not override the page-wide window.components.logging switch', async ({ page }) => {
    const logs = captureDrpLogs(page);
    await page.goto(PAGE);
    await page.evaluate(async () => {
        (window as any).components.logging.enableLogging();
        // A picker built AFTER the global enable (its engine used to call disableLogging()).
        const el = document.createElement('web-daterangepicker');
        el.id = 'late';
        document.querySelector('.fixture')!.appendChild(el);
        await (el as any).whenSettled();
    });
    logs.length = 0;
    await interact(page);
    expect(logs.length).toBeGreaterThan(0);   // debug lines (loglevel prints debug via console.log)
});
