import { test, expect, Page, Locator, pickerById, calendarOf } from './fixtures';

/**
 * v2.0.0-rc02 scoped read-only lock — lock() / unlock() / toggleLock(), the
 * `readonly` attribute, and per-aspect gating (selection / navigation / actions /
 * open). Also verifies that a lock freezes the END USER only: the programmatic
 * API stays live while locked.
 *
 * Fixture: test/lock.html — an inline range picker (#lockpick, two months, Apply +
 * Clear shown) and a floating picker (#floatpick) for the 'open' aspect.
 */

const PAGE = '/test/lock.html';

function enabledDays(p: Locator) {
    return p.locator('.drp__day:not(.drp__day--disabled):not(.drp__day--other-month)');
}
function selectedCells(p: Locator) {
    return p.locator('.drp__day--range-start, .drp__day--range-end, .drp__day--selected');
}
function rangesOf(p: Locator) {
    // Format in LOCAL time — the stored Dates are local midnight, so toISOString()
    // would roll a day in tz offsets ahead of UTC.
    return p.evaluate((el: any) => {
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return (el.selectedRanges || []).map((r: any) => ({ start: fmt(r.start), end: fmt(r.end) }));
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(calendarOf(pickerById(page, 'lockpick'))).toBeVisible();
});

// =============================================================================
// selection aspect
// =============================================================================

test('lock() freezes day selection; unlock() restores it', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => el.lock());
    await enabledDays(p).nth(3).click();
    await enabledDays(p).nth(8).click();
    await expect(selectedCells(p)).toHaveCount(0);
    expect(await rangesOf(p)).toEqual([]);

    await p.evaluate((el: any) => el.unlock());
    await enabledDays(p).nth(3).click();
    await enabledDays(p).nth(8).click();
    await expect(selectedCells(p)).not.toHaveCount(0);
});

test('lock(["selection","actions"]) freezes the range but keeps < > navigation live', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => el.lock(['selection', 'actions']));

    // Selection frozen.
    await enabledDays(p).nth(4).click();
    await expect(selectedCells(p)).toHaveCount(0);

    // Navigation still works — advance the first column's month.
    await expect(p.locator('.drp__month-year').first()).toContainText(/June\s+2026/);
    await p.locator('.drp__nav--next[data-month-index="0"]').click();
    await expect(p.locator('.drp__month-year').first()).toContainText(/July\s+2026/);

    expect(await p.evaluate((el: any) => el.lockedAspects.sort())).toEqual(['actions', 'selection']);
});

// =============================================================================
// navigation aspect
// =============================================================================

test('lock("navigation") blocks the < > nav buttons', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => el.lock('navigation'));

    await expect(p.locator('.drp__month-year').first()).toContainText(/June\s+2026/);
    // Nav buttons are pointer-events:none while locked — dispatch the click directly
    // to prove the JS guard (not just the CSS) drops it.
    await p.locator('.drp__nav--next[data-month-index="0"]').dispatchEvent('click');
    // Header unchanged — navigation was frozen.
    await expect(p.locator('.drp__month-year').first()).toContainText(/June\s+2026/);

    // Selection is NOT locked, so a day click still commits.
    await enabledDays(p).nth(3).click();
    await enabledDays(p).nth(8).click();
    await expect(selectedCells(p)).not.toHaveCount(0);
});

test('lock("navigation") blocks the rolling year/month selector from opening', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => el.lock('navigation'));
    await p.locator('.drp__month-year').first().dispatchEvent('click');
    await expect(p.locator('.drp__rolling-selector--visible')).toHaveCount(0);
});

// =============================================================================
// actions aspect
// =============================================================================

test('lock("actions") makes the action buttons non-interactive (pointer-events: none)', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => el.lock('actions'));

    await expect(calendarOf(p)).toHaveClass(/drp__picker--locked-actions/);
    const pe = await p.locator('.drp__button--apply')
        .evaluate((btn) => getComputedStyle(btn).pointerEvents);
    expect(pe).toBe('none');
});

// =============================================================================
// readonly attribute (declarative full lock)
// =============================================================================

test('the readonly attribute is a full lock and reflects to lockedAspects', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => el.setAttribute('readonly', ''));
    expect(await p.evaluate((el: any) => el.lockedAspects.sort()))
        .toEqual(['actions', 'navigation', 'open', 'selection']);
    expect(await p.evaluate((el: any) => el.readonly)).toBe(true);

    await enabledDays(p).nth(3).click();
    await expect(selectedCells(p)).toHaveCount(0);

    await p.evaluate((el: any) => el.removeAttribute('readonly'));
    expect(await p.evaluate((el: any) => el.lockedAspects)).toEqual([]);
    await enabledDays(p).nth(3).click();
    await enabledDays(p).nth(8).click();
    await expect(selectedCells(p)).not.toHaveCount(0);
});

// =============================================================================
// programmatic API bypasses the lock (only the end user is frozen)
// =============================================================================

test('a full lock does not block the programmatic selection API', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => {
        el.lock();
        el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 14) }];
    });

    // The setter rendered the range even though the user is locked out.
    await expect(selectedCells(p)).not.toHaveCount(0);
    expect(await rangesOf(p)).toEqual([{ start: '2026-06-10', end: '2026-06-14' }]);

    // clearSelection() is likewise not gated.
    await p.evaluate((el: any) => el.clearSelection());
    await expect(selectedCells(p)).toHaveCount(0);
});

// =============================================================================
// open aspect (floating popover)
// =============================================================================

test('lock("open") blocks opening but never traps an already-open popover', async ({ page }) => {
    const f = pickerById(page, 'floatpick');

    await f.evaluate((el: any) => el.lock('open'));
    await f.locator('input').click();
    await expect(calendarOf(f)).not.toBeVisible();

    // Unlock → opens normally.
    await f.evaluate((el: any) => el.unlock('open'));
    await f.locator('input').click();
    await expect(calendarOf(f)).toBeVisible();

    // Re-lock while open → closing (Escape) is still allowed, so no trap.
    await f.evaluate((el: any) => el.lock('open'));
    await page.keyboard.press('Escape');
    await expect(calendarOf(f)).not.toBeVisible();
});

// =============================================================================
// toggleLock
// =============================================================================

test('toggleLock() flips the whole lock on and back off', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => el.toggleLock());
    expect(await p.evaluate((el: any) => el.readonly)).toBe(true);

    await p.evaluate((el: any) => el.toggleLock());
    expect(await p.evaluate((el: any) => el.lockedAspects)).toEqual([]);
});
