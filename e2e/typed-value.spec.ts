import { test, expect, Page, Locator, pickerById, dayByDate } from './fixtures';

/**
 * A valid date TYPED into the input becomes the value — native <input> semantics:
 * the typed text is the value once committed (Enter / Tab = blur), `change`
 * fires, the form submits it. Same commit path as a calendar pick.
 *
 * Fixture: test/typed-value.html
 */

const PAGE = '/test/typed-value.html';

const textInput = (p: Locator) => p.locator('input.drp__input');
const value = (p: Locator) => p.evaluate((el: any) => el.value);
const changes = (page: Page, id: string) => page.evaluate((i) => (window as any).__changes[i] ?? [], id);
const formValue = (page: Page, name: string) => page.evaluate((n) => (window as any).__formValue(n), name);

async function typeInto(p: Locator, text: string) {
    const inp = textInput(p);
    await inp.click();
    await inp.pressSequentially(text);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('#datetime[ready]').waitFor();
});

test('single: a typed date + Enter becomes the value, submits and fires change once', async ({ page }) => {
    const p = pickerById(page, 'single');
    await typeInto(p, '20260615');
    await textInput(p).press('Enter');
    await expect.poll(() => value(p)).toBe('2026-06-15');
    expect(await formValue(page, 'single')).toEqual(['2026-06-15']);
    expect(await changes(page, 'single')).toEqual(['2026-06-15']);
    await expect(textInput(p)).toHaveValue('2026-06-15');
});

test('single: a typed date + Tab becomes the value', async ({ page }) => {
    const p = pickerById(page, 'single');
    await typeInto(p, '20260615');
    await textInput(p).press('Tab');
    await expect.poll(() => value(p)).toBe('2026-06-15');
    expect(await formValue(page, 'single')).toEqual(['2026-06-15']);
    expect(await changes(page, 'single')).toEqual(['2026-06-15']);
    await expect(textInput(p)).toHaveValue('2026-06-15');
});

test('single: committing the same typed date again fires no second change', async ({ page }) => {
    const p = pickerById(page, 'single');
    await typeInto(p, '20260615');
    await textInput(p).press('Enter');
    await expect.poll(() => value(p)).toBe('2026-06-15');
    await textInput(p).focus();
    await textInput(p).press('Tab');
    expect(await changes(page, 'single')).toEqual(['2026-06-15']);
});

test('single: a typed date replaces a previously committed one', async ({ page }) => {
    const p = pickerById(page, 'single');
    await p.evaluate((el: any) => { el.value = '2026-01-10'; });
    await textInput(p).click();
    await textInput(p).fill('');
    await textInput(p).pressSequentially('20260615');
    await textInput(p).press('Tab');
    await expect.poll(() => value(p)).toBe('2026-06-15');
    // Emptying the text is itself a committed clear (like the ✕), then the typed date.
    expect(await changes(page, 'single')).toEqual(['', '2026-06-15']);
});

test('range: opening the calendar on a committed range fires no change', async ({ page }) => {
    const p = pickerById(page, 'range');
    await p.evaluate((el: any) => { el.value = '2026-06-10/2026-06-15'; });
    await textInput(p).click();
    await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--range-end/);
    expect(await value(p)).toBe('2026-06-10/2026-06-15');
    expect(await changes(page, 'range')).toEqual([]);
});

test('single DD.MM.YYYY, manual trigger (calendar closed): typed date + Enter', async ({ page }) => {
    const p = pickerById(page, 'single-eu');
    await typeInto(p, '15062026');
    await expect(textInput(p)).toHaveValue('15.06.2026');
    await textInput(p).press('Enter');
    await expect.poll(() => value(p)).toBe('2026-06-15');
    expect(await formValue(page, 'singleEu')).toEqual(['2026-06-15']);
    expect(await changes(page, 'single-eu')).toEqual(['15.06.2026']);
});

test('single DD.MM.YYYY, manual trigger: typed date + Tab', async ({ page }) => {
    const p = pickerById(page, 'single-eu');
    await typeInto(p, '15062026');
    await textInput(p).press('Tab');
    await expect.poll(() => value(p)).toBe('2026-06-15');
    expect(await changes(page, 'single-eu')).toEqual(['15.06.2026']);
});

test('single: an incomplete typed date does not change the value', async ({ page }) => {
    const p = pickerById(page, 'single');
    await typeInto(p, '202606');
    await textInput(p).press('Tab');
    expect(await value(p)).toBe('');
    expect(await changes(page, 'single')).toEqual([]);
});

test('single: an impossible typed date (02-30) does not change the value', async ({ page }) => {
    const p = pickerById(page, 'single');
    await typeInto(p, '20260230');
    await textInput(p).press('Tab');
    expect(await value(p)).toBe('');
    expect(await changes(page, 'single')).toEqual([]);
});

test('range: a typed range + Enter becomes the value', async ({ page }) => {
    const p = pickerById(page, 'range');
    await typeInto(p, '2026061020260615');
    await expect(textInput(p)).toHaveValue('2026-06-10 - 2026-06-15');
    await textInput(p).press('Enter');
    await expect.poll(() => value(p)).toBe('2026-06-10/2026-06-15');
    expect(await formValue(page, 'range')).toEqual(['2026-06-10/2026-06-15']);
    expect(await changes(page, 'range')).toEqual(['2026-06-10 - 2026-06-15']);
});

test('range: a typed range + Tab becomes the value', async ({ page }) => {
    const p = pickerById(page, 'range');
    await typeInto(p, '2026061020260615');
    await textInput(p).press('Tab');
    await expect.poll(() => value(p)).toBe('2026-06-10/2026-06-15');
    expect(await changes(page, 'range')).toEqual(['2026-06-10 - 2026-06-15']);
});

test('apply mode: a typed date + Enter commits (like Apply)', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await typeInto(p, '20260615');
    await textInput(p).press('Enter');
    await expect.poll(() => value(p)).toBe('2026-06-15');
    expect(await changes(page, 'single-apply')).toEqual(['2026-06-15']);
});

test('apply mode: a typed date is staged — the Apply button commits it', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await typeInto(p, '20260615');
    await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--selected/);
    expect(await value(p)).toBe('');
    expect(await changes(page, 'single-apply')).toEqual([]);
    await p.locator('.drp__button--apply').click();
    await expect.poll(() => value(p)).toBe('2026-06-15');
    expect(await formValue(page, 'singleApply')).toEqual(['2026-06-15']);
    expect(await changes(page, 'single-apply')).toEqual(['2026-06-15']);
});

test('manual mode: a typed date is staged — the app commit() commits it', async ({ page }) => {
    const p = pickerById(page, 'single-manual');
    await typeInto(p, '20260615');
    await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--selected/);
    expect(await value(p)).toBe('');
    await p.evaluate((el: any) => el.commit());
    await expect.poll(() => value(p)).toBe('2026-06-15');
    expect(await changes(page, 'single-manual')).toEqual(['2026-06-15']);
});

test('manual mode: a typed range is staged — the app commit() commits it', async ({ page }) => {
    const p = pickerById(page, 'range-manual');
    await typeInto(p, '2026061020260615');
    await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--range-end/);
    await p.evaluate((el: any) => el.commit());
    await expect.poll(() => value(p)).toBe('2026-06-10/2026-06-15');
    expect(await changes(page, 'range-manual')).toEqual(['2026-06-10 - 2026-06-15']);
});

// Typing in datetime mode is not implemented: the input mask is date-only (it cuts the
// time off) and updateCalendarFromInput() bails for time / datetime. Open question.
test.fixme('datetime: a typed date + time + Enter becomes the value', async ({ page }) => {
    const p = pickerById(page, 'datetime');
    await typeInto(p, '202606151430');
    await expect(textInput(p)).toHaveValue('2026-06-15 14:30');
    await textInput(p).press('Enter');
    await expect.poll(() => value(p)).not.toBe('');
    expect(await changes(page, 'datetime')).toEqual(['2026-06-15 14:30']);
});

test('single: beforeSelectCallback runs for a typed date — a returned Date adjusts it', async ({ page }) => {
    const p = pickerById(page, 'single');
    await p.evaluate((el: any) => {
        el.beforeSelectCallback = (ctx: any) => new Date(ctx.date.getFullYear(), ctx.date.getMonth(), ctx.date.getDate() + 1);
    });
    await typeInto(p, '20260615');
    await expect.poll(() => value(p)).toBe('2026-06-16');
    await expect(textInput(p)).toHaveValue('2026-06-16');
});

test('single: beforeSelectCallback returning false rejects a typed date', async ({ page }) => {
    const p = pickerById(page, 'single');
    await p.evaluate((el: any) => { el.beforeSelectCallback = () => false; });
    await typeInto(p, '20260615');
    await textInput(p).press('Tab');
    expect(await value(p)).toBe('');
    expect(await changes(page, 'single')).toEqual([]);
});

// =============================================================================
// Clearing is a change like any other: emptying the text, the footer Clear and
// the input ✕ commit an empty value (selection mode) or stage it (apply / manual).
// =============================================================================

const calendar = (p: Locator) => p.locator('.drp__picker');

async function emptyText(p: Locator) {
    const inp = textInput(p);
    await inp.click();
    await inp.press('ControlOrMeta+a');
    await inp.press('Backspace');
}

async function seed(p: Locator, v: string) {
    await p.evaluate((el: any, val) => { el.value = val; }, v);
    await expect(textInput(p)).not.toHaveValue('');
}

test('clear: an initially empty form field submits an empty value', async ({ page }) => {
    expect(await formValue(page, 'single')).toEqual(['']);
});

test('single: emptying the text clears the value, the form value and fires change once', async ({ page }) => {
    const p = pickerById(page, 'single');
    await seed(p, '2026-06-15');
    await emptyText(p);
    await expect.poll(() => value(p)).toBe('');
    expect(await formValue(page, 'single')).toEqual(['']);
    await textInput(p).press('Tab');
    expect(await changes(page, 'single')).toEqual(['']);
});

test('single: the footer Clear clears the value and fires change once', async ({ page }) => {
    const p = pickerById(page, 'single');
    await seed(p, '2026-06-15');
    await textInput(p).click();
    await p.locator('.drp__button--clear').click();
    await expect(textInput(p)).toHaveValue('');
    await expect.poll(() => value(p)).toBe('');
    expect(await formValue(page, 'single')).toEqual(['']);
    expect(await changes(page, 'single')).toEqual(['']);
});

test('single: the input ✕ clears the value and fires change once', async ({ page }) => {
    const p = pickerById(page, 'single');
    await seed(p, '2026-06-15');
    await p.locator('.drp__input-clear').click();
    await expect(textInput(p)).toHaveValue('');
    await expect.poll(() => value(p)).toBe('');
    expect(await formValue(page, 'single')).toEqual(['']);
    expect(await changes(page, 'single')).toEqual(['']);
});

test('single: clearing an already empty field fires no change', async ({ page }) => {
    const p = pickerById(page, 'single');
    await textInput(p).click();
    await p.locator('.drp__button--clear').click();
    await textInput(p).pressSequentially('2026');
    await textInput(p).press('ControlOrMeta+a');
    await textInput(p).press('Backspace');
    await textInput(p).press('Tab');
    expect(await value(p)).toBe('');
    expect(await changes(page, 'single')).toEqual([]);
});

test('single: a typed date, then emptying the text: one change each', async ({ page }) => {
    const p = pickerById(page, 'single');
    await typeInto(p, '20260615');
    await expect.poll(() => value(p)).toBe('2026-06-15');
    await textInput(p).press('ControlOrMeta+a');
    await textInput(p).press('Backspace');
    await expect.poll(() => value(p)).toBe('');
    expect(await changes(page, 'single')).toEqual(['2026-06-15', '']);
});

test('range: emptying the text clears the value and fires change once', async ({ page }) => {
    const p = pickerById(page, 'range');
    await seed(p, '2026-06-10/2026-06-15');
    await emptyText(p);
    await expect.poll(() => value(p)).toBe('');
    expect(await formValue(page, 'range')).toEqual(['']);
    expect(await changes(page, 'range')).toEqual(['']);
});

test('range: the footer Clear clears the value and fires change once', async ({ page }) => {
    const p = pickerById(page, 'range');
    await seed(p, '2026-06-10/2026-06-15');
    await textInput(p).click();
    await p.locator('.drp__button--clear').click();
    await expect.poll(() => value(p)).toBe('');
    expect(await formValue(page, 'range')).toEqual(['']);
    expect(await changes(page, 'range')).toEqual(['']);
});

test('apply mode: the footer Clear is staged — Apply commits the empty value', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await seed(p, '2026-06-15');
    await textInput(p).click();
    await p.locator('.drp__button--clear').click();
    await expect(textInput(p)).toHaveValue('');
    expect(await value(p)).toBe('2026-06-15');
    expect(await changes(page, 'single-apply')).toEqual([]);
    await p.locator('.drp__button--apply').click();
    await expect.poll(() => value(p)).toBe('');
    expect(await formValue(page, 'singleApply')).toEqual(['']);
    expect(await changes(page, 'single-apply')).toEqual(['']);
});

test('apply mode: a staged clear is discarded when closing without Apply', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await seed(p, '2026-06-15');
    await textInput(p).click();
    await p.locator('.drp__button--clear').click();
    await page.keyboard.press('Escape');
    await expect(calendar(p)).toBeHidden();
    await expect(textInput(p)).toHaveValue('2026-06-15');
    expect(await value(p)).toBe('2026-06-15');
    expect(await changes(page, 'single-apply')).toEqual([]);
});

test('apply mode: emptying the text is staged — Enter commits it', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await seed(p, '2026-06-15');
    await emptyText(p);
    expect(await value(p)).toBe('2026-06-15');
    expect(await changes(page, 'single-apply')).toEqual([]);
    await textInput(p).press('Enter');
    await expect.poll(() => value(p)).toBe('');
    expect(await changes(page, 'single-apply')).toEqual(['']);
});

test('apply mode: the input ✕ is staged — Apply commits it', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await seed(p, '2026-06-15');
    await textInput(p).click();
    await p.locator('.drp__input-clear').click();
    expect(await value(p)).toBe('2026-06-15');
    expect(await formValue(page, 'singleApply')).toEqual(['2026-06-15']);
    await p.locator('.drp__button--apply').click();
    await expect.poll(() => value(p)).toBe('');
    expect(await changes(page, 'single-apply')).toEqual(['']);
});

test('manual mode: emptying the text is staged — the app commit() commits it', async ({ page }) => {
    const p = pickerById(page, 'range-manual');
    await seed(p, '2026-06-10/2026-06-15');
    await emptyText(p);
    expect(await value(p)).toBe('2026-06-10/2026-06-15');
    await p.evaluate((el: any) => el.commit());
    await expect.poll(() => value(p)).toBe('');
    expect(await formValue(page, 'rangeManual')).toEqual(['']);
    expect(await changes(page, 'range-manual')).toEqual(['']);
});

test('apply mode: Clear + Apply on an already empty value fires no change', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await textInput(p).click();
    await p.locator('.drp__button--clear').click();
    await p.locator('.drp__button--apply').click();
    expect(await value(p)).toBe('');
    expect(await changes(page, 'single-apply')).toEqual([]);
});

test('single: beforeSelectCallback returning null clears the committed value (one change)', async ({ page }) => {
    const p = pickerById(page, 'single');
    await seed(p, '2026-06-15');
    await p.evaluate((el: any) => { el.beforeSelectCallback = () => null; });
    await textInput(p).click();
    await dayByDate(p, '2026-06-20').click();
    await expect.poll(() => value(p)).toBe('');
    expect(await formValue(page, 'single')).toEqual(['']);
    expect(await changes(page, 'single')).toEqual(['']);
});

// ── a discarded staged change restores the input TEXT (apply / manual) ──────────
// Closing without Apply / commit() reverts the selection AND the text (+ the ✕) to the
// committed value — also when the change was staged while the calendar was closed
// (re-focusing reopens it; the next close is the discard).

const inputClear = (p: Locator) => p.locator('.drp__input-clear');

async function expectRestored(page: Page, p: Locator, id: string, name: string) {
    await expect(calendar(p)).toBeHidden();
    await expect(textInput(p)).toHaveValue('2026-06-15');
    await expect(inputClear(p)).toHaveClass(/drp__input-clear--visible/);
    expect(await value(p)).toBe('2026-06-15');
    expect(await formValue(page, name)).toEqual(['2026-06-15']);
    expect(await changes(page, id)).toEqual([]);
}

/** Open, then Escape: the calendar is closed, focus stays in the input. */
async function openAndClose(p: Locator) {
    await textInput(p).click();
    await expect(calendar(p)).toBeVisible();
    await textInput(p).press('Escape');
    await expect(calendar(p)).toBeHidden();
}

/** Reopen (if the change left it closed), then close without committing. */
async function discard(p: Locator) {
    if (!(await calendar(p).isVisible())) await textInput(p).click();
    await expect(calendar(p)).toBeVisible();
    await textInput(p).press('Escape');
}

for (const [id, name] of [['single-apply', 'singleApply'], ['single-manual', 'singleManual']] as const) {
    test(`${id}: emptied text, calendar open — discarded on close restores the text`, async ({ page }) => {
        const p = pickerById(page, id);
        await seed(p, '2026-06-15');
        await emptyText(p);
        await expect(calendar(p)).toBeVisible();
        await expect(textInput(p)).toHaveValue('');
        await discard(p);
        await expectRestored(page, p, id, name);
    });

    test(`${id}: the ✕, calendar closed — discarded on the next close restores the text`, async ({ page }) => {
        const p = pickerById(page, id);
        await seed(p, '2026-06-15');
        await openAndClose(p);
        await inputClear(p).click();
        await expect(textInput(p)).toHaveValue('');
        await expect(inputClear(p)).not.toHaveClass(/drp__input-clear--visible/);
        await discard(p);
        await expectRestored(page, p, id, name);
    });

    test(`${id}: emptied text, calendar closed — discarded on the next close restores the text`, async ({ page }) => {
        const p = pickerById(page, id);
        await seed(p, '2026-06-15');
        await openAndClose(p);
        await textInput(p).press('ControlOrMeta+a');
        await textInput(p).press('Backspace');
        await expect(textInput(p)).toHaveValue('');
        await discard(p);
        await expectRestored(page, p, id, name);
    });

    test(`${id}: typed date, calendar open — discarded on close shows the committed date again`, async ({ page }) => {
        const p = pickerById(page, id);
        await seed(p, '2026-06-15');
        await textInput(p).click();
        await expect(calendar(p)).toBeVisible();
        await textInput(p).press('ControlOrMeta+a');
        await textInput(p).pressSequentially('20260620');
        await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--selected/);
        await discard(p);
        await expectRestored(page, p, id, name);
    });

    test(`${id}: typed date, calendar closed — discarded on the next close shows the committed date again`, async ({ page }) => {
        const p = pickerById(page, id);
        await seed(p, '2026-06-15');
        await openAndClose(p);
        await textInput(p).press('ControlOrMeta+a');
        await textInput(p).pressSequentially('20260620');
        await expect(textInput(p)).toHaveValue('2026-06-20');
        await discard(p);
        await expectRestored(page, p, id, name);
        // Reopening shows the committed date selected, not the discarded one.
        await textInput(p).click();
        await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--selected/);
        await expect(dayByDate(p, '2026-06-20')).not.toHaveClass(/drp__day--selected/);
    });
}

// ── multiple mode: a discarded staged change restores the committed dates + text ──
// Multiple mode keeps a committed snapshot like single / range: closing without
// Apply / commit() reverts the toggled days (and the text / ✕ / value with them).

const MULTI_SEED = '2026-06-10, 2026-06-12';

async function seedMultiple(p: Locator) {
    await p.evaluate((el: any, v) => { el.value = v; }, MULTI_SEED);
    await expect(textInput(p)).toHaveValue('2 selected');
}

async function expectMultipleRestored(page: Page, p: Locator, id: string, name: string, seeded: string[]) {
    await expect(calendar(p)).toBeHidden();
    await expect(textInput(p)).toHaveValue('2 selected');
    await expect(inputClear(p)).toHaveClass(/drp__input-clear--visible/);
    expect(await value(p)).toBe(seeded[0]);
    expect(await formValue(page, name)).toEqual([seeded[1]]);
    expect(await changes(page, id)).toEqual([]);
    // Reopening shows the committed days, not the discarded toggles.
    await textInput(p).click();
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--selected/);
    await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--selected/);
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--selected/);
    await expect(dayByDate(p, '2026-06-16')).not.toHaveClass(/drp__day--selected/);
}

/** Current el.value + submitted form value — the committed state to compare against. */
async function committedState(page: Page, p: Locator, name: string): Promise<string[]> {
    return [await value(p), (await formValue(page, name))[0]];
}

for (const [id, name] of [['multiple-apply', 'multipleApply'], ['multiple-manual', 'multipleManual']] as const) {
    test(`${id}: extra days picked, then closed — the committed set and text are restored`, async ({ page }) => {
        const p = pickerById(page, id);
        await seedMultiple(p);
        const seeded = await committedState(page, p, name);
        expect(seeded[0]).not.toBe('');
        await textInput(p).click();
        await expect(calendar(p)).toBeVisible();
        await dayByDate(p, '2026-06-15').click();
        await dayByDate(p, '2026-06-16').click();
        await dayByDate(p, '2026-06-10').click(); // toggled off
        await expect(textInput(p)).toHaveValue('2 selected'); // staged: text untouched
        await page.keyboard.press('Escape');
        await expectMultipleRestored(page, p, id, name, seeded);
    });

    test(`${id}: the ✕, calendar closed — discarded on the next close restores the set`, async ({ page }) => {
        const p = pickerById(page, id);
        await seedMultiple(p);
        const seeded = await committedState(page, p, name);
        await openAndClose(p);
        await inputClear(p).click();
        await expect(textInput(p)).toHaveValue('');
        await discard(p);
        await expectMultipleRestored(page, p, id, name, seeded);
    });

    test(`${id}: a set assigned via selectedDates is what a discard restores`, async ({ page }) => {
        const p = pickerById(page, id);
        // An older committed value (also shows June), then the assigned set replaces it.
        await p.evaluate((el: any) => { el.value = '2026-06-20'; });
        await expect(textInput(p)).toHaveValue('1 selected');
        await p.evaluate(async (el: any) => {
            el.selectedDates = [new Date(2026, 5, 10), new Date(2026, 5, 12)];
            await el.whenSettled();
        });
        await expect(textInput(p)).toHaveValue('2 selected');
        const seeded = await committedState(page, p, name);
        await textInput(p).click();
        await dayByDate(p, '2026-06-15').click();
        await page.keyboard.press('Escape');
        await expectMultipleRestored(page, p, id, name, seeded);
        await expect(dayByDate(p, '2026-06-20')).not.toHaveClass(/drp__day--selected/);
    });
}

test('multiple-apply: Apply commits the picked days — change once, value, text; a later discard keeps them', async ({ page }) => {
    const p = pickerById(page, 'multiple-apply');
    await seedMultiple(p);
    await textInput(p).click();
    await dayByDate(p, '2026-06-15').click();
    await p.locator('.drp__button--apply').click();
    await expect(calendar(p)).toBeHidden();
    await expect(textInput(p)).toHaveValue('3 selected');
    const committed = await committedState(page, p, 'multipleApply');
    expect(committed[0]).toContain('2026-06-15');
    expect(committed[1]).toBe(committed[0]);
    expect(await changes(page, 'multiple-apply')).toHaveLength(1);
    // The Apply moved the snapshot: a later discarded toggle restores the 3 days.
    await textInput(p).click();
    await dayByDate(p, '2026-06-16').click();
    await page.keyboard.press('Escape');
    await expect(calendar(p)).toBeHidden();
    await expect(textInput(p)).toHaveValue('3 selected');
    expect(await committedState(page, p, 'multipleApply')).toEqual(committed);
    expect(await changes(page, 'multiple-apply')).toHaveLength(1);
});

test('multiple-manual: commit() commits the picked days', async ({ page }) => {
    const p = pickerById(page, 'multiple-manual');
    await seedMultiple(p);
    await textInput(p).click();
    await dayByDate(p, '2026-06-15').click();
    await p.evaluate((el: any) => el.commit());
    await expect(calendar(p)).toBeHidden();
    await expect(textInput(p)).toHaveValue('3 selected');
    const committed = await committedState(page, p, 'multipleManual');
    expect(committed[0]).toContain('2026-06-15');
    expect(await changes(page, 'multiple-manual')).toHaveLength(1);
});

// ── leaving the field / Escape discards a staged change (apply / manual) ─────────
// User decision 2026-11-20: a staged change (typed date, ✕ / emptied text, calendar pick)
// is discarded when the focus leaves the component (Tab / click elsewhere — the calendar
// and its controls are part of it) or on Escape, also with the calendar CLOSED. Discard =
// the committed selection, text and ✕ again, no `change`.

type Stage = 'typed' | 'clear' | 'pick';
type Leave = 'tab' | 'click' | 'escape';

/** Seed 2026-06-15 as committed, then stage a change to 2026-06-20 / empty. */
async function stageChange(p: Locator, kind: Stage, isOpen: boolean) {
    await seed(p, '2026-06-15');
    if (isOpen) {
        await textInput(p).click();
        await expect(calendar(p)).toBeVisible();
    } else {
        await openAndClose(p);
    }
    if (kind === 'typed') {
        await textInput(p).press('ControlOrMeta+a');
        await textInput(p).pressSequentially('20260620');
        await expect(textInput(p)).toHaveValue('2026-06-20');
        if (isOpen) await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--selected/);
    } else if (kind === 'clear') {
        await inputClear(p).click();
        await expect(textInput(p)).toHaveValue('');
    } else {
        await dayByDate(p, '2026-06-20').click();
        await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--selected/);
    }
    expect(await value(p)).toBe('2026-06-15'); // staged, not committed
}

async function leaveField(page: Page, id: string, how: Leave) {
    if (how === 'escape') {
        await page.keyboard.press('Escape');
    } else if (how === 'click') {
        await page.locator('h1').click(); // a non-focusable spot outside
    } else {
        // Tab until the focus reaches the plain button after the picker (the calendar's
        // own controls come first while it is open — they are not "leaving").
        for (let i = 0; i < 40; i++) {
            if (await page.evaluate(() => document.activeElement?.id) === `next-${id}`) break;
            await page.keyboard.press('Tab');
        }
        await expect(page.locator(`#next-${id}`)).toBeFocused();
    }
}

async function expectDiscarded(page: Page, p: Locator, id: string, name: string) {
    await expect(textInput(p)).toHaveValue('2026-06-15');
    await expect(inputClear(p)).toHaveClass(/drp__input-clear--visible/);
    expect(await value(p)).toBe('2026-06-15');
    expect(await formValue(page, name)).toEqual(['2026-06-15']);
    expect(await changes(page, id)).toEqual([]);
    // The calendar (still open, or reopened) shows the committed day, not the discarded one.
    if (!(await calendar(p).isVisible())) await textInput(p).click();
    await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--selected/);
    await expect(dayByDate(p, '2026-06-20')).not.toHaveClass(/drp__day--selected/);
    expect(await changes(page, id)).toEqual([]);
}

const LEAVE_CASES: [Stage, boolean][] = [
    ['typed', true], ['typed', false], ['clear', true], ['clear', false], ['pick', true],
];

for (const [id, name] of [['single-apply', 'singleApply'], ['single-manual', 'singleManual']] as const) {
    for (const [kind, isOpen] of LEAVE_CASES) {
        for (const how of ['tab', 'click', 'escape'] as const) {
            test(`${id}: ${kind}, calendar ${isOpen ? 'open' : 'closed'} — ${how} discards the staged change`, async ({ page }) => {
                const p = pickerById(page, id);
                await stageChange(p, kind, isOpen);
                await leaveField(page, id, how);
                await expectDiscarded(page, p, id, name);
            });
        }
    }

    test(`${id}: moving into the calendar and its year / month selector keeps the staged change`, async ({ page }) => {
        const p = pickerById(page, id);
        await stageChange(p, 'typed', true);
        await textInput(p).press('Tab'); // into the calendar
        await expect(textInput(p)).not.toBeFocused();
        await p.locator('.drp__month-year').first().click();
        await expect(p.locator('.drp__rolling-selector--visible').first()).toBeVisible();
        await p.locator('.drp__month-year').first().click();
        await expect(p.locator('.drp__rolling-selector--visible')).toHaveCount(0);
        await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--selected/);
        await expect(textInput(p)).toHaveValue('2026-06-20');
        expect(await value(p)).toBe('2026-06-15');
    });
}

test('single-apply: a staged pick — the Apply button click still commits it', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await stageChange(p, 'pick', true);
    await p.locator('.drp__button--apply').click();
    await expect(calendar(p)).toBeHidden();
    await expect.poll(() => value(p)).toBe('2026-06-20');
    await expect(textInput(p)).toHaveValue('2026-06-20');
    expect(await formValue(page, 'singleApply')).toEqual(['2026-06-20']);
    expect(await changes(page, 'single-apply')).toEqual(['2026-06-20']);
});

test('single-apply: a typed date, calendar closed — Enter still commits it', async ({ page }) => {
    const p = pickerById(page, 'single-apply');
    await stageChange(p, 'typed', false);
    await textInput(p).press('Enter');
    await expect.poll(() => value(p)).toBe('2026-06-20');
    expect(await changes(page, 'single-apply')).toEqual(['2026-06-20']);
});

test('single-manual: commit() before leaving commits — leaving afterwards keeps it', async ({ page }) => {
    const p = pickerById(page, 'single-manual');
    await stageChange(p, 'typed', false);
    await p.evaluate((el: any) => el.commit());
    await expect.poll(() => value(p)).toBe('2026-06-20');
    await leaveField(page, 'single-manual', 'tab');
    await expect(textInput(p)).toHaveValue('2026-06-20');
    expect(await value(p)).toBe('2026-06-20');
    expect(await changes(page, 'single-manual')).toEqual(['2026-06-20']);
});

test('single-manual: an app button whose click calls commit() commits the staged change', async ({ page }) => {
    const p = pickerById(page, 'single-manual');
    await stageChange(p, 'typed', true);
    await page.locator('#commit-single-manual').click();
    await expect.poll(() => value(p)).toBe('2026-06-20');
    await expect(textInput(p)).toHaveValue('2026-06-20');
    expect(await formValue(page, 'singleManual')).toEqual(['2026-06-20']);
    expect(await changes(page, 'single-manual')).toEqual(['2026-06-20']);
});
