import { test, expect } from './fixtures';

/**
 * Phone half of the device-adaptive action-buttons check (see
 * adaptive-actions.spec.ts for the desktop half and the shared rationale).
 *
 * `classifyDevice` is capability-first: it only drops to `mobile` for a
 * touch-primary device (coarse pointer AND no hover) — a narrow *desktop* window
 * stays `desktop`. Playwright device descriptors and CDP `setEmulatedMedia` do NOT
 * flip the pointer/hover CSS media in headless Chromium, but the Blink
 * `primaryPointerType`/`primaryHoverType` launch settings do — so this file runs in
 * its own worker with a coarse, hover-less pointer. (launchOptions can only be set
 * at file top level, hence the separate spec.)
 *
 * Blink enums: PointerType Coarse = 2, HoverType None = 1.
 *
 * Fixture: test/adaptive-actions.html — inline range picker (#adaptive).
 */

test.use({
    launchOptions: {
        args: ['--blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=1,availableHoverTypes=1'],
    },
    viewport: { width: 390, height: 844 }, // shorter side 390 < TABLET_MIN_SHORT_SIDE (600)
});

const PAGE = '/test/adaptive-actions.html';
const buttons = '#adaptive .drp__actions .drp__button';

test('phone (coarse pointer, no hover, < 600px) renders only the essentials', async ({ page }) => {
    await page.goto(PAGE);
    // isTouchPrimary + 390px short side → classifyDevice → 'mobile' → 2 buttons.
    await expect(page.locator(buttons)).toHaveCount(2);
});
