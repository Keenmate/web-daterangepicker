import { test, expect, Page, Locator, pickerById, calendarOf, open } from './fixtures';

/**
 * Verifies the v1.12.1 actions/summary CSS contract:
 *   - Actions row has no border-top when no visible summary precedes it
 *     (single mode never appends a summary; range mode marks it --hidden
 *     until a range is committed).
 *   - When the summary is visible, it carries a margin-top so its own
 *     border-top doesn't visually touch the open rolling-selector overlay.
 *
 * Fixture: test/summary-actions.html — two pickers (single, range).
 */

const PAGE = '/test/summary-actions.html';

function actionsOf(picker: Locator) {
    return picker.locator('.drp__actions');
}

function summaryOf(picker: Locator) {
    return picker.locator('.drp__summary');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('single mode: actions row has no border-top', async ({ page }) => {
    const p = await open(page, 'single');

    const borderTopWidth = await actionsOf(p).evaluate(
        el => parseFloat(getComputedStyle(el).borderTopWidth)
    );
    expect(borderTopWidth).toBe(0);

    // And no summary element is appended at all in single mode.
    await expect(summaryOf(p)).toHaveCount(0);
});

test('range mode, no selection: actions row has no border-top (summary is --hidden)', async ({ page }) => {
    const p = await open(page, 'range');

    // Summary exists in range mode but starts hidden.
    await expect(summaryOf(p)).toHaveCount(1);
    await expect(summaryOf(p)).toHaveClass(/drp__summary--hidden/);

    const borderTopWidth = await actionsOf(p).evaluate(
        el => parseFloat(getComputedStyle(el).borderTopWidth)
    );
    expect(borderTopWidth).toBe(0);
});

test('range mode with committed selection: summary --visible, actions has border-top', async ({ page }) => {
    const p = await open(page, 'range');

    // Pick any two enabled days in the visible month to commit a range.
    const days = p.locator('.drp__day:not(.drp__day--disabled):not(.drp__day--other-month)');
    await days.nth(5).click();
    await days.nth(10).click();

    await expect(summaryOf(p)).toHaveClass(/drp__summary--visible/);

    const borderTopWidth = await actionsOf(p).evaluate(
        el => parseFloat(getComputedStyle(el).borderTopWidth)
    );
    expect(borderTopWidth).toBeGreaterThan(0);
});

test('visible summary has margin-top (gap from the months area above)', async ({ page }) => {
    const p = await open(page, 'range');

    const days = p.locator('.drp__day:not(.drp__day--disabled):not(.drp__day--other-month)');
    await days.nth(5).click();
    await days.nth(10).click();

    await expect(summaryOf(p)).toHaveClass(/drp__summary--visible/);
    const marginTop = await summaryOf(p).evaluate(
        el => parseFloat(getComputedStyle(el).marginTop)
    );
    expect(marginTop).toBeGreaterThan(0);
});

test('summary text is selectable even though the calendar root suppresses selection', async ({ page }) => {
    const p = await open(page, 'range');

    const days = p.locator('.drp__day:not(.drp__day--disabled):not(.drp__day--other-month)');
    await days.nth(5).click();
    await days.nth(10).click();
    await expect(summaryOf(p)).toHaveClass(/drp__summary--visible/);

    // The root opts OUT of selection (so drag-selecting a range never grabs text)…
    const rootSelect = await calendarOf(p).evaluate(el => getComputedStyle(el).userSelect);
    expect(rootSelect).toBe('none');

    // …but the summary opts back IN, so day counts / prices / booking Ref codes
    // written via showSummary() can be selected and copied.
    const summarySelect = await summaryOf(p).evaluate(el => getComputedStyle(el).userSelect);
    expect(summarySelect).toBe('text');
});
