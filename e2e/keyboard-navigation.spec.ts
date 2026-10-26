import { test, expect, Page } from './fixtures';

/**
 * Keyboard interactions in floating-mode single picker. Picker is pinned to
 * initial-date="2026-06-15" so jumps land on predictable cells. Today is NOT
 * in the visible month, so the first arrow press initializes the focus to
 * day index 0 (June 1) and THEN applies the offset — this is the picker's
 * documented "today-or-first-day" fallback behavior.
 *
 * Fixture: test/keyboard-navigation.html
 */

const PAGE = '/test/keyboard-navigation.html';

function picker(page: Page) {
    return page.locator('#picker');
}

function calendar(page: Page) {
    return picker(page).locator('.drp__picker');
}

function focusedDay(page: Page) {
    return picker(page).locator('.drp__day--focused');
}

function dayByDate(page: Page, isoDate: string) {
    return picker(page).locator(`.drp__day[data-date="${isoDate}"]`);
}

async function openPicker(page: Page) {
    await page.goto(PAGE);
    await picker(page).locator('input').click();
    await expect(calendar(page)).toBeVisible();
}

test('ArrowRight focuses day index 1 (June 2) when today is not in view', async ({ page }) => {
    await openPicker(page);

    await page.keyboard.press('ArrowRight');
    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-06-02');
});

test('ArrowDown moves focus by a full week', async ({ page }) => {
    await openPicker(page);

    await page.keyboard.press('ArrowDown'); // +7 from index 0 → index 7 → June 8
    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-06-08');
});

test('Home jumps focus to the first day of the visible month', async ({ page }) => {
    await openPicker(page);

    // Move first so we have a non-zero focus to "jump back" from.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');

    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-06-01');
});

test('Enter on focused day commits the selection', async ({ page }) => {
    await openPicker(page);

    await page.keyboard.press('ArrowRight'); // focus 2026-06-02
    await page.keyboard.press('Enter');

    await expect(picker(page).locator('input')).toHaveValue('2026-06-02');
    // Single mode auto-closes on selection.
    await expect(calendar(page)).toBeHidden();
});

test('Escape closes the calendar without selecting', async ({ page }) => {
    await openPicker(page);

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect(calendar(page)).toBeHidden();
    await expect(picker(page).locator('input')).toHaveValue('');
});

test('PageDown navigates to next month, preserving day index', async ({ page }) => {
    await openPicker(page);

    await page.keyboard.press('ArrowDown'); // focus index 7 = 2026-06-08
    await page.keyboard.press('PageDown'); // → July 2026, same index

    // July 1 2026 is a Wednesday; index 7 in non-other-month-only enumeration
    // is July 8 (skipping 1..7 as days 1-7).
    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-07-08');
});

test('PageUp navigates to previous month, preserving day index', async ({ page }) => {
    await openPicker(page);

    await page.keyboard.press('ArrowDown'); // index 7
    await page.keyboard.press('PageUp');    // → May 2026

    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-05-08');
});

test('"t" key navigates the active column to today', async ({ page }) => {
    await openPicker(page);

    await page.keyboard.press('t');

    // Today is 2026-05-22 (set by harness). Header should show May 2026.
    await expect(picker(page).locator('.drp__month-year').first()).toContainText(/May\s+2026/);
    await expect(dayByDate(page, '2026-05-22')).toHaveClass(/drp__day--today/);
});

// =============================================================================
// one test per remaining key (focus starts at June 1 when today isn't in view)
// =============================================================================

const header = (page: Page) => picker(page).locator('.drp__month-year').first();

test('ArrowLeft moves focus back one day', async ({ page }) => {
    await openPicker(page);
    await page.keyboard.press('ArrowDown');   // June 8
    await page.keyboard.press('ArrowLeft');
    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-06-07');
});

test('ArrowUp moves focus back a full week', async ({ page }) => {
    await openPicker(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');   // June 15
    await page.keyboard.press('ArrowUp');
    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-06-08');
});

test('End jumps focus to the last day of the visible month', async ({ page }) => {
    await openPicker(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('End');
    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-06-30');
});

test('Ctrl+ArrowRight goes to the next month keeping the day index', async ({ page }) => {
    await openPicker(page);
    await page.keyboard.press('ArrowDown');   // index 7 = June 8
    await page.keyboard.press('Control+ArrowRight');
    await expect(header(page)).toContainText(/July\s+2026/);
    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-07-08');
});

test('Ctrl+ArrowLeft goes to the previous month keeping the day index', async ({ page }) => {
    await openPicker(page);
    await page.keyboard.press('ArrowDown');   // index 7
    await page.keyboard.press('Control+ArrowLeft');
    await expect(header(page)).toContainText(/May\s+2026/);
    await expect(focusedDay(page)).toHaveAttribute('data-date', '2026-05-08');
});

test('Ctrl+Home goes to January 1st; pressed again, to the previous year', async ({ page }) => {
    await openPicker(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Control+Home');
    await expect(header(page)).toContainText(/January\s+2026/);
    await expect(dayByDate(page, '2026-01-01')).toHaveClass(/drp__day--focused/);
    await page.keyboard.press('Control+Home');
    await expect(header(page)).toContainText(/January\s+2025/);
});

// FINDINGS #26: back-to-back keys used to leave the previous day's focus ring too.
for (const [key, date] of [['Control+Home', '2026-01-01'], ['Control+End', '2026-12-31']] as const) {
    test(`ArrowRight immediately followed by ${key} leaves exactly one focused day`, async ({ page }) => {
        await openPicker(page);
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press(key);
        await expect(dayByDate(page, date)).toHaveClass(/drp__day--focused/);
        await page.waitForTimeout(50);
        await expect(focusedDay(page)).toHaveCount(1);
    });
}

test('Ctrl+End goes to December 31st; pressed again, to the next year', async ({ page }) => {
    await openPicker(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Control+End');
    await expect(header(page)).toContainText(/December\s+2026/);
    await expect(dayByDate(page, '2026-12-31')).toHaveClass(/drp__day--focused/);
    await page.keyboard.press('Control+End');
    await expect(header(page)).toContainText(/December\s+2027/);
});

