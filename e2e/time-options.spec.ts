import { test, expect, pickerById, calendarOf, inputOf, open } from './fixtures';
import type { Locator } from './fixtures';

/**
 * Time-picker options: hour-cycle, time-step, show-seconds,
 * show-now-button, time-format-mask — declared and changed at runtime.
 *
 * Fixture: test/time-options.html (clock pinned to 2026-05-22 10:00:00).
 */

const PAGE = '/test/time-options.html';

function list(p: Locator, name: string): Locator {
    return p.locator(`[data-time-list="${name}"]`);
}

async function apply(p: Locator): Promise<void> {
    await p.locator('.drp__button--apply').click();
    await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
}

async function setAttr(p: Locator, name: string, value: string | null): Promise<void> {
    await p.evaluate((el: any, [n, v]) => {
        if (v === null) el.removeAttribute(n); else el.setAttribute(n, v);
        return el.whenSettled();
    }, [name, value] as const);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('hour-cycle', () => {
    test('h12 shows 1-12 hours and an AM/PM column', async ({ page }) => {
        const p = await open(page, 'h12');
        await expect(list(p, 'hours').locator('[data-hour12]')).toHaveCount(12);
        await expect(list(p, 'ampm').locator('[data-ampm]')).toHaveText(['AM', 'PM']);
    });

    test('h12: 3 + PM commits hour 15 and formats with the AM/PM token', async ({ page }) => {
        const p = await open(page, 'h12');
        await list(p, 'hours').locator('[data-hour12="3"]').click();
        await list(p, 'minutes').locator('[data-minute="15"]').click();
        await list(p, 'ampm').locator('[data-ampm="pm"]').click();
        await apply(p);
        await expect(inputOf(p)).toHaveValue('03:15 PM');
        expect(await p.evaluate((el: any) => el.selectedTime)).toMatchObject({ hour: 15, minute: 15, ampm: 'pm' });
    });

    test('a 12-hour time-format-mask derives hour-cycle h12', async ({ page }) => {
        const p = await open(page, 'mask12');
        await expect(list(p, 'ampm')).toBeVisible();
        await expect(list(p, 'hours').locator('[data-hour12]')).toHaveCount(12);
    });

    test('the default (HH:mm) is a 24-hour roll without AM/PM', async ({ page }) => {
        const p = await open(page, 'plain');
        await expect(list(p, 'hours').locator('[data-hour]')).toHaveCount(24);
        await expect(list(p, 'ampm')).toHaveCount(0);
    });

    test('switching hour-cycle at runtime rebuilds the rolls and keeps the time', async ({ page }) => {
        const p = await open(page, 'plain');
        await list(p, 'hours').locator('[data-hour="20"]').click();
        await list(p, 'minutes').locator('[data-minute="5"]').click();
        await apply(p);

        await setAttr(p, 'hour-cycle', 'h12');
        expect(await p.evaluate((el: any) => el.selectedTime)).toMatchObject({ hour: 20, minute: 5 });
        await expect(inputOf(p)).toHaveValue('20:05');
        await inputOf(p).click();
        await expect(list(p, 'ampm')).toBeVisible();
        await expect(list(p, 'hours').locator('[data-hour12="8"]')).toHaveClass(/drp__rolling-item--selected/);
    });
});

test.describe('time-step', () => {
    test('time-step="15" offers only quarter-hour minutes', async ({ page }) => {
        const p = await open(page, 'step');
        await expect(list(p, 'minutes').locator('[data-minute]')).toHaveText(['00', '15', '30', '45']);
    });

    test('changing time-step at runtime re-renders the minute roll', async ({ page }) => {
        const p = pickerById(page, 'plain');
        await setAttr(p, 'time-step', '20');
        await open(page, 'plain');
        await expect(list(p, 'minutes').locator('[data-minute]')).toHaveText(['00', '20', '40']);
    });
});

test.describe('show-seconds', () => {
    test('adds a seconds roll; the committed value carries seconds', async ({ page }) => {
        const p = await open(page, 'seconds');
        await expect(list(p, 'seconds')).toBeVisible();
        await list(p, 'hours').locator('[data-hour="9"]').click();
        await list(p, 'minutes').locator('[data-minute="8"]').click();
        await list(p, 'seconds').locator('[data-second="7"]').click();
        await apply(p);
        await expect(inputOf(p)).toHaveValue('09:08:07');
    });

    test('toggling it at runtime adds and removes the seconds roll', async ({ page }) => {
        const p = pickerById(page, 'plain');
        await setAttr(p, 'show-seconds', '');
        await open(page, 'plain');
        await expect(list(p, 'seconds')).toBeVisible();
        await page.keyboard.press('Escape');
        await setAttr(p, 'show-seconds', 'false');
        await open(page, 'plain');
        await expect(list(p, 'seconds')).toHaveCount(0);
    });
});

test.describe('show-now-button', () => {
    test('Now (+ Apply) commits the pinned current time', async ({ page }) => {
        const p = await open(page, 'plain');
        await p.locator('.drp__button--now').click();
        await apply(p);
        await expect(inputOf(p)).toHaveValue('10:00');
        expect(await p.evaluate((el: any) => el.selectedTime)).toMatchObject({ hour: 10, minute: 0 });
    });

    test('show-now-button="false" omits the Now button', async ({ page }) => {
        const p = await open(page, 'no-now');
        await expect(p.locator('.drp__button--apply')).toBeVisible();
        await expect(p.locator('.drp__button--now')).toHaveCount(0);
    });

    test('hiding it at runtime removes the Now button', async ({ page }) => {
        const p = pickerById(page, 'plain');
        await setAttr(p, 'show-now-button', 'false');
        await open(page, 'plain');
        await expect(p.locator('.drp__button--now')).toHaveCount(0);
    });
});

test.describe('time-format-mask', () => {
    test('changing time-format-mask at runtime re-formats the next commit', async ({ page }) => {
        const p = pickerById(page, 'plain');
        await setAttr(p, 'time-format-mask', 'HH.mm');
        await open(page, 'plain');
        await list(p, 'hours').locator('[data-hour="7"]').click();
        await list(p, 'minutes').locator('[data-minute="30"]').click();
        await apply(p);
        await expect(inputOf(p)).toHaveValue('07.30');
    });

    test('a runtime 12-hour time-format-mask re-derives the hour cycle (AM/PM roll appears)', async ({ page }) => {
        const p = pickerById(page, 'plain');
        await setAttr(p, 'time-format-mask', 'hh:mm a');
        await open(page, 'plain');
        await expect(list(p, 'ampm')).toBeVisible();
        await expect(list(p, 'hours').locator('[data-hour12]')).toHaveCount(12);
    });
});
