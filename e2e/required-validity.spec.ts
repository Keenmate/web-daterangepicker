import { test, expect, Page, dayByDate } from './fixtures';

/**
 * `required` (core SPEC §6.6): while there is no complete value — nothing the form would
 * submit — the host has `validity.valueMissing` (message = the `errors.required` label),
 * `:state(required)`, and a form refuses to submit. Read-only / disabled are never missing.
 *
 * Fixture: test/required-validity.html
 */

const PAGE = '/test/required-validity.html';

type Validity = { valueMissing: boolean; customError: boolean; valid: boolean; message: string; check: boolean; isRequiredState: boolean };

function validity(page: Page, id: string): Promise<Validity> {
    return page.locator(`#${id}`).evaluate(async (el: any) => {
        await el.whenSettled();
        return {
            valueMissing: el.validity.valueMissing,
            customError: el.validity.customError,
            valid: el.validity.valid,
            message: el.validationMessage,
            check: el.checkValidity(),
            isRequiredState: el.matches(':state(required)'),
        };
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForFunction(() => (document.getElementById('single') as any)?.isReady);
});

test('required + empty → valueMissing with the errors.required message, :state(required), reflected attribute', async ({ page }) => {
    const v = await validity(page, 'single');
    expect(v).toMatchObject({ valueMissing: true, valid: false, check: false, message: 'Select a date.', isRequiredState: true });
    expect(await page.locator('#single').evaluate((el: any) => el.isRequired)).toBe(true);
    // Core marks the validity anchor (the inner input — focus sits there) aria-required too.
    await expect(page.locator('#single .drp__input')).toHaveAttribute('aria-required', 'true');
    await page.locator('#single').evaluate((el: any) => { el.isRequired = false; });
    expect(await validity(page, 'single')).toMatchObject({ valueMissing: false, valid: true, isRequiredState: false });
    await expect(page.locator('#single')).not.toHaveAttribute('required');
    await expect(page.locator('#single .drp__input')).not.toHaveAttribute('aria-required');
    await page.locator('#single').evaluate((el: any) => { el.isRequired = true; });
    await expect(page.locator('#single')).toHaveAttribute('required', '');
    expect(await validity(page, 'single')).toMatchObject({ valueMissing: true, isRequiredState: true });
});

test('submit is blocked while empty; a picked day clears it and the form submits', async ({ page }) => {
    const invalid = page.locator('#single').evaluate((el: HTMLElement) =>
        new Promise<boolean>((resolve) => el.addEventListener('invalid', () => resolve(true), { once: true })));
    await page.locator('#submit-single').click();
    expect(await invalid).toBe(true);
    expect(await page.evaluate(() => (window as any).submits)).toBe(0);

    const p = page.locator('#single');
    await p.locator('.drp__input').click();
    await dayByDate(p, '2026-06-15').click();
    expect(await validity(page, 'single')).toMatchObject({ valueMissing: false, valid: true, check: true });
    await page.locator('#submit-single').click();
    expect(await page.evaluate(() => (window as any).submits)).toBe(1);
});

test('clearing again (✕, clearSelection(), controller.clearSelection(), value = "") → valueMissing again', async ({ page }) => {
    const p = page.locator('#single');
    const set = () => p.evaluate((el: any) => { el.value = '2026-06-10'; });
    await set();
    expect((await validity(page, 'single')).valueMissing).toBe(false);

    await p.locator('.drp__input-clear').click();
    expect((await validity(page, 'single')).valueMissing).toBe(true);

    await set();
    await p.evaluate((el: any) => el.clearSelection());
    expect((await validity(page, 'single')).valueMissing).toBe(true);

    // The controller path also updates the submitted value (the engine's own clear is silent).
    await set();
    await p.evaluate((el: any) => el.controller.clearSelection());
    expect((await validity(page, 'single')).valueMissing).toBe(true);
    expect(await page.evaluate(() => new FormData(document.getElementById('fs') as HTMLFormElement).get('when'))).toBe('');

    await set();
    await p.evaluate((el: any) => { el.value = ''; });
    expect((await validity(page, 'single')).valueMissing).toBe(true);
});

test('range: a half-picked range is empty, a complete one is a value', async ({ page }) => {
    const p = page.locator('#range');
    expect((await validity(page, 'range')).valueMissing).toBe(true);
    await dayByDate(p, '2026-06-10').click();
    expect((await validity(page, 'range')).valueMissing).toBe(true);
    await dayByDate(p, '2026-06-14').click();
    expect(await validity(page, 'range')).toMatchObject({ valueMissing: false, valid: true });
    await p.evaluate((el: any) => { el.selectedRanges = []; });
    expect((await validity(page, 'range')).valueMissing).toBe(true);
});

test('form.reset(): back to the value attribute (valid) / to empty (missing)', async ({ page }) => {
    expect((await validity(page, 'valued')).valueMissing).toBe(false);
    await page.locator('#valued').evaluate((el: any) => el.clearSelection());
    expect((await validity(page, 'valued')).valueMissing).toBe(true);
    await page.locator('#reset-valued').click();
    expect((await validity(page, 'valued')).valueMissing).toBe(false);

    await page.locator('#single').evaluate((el: any) => { el.value = '2026-06-10'; });
    expect((await validity(page, 'single')).valueMissing).toBe(false);
    await page.locator('#reset-single').click();
    expect((await validity(page, 'single')).valueMissing).toBe(true);
});

test('read-only / disabled / a disabled fieldset are never missing', async ({ page }) => {
    const p = page.locator('#single');
    await p.evaluate((el: any) => { el.isReadonly = true; });
    expect(await validity(page, 'single')).toMatchObject({ valueMissing: false, isRequiredState: true });
    await p.evaluate((el: any) => { el.isReadonly = false; el.isDisabled = true; });
    expect((await validity(page, 'single')).valueMissing).toBe(false);
    await p.evaluate((el: any) => { el.isDisabled = false; });
    expect((await validity(page, 'single')).valueMissing).toBe(true);

    await p.evaluate((el: HTMLElement) => {
        const fs = document.createElement('fieldset');
        el.parentElement!.insertBefore(fs, el);
        fs.appendChild(el);
        fs.disabled = true;
    });
    expect((await validity(page, 'single')).valueMissing).toBe(false);
});

test('time mode: no time is empty, a time is a value', async ({ page }) => {
    expect((await validity(page, 'time')).valueMissing).toBe(true);
    await page.locator('#time').evaluate((el: any) => { el.value = '14:30'; });
    expect((await validity(page, 'time')).valueMissing).toBe(false);
});

test('not required → valid while empty, no :state(required)', async ({ page }) => {
    expect(await validity(page, 'optional')).toMatchObject({ valueMissing: false, valid: true, isRequiredState: false });
});

test('labels: errors.required overrides the message', async ({ page }) => {
    await page.locator('#single').evaluate((el: any) => { el.labels = { 'errors.required': 'Pick a day.' }; });
    expect((await validity(page, 'single')).message).toBe('Pick a day.');
});

test('a getValueFormatCallback error stays customError, independent of required', async ({ page, pageErrors }) => {
    const p = page.locator('#single');
    await p.evaluate((el: any) => {
        el.getValueFormatCallback = () => { throw new Error('boom'); };
        el.value = '2026-06-10';
    });
    expect(await validity(page, 'single')).toMatchObject({ valueMissing: false, customError: true });
    await p.evaluate((el: any) => { el.getValueFormatCallback = null; el.value = ''; });
    expect(await validity(page, 'single')).toMatchObject({ valueMissing: true, customError: false });
    pageErrors.length = 0;
});

test('reportValidity anchors on the visible input — no "anchor rejected" warning, also after a rebuild', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (m) => { if (/anchor rejected/.test(m.text())) warnings.push(m.text()); });
    const p = page.locator('#single');
    expect(await p.evaluate((el: any) => el.reportValidity())).toBe(false);
    // A structural rebuild (inline → floating) replaces the input.
    await p.evaluate(async (el: any) => { el.positioningMode = 'inline'; await el.whenSettled(); el.positioningMode = 'floating'; await el.whenSettled(); });
    await p.evaluate((el: any) => { el.isRequired = false; });
    await p.evaluate((el: any) => { el.isRequired = true; });
    expect(await p.evaluate((el: any) => el.reportValidity())).toBe(false);
    expect((await validity(page, 'single')).valueMissing).toBe(true);
    await expect(p.locator('.drp__input')).toHaveAttribute('aria-required', 'true');
    expect(warnings).toEqual([]);
});

test('typed text that is not a complete date is empty; a complete typed date is a value', async ({ page }) => {
    const input = page.locator('#single .drp__input');
    await input.click();
    await input.pressSequentially('2026-06');
    expect((await validity(page, 'single')).valueMissing).toBe(true);
    await input.pressSequentially('-12');
    await page.keyboard.press('Enter');
    expect((await validity(page, 'single')).valueMissing).toBe(false);
});
