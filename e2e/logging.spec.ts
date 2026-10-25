import { test, expect, open, dayByDate } from './fixtures';
import type { ConsoleMessage, Page } from './fixtures';

/**
 * Logging: the core `/logging` category loggers (`DRP:*`) default to `warn`
 * (no debug lines, warnings visible); `show-debug-info` turns debug on (and back
 * to `warn` when removed).
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

test('show-debug-info enables the DRP loggers; removing it drops the debug lines again', async ({ page }) => {
    const logs = captureDrpLogs(page);
    await page.goto(PAGE);
    const p = page.locator('#picker');
    await p.evaluate((el: any) => { el.setAttribute('show-debug-info', ''); return el.whenSettled(); });
    await interact(page);
    expect(logs.length).toBeGreaterThan(0);

    await p.evaluate((el: any) => { el.removeAttribute('show-debug-info'); return el.whenSettled(); });
    logs.length = 0;
    await interact(page);
    expect(logs).toEqual([]);
});

// Logging alignment with core (default level `warn`, page-wide
// `window.components.logging`): show-debug-info may turn debug ON, but a picker
// without it must never silence the bundle.

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

test('turning show-debug-info off goes back to warn — warnings still show', async ({ page }) => {
    const logs = captureDrpLogs(page);
    await page.goto(PAGE);
    const p = page.locator('#picker');
    await p.evaluate((el: any) => { el.setAttribute('show-debug-info', ''); return el.whenSettled(); });
    await p.evaluate((el: any) => { el.removeAttribute('show-debug-info'); return el.whenSettled(); });
    logs.length = 0;
    await warnInvalid(page);
    expect(logs.some((l) => l.startsWith('warning:') && l.includes('bogus'))).toBe(true);
});

test('a picker without show-debug-info does not override the page-wide window.components.logging switch', async ({ page }) => {
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
