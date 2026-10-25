import { test, expect, open, dayByDate } from './fixtures';
import type { ConsoleMessage, Page } from './fixtures';

/**
 * Logging: the core `/logging` category loggers (`DRP:*`) are silent by
 * default; `show-debug-info` turns them on (and off again).
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

test('silent by default: load + open + select emit no DRP log lines', async ({ page }) => {
    const logs = captureDrpLogs(page);
    await page.goto(PAGE);
    await interact(page);
    expect(logs).toEqual([]);
});

test('show-debug-info enables the DRP loggers; removing it silences them again', async ({ page }) => {
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
