import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, inputOf, open } from './fixtures';

/**
 * Covers the three selection modes and the commit-mode / Apply-button
 * variations. All pickers are pinned to `initial-date="2026-06-15"` in the
 * fixture so day cells (data-date="YYYY-MM-DD") are stable.
 *
 * Fixture: test/selection-modes.html
 */

const PAGE = '/test/selection-modes.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// single mode
// =============================================================================

test.describe('single mode', () => {
    test('clicking a day populates the input and closes the picker', async ({ page }) => {
        const p = await open(page, 'single');

        await dayByDate(p, '2026-06-20').click();

        await expect(inputOf(p)).toHaveValue('2026-06-20');
        // Default commit-mode="selection": closes immediately after pick.
        await expect(calendarOf(p)).toBeHidden();
    });

    test('clicked day gets the --selected class', async ({ page }) => {
        const p = await open(page, 'single');

        await dayByDate(p, '2026-06-20').click();
        // Reopen to inspect class state.
        await inputOf(p).click();
        await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--selected/);
    });
});

// =============================================================================
// range mode
// =============================================================================

test.describe('range mode', () => {
    test('two clicks commit a range; input shows "start - end"', async ({ page }) => {
        const p = await open(page, 'range');

        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-15').click();

        await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');
    });

    test('range-start, range-middle, range-end classes are applied after commit', async ({ page }) => {
        const p = await open(page, 'range');

        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-15').click();
        await inputOf(p).click();

        await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
        await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--range-end/);
        // A day between start and end should be in-range.
        await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--in-range/);
    });

    test('summary becomes --visible after a range is committed', async ({ page }) => {
        const p = await open(page, 'range');

        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-15').click();
        await inputOf(p).click();

        await expect(p.locator('.drp__summary')).toHaveClass(/drp__summary--visible/);
    });

    test('clicking earlier date after start auto-orders the range (10 → 15 from clicks 15, 10)', async ({ page }) => {
        const p = await open(page, 'range');

        await dayByDate(p, '2026-06-15').click();
        // Picker is smart: clicking an earlier date completes the range with
        // the lower date as start, not as a reset.
        await dayByDate(p, '2026-06-10').click();

        await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');
    });
});

// =============================================================================
// multiple mode
// =============================================================================

test.describe('multiple mode', () => {
    test('toggling individual days accumulates a --selected set; commits via Apply', async ({ page }) => {
        const p = await open(page, 'multiple');

        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-12').click();
        await dayByDate(p, '2026-06-15').click();

        // Multiple mode never auto-closes on selection — needs Apply.
        await expect(calendarOf(p)).toBeVisible();
        await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--selected/);
        await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--selected/);
        await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--selected/);

        await p.locator('.drp__button--apply').click();
        await expect(calendarOf(p)).toBeHidden();
        // Multiple mode summarizes the selection count in the input rather than
        // listing every date (which would overflow for long selections).
        await expect(inputOf(p)).toHaveValue(/3 selection/);
    });

    test('re-clicking a selected day unselects it', async ({ page }) => {
        const p = await open(page, 'multiple');

        await dayByDate(p, '2026-06-10').click();
        await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--selected/);

        await dayByDate(p, '2026-06-10').click();
        await expect(dayByDate(p, '2026-06-10')).not.toHaveClass(/drp__day--selected/);
    });
});

// =============================================================================
// Apply / cancel
// =============================================================================

test.describe('Apply button (range mode)', () => {
    test('Escape before Apply restores the originalInputValue', async ({ page }) => {
        const p = await open(page, 'range-apply');

        // Seed an existing value, reopen, then make a different pending selection.
        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-12').click();
        await p.locator('.drp__button--apply').click();
        await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-12');

        await inputOf(p).click();
        await dayByDate(p, '2026-06-20').click();
        await dayByDate(p, '2026-06-25').click();
        // Pending — not yet applied. Press Escape to cancel.
        await page.keyboard.press('Escape');

        await expect(calendarOf(p)).toBeHidden();
        // Input should still hold the previously-applied value, not the cancelled pending one.
        await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-12');
    });

    test('Apply commits the pending selection and closes', async ({ page }) => {
        const p = await open(page, 'range-apply');

        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-15').click();
        await p.locator('.drp__button--apply').click();

        await expect(calendarOf(p)).toBeHidden();
        await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');
    });
});

// =============================================================================
// commit-mode="manual"
// =============================================================================

test('commit-mode="manual": single mode does NOT close after selecting a day', async ({ page }) => {
    const p = await open(page, 'single-never');

    await dayByDate(p, '2026-06-20').click();

    // Value committed, but picker stays open.
    await expect(inputOf(p)).toHaveValue('2026-06-20');
    await expect(calendarOf(p)).toBeVisible();
});

test.describe('commit-mode="manual" (range, app-driven commit)', () => {
    const log = (page: Page) => page.getByTestId('selection-modes-log');

    test('completing a range neither closes the picker nor renders an Apply button', async ({ page }) => {
        const p = await open(page, 'range-manual');
        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-12').click();
        await expect(calendarOf(p)).toHaveClass(/drp__picker--visible/);
        await expect(p.locator('.drp__button--apply')).toHaveCount(0);
        await expect(p.locator('.drp__button[data-id="done"]')).toBeVisible();
    });

    test('nothing is committed (no select/change) until the app calls controller.apply()', async ({ page }) => {
        test.fail(true, 'FINDINGS.md #22');
        const p = await open(page, 'range-manual');
        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-12').click();
        await page.waitForTimeout(100);
        await expect(log(page)).toHaveText('');
    });

    test('controller.apply() (custom Done button) commits the range and closes', async ({ page }) => {
        const p = await open(page, 'range-manual');
        await dayByDate(p, '2026-06-10').click();
        await dayByDate(p, '2026-06-12').click();
        await p.locator('.drp__button[data-id="done"]').click();
        await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
        await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-12');
        await expect(log(page)).toContainText('select:range-manual:2026-06-10 - 2026-06-12');
    });
});
