import { test, expect } from './fixtures';

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

  await page.goto('/test/mode-flip.html');
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

// ── selection-mode / picker-mode flip: the input always shows what the selection holds ──

test('range → single flip: the range can not carry over, so the input text is cleared too', async ({ page }) => {
  await page.goto('/test/mode-flip.html');
  const host = page.locator('#flip');
  await host.evaluate((el: any) => { el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 14) }]; });
  await expect(host.locator('input.drp__input')).toHaveValue('2026-06-10 - 2026-06-14');

  await host.evaluate((el: any) => el.setAttribute('selection-mode', 'single'));
  await expect(host.locator('input.drp__input')).toHaveValue('');
  expect(await host.evaluate((el: any) => el.selectedDate)).toBeNull();
  expect(await host.evaluate((el: any) => el.value)).toBe('');
});

test('single → multiple flip: the date carries over, reformatted for multiple mode', async ({ page }) => {
  await page.goto('/test/mode-flip.html');
  const host = page.locator('#flip');
  await host.evaluate((el: any) => el.setAttribute('selection-mode', 'single'));
  await host.evaluate((el: any) => { el.selectedDate = new Date(2026, 5, 10); });
  await expect(host.locator('input.drp__input')).toHaveValue('2026-06-10');

  await host.evaluate((el: any) => el.setAttribute('selection-mode', 'multiple'));
  await expect(host.locator('input.drp__input')).toHaveValue('1 selection(s)');
  const dates = await host.evaluate((el: any) => el.selectedDates.map((d: Date) => d.toDateString()));
  expect(dates).toEqual([new Date(2026, 5, 10).toDateString()]);
});

test('range → multiple flip: the range carries over as one range', async ({ page }) => {
  await page.goto('/test/mode-flip.html');
  const host = page.locator('#flip');
  await host.evaluate((el: any) => { el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 14) }]; });
  await host.evaluate((el: any) => el.setAttribute('selection-mode', 'multiple'));
  await expect(host.locator('input.drp__input')).toHaveValue('1 selection(s)');
  expect(await host.evaluate((el: any) => el.selectedRanges.length)).toBe(1);
});

test('datetime → date flip: the date part carries over and the time is dropped from the text', async ({ page }) => {
  await page.goto('/test/mode-flip.html');
  const host = page.locator('#flip-dt');
  await host.evaluate((el: any) => { el.selectedDatetime = new Date(2026, 5, 10, 14, 30); });
  await expect(host.locator('input.drp__input')).toHaveValue('2026-06-10 14:30');

  await host.evaluate((el: any) => el.setAttribute('picker-mode', 'date'));
  await expect(host.locator('input.drp__input')).toHaveValue('2026-06-10');
  expect(await host.evaluate((el: any) => el.selectedDate?.toDateString())).toBe(new Date(2026, 5, 10).toDateString());
});

test('datetime → time flip keeps the time; date → time clears the stale date text', async ({ page }) => {
  await page.goto('/test/mode-flip.html');
  const dt = page.locator('#flip-dt');
  await dt.evaluate((el: any) => { el.selectedDatetime = new Date(2026, 5, 10, 14, 30); });
  await dt.evaluate((el: any) => el.setAttribute('picker-mode', 'time'));
  await expect(dt.locator('input.drp__input')).toHaveValue('14:30');

  const host = page.locator('#flip');
  await host.evaluate((el: any) => { el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 14) }]; });
  await host.evaluate((el: any) => el.setAttribute('picker-mode', 'time'));
  await expect(host.locator('input.drp__input')).toHaveValue('');
});
