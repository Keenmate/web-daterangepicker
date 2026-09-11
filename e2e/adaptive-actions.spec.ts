import { test, expect } from './fixtures';

/**
 * Device-adaptive action buttons: the demo page picks its `actionButtons` set from
 * the core environment signal (`observeViewport` + `classifyDevice`, re-exported
 * from @keenmate/web-daterangepicker). classifyDevice is capability-first — a
 * shrunk *desktop* window stays `desktop` — so this file covers the desktop case;
 * the touch/phone case (which needs coarse-pointer emulation) lives in
 * adaptive-actions-phone.spec.ts.
 *
 * Fixture: test/adaptive-actions.html — inline range picker (#adaptive), rich set
 * (6 buttons) on desktop, essentials (2) on phone.
 */

const PAGE = '/test/adaptive-actions.html';
const buttons = '#adaptive .drp__actions .drp__button';

test('desktop (fine pointer) renders the rich action set', async ({ page }) => {
    await page.goto(PAGE);
    // Wide, mouse-driven context → classifyDevice → 'desktop' → 6 buttons.
    await expect(page.locator(buttons)).toHaveCount(6);
});
