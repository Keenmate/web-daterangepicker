import { test, expect } from '@playwright/test';

/**
 * Device-adaptive presentation (SPEC §12.9) on DESKTOP (fine pointer). `auto`
 * resolves to `floating`; a forced `fullscreen` still applies (the preview path
 * the examples page uses to inspect the phone overlay on a desktop).
 *
 * Fixture: test/mobile-presentation.html — a plain floating #picker, no overrides.
 */

test('auto → floating: no full-screen sheet on a mouse device', async ({ page }) => {
  await page.goto('/test/mobile-presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.evaluate(el => (el as any).open());
  const fullscreen = await host.evaluate(el =>
    el.shadowRoot?.querySelector('.drp__picker')?.classList.contains('drp__picker--fullscreen') ?? false);
  expect(fullscreen).toBe(false);
});

test('forced mobile-presentation="fullscreen" opens full-screen even on desktop', async ({ page }) => {
  await page.goto('/test/mobile-presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.evaluate(el => el.setAttribute('mobile-presentation', 'fullscreen'));
  await host.evaluate(el => (el as any).open());
  await expect(host.locator('.drp__picker')).toHaveClass(/drp__picker--fullscreen/);
});
