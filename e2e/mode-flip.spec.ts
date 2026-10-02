import { test, expect } from '@playwright/test';

/**
 * Regression: a positioning-mode flip (as the environment auto-modal switch does)
 * destroys + rebuilds the picker while its input element is reused. The destroyed
 * picker must not leave zombie input listeners or a live autoUpdate anchor behind,
 * or re-triggering the input reopens the dead floating picker and emits a spurious
 * "Calendar rendered … away" drift warning against its detached calendar.
 */
test('positioning-mode flip leaves no zombie floating picker on the reused input', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', m => {
    if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text());
  });

  await page.goto('/test/anchor-stability.html');
  const host = page.locator('#picker');
  await host.waitFor();

  // Environment-style flip while CLOSED (as the connect-time auto-modal switch
  // does): destroy() the freshly built floating picker + rebuild as modal. The
  // destroyed picker never opened, so a leaked listener's open() would NOT early
  // return on a stale --visible class — it proceeds and anchors a detached calendar.
  await host.evaluate(el => el.setAttribute('positioning-mode', 'modal'));
  await expect
    .poll(() => host.evaluate(el => el.getAttribute('positioning-mode')))
    .toBe('modal');

  // Trigger the input. Only the live modal picker should respond; a leaked listener
  // from the destroyed floating picker would fire open() on its detached calendar
  // and drift.
  await host.locator('input').click();
  await page.waitForTimeout(800);

  const drift = warnings.filter(w => w.includes('Calendar rendered'));
  expect(drift, `unexpected drift warning(s):\n${drift.join('\n')}`).toHaveLength(0);

  // The picker that opened must be the modal one, not a resurrected floating one.
  const opened = await host.evaluate(el => {
    const cal = el.shadowRoot?.querySelector('.drp__picker--visible');
    return cal ? cal.classList.contains('drp__picker--modal') : 'none-visible';
  });
  expect(opened).toBe(true);
});
