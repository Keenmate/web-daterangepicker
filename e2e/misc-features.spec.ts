import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, open } from './fixtures';

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

// =============================================================================
// enable-transitions
// =============================================================================

test.describe('enable-transitions', () => {
    test('absent by default: no transitions class on the calendar', async ({ page }) => {
        const p = await open(page, 'no-transitions');
        await expect(calendarOf(p)).not.toHaveClass(/drp__picker--transitions-enabled/);
    });

    test('declared: the calendar carries the transitions class', async ({ page }) => {
        const p = await open(page, 'transitions');
        await expect(calendarOf(p)).toHaveClass(/drp__picker--transitions-enabled/);
    });

    test('toggling the property at runtime adds/removes the class and reflects the attribute', async ({ page }) => {
        const p = pickerById(page, 'no-transitions');
        await p.evaluate((el: any) => { el.enableTransitions = true; return el.whenSettled(); });
        await expect(p).toHaveAttribute('enable-transitions', '');
        await expect(calendarOf(p)).toHaveClass(/drp__picker--transitions-enabled/);
        await p.evaluate((el: any) => { el.enableTransitions = false; return el.whenSettled(); });
        await expect(p).not.toHaveAttribute('enable-transitions');
        await expect(calendarOf(p)).not.toHaveClass(/drp__picker--transitions-enabled/);
    });
});
