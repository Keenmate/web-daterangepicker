import { test, expect, devices } from '@playwright/test';

/**
 * Device-adaptive presentation (SPEC §12.9) on a PHONE. A `floating` picker with
 * `mobile-presentation="auto"` (default) resolves — via core's classifyDevice —
 * to `fullscreen` on a touch-primary device whose shorter viewport side < 600px.
 *
 * Device emulation must be top-level (Playwright forbids test.use in describe).
 * Fixture: test/mobile-presentation.html — a plain floating #picker, no overrides.
 */
test.use({ ...devices['iPhone 13'] });

test('auto → fullscreen: opening shows the edge-to-edge sheet with a close header', async ({ page }) => {
  await page.goto('/test/mobile-presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();

  // Open via the API (Playwright tap emulation is unreliable; real focus/tap works
  // on device — see triggers.spec.ts for open-trigger coverage).
  await host.evaluate(el => (el as any).open());

  const state = await host.evaluate(el => {
    const cal = el.shadowRoot?.querySelector('.drp__picker') ?? null;
    return {
      fullscreen: cal?.classList.contains('drp__picker--fullscreen') ?? false,
      visible: cal?.classList.contains('drp__picker--visible') ?? false,
      hasHeader: !!el.shadowRoot?.querySelector('.drp__fullscreen-header'),
      hasClose: !!el.shadowRoot?.querySelector('.drp__fullscreen-close'),
    };
  });
  expect(state.visible).toBe(true);
  expect(state.fullscreen).toBe(true);
  expect(state.hasHeader).toBe(true);
  expect(state.hasClose).toBe(true);
});

test('the ✕ close button dismisses the full-screen sheet', async ({ page }) => {
  await page.goto('/test/mobile-presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.evaluate(el => (el as any).open());
  await expect(host.locator('.drp__picker')).toHaveClass(/drp__picker--fullscreen/);

  await host.evaluate(el => (el.shadowRoot?.querySelector('.drp__fullscreen-close') as HTMLElement)?.click());
  await expect(host.locator('.drp__picker')).not.toHaveClass(/drp__picker--visible/);
});

test('with no title, the ✕ merges into the month-nav row and stays on top', async ({ page }) => {
  await page.goto('/test/mobile-presentation.html');
  const host = page.locator('#picker'); // no fullscreen-title
  await host.waitFor();
  await host.evaluate(el => (el as any).open());
  await expect(host.locator('.drp__picker')).toHaveClass(/drp__picker--fullscreen/);

  const state = await host.evaluate(el => {
    const sr = el.shadowRoot!;
    const close = sr.querySelector('.drp__fullscreen-close') as HTMLElement;
    const b = close.getBoundingClientRect();
    // Topmost element at the ✕ centre must be the ✕ itself (not the sticky header).
    const topClass = (sr.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2)[0] as HTMLElement)?.className;
    return { merged: !!sr.querySelector('.drp__picker--fs-merged-header'), clickable: topClass?.includes('drp__fullscreen-close') };
  });
  expect(state.merged).toBe(true);      // no own row
  expect(state.clickable).toBe(true);   // ✕ paints above the month header
});

test('fullscreen-input: the trigger input relocates into the header (numeric keypad) and restores on close', async ({ page }) => {
  await page.goto('/test/mobile-presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();

  const opened = await host.evaluate(el => {
    el.setAttribute('fullscreen-input', '');
    (el as any).open();
    const sr = el.shadowRoot!;
    const input = sr.querySelector('input') as HTMLInputElement;
    const header = sr.querySelector('.drp__fullscreen-header');
    return {
      inHeader: !!input && header?.contains(input),
      inputMode: input?.getAttribute('inputmode'),
      hasClass: input?.classList.contains('drp__fullscreen-input'),
      merged: !!sr.querySelector('.drp__picker--fs-merged-header'),
    };
  });
  expect(opened.inHeader).toBe(true);       // relocated into the header
  expect(opened.inputMode).toBe('numeric'); // digits keypad on phones
  expect(opened.hasClass).toBe(true);
  expect(opened.merged).toBe(false);        // input takes the header row → not merged

  const restored = await host.evaluate(el => {
    const sr = el.shadowRoot!;
    (sr.querySelector('.drp__fullscreen-close') as HTMLElement)?.click();
    const input = sr.querySelector('input') as HTMLInputElement;
    // The input lives inside its .drp__input-wrapper; relocation moves the whole
    // wrapper (so the inline ✕ clear travels), so "home" is the wrapper back at the
    // shadow-root top level.
    const wrapper = input?.closest('.drp__input-wrapper');
    return {
      backHome: !!wrapper && wrapper.parentNode === sr, // wrapper top-level again, not in header
      noInputMode: input?.getAttribute('inputmode'),
      noClass: input?.classList.contains('drp__fullscreen-input'),
    };
  });
  expect(restored.backHome).toBe(true);
  expect(restored.noInputMode).toBeNull();
  expect(restored.noClass).toBe(false);
});

test('keyboard-off default: the input is not focused when the sheet opens', async ({ page }) => {
  await page.goto('/test/mobile-presentation.html');
  const host = page.locator('#picker');
  await host.waitFor();
  await host.evaluate(el => (el as any).open());
  const inputIsActive = await host.evaluate(el =>
    el.shadowRoot?.activeElement === el.shadowRoot?.querySelector('input'));
  expect(inputIsActive).toBe(false);
});
