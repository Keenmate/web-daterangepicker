import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, open } from './fixtures';

/**
 * Round-out for several smaller features:
 *   - badge tooltip via specialDates.badgeTooltip
 *   - invalid-range error styling (showInvalidRange:true on restore)
 *   - unified-header-interactive opens unified rolling selector
 *
 * Fixture: test/misc-features.html
 * (Device-adaptive `presentation` — modal / fullscreen — lives in
 *  e2e/presentation-*.spec.ts, which needs per-project device emulation.)
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
// unified-header-interactive
// =============================================================================

test('unified-header-interactive: clicking the unified range header opens the unified rolling selector', async ({ page }) => {
    const p = await open(page, 'unified-click');

    await p.locator('.drp__unified-range').click();
    await expect(p.locator('.drp__unified-rolling-selector--visible')).toBeVisible();
});

// =============================================================================
// motion — CSS only, no attribute
// =============================================================================

test.describe('motion', () => {
    const inputDuration = (p: Locator) =>
        p.locator('.drp__input').evaluate((el) => getComputedStyle(el).transitionDuration);

    test('on by default, timed by the contract speed (normal = 0.15s)', async ({ page }) => {
        const p = pickerById(page, 'motion');
        expect(await inputDuration(p)).toBe('0.15s, 0.15s');
    });

    test('--drp-transition-normal: 0s turns it off', async ({ page }) => {
        const p = pickerById(page, 'motion');
        await p.evaluate((el: HTMLElement) => el.style.setProperty('--drp-transition-normal', '0s'));
        expect(await inputDuration(p)).toBe('0s, 0s');
    });

    test('prefers-reduced-motion: transitions 0s, scrolling instant', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const p = pickerById(page, 'motion');
        expect(await inputDuration(p)).toBe('0s, 0s');
        expect(await p.evaluate((el) => getComputedStyle(el).getPropertyValue('--drp-scroll-behavior').trim())).toBe('auto');
    });

    test('the enable-transition attribute is gone', async ({ page }) => {
        const p = pickerById(page, 'motion');
        expect(await p.evaluate((el: any) => 'isTransitionEnabled' in el)).toBe(false);
    });
});
