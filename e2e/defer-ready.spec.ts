import { test, expect, pickerById, calendarOf, inputOf, open } from './fixtures';
import type { Page } from './fixtures';

/**
 * `defer` render gate + the core `ready` event / `ready` attribute / `isReady` / `release()` / `destroy()`.
 *
 * Fixture: test/defer-ready.html.
 */

const PAGE = '/test/defer-ready.html';
const log = (page: Page) => page.getByTestId('defer-ready-log');

/** Lines of the ready log for one picker id. */
async function readyCount(page: Page, id: string): Promise<number> {
    const text = (await log(page).textContent()) ?? '';
    return text.split('\n').filter((l) => l === `ready:${id}`).length;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(log(page)).toContainText('ready:plain');
});

test('a non-deferred picker builds on upgrade, fires ready once and reflects the ready attribute', async ({ page }) => {
    const p = pickerById(page, 'plain');
    await expect(p).toHaveAttribute('ready', '');
    expect(await p.evaluate((el: any) => el.isReady)).toBe(true);
    expect(await readyCount(page, 'plain')).toBe(1);
});

test('defer renders nothing: no input, no calendar, no ready, isReady false', async ({ page }) => {
    const p = pickerById(page, 'attr');
    await expect(inputOf(p)).toHaveCount(0);
    await expect(calendarOf(p)).toHaveCount(0);
    await expect(p).not.toHaveAttribute('ready');
    expect(await p.evaluate((el: any) => el.isReady)).toBe(false);
    expect(await readyCount(page, 'attr')).toBe(0);
});

test('removing the defer attribute builds the picker and fires ready once', async ({ page }) => {
    const p = pickerById(page, 'attr');
    await p.evaluate((el) => el.removeAttribute('defer'));
    await expect(inputOf(p)).toHaveCount(1);
    await expect(p).toHaveAttribute('ready', '');
    expect(await readyCount(page, 'attr')).toBe(1);
    await open(page, 'attr');
});

test('el.release() builds with the options set while deferred, firing ready once', async ({ page }) => {
    const p = pickerById(page, 'api');
    await p.evaluate((el: any) => {
        el.setAttribute('selection-mode', 'range');
        el.release();
    });
    expect(await p.evaluate((el: any) => el.isReady)).toBe(true);
    expect(await readyCount(page, 'api')).toBe(1);
    // The range option set while deferred landed in the single build.
    await open(page, 'api');
    await expect(p.locator('.drp__summary')).toHaveCount(1);
    // release() again is a no-op.
    await p.evaluate((el: any) => el.release());
    expect(await readyCount(page, 'api')).toBe(1);
});

test('ready does not re-fire on a reinit or a reconnect; re-adding defer does not re-hold', async ({ page }) => {
    const p = pickerById(page, 'plain');
    await p.evaluate(async (el: any) => {
        el.setAttribute('selection-mode', 'range');        // on:'reinit' → rebuild
        await el.whenSettled();
        document.getElementById('home')!.appendChild(el);  // reconnect (DOM move)
        el.setAttribute('defer', '');                      // latched: must not re-hold
        await el.whenSettled();
    });
    await page.waitForTimeout(100);
    expect(await readyCount(page, 'plain')).toBe(1);
    await expect(inputOf(p)).toHaveCount(1);
    await open(page, 'plain');
});

test('whenReady() resolves after release(); :state(ready) matches', async ({ page }) => {
    const p = pickerById(page, 'api');
    const result = await p.evaluate(async (el: any) => {
        const before = el.matches(':state(ready)');
        const waited = el.whenReady().then(() => 'resolved');
        el.release();
        return { before, waited: await waited, after: el.matches(':state(ready)') };
    });
    expect(result).toEqual({ before: false, waited: 'resolved', after: true });
});

test('destroy() tears the picker down and leaves the element inert', async ({ page }) => {
    const p = pickerById(page, 'plain');
    await open(page, 'plain');
    const state = await p.evaluate(async (el: any) => {
        el.destroy();
        const calendars = el.shadowRoot.querySelectorAll('.drp__picker').length;
        el.setAttribute('selection-mode', 'range');
        await el.whenSettled();
        return { isDestroyed: el.isDestroyed, calendars, isOpen: el.isOpen };
    });
    expect(state).toEqual({ isDestroyed: true, calendars: 0, isOpen: false });
    await expect(p.locator('.drp__summary')).toHaveCount(0);
});
