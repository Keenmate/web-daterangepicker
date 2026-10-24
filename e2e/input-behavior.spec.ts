import { test, expect, Page, Locator, pickerById, inputOf } from './fixtures';

/**
 * Progressive input masking: as the user types digits, the picker auto-inserts
 * the configured separator at each segment boundary. All three pickers use
 * calendar-open-trigger="manual" so the calendar doesn't pop up during typing
 * and accidentally consume keys.
 *
 * Fixture: test/input-behavior.html
 */

const PAGE = '/test/input-behavior.html';

async function typeInto(p: Locator, text: string) {
    const inp = inputOf(p);
    await inp.click();
    await inp.pressSequentially(text);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// default YYYY-MM-DD
// =============================================================================

test('YYYY-MM-DD: typing a full year segment eagerly appends the separator', async ({ page }) => {
    const p = pickerById(page, 'iso');

    await typeInto(p, '2026');
    // The mask inserts the next separator as soon as the current segment is
    // fully consumed, so the user can keep typing month digits without
    // having to type the dash themselves.
    await expect(inputOf(p)).toHaveValue('2026-');
});

test('YYYY-MM-DD: a partial year does not yet have a separator', async ({ page }) => {
    const p = pickerById(page, 'iso');

    await typeInto(p, '202');
    await expect(inputOf(p)).toHaveValue('202');
});

test('YYYY-MM-DD: a complete date is fully formatted to YYYY-MM-DD', async ({ page }) => {
    const p = pickerById(page, 'iso');

    await typeInto(p, '20260615');
    await expect(inputOf(p)).toHaveValue('2026-06-15');
});

test('YYYY-MM-DD: typing past the max length is truncated', async ({ page }) => {
    const p = pickerById(page, 'iso');

    await typeInto(p, '202606159');
    await expect(inputOf(p)).toHaveValue('2026-06-15');
});

// =============================================================================
// custom DD.MM.YYYY
// =============================================================================

test('DD.MM.YYYY: complete date uses dot separators (15.06.2026 for 15062026)', async ({ page }) => {
    const p = pickerById(page, 'eu');

    await typeInto(p, '15062026');
    await expect(inputOf(p)).toHaveValue('15.06.2026');
});

test('DD.MM.YYYY: progressive separators after day, then after month', async ({ page }) => {
    const p = pickerById(page, 'eu');

    // Full day → eager dot
    await typeInto(p, '15');
    await expect(inputOf(p)).toHaveValue('15.');

    // Partial month → no extra separator
    await typeInto(p, '0');
    await expect(inputOf(p)).toHaveValue('15.0');

    // Finish the month → second dot is added, then start of year
    await typeInto(p, '62');
    await expect(inputOf(p)).toHaveValue('15.06.2');
});

// =============================================================================
// range
// =============================================================================

test('range: completing the start date auto-appends " - " so the user can type the end immediately', async ({ page }) => {
    const p = pickerById(page, 'range');

    await typeInto(p, '20260610');
    // Once the start side is fully masked (matches maxLength), the picker
    // injects " - " as a hint for the second date — same separator the
    // committed value uses, so the user sees one form everywhere.
    await expect(inputOf(p)).toHaveValue('2026-06-10 - ');
});

test('range: typing both halves produces "start - end" matching the committed form', async ({ page }) => {
    const p = pickerById(page, 'range');

    await typeInto(p, '2026061020260615');
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');
});

test('range: a compact bare "-" between the two dates is accepted and normalised to " - "', async ({ page }) => {
    const p = pickerById(page, 'range');
    const inp = inputOf(p);

    // Format the value manually with a bare dash, then trigger the input mask
    // (mirrors a paste / manual edit). The mask should rewrite it to " - ".
    await inp.click();
    await inp.evaluate((el: HTMLInputElement) => {
        el.value = '2026-06-10-2026-06-15';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(inp).toHaveValue('2026-06-10 - 2026-06-15');
});

// =============================================================================
// inline clear (✕) button
// =============================================================================

function clearOf(p: Locator) {
    return p.locator('.drp__input-clear');
}

test('clear button: hidden when empty, shown once the field has a value', async ({ page }) => {
    const p = pickerById(page, 'iso');
    await expect(clearOf(p)).not.toHaveClass(/drp__input-clear--visible/);
    await typeInto(p, '20260610');
    await expect(inputOf(p)).toHaveValue('2026-06-10');
    await expect(clearOf(p)).toHaveClass(/drp__input-clear--visible/);
});

test('clear button: click empties the field and hides itself', async ({ page }) => {
    const p = pickerById(page, 'iso');
    await typeInto(p, '20260610');
    await clearOf(p).click();
    await expect(inputOf(p)).toHaveValue('');
    await expect(clearOf(p)).not.toHaveClass(/drp__input-clear--visible/);
});

test('clear button: range mode clears both halves', async ({ page }) => {
    const p = pickerById(page, 'range');
    await typeInto(p, '2026061020260615');
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');
    await clearOf(p).click();
    await expect(inputOf(p)).toHaveValue('');
    await expect(clearOf(p)).not.toHaveClass(/drp__input-clear--visible/);
});
