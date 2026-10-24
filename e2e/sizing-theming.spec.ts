import { test, expect, Page, Locator, pickerById } from './fixtures';

/**
 * input-size variants apply size-modifier classes; consumer-supplied CSS
 * variables propagate into the shadow DOM via inherited custom properties.
 *
 * Fixture: test/sizing-theming.html
 */

const PAGE = '/test/sizing-theming.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('input-size="xs" applies the --xs modifier classes on the input', async ({ page }) => {
    const p = pickerById(page, 'size-xs');
    const input = p.locator('input.drp__input');
    await expect(input).toHaveClass(/drp__input--xs/);
});

test('input-size="md" does NOT apply a modifier class (md is the default)', async ({ page }) => {
    const p = pickerById(page, 'size-md');
    const input = p.locator('input.drp__input');
    // md is the default — no `--md` suffix class is added.
    await expect(input).not.toHaveClass(/drp__input--md/);
});

test('input-size="xl" applies the --xl modifier classes', async ({ page }) => {
    const p = pickerById(page, 'size-xl');
    const input = p.locator('input.drp__input');
    await expect(input).toHaveClass(/drp__input--xl/);
});

test('a CSS variable declared on the host inherits into the shadow DOM', async ({ page }) => {
    const p = pickerById(page, 'themed');
    await p.locator('input').click();

    // Resolve the inherited variable from inside the shadow DOM. CSS custom
    // properties cross the shadow boundary via normal inheritance — so a
    // declaration on the host should be readable on any shadow descendant.
    const value = await p.locator('.drp__picker').evaluate(
        el => getComputedStyle(el).getPropertyValue('--drp-day-bg-selected').trim()
    );
    expect(value).toBe('rgb(11, 22, 33)');
});
