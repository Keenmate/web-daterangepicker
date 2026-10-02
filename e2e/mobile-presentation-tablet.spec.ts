import { test, expect, devices } from '@playwright/test';

/**
 * Device-adaptive presentation (SPEC §12.9) on a TABLET. This is the
 * daterangepicker-specific tier: a touch device whose shorter viewport side is
 * ≥ 600px classifies as `tablet`, and our `{ tablet: 'modal' }` override maps that
 * to the centered `modal` dialog (not full-screen, not floating).
 *
 * Device emulation must be top-level (Playwright forbids test.use in describe).
 * Fixture: test/mobile-presentation.html — a plain floating #picker, no overrides.
 */
test.use({ ...devices['iPad (gen 7)'] });

test('auto → modal on a tablet (touch, shorter side ≥ 600px)', async ({ page }) => {
  await page.goto('/test/mobile-presentation.html');
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
  await page.goto('/test/mobile-presentation.html');
  const host = page.locator('#low'); // single mode → would auto-close on a stray day select
  await host.waitFor();
  await host.locator('input').tap();
  await page.waitForTimeout(500);
  const cls = await host.evaluate(el => el.shadowRoot?.querySelector('.drp__picker')?.className || 'NO');
  expect(cls).toContain('drp__picker--visible');
  expect(cls).toContain('drp__picker--modal');
});
