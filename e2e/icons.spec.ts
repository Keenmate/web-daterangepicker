import { test, expect, pickerById, dayByDate } from './fixtures';

/**
 * Action-button icons are data read by core `renderIcon` (SPEC §12.33): markup raw, a built-in name masked (no hook
 * sees it), the element's `renderIconCallback`, then the page-wide one (`null` = not mine), an ASCII class list →
 * `<i class="drp__icon …">`, anything else escaped text. Fixture: test/icons.html.
 */
const BUTTONS = [
    { id: 'svg', text: 'Svg', icon: '<svg class="probe" viewBox="0 0 1 1"></svg>' },
    { id: 'builtin', text: 'Built-in', icon: 'check' },
    { id: 'font', text: 'Font', icon: 'fa-solid fa-flag' },
    { id: 'word', text: 'Word', icon: 'star' },
    { id: 'emoji', text: 'Emoji', icon: '🚀' },
    { id: 'text', text: 'Text', icon: '1 < 2 <b>' },
];

test.beforeEach(async ({ page }) => {
    await page.goto('/test/icons.html');
    await page.waitForFunction(() => !!customElements.get('web-daterangepicker'));
});

const icon = (page: any, id: string) => pickerById(page, 'icons').locator(`.drp__button[data-id="${id}"] .drp__button-icon`);

async function setButtons(page: any) {
    await pickerById(page, 'icons').evaluate((el: any, buttons) => { el.actionButtons = buttons; return el.whenSettled(); }, BUTTONS);
}

test('no hook: markup raw, a built-in masked, a class list an icon-font <i>, other text escaped', async ({ page }) => {
    await setButtons(page);
    await expect(icon(page, 'svg').locator('svg.probe')).toHaveCount(1);
    await expect(icon(page, 'builtin').locator('.km-icon.drp__icon--check')).toHaveCount(1);
    await expect(icon(page, 'font').locator('i.drp__icon.fa-solid.fa-flag[aria-hidden="true"]')).toHaveCount(1);
    // A one-word name that is NOT built-in is an icon-font class now (core rc25), not a mask.
    await expect(icon(page, 'word').locator('i.drp__icon.star')).toHaveCount(1);
    await expect(icon(page, 'word').locator('.km-icon')).toHaveCount(0);
    await expect(icon(page, 'emoji')).toHaveText('🚀');
    await expect(icon(page, 'text')).toHaveText('1 < 2 <b>');
    await expect(icon(page, 'text').locator('b')).toHaveCount(0);
    // The icon-font <i> is a fixed glyph (flex: none).
    expect(await icon(page, 'font').locator('i').evaluate((el: Element) => getComputedStyle(el).flexShrink)).toBe('0');
});

test('the element hook beats the page hook; null falls through; a built-in never reaches a hook', async ({ page }) => {
    await pickerById(page, 'icons').evaluate((el: any, buttons) => {
        const calls: string[] = [];
        (window as any).components.renderIconCallback = (name: string) => {
            calls.push(`page:${name}`);
            return `<b class="page-${name.replace(/\W/g, '')}"></b>`;
        };
        el.renderIconCallback = (name: string, ctx: any) => {
            calls.push(`el:${name}:${ctx.component}:${ctx.prefix}:${ctx.element === el}:${ctx.item?.id}`);
            return name === 'star' ? '<b class="mine"></b>' : null;
        };
        el.actionButtons = buttons;
        (window as any).__calls = calls;
        return el.whenSettled();
    }, BUTTONS);
    // Element hook answered 'star' → the page hook is not asked for it.
    await expect(icon(page, 'word').locator('b.mine')).toHaveCount(1);
    // Element hook said null for the class list → the page hook decides.
    await expect(icon(page, 'font').locator('b.page-fasolidfaflag')).toHaveCount(1);
    // Built-in stays the mask.
    await expect(icon(page, 'builtin').locator('.km-icon.drp__icon--check')).toHaveCount(1);
    const calls: string[] = await page.evaluate(() => (window as any).__calls);
    expect(calls).toContain('el:star:web-daterangepicker:drp:true:word');
    expect(calls).not.toContain('page:star');
    expect(calls).toContain('page:fa-solid fa-flag');
    expect(calls.some((c) => c.includes(':check'))).toBe(false);
    expect(calls.some((c) => c.startsWith('page:<') || c.startsWith('el:<'))).toBe(false);
});

test('changing renderIconCallback re-renders the action bar in place', async ({ page }) => {
    await setButtons(page);
    const p = pickerById(page, 'icons');
    await expect(icon(page, 'word').locator('i.drp__icon.star')).toHaveCount(1);
    await p.evaluate((el: any) => { el.renderIconCallback = (name: string) => (name === 'star' ? '<b class="late"></b>' : null); });
    await expect(icon(page, 'word').locator('b.late')).toHaveCount(1);
    await p.evaluate((el: any) => { el.renderIconCallback = null; });
    await expect(icon(page, 'word').locator('i.drp__icon.star')).toHaveCount(1);
});

test.describe('page-wide renderIconCallback assigned after render (core iconsChanged, C-CA-40)', () => {
    test.afterEach(async ({ page }) => {
        await page.evaluate(() => { (window as any).components.renderIconCallback = null; });
    });

    test('inline: the icons repaint, the selection stays', async ({ page }) => {
        await setButtons(page);
        const p = pickerById(page, 'icons');
        await p.evaluate((el: any) => { el.selectedDate = new Date(2026, 5, 18); return el.whenSettled(); });
        await expect(icon(page, 'word').locator('i.drp__icon.star')).toHaveCount(1);
        await page.evaluate(() => {
            (window as any).components.renderIconCallback = (name: string) => (name === 'star' ? '<b data-test-icon>x</b>' : null);
        });
        await expect(icon(page, 'word').locator('b[data-test-icon]')).toHaveCount(1);
        await expect(dayByDate(p, '2026-06-18')).toHaveClass(/drp__day--selected/);
        // Cleared again → back to the icon-font class.
        await page.evaluate(() => { (window as any).components.renderIconCallback = null; });
        await expect(icon(page, 'word').locator('i.drp__icon.star')).toHaveCount(1);
    });

    test('floating: an open calendar stays open and keeps the selection', async ({ page }) => {
        const p = pickerById(page, 'icons-floating');
        await p.evaluate((el: any, buttons) => {
            el.actionButtons = buttons;
            el.selectedDate = new Date(2026, 5, 18);
            return el.whenSettled().then(() => el.open());
        }, BUTTONS);
        await expect.poll(() => p.evaluate((el: any) => el.isOpen)).toBe(true);
        const word = p.locator('.drp__button[data-id="word"] .drp__button-icon');
        await expect(word.locator('i.drp__icon.star')).toHaveCount(1);
        await page.evaluate(() => {
            (window as any).components.renderIconCallback = (name: string) => (name === 'star' ? '<b data-test-icon>x</b>' : null);
        });
        await expect(word.locator('b[data-test-icon]')).toHaveCount(1);
        expect(await p.evaluate((el: any) => el.isOpen)).toBe(true);
        await expect(dayByDate(p, '2026-06-18')).toHaveClass(/drp__day--selected/);
    });
});
