import { test, expect, Page, Locator, dayByDate } from './fixtures';

/**
 * Form association. `<web-daterangepicker>` submits a stable ISO value under its
 * `name` through a light-DOM hidden `<input>` (web-multiselect's model), exposes
 * `el.form` (via core's BlissElement), and clears with `form.reset()`. The
 * submitted value is format-mask-independent; `value-format` / `getValueFormatCallback`
 * pick the serialization. This is the surface host frameworks depend on — e.g.
 * Phoenix LiveView resolves the parent form via `event.target.form`.
 *
 * Real Chromium wires ElementInternals + native form submission fully (jsdom does
 * not), so these assert the actual browser behaviour.
 *
 * Fixture: test/form-association.html
 */

const PAGE = '/test/form-association.html';

// The VISIBLE input only — the light-DOM hidden form input is also an <input>.
function visibleInput(p: Locator) {
    return p.locator('.drp__input');
}

function formValue(page: Page, formId: string, name = 'range') {
    return page.evaluate(
        ([id, n]) => new FormData(document.getElementById(id) as HTMLFormElement).get(n),
        [formId, name] as const,
    );
}

function formValues(page: Page, formId: string, name = 'range[]') {
    return page.evaluate(
        ([id, n]) => new FormData(document.getElementById(id) as HTMLFormElement).getAll(n),
        [formId, name] as const,
    );
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('el.form resolves the containing form (and event.target.form does too)', async ({ page }) => {
    const resolved = await page.locator('#picker').evaluate((el: any) => {
        const byGetter = el.form === document.getElementById('f');
        // event.target.form — the exact shape LiveView's phx-change reads.
        const byEventTarget = ({ target: el }).target.form === document.getElementById('f');
        return { byGetter, byEventTarget };
    });
    expect(resolved.byGetter).toBe(true);
    expect(resolved.byEventTarget).toBe(true);
});

test('selecting a date submits the ISO value under the name (single entry, no double-submit)', async ({ page }) => {
    const p = page.locator('#picker');

    // Nothing selected yet → empty form value.
    expect(await formValue(page, 'f')).toBe('');

    await visibleInput(p).click();
    await dayByDate(p, '2026-06-15').click();

    expect(await formValue(page, 'f')).toBe('2026-06-15');
    // The form-associated host itself must NOT also submit under `range`.
    expect(await formValues(page, 'f', 'range')).toEqual(['2026-06-15']);
});

test('a programmatic value is reflected into the form submission', async ({ page }) => {
    await page.locator('#picker').evaluate(async (el: any) => {
        el.value = '2026-07-04';
        await el.whenSettled();
    });
    expect(await formValue(page, 'f')).toBe('2026-07-04');
});

test('a disabled picker submits nothing (native semantics); enabled again it submits its value', async ({ page }) => {
    const p = page.locator('#picker');
    await p.evaluate(async (el: any) => { el.value = '2026-07-04'; await el.whenSettled(); });
    expect(await formValue(page, 'f')).toBe('2026-07-04');

    await p.evaluate(async (el: any) => { el.setAttribute('disabled', ''); await el.whenSettled(); });
    expect(await formValue(page, 'f')).toBeNull();
    // A selection written while disabled re-renders the field — still not submitted.
    await p.evaluate(async (el: any) => { el.value = '2026-07-05'; await el.whenSettled(); });
    expect(await formValue(page, 'f')).toBeNull();

    await p.evaluate(async (el: any) => { el.isDisabled = false; await el.whenSettled(); });
    expect(await formValue(page, 'f')).toBe('2026-07-05');
});

test('a picker created disabled submits nothing from its first build', async ({ page }) => {
    const value = await page.evaluate(async () => {
        const form = document.getElementById('f') as HTMLFormElement;
        const el = document.createElement('web-daterangepicker') as any;
        el.setAttribute('name', 'late');
        el.setAttribute('value', '2026-06-01');
        el.setAttribute('disabled', '');
        form.appendChild(el);
        await el.whenReady();
        return { submitted: new FormData(form).get('late'), value: el.value };
    });
    expect(value.submitted).toBeNull();
    expect(value.value).toBe('2026-06-01');
});

test('form.reset() clears the selection and the submitted value', async ({ page }) => {
    const p = page.locator('#picker');

    await visibleInput(p).click();
    await dayByDate(p, '2026-06-15').click();
    expect(await formValue(page, 'f')).toBe('2026-06-15');

    await page.locator('#reset').click();

    expect(await formValue(page, 'f')).toBe('');
    await expect(visibleInput(p)).toHaveValue('');
});

test('inline picker (no visible input) submits its selection via a hidden field', async ({ page }) => {
    const p = page.locator('#picker-inline');

    // Inline mode renders no visible input, but still submits under its `name`.
    await expect(p.locator('input[type="hidden"]')).not.toHaveCount(0);
    expect(await formValue(page, 'fi')).toBe('');

    // The calendar is always visible inline — click a day directly.
    await dayByDate(p, '2026-06-15').click();
    expect(await formValue(page, 'fi')).toBe('2026-06-15');

    await page.locator('#reset-inline').click();
    expect(await formValue(page, 'fi')).toBe('');
});

test('range selection serializes as an ISO interval "start/end"', async ({ page }) => {
    const p = page.locator('#picker-range');
    await dayByDate(p, '2026-06-15').click();
    await dayByDate(p, '2026-06-20').click();
    expect(await formValue(page, 'fr')).toBe('2026-06-15/2026-06-20');
});

test('a range split across disabled days submits each sub-range, not the envelope', async ({ page }) => {
    const p = page.locator('#picker-split');
    // 17th & 18th are disabled with split handling → 15–20 breaks into 15–16 and 19–20.
    await dayByDate(p, '2026-06-15').click();
    await dayByDate(p, '2026-06-20').click();
    expect(await formValue(page, 'fs')).toBe('2026-06-15/2026-06-16,2026-06-19/2026-06-20');
});

test('value-format="json" submits a JSON-serialized value', async ({ page }) => {
    const p = page.locator('#picker-json');
    await dayByDate(p, '2026-06-15').click();
    expect(await formValue(page, 'fj')).toBe(JSON.stringify('2026-06-15'));
});

test('value-format="array" emits one name[] input per RANGE ("start/end")', async ({ page }) => {
    const p = page.locator('#picker-array');
    await dayByDate(p, '2026-06-15').click();
    await dayByDate(p, '2026-06-20').click();

    const values = await formValues(page, 'fa', 'range[]');
    expect(values).toEqual(['2026-06-15/2026-06-20']);
    // ...and nothing under the bare name.
    expect(await formValue(page, 'fa', 'range')).toBeNull();
});

test('getValueFormatCallback overrides serialization', async ({ page }) => {
    const p = page.locator('#picker-cb');
    await dayByDate(p, '2026-06-15').click();
    expect(await formValue(page, 'fc')).toBe('D:2026-06-15');
});

// ── `value` is not reflected: the attribute is the form.reset() default ──────────

test('the value attribute is the initial selection', async ({ page }) => {
    const p = page.locator('#picker-default');
    await expect(visibleInput(p)).toHaveValue('2026-06-10 - 2026-06-14');
    const range = await p.evaluate((el: any) => [el.selectedStartDate?.getDate(), el.selectedEndDate?.getDate()]);
    expect(range).toEqual([10, 14]);
    expect(await formValue(page, 'fd')).toBe('2026-06-10/2026-06-14');
});

test('setting value from JS (twice) leaves the value attribute unchanged', async ({ page }) => {
    const p = page.locator('#picker-default');
    const attrs = await p.evaluate(async (el: any) => {
        el.value = '2026-07-01 - 2026-07-03';
        await el.whenSettled();
        const a = el.getAttribute('value');
        el.value = '2026-08-01/2026-08-05';
        await el.whenSettled();
        return [a, el.getAttribute('value'), el.value];
    });
    // el.value reads back the SUBMITTED form (ISO `start/end`), not the displayed text.
    expect(attrs).toEqual(['2026-06-10 - 2026-06-14', '2026-06-10 - 2026-06-14', '2026-08-01/2026-08-05']);
    await expect(visibleInput(p)).toHaveValue('2026-08-01 - 2026-08-05');
    const range = await p.evaluate((el: any) => [el.selectedStartDate?.getDate(), el.selectedEndDate?.getDate()]);
    expect(range).toEqual([1, 5]);
});

test('submit sends the current state, form.reset() goes back to the value attribute', async ({ page }) => {
    const p = page.locator('#picker-default');
    await p.evaluate((el: any) => { el.value = '2026-07-01 - 2026-07-03'; });
    // What a submit would send (the form's own FormData at submit time).
    const submitted = await page.evaluate(() => new Promise<string | null>((resolve) => {
        const form = document.getElementById('fd') as HTMLFormElement;
        form.addEventListener('submit', (e) => { e.preventDefault(); resolve(new FormData(form).get('range') as string); }, { once: true });
        form.requestSubmit();
    }));
    expect(submitted).toBe('2026-07-01/2026-07-03');

    await page.locator('#reset-default').click();
    await expect(visibleInput(p)).toHaveValue('2026-06-10 - 2026-06-14');
    const range = await p.evaluate((el: any) => [el.selectedStartDate?.getDate(), el.selectedEndDate?.getDate()]);
    expect(range).toEqual([10, 14]);
    expect(await formValue(page, 'fd')).toBe('2026-06-10/2026-06-14');
    expect(await p.evaluate((el: any) => el.getAttribute('value'))).toBe('2026-06-10 - 2026-06-14');
});

test('form.reset() and a `value` assignment are silent — no change / month-change / action / open / close', async ({ page }) => {
    // Like a native form.reset() / input.value: the visible month moves (June -> September -> June)
    // but neither path fires month-change.
    const p = page.locator('#picker-default');
    await p.evaluate((el: any) => {
        (window as any).__resetEvents = [];
        for (const n of ['change', 'month-change', 'action', 'open', 'close']) {
            el.addEventListener(n, () => (window as any).__resetEvents.push(n));
        }
    });
    await p.evaluate((el: any) => { el.value = '2026-09-01 - 2026-09-03'; });
    await expect(visibleInput(p)).toHaveValue('2026-09-01 - 2026-09-03');
    await page.locator('#reset-default').click();
    await expect(visibleInput(p)).toHaveValue('2026-06-10 - 2026-06-14');
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50))));
    expect(await page.evaluate(() => (window as any).__resetEvents)).toEqual([]);
});

test('an invalid value attribute warns, leaves the selection empty and the attribute untouched', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
    await page.reload();
    const p = page.locator('#picker-invalid');
    await expect(visibleInput(p)).toHaveValue('');
    expect(await p.evaluate((el: any) => el.selectedDate)).toBeNull();
    expect(await p.evaluate((el: any) => el.getAttribute('value'))).toBe('hroch');
    expect(await formValue(page, 'fx')).toBe('');
    expect(warnings.some((w) => w.includes('hroch'))).toBe(true);
});

test('a range value is lenient about the separator between the two dates', async ({ page }) => {
    const p = page.locator('#picker-default');
    const results = await p.evaluate(async (el: any) => {
        const out: Array<[string, string, string, string]> = [];
        for (const v of ['2026-07-01 to 2026-07-03', '2026-07-01 – 2026-07-03', '2026-07-01 bis 2026-07-03', '2026-07-01/2026-07-03', '2026-07-01 - 2026-07-03', '  2026-07-03 -2026-07-01 ']) {
            el.value = v;
            await el.whenSettled();
            out.push([v, el.shadowRoot.querySelector('.drp__input').value, new FormData(document.getElementById('fd') as HTMLFormElement).get('range') as string, el.value]);
        }
        return out;
    });
    for (const [v, shown, submitted, value] of results) {
        expect(shown, v).toBe('2026-07-01 - 2026-07-03');
        expect(submitted, v).toBe('2026-07-01/2026-07-03');
        expect(value, v).toBe(submitted);
    }
});

test('a range value with extra text or a third date is still invalid', async ({ page }) => {
    const p = page.locator('#picker-default');
    const shown = await p.evaluate(async (el: any) => {
        const out: string[] = [];
        for (const v of ['from 2026-07-01 to 2026-07-03', '2026-07-01 - 2026-07-03 - 2026-07-05', '2026-07-012026-07-03']) {
            el.value = v;
            await el.whenSettled();
            out.push(el.value);
        }
        return out;
    });
    expect(shown).toEqual(['', '', '']);
});

// ── Form value model: el.value === what the form submits ─────────────────────────

test('value-format-mask + value-separator shape the submitted text value and el.value', async ({ page }) => {
    const p = page.locator('#picker-mask');
    // The value attribute is parsed with the mask + separator.
    const range = await p.evaluate((el: any) => [el.selectedStartDate?.getDate(), el.selectedEndDate?.getDate()]);
    expect(range).toEqual([3, 10]);
    expect(await formValue(page, 'fm', 'stay')).toBe('03.11.2026 - 10.11.2026');
    expect(await p.evaluate((el: any) => el.value)).toBe('03.11.2026 - 10.11.2026');
    // The shown text still follows date-format-mask (default ISO).
    await expect(visibleInput(p)).toHaveValue('2026-11-03 - 2026-11-10');
});

test('the value setter accepts the submitted form, ISO and the displayed form', async ({ page }) => {
    const p = page.locator('#picker-mask');
    const read = await p.evaluate(async (el: any) => {
        const out: string[] = [];
        for (const v of ['05.12.2026 - 07.12.2026', '2026-12-05/2026-12-07', '2026-12-05 - 2026-12-07']) {
            el.value = v;
            await el.whenSettled();
            out.push(el.value);
        }
        return out;
    });
    expect(read).toEqual(['05.12.2026 - 07.12.2026', '05.12.2026 - 07.12.2026', '05.12.2026 - 07.12.2026']);
    expect(await formValue(page, 'fm', 'stay')).toBe('05.12.2026 - 07.12.2026');
});

test('value-format="array" + mask submits stay[] per range; el.value is the string[] and round-trips', async ({ page }) => {
    const p = page.locator('#picker-mask-array');
    expect(await formValues(page, 'fma', 'stay[]')).toEqual(['03.11.2026/10.11.2026']);
    expect(await p.evaluate((el: any) => el.value)).toEqual(['03.11.2026/10.11.2026']);
    // The setter takes the same array — several ranges come back as several ranges.
    const after = await p.evaluate(async (el: any) => {
        el.value = ['05.12.2026/07.12.2026', '10.12.2026/12.12.2026'];
        await el.whenSettled();
        return [el.value, el.selectedRanges.length];
    });
    expect(after).toEqual([['05.12.2026/07.12.2026', '10.12.2026/12.12.2026'], 2]);
    expect(await formValues(page, 'fma', 'stay[]')).toEqual(['05.12.2026/07.12.2026', '10.12.2026/12.12.2026']);
});

test('value-format="json" + mask submits a JSON list of {start, end} ranges', async ({ page }) => {
    const p = page.locator('#picker-mask-json');
    expect(await formValue(page, 'fmj', 'stay')).toBe('[{"start":"03.11.2026","end":"10.11.2026"}]');
    expect(await p.evaluate((el: any) => el.value)).toBe('[{"start":"03.11.2026","end":"10.11.2026"}]');
    const twoRanges = '[{"start":"05.12.2026","end":"07.12.2026"},{"start":"10.12.2026","end":"12.12.2026"}]';
    const after = await p.evaluate(async (el: any, v: string) => {
        el.value = v;
        await el.whenSettled();
        const set = el.value;
        el.value = '';
        await el.whenSettled();
        return [set, el.value];
    }, twoRanges);
    expect(after).toEqual([twoRanges, '']);
    expect(await formValue(page, 'fmj', 'stay')).toBe('');
});

test('multiple: the dates are joined with value-separator and written with the mask', async ({ page }) => {
    const p = page.locator('#picker-mask-multiple');
    expect(await formValue(page, 'fmm', 'days')).toBe('3.11.2026; 5.11.2026');
    expect(await p.evaluate((el: any) => el.value)).toBe('3.11.2026; 5.11.2026');
});

test('multiple json: range items are {start, end} objects and parse back', async ({ page }) => {
    const p = page.locator('#picker-multiple-json');
    const json = '[{"start":"2026-06-01","end":"2026-06-03"},{"start":"2026-06-08","end":"2026-06-09"}]';
    const read = await p.evaluate(async (el: any, v: string) => {
        el.selectedRanges = [
            { start: new Date(2026, 5, 1), end: new Date(2026, 5, 3) },
            { start: new Date(2026, 5, 8), end: new Date(2026, 5, 9) },
        ];
        await el.whenSettled();
        const set = el.value;
        el.value = '';
        await el.whenSettled();
        const cleared = el.value;
        el.value = v;
        await el.whenSettled();
        return [set, cleared, el.value];
    }, json);
    expect(read).toEqual([json, '', json]);
    expect(await formValue(page, 'fmuj', 'days')).toBe(json);
});

test('datetime: value-format-mask writes and parses date + time', async ({ page }) => {
    const p = page.locator('#picker-mask-datetime');
    expect(await formValue(page, 'fmd', 'at')).toBe('03.11.2026 14:30');
    const after = await p.evaluate(async (el: any) => {
        el.value = '2026-12-24T18:05';
        await el.whenSettled();
        return el.value;
    });
    expect(after).toBe('24.12.2026 18:05');
});

test('changing value-format-mask / value-separator live re-serializes the value', async ({ page }) => {
    const p = page.locator('#picker-mask');
    const read = await p.evaluate(async (el: any) => {
        el.setAttribute('value-separator', ' bis ');
        await el.whenSettled();
        const a = el.value;
        el.removeAttribute('value-format-mask');
        el.removeAttribute('value-separator');
        await el.whenSettled();
        return [a, el.value];
    });
    expect(read).toEqual(['03.11.2026 bis 10.11.2026', '2026-11-03/2026-11-10']);
    expect(await formValue(page, 'fm', 'stay')).toBe('2026-11-03/2026-11-10');
});

// ── Range mode always submits a list of ranges ───────────────────────────────────

test('range json: a clicked range is a one-item list; several ranges list each', async ({ page }) => {
    const p = page.locator('#picker-range-json');
    await dayByDate(p, '2026-06-15').click();
    await dayByDate(p, '2026-06-20').click();
    expect(await formValue(page, 'frj', 'stay')).toBe('[{"start":"2026-06-15","end":"2026-06-20"}]');
    const several = await p.evaluate(async (el: any) => {
        el.selectedRanges = [
            { start: new Date(2026, 5, 1), end: new Date(2026, 5, 3) },
            { start: new Date(2026, 5, 8), end: new Date(2026, 5, 9) },
        ];
        await el.whenSettled();
        return el.value;
    });
    expect(several).toBe('[{"start":"2026-06-01","end":"2026-06-03"},{"start":"2026-06-08","end":"2026-06-09"}]');
});

// ── A throwing getValueFormatCallback marks the host invalid (core setFormatError) ──

async function armThrowingCallback(p: Locator) {
    return p.evaluate(async (el: any) => {
        const w = window as any;
        w.__fmtErrors = [];
        w.__twin = 0;
        el.addEventListener('value-format-error', (e: any) => w.__fmtErrors.push({
            message: e.detail.error?.message, items: e.detail.value.items,
        }));
        el.onValueFormatError = () => { w.__twin++; };
        el.getValueFormatCallback = () => { throw new Error('boom'); };
        await el.whenSettled();
        return {
            value: el.value,
            customError: el.validity.customError,
            message: el.validationMessage,
            errors: w.__fmtErrors,
            twin: w.__twin,
        };
    });
}

test("a throwing getValueFormatCallback submits '', turns the host invalid and emits value-format-error", async ({ page }) => {
    const p = page.locator('#picker-err');
    const state = await armThrowingCallback(p);
    expect(state.value).toBe('');
    expect(state.customError).toBe(true);
    expect(state.message).toBe('The value could not be formatted.');
    expect(state.errors).toEqual([{ message: 'boom', items: ['2026-06-15'] }]);
    expect(state.twin).toBe(1);
    expect(await formValue(page, 'fe', 'when')).toBe('');

    // Submitting is blocked: `invalid` fires on the host, `submit` never does.
    const outcome = await page.evaluate(async () => {
        const form = document.getElementById('fe') as HTMLFormElement;
        const host = document.getElementById('picker-err')!;
        let submitted = false;
        let invalid = false;
        form.addEventListener('submit', (e) => { submitted = true; e.preventDefault(); });
        host.addEventListener('invalid', () => { invalid = true; });
        form.requestSubmit();
        await new Promise((r) => setTimeout(r, 50));
        return { submitted, invalid };
    });
    expect(outcome).toEqual({ submitted: false, invalid: true });

    // Recovery: a working callback formats again and clears the invalid state.
    const recovered = await p.evaluate(async (el: any) => {
        el.getValueFormatCallback = (s: any) => 'OK:' + s.items.join('|');
        await el.whenSettled();
        return { value: el.value, valid: el.validity.valid, checked: el.checkValidity() };
    });
    expect(recovered).toEqual({ value: 'OK:2026-06-15', valid: true, checked: true });
    expect(await formValue(page, 'fe', 'when')).toBe('OK:2026-06-15');
});

test('a labels.valueFormatError override is the validation message', async ({ page }) => {
    const p = page.locator('#picker-err');
    const message = await p.evaluate(async (el: any) => {
        el.labels = { valueFormatError: 'Datum nelze odeslat.' };
        el.getValueFormatCallback = () => { throw new Error('boom'); };
        await el.whenSettled();
        const first = el.validationMessage;
        // A label change while invalid updates the message.
        el.labels = { valueFormatError: 'Neplatné datum.' };
        await el.whenSettled();
        return [first, el.validationMessage];
    });
    expect(message).toEqual(['Datum nelze odeslat.', 'Neplatné datum.']);
});

test("<form novalidate> submits '' while the callback throws", async ({ page }) => {
    const p = page.locator('#picker-err-nv');
    await armThrowingCallback(p);
    const outcome = await page.evaluate(async () => {
        const form = document.getElementById('fen') as HTMLFormElement;
        let data: string | null = null;
        form.addEventListener('submit', (e) => {
            data = new FormData(form).get('when') as string;
            e.preventDefault();
        });
        form.requestSubmit();
        await new Promise((r) => setTimeout(r, 50));
        return data;
    });
    expect(outcome).toBe('');
});
