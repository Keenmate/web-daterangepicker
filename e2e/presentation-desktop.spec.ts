import { test, expect } from './fixtures';

/**
 * Device-adaptive presentation (SPEC §12.9) on DESKTOP (fine pointer). `auto`
 * resolves to `floating`; a forced `fullscreen` still applies (the preview path
 * the examples page uses to inspect the phone overlay on a desktop).
 *
 * Fixture: test/presentation.html — a plain floating #picker, no overrides.
 */

test('auto → floating: no full-screen sheet on a mouse device', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.evaluate(el => (el as any).open());
  const fullscreen = await host.evaluate(el =>
    el.shadowRoot?.querySelector('.drp__picker')?.classList.contains('drp__picker--fullscreen') ?? false);
  expect(fullscreen).toBe(false);
});

test('forced presentation="fullscreen" opens full-screen even on desktop', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.evaluate(el => el.setAttribute('presentation', 'fullscreen'));
  await host.evaluate(el => (el as any).open());
  await expect(host.locator('.drp__picker')).toHaveClass(/drp__picker--fullscreen/);
});

// ── responsive rules (core SPEC §6.7) driving `presentation` ─────────────────

const openClass = (host: import('@playwright/test').Locator) =>
  host.evaluate(async (el: any) => {
    await el.whenSettled();
    el.open();
    return el.shadowRoot?.querySelector('.drp__picker')?.className ?? '';
  });

test('instance responsive map: { desktop: { presentation: "modal" } } opens the modal, never reflects', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.evaluate((el: any) => { el.responsive = { desktop: { presentation: 'modal' } }; });
  expect(await openClass(host)).toContain('drp__picker--modal');
  expect(await host.evaluate((el: any) => el.presentation)).toBe('modal');
  expect(await host.evaluate(el => el.getAttribute('presentation'))).toBeNull();
});

test('instance responsiveCallback receives the device class and its result applies', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  const seen = await host.evaluate(async (el: any) => {
    let cls = '';
    el.responsiveCallback = (ctx: any) => { cls = ctx.deviceClass; return ctx.deviceClass === 'desktop' ? { presentation: 'fullscreen' } : undefined; };
    await el.whenSettled();
    return cls;
  });
  expect(seen).toBe('desktop');
  expect(await openClass(host)).toContain('drp__picker--fullscreen');
});

test('per-tag page rule applies, but an explicit presentation attribute on an instance wins', async ({ page }) => {
  await page.goto('/test/presentation.html');
  await page.locator('#picker').waitFor();
  await page.evaluate(() => {
    (window as any).components['web-daterangepicker'].responsive = { desktop: { presentation: 'modal' } };
    const explicit = document.createElement('web-daterangepicker');
    explicit.id = 'explicit';
    explicit.setAttribute('presentation', 'floating');
    document.body.prepend(explicit);
  });
  expect(await openClass(page.locator('#picker'))).toContain('drp__picker--modal');
  await page.locator('#picker').evaluate((el: any) => el.close());
  const explicitCls = await openClass(page.locator('#explicit'));
  expect(explicitCls).not.toContain('drp__picker--modal');
  expect(explicitCls).not.toContain('drp__picker--fullscreen');
});
