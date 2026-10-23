import { test, expect, Page, Locator } from './fixtures';

/**
 * Custom rendering + lifecycle callbacks:
 *   - renderDayContentCallback augments a day cell
 *   - getMonthHeaderCallback rewrites the per-month header text
 *   - beforeSelectCallback can reject a selection (returns false)
 *   - beforeMonthChangeCallback can block navigation (returns false)
 *   - getDateMetadataCallback can disable a date dynamically
 *
 * Fixture: test/callbacks.html
 */

const PAGE = '/test/callbacks.html';

function pickerById(page: Page, id: string) {
    return page.locator(`#${id}`);
}

function calendarOf(p: Locator) {
    return p.locator('.drp__picker');
}

function dayByDate(p: Locator, isoDate: string) {
    return p.locator(`.drp__day[data-date="${isoDate}"]`);
}

function inputOf(p: Locator) {
    return p.locator('input');
}

async function open(page: Page, id: string) {
    const p = pickerById(page, id);
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
    return p;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// renderDayContentCallback
// =============================================================================

test('renderDayContentCallback appends additional HTML into the matched day cell', async ({ page }) => {
    const p = await open(page, 'content');

    // Day 15 should have our mark element inside it.
    await expect(dayByDate(p, '2026-06-15').locator('[data-testid="mark"]')).toBeVisible();
    // Day 14 (not 15) should NOT have the mark.
    await expect(dayByDate(p, '2026-06-14').locator('[data-testid="mark"]')).toHaveCount(0);
});

// =============================================================================
// getMonthHeaderCallback
// =============================================================================

test('getMonthHeaderCallback overrides the month-year header text', async ({ page }) => {
    const p = await open(page, 'header');

    await expect(p.locator('.drp__month-year').first()).toContainText('❄ June 2026 ❄');
});

// =============================================================================
// beforeSelectCallback
// =============================================================================

test('beforeSelectCallback returning false rejects the selection (input stays empty)', async ({ page }) => {
    const p = await open(page, 'before-select');

    // Day 13 is configured for rejection.
    await dayByDate(p, '2026-06-13').click();

    // Selection is not committed.
    await expect(inputOf(p)).toHaveValue('');
});

test('beforeSelectCallback accepts non-rejected days normally', async ({ page }) => {
    const p = await open(page, 'before-select');

    await dayByDate(p, '2026-06-14').click();
    await expect(inputOf(p)).toHaveValue('2026-06-14');
});

// =============================================================================
// beforeMonthChangeCallback
// =============================================================================

test('beforeMonthChangeCallback returning false prevents navigation to the target month', async ({ page }) => {
    const p = await open(page, 'before-month');

    // June → July is allowed.
    await p.locator('.drp__nav--next[data-month-index="0"]').click();
    await expect(p.locator('.drp__month-year').first()).toContainText(/July\s+2026/);

    // July → August is blocked.
    await p.locator('.drp__nav--next[data-month-index="0"]').click();
    await expect(p.locator('.drp__month-year').first()).toContainText(/July\s+2026/);
});

// =============================================================================
// getDateMetadataCallback
// =============================================================================

test('getDateMetadataCallback can mark an individual date disabled via {isDisabled:true}', async ({ page }) => {
    const p = await open(page, 'metadata');

    await expect(dayByDate(p, '2026-06-17')).toHaveClass(/drp__day--disabled/);
    // Adjacent day is still enabled.
    await expect(dayByDate(p, '2026-06-18')).not.toHaveClass(/drp__day--disabled/);
});

// =============================================================================
// beforeSelectCallback → DateRange[] (multi-range result)
// =============================================================================

test('beforeSelectCallback returning DateRange[] splits one selection into two rendered ranges', async ({ page }) => {
    const p = await open(page, 'split-ranges');

    // Select Jun 10 → Jun 20; the callback carves out Jun 15.
    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-20').click();

    // Two range-start / range-end pairs are decorated (10..14 and 16..20).
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-14')).toHaveClass(/drp__day--range-end/);
    await expect(dayByDate(p, '2026-06-16')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--range-end/);

    // Endpoints are NOT also tagged --in-range (exclusive), so they keep the solid
    // endpoint style rather than the pale in-range fill.
    await expect(dayByDate(p, '2026-06-10')).not.toHaveClass(/drp__day--in-range/);
    await expect(dayByDate(p, '2026-06-14')).not.toHaveClass(/drp__day--in-range/);
    await expect(dayByDate(p, '2026-06-16')).not.toHaveClass(/drp__day--in-range/);
    await expect(dayByDate(p, '2026-06-20')).not.toHaveClass(/drp__day--in-range/);
    // A day strictly inside a range IS in-range.
    await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--in-range/);

    // The carved-out day is neither an endpoint nor in-range.
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--range-end/);
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--in-range/);
});

test('adjustedRanges are reflected in selectedRanges and the envelope accessors', async ({ page }) => {
    const p = await open(page, 'split-ranges');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-20').click();

    const state = await p.evaluate((el: any) => {
        const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
        return {
            ranges: el.selectedRanges.map((r: any) => ({ start: iso(r.start), end: iso(r.end) })),
            envStart: iso(el.selectedStartDate),
            envEnd: iso(el.selectedEndDate),
        };
    });

    expect(state.ranges).toEqual([
        { start: '2026-06-10', end: '2026-06-14' },
        { start: '2026-06-16', end: '2026-06-20' },
    ]);
    // Envelope spans first start .. last end.
    expect(state.envStart).toBe('2026-06-10');
    expect(state.envEnd).toBe('2026-06-20');
});

test('starting a new range clears a prior multi-range result', async ({ page }) => {
    const p = await open(page, 'split-ranges');

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-20').click();
    // Committing a range auto-closes the floating calendar; reopen for a fresh pick.
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
    // A fresh, non-straddling selection (both endpoints after the hole) stays single.
    await dayByDate(p, '2026-06-18').click();
    await dayByDate(p, '2026-06-22').click();

    // A plain single range is cleared out of _selectedRanges (it lives in the
    // start/end envelope), so the prior 2-range result is gone.
    const state = await p.evaluate((el: any) => {
        const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
        return { count: el.selectedRanges.length, start: iso(el.selectedStartDate), end: iso(el.selectedEndDate) };
    });
    expect(state.count).toBe(0);
    expect([state.start, state.end]).toEqual(['2026-06-18', '2026-06-22']);
    await expect(dayByDate(p, '2026-06-10')).not.toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-18')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-22')).toHaveClass(/drp__day--range-end/);
});

// Drag from one day to another (crossing the >5px threshold), mirroring
// e2e/drag-adjust.spec.ts's helper.
async function dragDay(page: Page, p: Locator, fromIso: string, toIso: string) {
    const from = await dayByDate(p, fromIso).boundingBox();
    const to = await dayByDate(p, toIso).boundingBox();
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    const fromCx = from!.x + from!.width / 2, fromCy = from!.y + from!.height / 2;
    const toCx = to!.x + to!.width / 2, toCy = to!.y + to!.height / 2;
    await page.mouse.move(fromCx, fromCy);
    await page.mouse.down();
    await page.mouse.move(fromCx + 10, fromCy, { steps: 2 }); // cross drag threshold
    await page.mouse.move(toCx, toCy, { steps: 8 });
    await page.mouse.up();
}

test('adjustedRanges also applies when the range is created by DRAGGING (not clicking)', async ({ page }) => {
    const p = await open(page, 'split-ranges');

    // Drag Jun 10 → Jun 20 in one motion; the callback carves out Jun 15.
    await dragDay(page, p, '2026-06-10', '2026-06-20');

    // Same two-range result as the click path.
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-14')).toHaveClass(/drp__day--range-end/);
    await expect(dayByDate(p, '2026-06-16')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--range-end/);
    // The carved-out day is neither an endpoint nor in-range.
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--in-range/);

    const state = await p.evaluate((el: any) => {
        const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
        return {
            ranges: el.selectedRanges.map((r: any) => ({ start: iso(r.start), end: iso(r.end) })),
            envStart: iso(el.selectedStartDate),
            envEnd: iso(el.selectedEndDate),
            input: el.shadowRoot.querySelector('input').value,
        };
    });
    expect(state.ranges).toEqual([
        { start: '2026-06-10', end: '2026-06-14' },
        { start: '2026-06-16', end: '2026-06-20' },
    ]);
    expect(state.envStart).toBe('2026-06-10');
    expect(state.envEnd).toBe('2026-06-20');
    // Input reflects both snapped pieces, not the raw 06-10..06-20 span.
    expect(state.input).toBe('2026-06-10 - 2026-06-14, 2026-06-16 - 2026-06-20');
});

// =============================================================================
// Programmatic selectedRanges setter (range mode) + split-context + Apply mode
// =============================================================================

test('programmatic el.selectedRanges = [2 ranges] renders both ranges in range mode', async ({ page }) => {
    const p = await open(page, 'prog-ranges');

    await p.evaluate((el: any) => {
        el.selectedRanges = [
            { start: new Date(2026, 5, 5), end: new Date(2026, 5, 8) },
            { start: new Date(2026, 5, 20), end: new Date(2026, 5, 24) },
        ];
    });

    await expect(dayByDate(p, '2026-06-05')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-08')).toHaveClass(/drp__day--range-end/);
    await expect(dayByDate(p, '2026-06-20')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-24')).toHaveClass(/drp__day--range-end/);
    // The gap between the two ranges is not highlighted.
    await expect(dayByDate(p, '2026-06-12')).not.toHaveClass(/drp__day--in-range/);

    // Envelope spans first-start .. last-end.
    const env = await p.evaluate((el: any) => {
        const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
        return { s: iso(el.selectedStartDate), e: iso(el.selectedEndDate) };
    });
    expect([env.s, env.e]).toEqual(['2026-06-05', '2026-06-24']);
});

test('beforeSelectCallback receives ctx.subRanges and ctx.enabledDates in split mode', async ({ page }) => {
    const p = await open(page, 'split-inspect');

    // 06-10 (Wed) → 06-18 (Thu); Sat 06-13 + Sun 06-14 are disabled weekends.
    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-18').click();

    const ctx = await p.evaluate((el: any) => el._lastCtx);
    expect(ctx.hasSubRanges).toBe(true);
    expect(ctx.subRanges).toEqual([
        { start: '2026-06-10', end: '2026-06-12' },
        { start: '2026-06-15', end: '2026-06-18' },
    ]);
    // Enabled days = the two segments' weekdays (weekend carved out).
    expect(ctx.enabledDates).toEqual([
        '2026-06-10', '2026-06-11', '2026-06-12',
        '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18',
    ]);
});

test('Apply mode: adjustedRanges commit on Apply and revert on cancel', async ({ page }) => {
    const p = await open(page, 'split-apply');

    // Select a straddling range → callback splits into 2; Apply required to commit.
    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-20').click();
    await p.locator('.drp__button--apply').click();

    const afterApply = await p.evaluate((el: any) => el.selectedRanges.length);
    expect(afterApply).toBe(2);

    // Reopen and complete a fresh (non-straddling → single) range, then cancel
    // with Escape before Apply. Cancel must revert to the committed 2-range result.
    await inputOf(p).click();
    await expect(calendarOf(p)).toBeVisible();
    await dayByDate(p, '2026-06-25').click();
    await dayByDate(p, '2026-06-27').click(); // pending selection now exists
    await page.keyboard.press('Escape');

    // Cancel reverts to the committed 2-range result.
    const afterCancel = await p.evaluate((el: any) =>
        el.selectedRanges.map((r: any) => [
            `${r.start.getMonth() + 1}/${r.start.getDate()}`,
            `${r.end.getMonth() + 1}/${r.end.getDate()}`,
        ]));
    expect(afterCancel).toEqual([['6/10', '6/14'], ['6/16', '6/20']]);
});

test('adjustedRanges also applies when the range is TYPED into the input', async ({ page }) => {
    const p = pickerById(page, 'split-ranges');
    const inp = inputOf(p);

    // Type 06-10 → 06-20 (mask auto-inserts separators + " - "). Completing the
    // end date runs the validation gate, which splits around Jun 15.
    await inp.click();
    await inp.pressSequentially('2026061020260620');

    // Commit is async — poll until the two snapped ranges land.
    await expect
        .poll(async () => p.evaluate((el: any) =>
            el.selectedRanges
                .map((r: any) => `${r.start.getMonth() + 1}/${r.start.getDate()}-${r.end.getMonth() + 1}/${r.end.getDate()}`)
                .join('|')))
        .toBe('6/10-6/14|6/16-6/20');

    // Input reflects the snapped pieces, and the carved-out day isn't in-range.
    await expect(inp).toHaveValue('2026-06-10 - 2026-06-14, 2026-06-16 - 2026-06-20');
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--in-range/);
});
