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
