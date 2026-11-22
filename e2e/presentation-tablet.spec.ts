import { test, expect, devices } from './fixtures';

/**
 * Device-adaptive presentation (SPEC §12.9) on a TABLET. This is the
 * daterangepicker-specific tier: a touch device whose shorter viewport side is
 * ≥ 600px classifies as `tablet`, and our `{ tablet: 'modal' }` override maps that
 * to the centered `modal` dialog (not full-screen, not floating).
 *
 * Device emulation must be top-level (Playwright forbids test.use in describe).
 * Fixture: test/presentation.html — a plain floating #picker, no overrides.
 */
// Device preset WITHOUT its `defaultBrowserType: 'webkit'` — the project decides the browser
// (otherwise this file launches WebKit even under --project=chromium).
const { defaultBrowserType: _ignored, ...TABLET } = devices['iPad (gen 7)'];
test.use({ ...TABLET });

// Firefox has no `isMobile` emulation (Playwright refuses the option there).
test.skip(({ browserName }) => browserName === 'firefox', 'isMobile emulation is not supported in Firefox');

test('auto → modal on a tablet (touch, shorter side ≥ 600px)', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.evaluate(el => (el as any).open());

  const state = await host.evaluate(el => {
    const cal = el.shadowRoot?.querySelector('.drp__picker') ?? null;
    return {
      modal: cal?.classList.contains('drp__picker--modal') ?? false,
      fullscreen: cal?.classList.contains('drp__picker--fullscreen') ?? false,
      shortSide: Math.min(window.innerWidth, window.innerHeight),
    };
  });
  expect(state.shortSide).toBeGreaterThanOrEqual(600); // sanity: really a tablet-class viewport
  expect(state.modal).toBe(true);
  expect(state.fullscreen).toBe(false);
});

// Regression: tapping the input opens the modal on pointerdown; the tap's
// synthesized `click` then lands inside the freshly-centered sheet (often a day
// cell). The open-gesture guard must swallow that ghost click so the modal stays
// open instead of selecting a day and single-mode auto-closing.
test('tapping the input opens the modal and it STAYS open (ghost click swallowed)', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#low'); // single mode → would auto-close on a stray day select
  await host.waitFor();
  await host.locator('input').tap();
  await page.waitForTimeout(500);
  const cls = await host.evaluate(el => el.shadowRoot?.querySelector('.drp__picker')?.className || 'NO');
  expect(cls).toContain('drp__picker--visible');
  expect(cls).toContain('drp__picker--modal');
});

// Regression (core claimBackEntry, rulebook C-RO-15): closing the modal — programmatically or
// with Back — used to jump the page to the top (its Back entry was pushed while scroll-locked).
test('closing the modal (close(), then Back) keeps the page scrolled where it was', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '1500px';
    document.body.prepend(spacer);
    document.body.style.minHeight = '4000px';
  });
  await host.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
  const before = await scrollY();
  expect(before).toBeGreaterThan(1000);

  await host.evaluate(el => (el as any).open());
  await expect(host.locator('.drp__picker')).toHaveClass(/drp__picker--modal/);
  await host.evaluate(el => (el as any).close());
  await expect(host.locator('.drp__picker')).not.toHaveClass(/drp__picker--visible/);
  await page.waitForTimeout(300); // the deferred history.back() and its traversal
  expect(await scrollY()).toBe(before);

  await host.evaluate(el => (el as any).open());
  await expect(host.locator('.drp__picker')).toHaveClass(/drp__picker--modal/);
  await page.evaluate(() => history.back());
  await expect(host.locator('.drp__picker')).not.toHaveClass(/drp__picker--visible/);
  await page.waitForTimeout(300);
  expect(await scrollY()).toBe(before);
});

// The modal is a core modal session (SPEC §12.19 of core): the page behind is inert, Tab stays
// in the calendar, Escape closes it and a keyboard open hands focus back to the input.
test('modal: the page behind is inert, Tab stays inside, Escape closes and focus returns to the input', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.locator('input').focus();
  const cal = host.locator('.drp__picker');
  await expect(cal).toHaveClass(/drp__picker--modal/);
  await expect(cal).toHaveAttribute('aria-modal', 'true');
  expect(await page.locator('h1').evaluate(el => el.closest('[inert]') !== null)).toBe(true);

  const focusInCalendar = () => host.evaluate(el => {
    const a = el.shadowRoot!.activeElement;
    return !!a && !!el.shadowRoot!.querySelector('.drp__picker')!.contains(a);
  });
  expect(await focusInCalendar()).toBe(true);
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await focusInCalendar()).toBe(true);

  await page.keyboard.press('Escape');
  await expect(cal).not.toHaveClass(/drp__picker--visible/);
  expect(await page.locator('h1').evaluate(el => el.closest('[inert]') !== null)).toBe(false);
  expect(await host.evaluate(el => el.shadowRoot!.activeElement?.tagName)).toBe('INPUT');
});

test('modal: a backdrop tap closes it and releases the page', async ({ page }) => {
  await page.goto('/test/presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.locator('input').tap();
  const cal = host.locator('.drp__picker');
  await expect(cal).toHaveClass(/drp__picker--modal/);
  await page.waitForTimeout(100);
  await page.touchscreen.tap(10, 10); // the backdrop covers the viewport
  await expect(cal).not.toHaveClass(/drp__picker--visible/);
  expect(await page.locator('h1').evaluate(el => el.closest('[inert]') !== null)).toBe(false);
  await expect(host.locator('.drp__backdrop')).not.toHaveClass(/drp__backdrop--visible/);
});
