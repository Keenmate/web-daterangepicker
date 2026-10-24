/**
 * Locator helpers shared across specs (re-exported from `./fixtures`).
 * Every picker in a fixture page is addressed by its element id.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** The `<web-daterangepicker id="…">` host. */
export function pickerById(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

/** The calendar popup (`.drp__picker`) inside a picker's shadow root. */
export function calendarOf(p: Locator): Locator {
    return p.locator('.drp__picker');
}

/** A day cell by ISO date (`YYYY-MM-DD`). */
export function dayByDate(p: Locator, isoDate: string): Locator {
    return p.locator(`.drp__day[data-date="${isoDate}"]`);
}

/** The picker's text input. */
export function inputOf(p: Locator): Locator {
    return p.locator('input');
}

/** Click the picker's input and wait for the calendar; returns the host. */
export async function open(page: Page, id: string): Promise<Locator> {
    const p = pickerById(page, id);
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
    return p;
}
