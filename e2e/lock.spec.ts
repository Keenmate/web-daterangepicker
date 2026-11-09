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

test('readonly attribute -> isReadonly = false removes the attribute and unlocks (reflects)', async ({ page }) => {
    const p = pickerById(page, 'lockpick');
    await p.evaluate((el: any) => el.setAttribute('readonly', ''));
    expect(await p.evaluate((el: any) => el.lockedAspects.length)).toBe(3);
    await p.evaluate((el: any) => { el.isReadonly = false; });
    expect(await p.evaluate((el: any) => el.hasAttribute('readonly'))).toBe(false);
    expect(await p.evaluate((el: any) => el.lockedAspects)).toEqual([]);
    await p.evaluate((el: any) => { el.isReadonly = true; });
    expect(await p.evaluate((el: any) => el.hasAttribute('readonly'))).toBe(true);
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
// readonly attribute (native readonly, core SPEC §6.4)
// =============================================================================

test('readonly locks selection / actions / open but keeps month navigation (native readonly)', async ({ page }) => {
    const p = pickerById(page, 'lockpick');

    await p.evaluate((el: any) => el.setAttribute('readonly', ''));
    expect(await p.evaluate((el: any) => el.lockedAspects.sort()))
        .toEqual(['actions', 'open', 'selection']);
    expect(await p.evaluate((el: any) => el.isReadonly)).toBe(true);

    // The data can't be changed…
    await enabledDays(p).nth(3).click();
    await expect(selectedCells(p)).toHaveCount(0);
    // …but the calendar stays navigable.
    await expect(p.locator('.drp__month-year').first()).toContainText(/June\s+2026/);
    await p.locator('.drp__nav--next[data-month-index="0"]').click();
    await expect(p.locator('.drp__month-year').first()).toContainText(/July\s+2026/);

    await p.evaluate((el: any) => el.removeAttribute('readonly'));
    expect(await p.evaluate((el: any) => el.lockedAspects)).toEqual([]);
    await enabledDays(p).nth(3).click();
    await enabledDays(p).nth(8).click();
    await expect(selectedCells(p)).not.toHaveCount(0);
});

test('removing readonly keeps an explicit lock() of another aspect', async ({ page }) => {
    const p = pickerById(page, 'lockpick');
    await p.evaluate((el: any) => { el.lock('navigation'); el.setAttribute('readonly', ''); });
    await p.evaluate((el: any) => { el.removeAttribute('readonly'); return el.whenSettled(); });
    expect(await p.evaluate((el: any) => el.lockedAspects)).toEqual(['navigation']);
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

test('calls from code work under readonly and a navigation lock (controller prevMonth / nextMonth, selection)', async ({ page }) => {
    const p = pickerById(page, 'lockpick');
    await p.evaluate((el: any) => { el.setAttribute('readonly', ''); el.lock('navigation'); });

    await p.evaluate((el: any) => el.controller.nextMonth(0));
    await expect(p.locator('.drp__month-year').first()).toContainText(/July\s+2026/);
    await p.evaluate((el: any) => el.controller.prevMonth(0));
    await expect(p.locator('.drp__month-year').first()).toContainText(/June\s+2026/);

    await p.evaluate((el: any) => { el.selectedRanges = [{ start: new Date(2026, 5, 10), end: new Date(2026, 5, 12) }]; });
    expect(await rangesOf(p)).toEqual([{ start: '2026-06-10', end: '2026-06-12' }]);
    await p.evaluate((el: any) => el.controller.clearSelection());
    expect(await rangesOf(p)).toEqual([]);
});

// =============================================================================
// disabled (native disabled, core SPEC §6.4)
// =============================================================================

test('disabled: an inline calendar is inert (no clicks, no focus) and greyed; code calls still work', async ({ page }) => {
    const p = pickerById(page, 'lockpick');
    await p.evaluate((el: any) => { el.setAttribute('disabled', ''); return el.whenSettled(); });

    await expect(calendarOf(p)).toHaveClass(/drp__picker--disabled/);
    expect(await calendarOf(p).evaluate((c: any) => c.inert)).toBe(true);
    await enabledDays(p).nth(3).click({ force: true });
    await expect(selectedCells(p)).toHaveCount(0);
    await p.locator('.drp__nav--next[data-month-index="0"]').click({ force: true });
    await expect(p.locator('.drp__month-year').first()).toContainText(/June\s+2026/);

    await p.evaluate((el: any) => el.controller.nextMonth(0));
    await expect(p.locator('.drp__month-year').first()).toContainText(/July\s+2026/);
    await p.evaluate((el: any) => { el.selectedRanges = [{ start: new Date(2026, 6, 10), end: new Date(2026, 6, 12) }]; });
    expect(await rangesOf(p)).toEqual([{ start: '2026-07-10', end: '2026-07-12' }]);

    await p.evaluate((el: any) => { el.removeAttribute('disabled'); return el.whenSettled(); });
    expect(await calendarOf(p).evaluate((c: any) => c.inert)).toBe(false);
    await expect(calendarOf(p)).not.toHaveClass(/drp__picker--disabled/);
});

test('disabled closes an open floating calendar and survives a rebuild', async ({ page }) => {
    const f = pickerById(page, 'floatpick');
    await f.locator('input').click();
    await expect(calendarOf(f)).toBeVisible();
    await f.evaluate((el: any) => { el.isDisabled = true; return el.whenSettled(); });
    await expect(calendarOf(f)).not.toBeVisible();
    // A structural change rebuilds the engine: still disabled.
    await f.evaluate((el: any) => { el.setAttribute('selection-mode', 'single'); return el.whenSettled(); });
    expect(await calendarOf(f).evaluate((c: any) => c.inert)).toBe(true);
    await expect(f.locator('input')).toBeDisabled();
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
    expect(await p.evaluate((el: any) => el.lockedAspects.length)).toBe(4);

    await p.evaluate((el: any) => el.toggleLock());
    expect(await p.evaluate((el: any) => el.lockedAspects)).toEqual([]);
});
