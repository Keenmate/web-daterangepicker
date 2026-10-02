import { test, expect } from '@playwright/test';

/**
 * Back-gesture trap: while a modal or full-screen sheet is open, the phone Back
 * gesture / browser Back button dismisses the sheet instead of navigating away.
 * Implemented by pushing a same-URL history entry on open; the Back pops it and
 * the popstate handler closes the sheet.
 *
 * Fixture: test/mobile-presentation.html (#picker, forced presentation).
 */
for (const mode of ['modal', 'fullscreen'] as const) {
  test(`${mode}: Back closes the sheet and does not navigate away`, async ({ page }) => {
    await page.goto('/test/mobile-presentation.html');
    const url = page.url();
    const host = page.locator('#picker');
    await host.waitFor();
    await host.evaluate((el, m) => el.setAttribute('mobile-presentation', m), mode);
    await host.evaluate(el => (el as any).open());
    await expect(host.locator('.drp__picker')).toHaveClass(new RegExp(`drp__picker--${mode}`));

    // Simulate the Back gesture.
    await page.evaluate(() => history.back());

    // Sheet closed, and we're still on the same page (didn't pop to the previous entry).
    await expect(host.locator('.drp__picker')).not.toHaveClass(/drp__picker--visible/);
    expect(page.url()).toBe(url);
  });
}
