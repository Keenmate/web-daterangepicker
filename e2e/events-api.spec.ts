import { test, expect, Page, Locator } from './fixtures';

/**
 * Public events (`change`, `custom-action`) and the programmatic property API
 * (`value`, `disabled`, `isOpen`, `updateOptions`). Event listeners are wired
 * from the spec via `page.evaluate` and stash collected detail on the picker
 * element under a known property — the spec then reads that property back.
 *
 * Fixture: test/events-api.html
 */

const PAGE = '/test/events-api.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp__picker');
}

function inputOf(p: Locator) {
    return p.locator('input');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp__day[data-date="${isoDate}"]`);
}

async function captureEvent(picker: Locator, name: string) {
    await picker.evaluate((el: any, evtName: string) => {
        el.__capture = el.__capture || {};
        el.__capture[evtName] = [];
        el.addEventListener(evtName, (e: any) => el.__capture[evtName].push(e.detail));
    }, name);
}

async function getCaptured(picker: Locator, name: string) {
    return picker.evaluate((el: any, evtName: string) => el.__capture?.[evtName] ?? [], name);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// change event
// =============================================================================

test('change event fires when a day is selected and detail includes formattedValue + date', async ({ page }) => {
    const p = pickerById(page, 'basic');

    await captureEvent(p, 'change');
    await inputOf(p).click();
    await dayByDate(p, '2026-06-15').click();

    const events = await getCaptured(p, 'change');
    expect(events.length).toBe(1);
    expect(events[0].formattedValue).toBe('2026-06-15');
    // detail.date is a Date object — Playwright deserializes it to an ISO string.
    expect(events[0].date).toBeTruthy();
});

test('change event does NOT fire when the calendar opens (only on selection)', async ({ page }) => {
    const p = pickerById(page, 'basic');

    await captureEvent(p, 'change');
    await inputOf(p).click(); // opens
    await expect(calendarOf(p)).toBeVisible();

    const events = await getCaptured(p, 'change');
    expect(events.length).toBe(0);
});

// =============================================================================
// custom-action event
// =============================================================================

test('custom-action event fires when the custom action button is clicked', async ({ page }) => {
    const p = pickerById(page, 'custom');

    await captureEvent(p, 'custom-action');
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();

    // The custom button (action: 'custom', text: 'Reset') is the second action button.
    await p.locator('.drp__button[data-action="custom"]').click();

    const events = await getCaptured(p, 'custom-action');
    // The picker dispatches a single composed+bubbling event on the
    // calendar; that one event crosses the shadow boundary and is what the
    // outside listener sees. (Used to double-fire because the web-component
    // also manually re-emitted — see FINDINGS.md #1, fixed.)
    expect(events.length).toBe(1);
});

// =============================================================================
// programmatic API
// =============================================================================

test('setting .value populates the input field', async ({ page }) => {
    const p = pickerById(page, 'basic');

    await p.evaluate((el: any) => { el.value = '2026-07-04'; });
    await expect(inputOf(p)).toHaveValue('2026-07-04');
});

test('setting .disabled = true disables the input element', async ({ page }) => {
    const p = pickerById(page, 'basic');

    await p.evaluate((el: any) => { el.disabled = true; });
    await expect(inputOf(p)).toBeDisabled();

    // Setting back to false re-enables.
    await p.evaluate((el: any) => { el.disabled = false; });
    await expect(inputOf(p)).toBeEnabled();
});

test('disabled = true suppresses calendar open even via programmatic clicks', async ({ page }) => {
    const p = pickerById(page, 'basic');

    await p.evaluate((el: any) => { el.disabled = true; });

    // Force a click past the browser's pointer-events block on the input
    // and confirm the picker still doesn't open (open() guards on input.disabled).
    await inputOf(p).click({ force: true });
    await expect(calendarOf(p)).toBeHidden();

    // Re-enabling restores normal open behavior.
    await p.evaluate((el: any) => { el.disabled = false; });
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
});

test('setting .isOpen = true opens the calendar, false closes it', async ({ page }) => {
    const p = pickerById(page, 'basic');

    await p.evaluate((el: any) => { el.isOpen = true; });
    await expect(calendarOf(p)).toBeVisible();

    await p.evaluate((el: any) => { el.isOpen = false; });
    await expect(calendarOf(p)).toBeHidden();
});

// =============================================================================
// updateOptions
// =============================================================================

test('updateOptions on a non-structural key preserves the existing selection', async ({ page }) => {
    const p = pickerById(page, 'updateopts');

    // Commit a range.
    await inputOf(p).click();
    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').click();
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');

    // Now toggle a non-structural option (should-highlight-disabled-in-range).
    const applied = await p.evaluate((el: any) =>
        el.picker.updateOptions({ shouldHighlightDisabledInRange: false })
    );
    expect(applied).toBe(true);

    // Selection still there.
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');
});

test('updateOptions on a structural key returns false (caller does full rebuild)', async ({ page }) => {
    const p = pickerById(page, 'updateopts');

    await inputOf(p).click();
    const applied = await p.evaluate((el: any) =>
        el.picker.updateOptions({ visibleMonthsCount: 3 })
    );
    expect(applied).toBe(false);
});
