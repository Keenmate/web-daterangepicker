import { test, expect, devices, pickerById, calendarOf, inputOf, dayByDate } from './fixtures';
import type { Locator, Page } from './fixtures';

/**
 * Time selection inside the phone full-screen sheet. On a phone,
 * `mobile-presentation="auto"` resolves to `fullscreen`; the time UIs must still
 * commit through Apply and close the sheet.
 *
 * Device emulation must be top-level (Playwright forbids test.use in describe).
 * Fixture: test/mobile-time-e2e.html.
 */
test.use({ ...devices['iPhone 13'] });

const PAGE = '/test/mobile-time-e2e.html';

/** Open via the API (tap emulation is unreliable — see mobile-presentation-phone.spec.ts). */
async function openSheet(page: Page, id: string): Promise<Locator> {
    const p = pickerById(page, id);
    await p.evaluate((el: any) => el.open());
    await expect(calendarOf(p)).toHaveClass(/drp__picker--fullscreen/);
    await expect(calendarOf(p)).toHaveClass(/drp__picker--visible/);
    return p;
}

async function apply(p: Locator): Promise<void> {
    await p.locator('.drp__button--apply').click();
    await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('time: picking hour + minute in the sheet and Apply commits and closes', async ({ page }) => {
    const p = await openSheet(page, 'time');
    await expect(p.locator('.drp__time-picker')).toBeVisible();
    await p.locator('[data-time-list="hours"] [data-hour="14"]').click();
    await p.locator('[data-time-list="minutes"] [data-minute="35"]').click();
    await apply(p);
    await expect(inputOf(p)).toHaveValue('14:35');
    expect(await p.evaluate((el: any) => el.selectedTime)).toMatchObject({ hour: 14, minute: 35 });
});

test('datetime: day + time in the sheet and Apply commits both', async ({ page }) => {
    const p = await openSheet(page, 'datetime');
    await dayByDate(p, '2026-06-18').click();
    await p.locator('[data-time-list="hours"] [data-hour="8"]').click();
    await p.locator('[data-time-list="minutes"] [data-minute="15"]').click();
    await apply(p);
    await expect(inputOf(p)).toHaveValue('2026-06-18 08:15');
});

test('wheel: a row tapped in the sheet commits on Apply', async ({ page }) => {
    const p = await openSheet(page, 'wheel');
    await p.locator('[data-wheel-list="hours"] [data-wheel-value="11"]').click();
    await expect.poll(() => p.evaluate((el: any) => el.selectedTime?.hour)).toBe(11);
    await apply(p);
    await expect(inputOf(p)).toHaveValue(/^11:/);
});

test('closing the sheet with ✕ (no Apply) discards the staged time', async ({ page }) => {
    const p = await openSheet(page, 'time');
    await p.locator('[data-time-list="hours"] [data-hour="14"]').click();
    await p.locator('.drp__fullscreen-close').click();
    await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
    await expect(inputOf(p)).toHaveValue('');
});
