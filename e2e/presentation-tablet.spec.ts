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
test.use({ ...devices['iPad (gen 7)'] });

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
