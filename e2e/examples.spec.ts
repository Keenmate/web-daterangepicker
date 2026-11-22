import { test, expect } from './fixtures';

/**
 * Smoke test for the example pages — the ONLY spec allowed to open an examples-*.html page
 * (every other spec targets a fixture under test/). Short on purpose: the page loads without
 * console errors and each toggle changes the text its readout box shows.
 */

test.describe('examples-localization.html', () => {
    test('loads clean; every toggle changes its readout', async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
        await page.goto('/examples-localization.html');

        const out = (id: string) => page.locator(`#${id}`);

        // LO01 · instance labels (short + full key); the neighbour stays English
        await expect(out('lo01-out')).toContainText('#lo01        buttons: Dnes / Vymazat');
        await expect(out('lo01-out')).toContainText('#lo01-plain  buttons: Today / Clear');
        await page.locator('#lo01-labels').uncheck();
        await expect(out('lo01-out')).toContainText('#lo01        buttons: Today / Clear');

        // LO08 · page dictionary; LO01's instance key still wins
        await page.locator('#lo08-dict').check();
        await expect(out('lo08-out')).toContainText('Dní: 5');
        await expect(out('lo08-out')).toContainText('time caption: Čas');
        await page.locator('#lo08-dict').uncheck();
        await expect(out('lo08-out')).toContainText('Days: 5');

        // LO09 · own callback first, null → page callback; instance labels win
        await page.locator('#lo09-page').check();
        await expect(out('lo09-out')).toContainText('#lo09a  buttons: Dnes / Vymazať');
        await page.locator('#lo09-own').check();
        await expect(out('lo09-out')).toContainText('#lo09a  buttons: Heute / Vymazať');
        await expect(out('lo09-out')).toContainText('#lo09b  buttons: Instance wins / Vymazať');
        await page.locator('#lo09-own').uncheck();
        await page.locator('#lo09-page').uncheck();

        // LO10 · the ✕ aria-label follows buttons.clear
        await expect(out('lo10-out')).toHaveText('aria-label: Clear');
        await page.locator('#lo10-clear').check();
        await expect(out('lo10-out')).toHaveText('aria-label: Vymazat');

        // LO11 · page locale → shown date format, month name, week start; locale="fr" ignores the page
        await page.locator('input[name="lo11-locale"][value="de-DE"]').check();
        await expect(out('lo11-out')).toContainText(/page\s+shown: 15\.06\.2026\s+month: Juni 2026\s+week starts: Mo/);
        await page.locator('input[name="lo11-locale"][value="en-US"]').check();
        await expect(out('lo11-out')).toContainText(/page\s+shown: 06\/15\/2026\s+month: June 2026\s+week starts: Su/);
        await expect(out('lo11-out')).toContainText(/locale="fr"\s+shown: 15\/06\/2026/);
        // the element locale toggle: de → its own; unset → follows the page (en-US)
        await page.locator('input[name="lo11-element"][value="de"]').check();
        await expect(out('lo11-out')).toContainText(/locale="de"\s+shown: 15\.06\.2026\s+month: Juni 2026/);
        await page.locator('input[name="lo11-element"][value=""]').check();
        await expect(out('lo11-out')).toContainText(/locale unset\s+shown: 06\/15\/2026\s+month: June 2026/);

        // LO12 · shouldEscapeLabels: template markup → text
        await expect(out('lo12-out')).toContainText('markup: <b>5</b> days');
        await page.locator('#lo12-escape').check();
        await expect(out('lo12-out')).toContainText('text:   <b>5</b> days');

        expect(consoleErrors).toEqual([]);
    });
});
