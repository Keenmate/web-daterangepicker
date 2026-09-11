import { test, expect, Page } from './fixtures';

/**
 * Icon glyphs and --drp-rem chain to the shared --base-* / --base-icon-* contract
 * (`var(--base-X, <inline fallback>)`). These verify the chain resolves across the
 * shadow boundary, that a base override re-skins the component, and that prev/next
 * nav share ONE directional chevron rotated per direction (not two glyphs).
 *
 * Fixture: test/icon-theming.html
 */

const PAGE = '/test/icon-theming.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// Custom properties cross the shadow boundary via normal inheritance, and the
// :host declarations apply to the host element — so reading them off the host is
// the most structure-independent probe of the resolved chain.
function hostVar(page: Page, id: string, name: string) {
    return page.locator(`#${id}`).evaluate(
        (el, v) => getComputedStyle(el).getPropertyValue(v).trim(),
        name,
    );
}

function pseudoBefore(page: Page, selector: string, prop: string) {
    return page.locator(selector).evaluate(
        (el, p) => getComputedStyle(el, '::before')[p as any] as string,
        prop,
    );
}

test('--drp-rem chains to --base-rem set on the host', async ({ page }) => {
    expect(await hostVar(page, 'base-rem', '--drp-rem')).toBe('20px');
});

test('--drp-rem falls back to 10px when no --base-rem is set', async ({ page }) => {
    expect(await hostVar(page, 'default-icon', '--drp-rem')).toBe('10px');
});

test('--base-icon-chevron re-skins --drp-icon-chevron through the shadow boundary', async ({ page }) => {
    expect(await hostVar(page, 'base-icon', '--drp-icon-chevron')).toContain('sentinel.test/chevron.svg');
});

test('--drp-icon-chevron falls back to the inline Lucide glyph with no base override', async ({ page }) => {
    expect(await hostVar(page, 'default-icon', '--drp-icon-chevron')).toContain('data:image/svg+xml');
});

test('--drp-icon-clear follows --drp-icon-close (shared ✕ glyph)', async ({ page }) => {
    const clear = await hostVar(page, 'default-icon', '--drp-icon-clear');
    const close = await hostVar(page, 'default-icon', '--drp-icon-close');
    expect(clear).toBe(close);
    expect(close).toContain('data:image/svg+xml');
});

test('prev/next nav share ONE directional chevron glyph (single mask)', async ({ page }) => {
    const prevMask = await pseudoBefore(page, '#default-icon .drp__nav--prev', 'maskImage');
    const nextMask = await pseudoBefore(page, '#default-icon .drp__nav--next', 'maskImage');
    expect(prevMask).toBe(nextMask);
    expect(prevMask).not.toBe('none');
    expect(prevMask).toContain('data:image/svg+xml');
});

test('the shared chevron is rotated per direction (prev 180°, next 0°)', async ({ page }) => {
    expect(await hostVar(page, 'default-icon', '--drp-nav-icon-rotate-prev')).toBe('180deg');
    expect(await hostVar(page, 'default-icon', '--drp-nav-icon-rotate-next')).toBe('0deg');

    // …and the rotation is actually applied to the prev glyph: rotate(180deg)
    // serialises to a matrix whose first component is exactly -1.
    const prevTransform = await pseudoBefore(page, '#default-icon .drp__nav--prev', 'transform');
    expect(prevTransform).toMatch(/^matrix\(-1,/);
});
