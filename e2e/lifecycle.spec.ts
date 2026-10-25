import { test, expect, pickerById, calendarOf, dayByDate } from './fixtures';
import type { Locator, Page } from './fixtures';

/**
 * DOM move (re-parent) — decision D1 (2026-10-24): a move must KEEP the picker's
 * state: committed selection, input value, form value, open state and a
 * half-picked range. Core's lifecycle is build-once + activate/deactivate, but
 * the component used to destroy the picker in disconnect() and rebuild it in
 * connect() (FINDINGS.md #16 / DRP-4, fixed): disconnect() now only deactivates
 * the picker's document-level resources and connect() re-activates them.
 *
 * Fixture: test/lifecycle.html (`window.movePicker()` toggles slot A ↔ B).
 */

const PAGE = '/test/lifecycle.html';
const log = (page: Page) => page.getByTestId('lifecycle-log');

/** The visible text input (the picker also renders a light-DOM hidden form input). */
const inputOf = (p: Locator) => p.locator('input.drp__input');

async function open(page: Page, id: string): Promise<Locator> {
    const p = pickerById(page, id);
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
    return p;
}

async function move(page: Page): Promise<void> {
    await page.evaluate(() => (window as any).movePicker());
}

function formValue(page: Page): Promise<string | null> {
    return page.evaluate(() => {
        const v = new FormData(document.getElementById('form') as HTMLFormElement).get('period');
        return v == null ? null : String(v);
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(log(page)).toContainText('ready:picker');
});

async function commitRange(page: Page): Promise<void> {
    const p = await open(page, 'picker');
    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-12').click();
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-12');
}

test('a move keeps the committed selection and the input value', async ({ page }) => {
    await commitRange(page);
    await move(page);
    const p = pickerById(page, 'picker');
    await expect(page.locator('#slot-b #picker')).toHaveCount(1);
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-12');
    // A plain clicked range lives in selectedStartDate/EndDate (selectedRanges is only
    // populated for independent multi-ranges).
    const range = await p.evaluate((el: any) => [el.selectedStartDate?.getDate(), el.selectedEndDate?.getDate()]);
    expect(range).toEqual([10, 12]);
    await inputOf(p).click();
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
});

test('a move keeps the form value', async ({ page }) => {
    await commitRange(page);
    const before = await formValue(page);
    expect(before).toBe('2026-06-10/2026-06-12');
    await move(page);
    expect(await formValue(page)).toBe(before);
});

test('a move keeps an open picker open', async ({ page }) => {
    const p = await open(page, 'picker');
    await move(page);
    await expect(calendarOf(p)).toHaveClass(/drp__picker--visible/);
});

test('after a move the open picker is re-activated: an outside click still closes it', async ({ page }) => {
    const p = await open(page, 'picker');
    await move(page);
    await expect(calendarOf(p)).toHaveClass(/drp__picker--visible/);
    await page.locator('h1').click();
    await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
});

test('a removed (open) picker stops listening to the document; re-inserting restores it', async ({ page }) => {
    const p = await open(page, 'picker');
    await page.evaluate(() => { (window as any).__parked = document.getElementById('picker'); (window as any).__parked.remove(); });
    await page.locator('h1').click();   // document click while detached: no outside-click close
    await page.evaluate(() => document.getElementById('slot-b')!.appendChild((window as any).__parked));
    await expect(calendarOf(p)).toHaveClass(/drp__picker--visible/);
    await page.locator('h1').click();
    await expect(calendarOf(p)).not.toHaveClass(/drp__picker--visible/);
});

test('a move keeps a half-picked range (start chosen, end pending)', async ({ page }) => {
    const p = await open(page, 'picker');
    await dayByDate(p, '2026-06-10').click();
    await move(page);
    if (!(await calendarOf(p).evaluate((c) => c.classList.contains('drp__picker--visible')))) {
        await inputOf(p).click();
    }
    await dayByDate(p, '2026-06-14').click();
    await expect(inputOf(p)).toHaveValue('2026-06-10 - 2026-06-14');
});

test('a move does not re-fire ready', async ({ page }) => {
    await move(page);
    await move(page);
    await page.waitForTimeout(100);
    await expect(log(page)).toHaveText('ready:picker\n');
});
