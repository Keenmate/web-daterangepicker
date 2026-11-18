import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, inputOf, open } from './fixtures';

/**
 * Action button visibility toggles (show-today/clear/apply) + action click
 * behavior + summary visibility / custom renderSummaryCallback.
 *
 * Fixture: test/action-buttons.html
 */

const PAGE = '/test/action-buttons.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// default buttons (single mode = Today + Clear)
// =============================================================================

test('default single mode renders Today and Clear buttons', async ({ page }) => {
    const p = await open(page, 'default');

    await expect(p.locator('.drp__button--today')).toBeVisible();
    await expect(p.locator('.drp__button--clear')).toBeVisible();
});

test('clicking Today selects today and closes the picker', async ({ page }) => {
    const p = await open(page, 'default');

    await p.locator('.drp__button--today').click();

    // Today is 2026-05-22 (set by harness).
    await expect(inputOf(p)).toHaveValue('2026-05-22');
    await expect(calendarOf(p)).toBeHidden();
});

test('clicking Clear empties the input', async ({ page }) => {
    const p = await open(page, 'default');

    await dayByDate(p, '2026-06-15').click();
    await expect(inputOf(p)).toHaveValue('2026-06-15');

    // Reopen and clear.
    await inputOf(p).click();
    await p.locator('.drp__button--clear').click();
    await expect(inputOf(p)).toHaveValue('');
});

// =============================================================================
// show-* toggles
// =============================================================================

test('show-today-button="false" omits the Today button', async ({ page }) => {
    const p = await open(page, 'no-today');

    await expect(p.locator('.drp__button--today')).toHaveCount(0);
    await expect(p.locator('.drp__button--clear')).toBeVisible();
});

test('all buttons disabled: the actions container is omitted entirely', async ({ page }) => {
    const p = await open(page, 'no-actions');

    // Per createCalendar(): actions is only appended if it has children.
    await expect(p.locator('.drp__actions')).toHaveCount(0);
});

// =============================================================================
// summary visibility
// =============================================================================

test('show-summary="false" omits the summary block in range mode', async ({ page }) => {
    const p = await open(page, 'no-summary');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();

    // Summary element should NOT be in the calendar.
    await expect(p.locator('.drp__summary')).toHaveCount(0);
});

// =============================================================================
// renderSummaryCallback
// =============================================================================

test('custom renderSummaryCallback overrides the default summary HTML', async ({ page }) => {
    const p = await open(page, 'custom-summary');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();
    // Reopen to inspect summary content (range commit may auto-close).
    await inputOf(p).click();

    const summary = p.locator('.drp__summary');
    await expect(summary).toHaveClass(/drp__summary--visible/);
    await expect(summary).toContainText('CUSTOM: 6d');
});

// =============================================================================
// `shortcut` on action buttons (core formatShortcut / matchesShortcut / isTypingTarget)
// =============================================================================

test('an action with shortcut: Mod+T shows a keycap and runs on the chord while open', async ({ page }) => {
    const p = await open(page, 'shortcuts');
    const today = p.locator('.drp__button--today');
    await expect(today.locator('kbd.drp__button-shortcut')).toHaveText(/^(Ctrl\+T|⌘T)$/);
    await expect(p.locator('.drp__button--clear kbd')).toHaveCount(0);

    // focus is in the input (a typing target) — a chord with a modifier still fires
    await expect(inputOf(p)).toBeFocused();
    await page.keyboard.press('ControlOrMeta+t');
    await expect.poll(() => page.evaluate(() => (window as any).__shortcutActions)).toEqual(['today']);
    await expect(inputOf(p)).not.toHaveValue('');
});

test('a plain-key shortcut is skipped while typing in the input, runs from the day grid; closed = no run', async ({ page }) => {
    const p = await open(page, 'shortcuts');
    await expect(p.locator('.drp__button--custom kbd')).toHaveText('M');

    await page.keyboard.press('m');                                   // typing in the input
    expect(await page.evaluate(() => (window as any).__shortcutActions)).toEqual([]);

    await dayByDate(p, '2026-06-15').focus();
    await page.keyboard.press('m');
    await expect.poll(() => page.evaluate(() => (window as any).__shortcutActions)).toEqual(['mark']);

    await page.keyboard.press('Escape');                              // closed: the chord does nothing
    await expect(calendarOf(p)).not.toBeVisible();
    await page.keyboard.press('ControlOrMeta+t');
    expect(await page.evaluate(() => (window as any).__shortcutActions)).toEqual(['mark']);
});
