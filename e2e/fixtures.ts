/**
 * Shared Playwright test fixtures for the web-daterangepicker e2e suite.
 *
 * Import `test` / `expect` (and the shared helpers) from here instead of
 * `@playwright/test`. Two always-on additions:
 *
 * 1. **Pinned clock** — `page.clock.setFixedTime(FIXED_TODAY)` so "today"
 *    highlights, the Today button and `t` are deterministic.
 * 2. **pageerror guard** (copied from web-multiselect) — fails any test in
 *    which the page threw an uncaught error, unless the test consumed the
 *    entries it expects:
 *
 *        test('...', async ({ page, pageErrors }) => {
 *            // ...trigger the expected throw...
 *            expect(pageErrors).toHaveLength(1);
 *            pageErrors.length = 0; // consumed → the guard passes
 *        });
 *
 * The listener attaches during fixture setup — before the test body's first
 * `page.goto` — so it catches load-time and init-script errors too.
 */
import { test as base, expect } from '@playwright/test';

export * from '@playwright/test';
export * from './helpers';

/** The pinned "now" every test runs at (a Friday). */
export const FIXED_TODAY = new Date('2026-05-22T10:00:00');

export const test = base.extend<{ pageErrors: string[] }>({
    page: async ({ page }, use) => {
        await page.clock.setFixedTime(FIXED_TODAY);
        await use(page);
    },
    pageErrors: [
        async ({ page }, use, testInfo) => {
            const errors: string[] = [];
            page.on('pageerror', (e) => errors.push(e.message ?? String(e)));

            await use(errors);

            // Only enforce when the test otherwise passed — don't bury a more
            // specific failure (or an expected-to-fail test) under this one.
            if (errors.length > 0 && testInfo.status === testInfo.expectedStatus) {
                expect(errors, 'uncaught page error(s) during test').toEqual([]);
            }
        },
        { auto: true }
    ]
});

export { expect };
