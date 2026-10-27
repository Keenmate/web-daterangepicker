import { test, expect, pickerById, calendarOf, inputOf, open, dayByDate } from './fixtures';
import type { Locator, Page } from './fixtures';

/**
 * Time + datetime picker modes and the four `time-display` UIs.
 *
 * Fixture: test/time-picker.html. The e2e fixture pins the clock to
 * 2026-05-22 10:00, so un-picked rolls focus 10:00.
 *
 * Time and datetime pickers default to `commit-mode="apply"`: picks are staged
 * until the Apply button commits them to the input (and closes the popover).
 */

const PAGE = '/test/time-picker.html';

const log = (page: Page) => page.getByTestId('time-picker-log');

/** A roll item in the default `rolls` display (`hours` / `minutes` / `seconds` / `ampm`). */
function rollItem(p: Locator, list: string, attr: string, value: string | number): Locator {
    return p.locator(`[data-time-list="${list}"] [${attr}="${value}"]`);
}

/** Click Apply and wait for the popover to close. */
async function apply(p: Locator): Promise<void> {
    await p.locator('.drp__button--apply').click();
    await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('picker-mode="time" (rolls)', () => {
    test('opens a time-only popover: rolls, no day grid', async ({ page }) => {
        const p = await open(page, 'time');
        await expect(p.locator('.drp__time-picker')).toBeVisible();
        await expect(p.locator('.drp__days')).toHaveCount(0);
        await expect(p.locator('[data-time-list="hours"] [data-hour]')).toHaveCount(24);
        await expect(p.locator('[data-time-list="minutes"] [data-minute]')).toHaveCount(60);
    });

    test('picking hour + minute commits selectedTime, the input and a select event', async ({ page }) => {
        const p = await open(page, 'time');
        await rollItem(p, 'hours', 'data-hour', 14).click();
        await rollItem(p, 'minutes', 'data-minute', 35).click();
        await expect(inputOf(p)).toHaveValue('');   // staged until Apply
        await apply(p);

        await expect(inputOf(p)).toHaveValue('14:35');
        const t = await p.evaluate((el: any) => el.selectedTime);
        expect(t).toMatchObject({ hour: 14, minute: 35 });
        await expect(rollItem(p, 'hours', 'data-hour', 14)).toHaveClass(/drp__rolling-item--selected/);
        await expect(rollItem(p, 'minutes', 'data-minute', 35)).toHaveClass(/drp__rolling-item--selected/);
    });

    test('Apply fires select with the committed time', async ({ page }) => {
        const p = await open(page, 'time');
        await rollItem(p, 'hours', 'data-hour', 14).click();
        await rollItem(p, 'minutes', 'data-minute', 35).click();
        await apply(p);
        await expect(log(page)).toContainText('select:time:14:35');
    });

    test('the selectedTime setter renders the rolls and the input', async ({ page }) => {
        const p = pickerById(page, 'time');
        await p.evaluate((el: any) => { el.selectedTime = { hour: 8, minute: 5, second: null, ampm: null }; });
        await expect(inputOf(p)).toHaveValue('08:05');
        await inputOf(p).click();
        await expect(rollItem(p, 'hours', 'data-hour', 8)).toHaveClass(/drp__rolling-item--selected/);
        await expect(rollItem(p, 'minutes', 'data-minute', 5)).toHaveClass(/drp__rolling-item--selected/);
    });
});

test.describe('picker-mode="datetime"', () => {
    test('shows the day grid and the rolls side by side', async ({ page }) => {
        const p = await open(page, 'datetime');
        await expect(p.locator('.drp__main .drp__days')).toBeVisible();
        await expect(p.locator('.drp__main .drp__time-picker')).toBeVisible();
    });

    test('day + hour + minute commit selectedDatetime and the input', async ({ page }) => {
        const p = await open(page, 'datetime');
        await dayByDate(p, '2026-06-18').click();
        await rollItem(p, 'hours', 'data-hour', 9).click();
        await rollItem(p, 'minutes', 'data-minute', 45).click();
        await apply(p);

        await expect(inputOf(p)).toHaveValue('2026-06-18 09:45');
        const parts = await p.evaluate((el: any) => {
            const d: Date = el.selectedDatetime;
            return d && [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
        });
        expect(parts).toEqual([2026, 6, 18, 9, 45]);
    });

    test('the selectedDatetime setter (ISO string) splits into day + time', async ({ page }) => {
        const p = pickerById(page, 'datetime');
        await p.evaluate((el: any) => { el.selectedDatetime = '2026-06-20T17:10:00'; });
        await expect(inputOf(p)).toHaveValue('2026-06-20 17:10');
        await inputOf(p).click();
        await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--selected/);
        await expect(rollItem(p, 'hours', 'data-hour', 17)).toHaveClass(/drp__rolling-item--selected/);
    });
});

test.describe('time-display variants', () => {
    test('clock: hour then minute on the face commits the time', async ({ page }) => {
        const p = await open(page, 'clock');
        await expect(p.locator('.drp__clock-picker .drp__clock-face')).toBeVisible();
        await p.locator('[data-clock-hour="15"]').click();
        // Picking the hour advances the dial to the minutes step.
        await expect(p.locator('[data-clock-step="minutes"]')).toHaveClass(/drp__clock-header-digit--active/);
        await p.locator('[data-clock-minute="20"]').click();
        await apply(p);

        await expect(inputOf(p)).toHaveValue('15:20');
        expect(await p.evaluate((el: any) => el.selectedTime)).toMatchObject({ hour: 15, minute: 20 });
    });

    test('wheel: clicking a row centres it and commits it', async ({ page }) => {
        const p = await open(page, 'wheel');
        await expect(p.locator('.drp__wheel-picker')).toBeVisible();
        await p.locator('[data-wheel-list="hours"] [data-wheel-value="11"]').click();
        await expect.poll(() => p.evaluate((el: any) => el.selectedTime?.hour)).toBe(11);
        await apply(p);
        await expect(inputOf(p)).toHaveValue(/^11:/);
    });

    test('compact: typing into the pills commits the time', async ({ page }) => {
        const p = await open(page, 'compact');
        const hours = p.locator('[data-compact-field="hours"]');
        await hours.click();
        await page.keyboard.type('07');      // auto-advances to the minutes pill
        await page.keyboard.type('42');      // last pill → commits on completion
        await expect(hours).toHaveClass(/drp__compact-pill--committed/);
        await apply(p);
        await expect(inputOf(p)).toHaveValue('07:42');
        expect(await p.evaluate((el: any) => el.selectedTime)).toMatchObject({ hour: 7, minute: 42 });
    });

    for (const display of ['clock', 'wheel', 'compact'] as const) {
        test(`switching time-display rolls → ${display} at runtime keeps the selection and renders the new UI`, async ({ page }) => {
            const p = await open(page, 'switch');
            await rollItem(p, 'hours', 'data-hour', 16).click();
            await rollItem(p, 'minutes', 'data-minute', 30).click();
            await apply(p);
            await expect(inputOf(p)).toHaveValue('16:30');

            await p.evaluate((el, d) => el.setAttribute('time-display', d), display);
            await p.evaluate((el: any) => el.whenSettled());

            expect(await p.evaluate((el: any) => el.selectedTime)).toMatchObject({ hour: 16, minute: 30 });
            await expect(inputOf(p)).toHaveValue('16:30');
            await inputOf(p).click();                     // reopen
            await expect(calendarOf(p)).toBeVisible();
            await expect(p.locator(`.drp__${display}-picker`)).toBeVisible();
            await expect(p.locator('.drp__time-picker')).toHaveCount(0);
        });
    }
});

test('placeholder-time-format-mask is the placeholder hint in time mode (FINDINGS #19)', async ({ page }) => {
    await expect(inputOf(pickerById(page, 'masked'))).toHaveAttribute('placeholder', 'hh:mm');
});

test('time mode without a placeholder mask falls back to time-format-mask', async ({ page }) => {
    await expect(inputOf(pickerById(page, 'masked-fallback'))).toHaveAttribute('placeholder', 'HH.mm');
});

test('datetime: the hint is the date placeholder mask + " " + the time placeholder mask', async ({ page }) => {
    await expect(inputOf(pickerById(page, 'masked-dt'))).toHaveAttribute('placeholder', 'dd.mm.rrrr hh:mm');
    await expect(inputOf(pickerById(page, 'masked-dt-fallback'))).toHaveAttribute('placeholder', 'YYYY-MM-DD HH:mm');
});

test('the placeholder hint follows a runtime mask / picker-mode change', async ({ page }) => {
    const p = pickerById(page, 'masked');
    await p.evaluate((el: any) => { el.setAttribute('placeholder-time-format-mask', 'hh.mm'); return el.whenSettled(); });
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'hh.mm');
    await p.evaluate((el: any) => { el.setAttribute('picker-mode', 'datetime'); return el.whenSettled(); });
    await expect(inputOf(p)).toHaveAttribute('placeholder', 'YYYY-MM-DD hh.mm');
});
