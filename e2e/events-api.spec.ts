import { test, expect, Page, Locator, pickerById, calendarOf, dayByDate, inputOf } from './fixtures';

/**
 * Public events (`change`, `action`) and the programmatic property API
 * (`value`, `disabled`, `isOpen`, `updateOptions`). Event listeners are wired
 * from the spec via `page.evaluate` and stash collected detail on the picker
 * element under a known property — the spec then reads that property back.
 *
 * Fixture: test/events-api.html
 */

const PAGE = '/test/events-api.html';

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

test('no separate select event fires — change is the only commit event', async ({ page }) => {
    const p = pickerById(page, 'basic');
    await captureEvent(p, 'select');
    await inputOf(p).click();
    await dayByDate(p, '2026-06-15').click();
    expect((await getCaptured(p, 'select')).length).toBe(0);
});

// =============================================================================
// open / close events
// =============================================================================

test('open / close events (and onOpen / onClose twins) fire once per transition', async ({ page }) => {
    const p = pickerById(page, 'basic');
    await p.evaluate((el: any) => {
        el.__log = [];
        el.addEventListener('open', (e: any) => el.__log.push(`open:${typeof e.detail.controller?.close}`));
        el.addEventListener('close', () => el.__log.push('close'));
        el.onOpen = () => el.__log.push('onOpen');
        el.onClose = () => el.__log.push('onClose');
    });
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
    await p.evaluate((el: any) => el.open()); // already open → no second event
    await page.keyboard.press('Escape');
    await expect(calendarOf(p)).toBeHidden();
    await p.evaluate((el: any) => el.close()); // already closed → nothing
    expect(await p.evaluate((el: any) => el.__log)).toEqual(['onOpen', 'open:function', 'onClose', 'close']);
});

// =============================================================================
// action event
// =============================================================================

test('action event fires once when a custom action button is clicked', async ({ page }) => {
    const p = pickerById(page, 'custom');

    await captureEvent(p, 'action');
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();

    // The custom button ({ id: 'reset', text: 'Reset' }) renders data-action="custom" data-id="reset".
    await p.locator('.drp__button[data-action="custom"][data-id="reset"]').click();

    const events = await getCaptured(p, 'action');
    // Dispatched once, on the host (not composed, not re-emitted).
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

test('setting .isDisabled = true disables the input element', async ({ page }) => {
    const p = pickerById(page, 'basic');

    await p.evaluate((el: any) => { el.isDisabled = true; });
    await expect(inputOf(p)).toBeDisabled();

    // Setting back to false re-enables.
    await p.evaluate((el: any) => { el.isDisabled = false; });
    await expect(inputOf(p)).toBeEnabled();
});

test('an ancestor <fieldset disabled> disables the input (core isEffectivelyDisabled)', async ({ page }) => {
    const p = pickerById(page, 'basic');
    await p.evaluate((el: any) => {
        const fs = document.createElement('fieldset');
        el.parentElement.insertBefore(fs, el);
        fs.appendChild(el);
        fs.disabled = true;
    });
    await expect(inputOf(p)).toBeDisabled();
    expect(await p.evaluate((el: any) => el.isDisabled)).toBe(false); // the fieldset never writes isDisabled
    await p.evaluate((el: any) => { el.parentElement.disabled = false; });
    await expect(inputOf(p)).toBeEnabled();
});

test('disabled attribute -> isDisabled = false re-enables (reflects; not stuck by formDisabledCallback)', async ({ page }) => {
    const p = pickerById(page, 'basic');
    await p.evaluate((el: any) => el.setAttribute('disabled', ''));
    await expect(inputOf(p)).toBeDisabled();
    expect(await p.evaluate((el: any) => el.matches(':disabled'))).toBe(true);
    await p.evaluate((el: any) => { el.isDisabled = false; });
    expect(await p.evaluate((el: any) => el.hasAttribute('disabled'))).toBe(false);
    await expect(inputOf(p)).toBeEnabled();
    expect(await p.evaluate((el: any) => el.matches(':disabled'))).toBe(false);
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
});

test('fieldset toggle while disabled by its own attribute, then the attribute cleared', async ({ page }) => {
    const p = pickerById(page, 'basic');
    await p.evaluate((el: any) => {
        const fs = document.createElement('fieldset');
        el.parentElement.insertBefore(fs, el);
        fs.appendChild(el);
        fs.disabled = true;
        el.isDisabled = true;
    });
    await expect(inputOf(p)).toBeDisabled();
    // Fieldset re-enabled: still disabled by the own attribute.
    await p.evaluate((el: any) => { el.parentElement.disabled = false; });
    await expect(inputOf(p)).toBeDisabled();
    // Own attribute cleared: enabled.
    await p.evaluate((el: any) => { el.isDisabled = false; });
    await expect(inputOf(p)).toBeEnabled();
    // Fieldset disabled again: disabled, isDisabled untouched.
    await p.evaluate((el: any) => { el.parentElement.disabled = true; });
    await expect(inputOf(p)).toBeDisabled();
    expect(await p.evaluate((el: any) => el.isDisabled)).toBe(false);
    await p.evaluate((el: any) => { el.parentElement.disabled = false; });
    await expect(inputOf(p)).toBeEnabled();
});

test('isDisabled = true suppresses calendar open even via programmatic clicks', async ({ page }) => {
    const p = pickerById(page, 'basic');

    await p.evaluate((el: any) => { el.isDisabled = true; });

    // Force a click past the browser's pointer-events block on the input
    // and confirm the picker still doesn't open (open() guards on input.disabled).
    await inputOf(p).click({ force: true });
    await expect(calendarOf(p)).toBeHidden();

    // Re-enabling restores normal open behavior.
    await p.evaluate((el: any) => { el.isDisabled = false; });
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

    // Now toggle a non-structural option (highlight-disabled-in-range) on the element.
    await p.evaluate(async (el: any) => {
        el.shouldHighlightDisabledInRange = false;
        await el.whenSettled();
    });

    // Selection still there.
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-15');
});

test('a structural key rebuilds the calendar (3 month columns after visibleMonthCount = 3)', async ({ page }) => {
    const p = pickerById(page, 'updateopts');

    await p.evaluate(async (el: any) => {
        el.visibleMonthCount = 3;
        await el.whenSettled();
    });
    await inputOf(p).click();
    await expect(p.locator('.drp__days')).toHaveCount(3);
});
