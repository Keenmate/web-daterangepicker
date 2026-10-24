import { test, expect, Page, Locator, pickerById, calendarOf, inputOf, open } from './fixtures';

/**
 * locale, customStrings, monthNames override, week-start-day.
 *
 * Fixture: test/locale.html
 */

const PAGE = '/test/locale.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// explicit locale
// =============================================================================

test('locale="de" uses German month names ("Juni 2026")', async ({ page }) => {
    const p = await open(page, 'de');
    await expect(p.locator('.drp__month-year').first()).toContainText('Juni 2026');
});

test('locale="de" uses German weekday headers (Mo Di Mi Do Fr Sa So)', async ({ page }) => {
    const p = await open(page, 'de');
    // Weekday header row text. Don't pin exact spacing/order — just spot
    // a few German abbreviations.
    const weekdays = await p.locator('.drp__weekdays').first().innerText();
    expect(weekdays).toMatch(/Mo/i);
    expect(weekdays).toMatch(/Di/i);
    expect(weekdays).toMatch(/Fr/i);
});

// =============================================================================
// customStrings
// =============================================================================

test('customStrings overrides individual button labels (Today → "Jump")', async ({ page }) => {
    const p = await open(page, 'custom-strings');

    const todayBtn = p.locator('.drp__button--today');
    await expect(todayBtn).toHaveText('Jump');
});

// =============================================================================
// monthNames override
// =============================================================================

test('monthNames override replaces the localized month names with the supplied array', async ({ page }) => {
    const p = await open(page, 'numeric-months');

    // June (index 5) → '06'
    await expect(p.locator('.drp__month-year').first()).toContainText('06 2026');
});

// =============================================================================
// week-start-day
// =============================================================================

test('week-start-day="0": first weekday header column is Sunday', async ({ page }) => {
    const p = await open(page, 'sunday');

    const firstWeekday = p.locator('.drp__weekdays > *').first();
    await expect(firstWeekday).toContainText(/Sun|Sun\.|Sunday|Su/i);
});

test('week-start-day="1": first weekday header column is Monday', async ({ page }) => {
    const p = await open(page, 'monday');

    const firstWeekday = p.locator('.drp__weekdays > *').first();
    await expect(firstWeekday).toContainText(/Mon|Mon\.|Monday|Mo/i);
});

// =============================================================================
// month-names attribute (pipe-delimited)
// =============================================================================

test('month-names attribute overrides month header (June → "Červen")', async ({ page }) => {
    const p = await open(page, 'month-names-attr');

    await expect(p.locator('.drp__month-year').first()).toContainText('Červen 2026');
});

// =============================================================================
// weekday-names attribute (pipe-delimited, Sunday-first, rotated by week-start-day)
// =============================================================================

test('weekday-names attribute + week-start-day="0": first column is the [0] entry ("Ne")', async ({ page }) => {
    const p = await open(page, 'weekday-names-attr');

    const firstWeekday = p.locator('.drp__weekdays > *').first();
    await expect(firstWeekday).toHaveText('Ne');
});

test('weekday-names is Sunday-indexed: week-start-day="3" rotates to Wednesday ([3] = "St")', async ({ page }) => {
    const p = await open(page, 'weekday-names-wed');

    const cols = p.locator('.drp__weekdays > *');
    // Sunday-first list "Ne|Po|Út|St|Čt|Pá|So" rotated by 3 → St Čt Pá So Ne Po Út
    await expect(cols.nth(0)).toHaveText('St');
    await expect(cols.nth(1)).toHaveText('Čt');
    await expect(cols.nth(6)).toHaveText('Út');
});

test('weekday-names with wrong segment count is ignored (falls back to locale names)', async ({ page }) => {
    const p = await open(page, 'weekday-names-bad');

    const firstWeekday = p.locator('.drp__weekdays > *').first();
    // Bad "Po|Út|St" (3 segments) is dropped → English Sunday-first fallback.
    await expect(firstWeekday).toContainText(/Sun|Su/i);
    await expect(firstWeekday).not.toHaveText('Po');
});
