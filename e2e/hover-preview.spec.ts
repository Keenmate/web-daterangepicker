import { test, expect, Page, Locator, pickerById, dayByDate } from './fixtures';

/**
 * Hover preview in range mode: after the first click sets a start date, the
 * picker paints the would-be range as the mouse moves over candidate end days.
 * Behavior is mode-aware per disabledDatesHandling — see FINDINGS.md #6 and
 * the source comment on updateHoverPreview() for the per-mode strategy.
 *
 * Fixture: test/hover-preview.html (initial-date=2026-06-15,
 * disabled-weekdays=0,6 so Sat 2026-06-13 and Sun 2026-06-14 are disabled).
 *
 *   Mon 2026-06-08  Tue 06-09  Wed 06-10  Thu 06-11  Fri 06-12
 *   Sat 06-13 (disabled)  Sun 06-14 (disabled)
 *   Mon 06-15  Tue 06-16  Wed 06-17  Thu 06-18  Fri 06-19
 */

const PAGE = '/test/hover-preview.html';

async function open(p: Locator) {
    await p.locator('input').click();
    await expect(p.locator('.drp__picker')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// =============================================================================
// allow — full range painted, disabled days keep their disabled overlay
// =============================================================================

test('allow: hovering Fri after clicking Mon paints the full Mon..Fri with --hover-preview', async ({ page }) => {
    const p = pickerById(page, 'allow');
    await open(p);

    await dayByDate(p, '2026-06-08').click(); // Mon — sets start
    await dayByDate(p, '2026-06-12').hover();  // Fri — preview end

    for (const iso of ['2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12']) {
        await expect(dayByDate(p, iso)).toHaveClass(/drp__day--hover-preview/);
    }
});

test('allow: hovering past the weekend paints the weekend days too (allow lets the range span them)', async ({ page }) => {
    const p = pickerById(page, 'allow');
    await open(p);

    await dayByDate(p, '2026-06-12').click(); // Fri — start
    await dayByDate(p, '2026-06-17').hover();  // following Wed — crosses Sat/Sun

    // Both disabled cells (Sat/Sun) carry --hover-preview alongside their
    // existing --disabled class. CSS layering handles the visual.
    await expect(dayByDate(p, '2026-06-13')).toHaveClass(/drp__day--hover-preview/);
    await expect(dayByDate(p, '2026-06-14')).toHaveClass(/drp__day--hover-preview/);
    await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--hover-preview/);
    await expect(dayByDate(p, '2026-06-17')).toHaveClass(/drp__day--hover-preview/);
});

// =============================================================================
// prevent — paint --hover-preview-invalid when range crosses disabled
// =============================================================================

test('prevent: hovering across a weekend paints with --hover-preview-invalid (signals click will be rejected)', async ({ page }) => {
    const p = pickerById(page, 'prevent');
    await open(p);

    await dayByDate(p, '2026-06-12').click(); // Fri — start
    await dayByDate(p, '2026-06-17').hover();  // crosses weekend

    // No regular preview class — every painted cell carries the invalid variant
    await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--hover-preview-invalid/);
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--hover-preview(?!-invalid)/);
});

test('prevent: hovering within a valid (contiguous-enabled) range uses the normal --hover-preview', async ({ page }) => {
    const p = pickerById(page, 'prevent');
    await open(p);

    await dayByDate(p, '2026-06-08').click(); // Mon
    await dayByDate(p, '2026-06-12').hover();  // Fri — same week, no weekend in between

    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--hover-preview/);
    await expect(dayByDate(p, '2026-06-10')).not.toHaveClass(/drp__day--hover-preview-invalid/);
});

// =============================================================================
// block — preview snaps end backward when range would cross disabled
// =============================================================================

test('block: hovering past the weekend snaps the preview end to the last enabled day before the gap', async ({ page }) => {
    const p = pickerById(page, 'block');
    await open(p);

    await dayByDate(p, '2026-06-08').click(); // Mon — start
    await dayByDate(p, '2026-06-17').hover();  // mouse over later Wed (after weekend)

    // Preview only reaches Fri (last enabled before Sat/Sun gap).
    await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--hover-preview/);
    // Days past the gap are NOT in the preview.
    await expect(dayByDate(p, '2026-06-13')).not.toHaveClass(/drp__day--hover-preview/);
    await expect(dayByDate(p, '2026-06-15')).not.toHaveClass(/drp__day--hover-preview/);
    await expect(dayByDate(p, '2026-06-17')).not.toHaveClass(/drp__day--hover-preview/);
});

// =============================================================================
// split — paint enabled days only; disabled days remain bare to show gaps
// =============================================================================

test('split: hovering across a weekend paints enabled days but leaves Sat/Sun bare (visual gaps)', async ({ page }) => {
    const p = pickerById(page, 'split');
    await open(p);

    await dayByDate(p, '2026-06-12').click(); // Fri — start
    await dayByDate(p, '2026-06-17').hover();  // crosses weekend

    // Enabled days in range are painted.
    await expect(dayByDate(p, '2026-06-15')).toHaveClass(/drp__day--hover-preview/);
    await expect(dayByDate(p, '2026-06-17')).toHaveClass(/drp__day--hover-preview/);
    // Disabled days (the weekend) stay bare.
    await expect(dayByDate(p, '2026-06-13')).not.toHaveClass(/drp__day--hover-preview/);
    await expect(dayByDate(p, '2026-06-14')).not.toHaveClass(/drp__day--hover-preview/);
});

// =============================================================================
// auto-swap when hovering before the start
// =============================================================================

test('the committed start day keeps its --range-start solid styling and does NOT get --hover-preview painted on top', async ({ page }) => {
    const p = pickerById(page, 'swap');
    await open(p);

    await dayByDate(p, '2026-06-10').click(); // commit start
    await dayByDate(p, '2026-06-15').hover();  // hover end

    // Intermediate days carry the preview class…
    await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--hover-preview/);

    // …but the start day must not (so its solid --range-start bg + on-accent
    // text don't get visually swapped for a translucent bg + mismatched text).
    await expect(dayByDate(p, '2026-06-10')).toHaveClass(/drp__day--range-start/);
    await expect(dayByDate(p, '2026-06-10')).not.toHaveClass(/drp__day--hover-preview/);
});

test('hovering before the start auto-swaps so preview paints (hovered)..(start)', async ({ page }) => {
    const p = pickerById(page, 'swap');
    await open(p);

    await dayByDate(p, '2026-06-15').click(); // start
    await dayByDate(p, '2026-06-11').hover();  // earlier day

    // Days between 06-11 and 06-15 are painted.
    for (const iso of ['2026-06-12', '2026-06-13', '2026-06-14']) {
        await expect(dayByDate(p, iso)).toHaveClass(/drp__day--hover-preview/);
    }
});

// =============================================================================
// cleanup behaviors
// =============================================================================

test('committing the range (second click) clears all hover preview classes', async ({ page }) => {
    const p = pickerById(page, 'swap');
    await open(p);

    await dayByDate(p, '2026-06-10').click(); // start
    await dayByDate(p, '2026-06-15').hover();  // preview painted

    await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--hover-preview/);

    await dayByDate(p, '2026-06-15').click(); // commit

    // After commit, the calendar re-renders with --in-range. The transient
    // hover-preview classes must not survive on any cell.
    const previewCells = p.locator(
        '.drp__day--hover-preview, .drp__day--hover-preview-invalid'
    );
    await expect(previewCells).toHaveCount(0);
});

test('moving the mouse away from the calendar clears the hover preview', async ({ page }) => {
    const p = pickerById(page, 'swap');
    await open(p);

    await dayByDate(p, '2026-06-10').click();
    await dayByDate(p, '2026-06-15').hover();

    await expect(dayByDate(p, '2026-06-12')).toHaveClass(/drp__day--hover-preview/);

    // Move the mouse to the page heading, well outside the calendar.
    await page.locator('h1').hover();

    const previewCells = p.locator(
        '.drp__day--hover-preview, .drp__day--hover-preview-invalid'
    );
    await expect(previewCells).toHaveCount(0);
});
