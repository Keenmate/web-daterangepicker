import { test, expect, Page, Locator } from './fixtures';

/**
 * renderDayCallback (full replacement), getCustomStylesCallback,
 * specialDates with default + custom *Member mapping,
 * getUnifiedHeaderCallback.
 *
 * Fixture: test/callbacks-extra.html
 */

const PAGE = '/test/callbacks-extra.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp__picker');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp__day[data-date="${isoDate}"]`);
}

async function open(page: Page, id: string) {
    const p = pickerById(page, id);
    await p.locator('input').click();
    await expect(calendarOf(p)).toBeVisible();
    return p;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// renderDayCallback
// =============================================================================

test('renderDayCallback returning an HTMLElement fully replaces the day content', async ({ page }) => {
    const p = await open(page, 'full-render');

    // Day 20 should now contain our injected element.
    await expect(dayByDate(p, '2026-06-20').locator('[data-testid="fullday"]')).toBeVisible();
    await expect(dayByDate(p, '2026-06-20').locator('[data-testid="fullday"]')).toHaveText('★');
});

// =============================================================================
// getCustomStylesCallback
// =============================================================================

test('getCustomStylesCallback adds a <style class="drp-custom-styles"> inside the shadow root', async ({ page }) => {
    const p = pickerById(page, 'custom-styles');

    // Style element should be present in the shadow root.
    const has = await p.evaluate((el: any) => {
        const styles = el.shadowRoot?.querySelector('style.drp-custom-styles');
        return styles ? styles.textContent : null;
    });
    expect(has).toContain('my-flag');
    expect(has).toContain('magenta');
});

// =============================================================================
// specialDates
// =============================================================================

test('specialDates with default member names renders badge cells with the configured text', async ({ page }) => {
    const p = await open(page, 'specials');

    // Badges are rendered in .drp__badge-cell elements
    // sibling-to the day cells, not inside them. We just check that the
    // badge cells exist with the configured text values.
    const badges = p.locator('.drp__badge-cell');
    await expect(badges.filter({ hasText: 'A' })).toHaveCount(1);
    await expect(badges.filter({ hasText: 'B' })).toHaveCount(1);
});

test('specialDates with custom *Member mapping consumes the renamed fields', async ({ page }) => {
    const p = await open(page, 'specials-custom');

    // dateMember="when", badgeTextMember="tag" — so { when: '2026-06-19', tag: 'X' }
    // produces a badge cell containing "X".
    const xBadge = p.locator('.drp__badge-cell').filter({ hasText: 'X' });
    await expect(xBadge).toHaveCount(1);
});

test('*Member mapping configured via HTML attributes (date-member, badge-text-member) works without JS setters', async ({ page }) => {
    const p = await open(page, 'specials-attr');

    // date-member="on", badge-text-member="label" — { on: '2026-06-21', label: 'Z' }
    // produces a badge cell containing "Z".
    const zBadge = p.locator('.drp__badge-cell').filter({ hasText: 'Z' });
    await expect(zBadge).toHaveCount(1);
});

test('all 7 *-member attributes renamed: each renamed field surfaces in the expected DOM signal', async ({ page }) => {
    const p = await open(page, 'specials-all-members');

    // badge-text-member="label" — 'M' shows up in the badge cell.
    const badgeM = p.locator('.drp__badge-cell').filter({ hasText: 'M' });
    await expect(badgeM).toHaveCount(1);

    // badge-class-member="badgeCls" — extra class on the badge cell.
    await expect(badgeM).toHaveClass(/my-badge-cls/);

    // badge-tooltip-member="badgeTip" — data-tooltip on the badge cell.
    await expect(badgeM).toHaveAttribute('data-tooltip', 'badge tip text');

    // date-member="on" anchors the special date at 2026-06-22.
    const day = p.locator('.drp__day[data-date="2026-06-22"]');

    // day-class-member="dayCls" — extra class on the day cell.
    await expect(day).toHaveClass(/my-day-cls/);

    // day-tooltip-member="dayTip" — data-tooltip on the day cell.
    await expect(day).toHaveAttribute('data-tooltip', 'day tip text');

    // is-disabled-member="off" with off: true — day is marked --disabled.
    await expect(day).toHaveClass(/drp__day--disabled/);
});

// =============================================================================
// getUnifiedHeaderCallback
// =============================================================================

test('getUnifiedHeaderCallback replaces the unified-header range text', async ({ page }) => {
    const p = await open(page, 'unified-header');

    await expect(p.locator('.drp__unified-range')).toContainText('June → August');
});
