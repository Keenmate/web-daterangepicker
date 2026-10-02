import { test, expect } from '@playwright/test';

/**
 * Touch drag-to-adjust. The drag handlers were converted from mouse events to
 * Pointer Events, so a finger can adjust a range endpoint. Faithful hardware touch
 * (a continuous pointermove stream + implicit capture) can't be reproduced through
 * Playwright/CDP, so this drives the handler pipeline with synthetic PointerEvents
 * carrying `pointerType: 'touch'` at real day-cell coordinates — verifying the
 * touch path is wired end-to-end (gating → drag-detect → preview → commit).
 *
 * Fixture: test/drag-adjust.html (#range pre-seeded to 2026-06-10..2026-06-15).
 */
test.use({ hasTouch: true });

test('touch pointer events on a range endpoint adjust the range', async ({ page }) => {
  await page.goto('/test/drag-adjust.html');
  const host = page.locator('#range');
  await host.waitFor();
  await host.evaluate(el => el.setAttribute('mobile-presentation', 'floating'));
  await host.evaluate(el => (el as any).open());
  await expect(host.locator('.drp__picker')).toHaveClass(/drp__picker--visible/);

  // Collect viewport-center coordinates of the endpoint (06-15) and each day along
  // the path to 06-20, so the synthetic pointermoves land on real day cells.
  const center = async (iso: string) => {
    const box = await host.locator(`.drp__day[data-date="${iso}"]`).boundingBox();
    expect(box, iso).not.toBeNull();
    return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  };
  const from = await center('2026-06-15');
  const path = [];
  for (const iso of ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20']) {
    path.push(await center(iso));
  }

  await host.evaluate((_el, { from, path }) => {
    const sr = (document.querySelector('#range') as any).shadowRoot;
    const startCell = sr.querySelector('.drp__day[data-date="2026-06-15"]') as HTMLElement;
    const opts = (x: number, y: number) =>
      ({ clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', bubbles: true, composed: true, isPrimary: true });
    startCell.dispatchEvent(new PointerEvent('pointerdown', opts(from.x, from.y)));
    document.dispatchEvent(new PointerEvent('pointermove', opts(from.x + 10, from.y))); // cross threshold
    for (const p of path) document.dispatchEvent(new PointerEvent('pointermove', opts(p.x, p.y)));
    const last = path[path.length - 1];
    document.dispatchEvent(new PointerEvent('pointerup', opts(last.x, last.y)));
  }, { from, path });

  // End is async (validateRangeAsync) — poll for the committed value.
  await expect
    .poll(() => host.locator('input').inputValue())
    .toMatch(/^2026-06-10 - 2026-06-20$/);
});
