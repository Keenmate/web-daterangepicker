import { test, expect, Page, Locator } from './fixtures';

/**
 * Round-out for several smaller features:
 *   - badge tooltip via specialDates.badgeTooltip
 *   - invalid-range error styling (showInvalidRange:true on restore)
 *   - is-unified-header-interactive opens unified rolling selector
 *
 * Fixture: test/misc-features.html
 * (Device-adaptive presentation — mobile-presentation / fullscreen — lives in
 *  e2e/mobile-presentation.spec.ts, which needs per-project device emulation.)
 */

const PAGE = '/test/misc-features.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp__picker');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp__day[data-date="${isoDate}"]`);
}

async function open(page: Page, id: string) {
    const p = pickerById(page, id);
    await p.locator('input').click();
    await expect(calendarOf(p)).toBeVisible();
    return p;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// badge tooltip
// =============================================================================

test('badge tooltip appears on hover of a badge with badgeTooltip text', async ({ page }) => {
    const p = await open(page, 'badge-tip');

    const badge = p.locator('.drp__badge-cell').filter({ hasText: 'B' });
    await expect(badge).toBeVisible();
    await badge.hover();

    // Day-tooltip mechanism is shared with badge tooltips — look for visible
    // tooltip element containing our text.
    const visibleTip = p.locator('.drp__tooltip--visible');
    await expect(visibleTip).toContainText('Special badge tooltip', { timeout: 2000 });
});

// =============================================================================
// invalid-range error styling
// =============================================================================

test('markRangeInvalid() + false keeps the invalid range visible with --invalid-range-start/end classes', async ({ page }) => {
    const p = await open(page, 'invalid-range');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-14').click();

    // The before-select callback restores with showInvalidRange:true, so the
    // rejected range stays visible with the dedicated invalid-* classes.
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--invalid-range-start/);
    await expect(dayByDate(p, '2026-06-14')).toHaveClass(/drp__day--invalid-range-end/);
});

// =============================================================================
// is-unified-header-interactive
// =============================================================================

test('is-unified-header-interactive: clicking the unified range header opens the unified rolling selector', async ({ page }) => {
    const p = await open(page, 'unified-click');

    await p.locator('.drp__unified-range').click();
    await expect(p.locator('.drp__unified-rolling-selector--visible')).toBeVisible();
});
