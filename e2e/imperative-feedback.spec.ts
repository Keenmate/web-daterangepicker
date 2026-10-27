import { test, expect, Page, Locator, pickerById, calendarOf } from './fixtures';

/**
 * v2.0.0 symmetric feedback API — the summary/loader/message imperative methods
 * that previously had no coverage (summary + loader had no public writer at all).
 *
 * Fixture: test/imperative-feedback.html — one inline range picker (#feedback),
 * so .drp__picker, .drp__message and .drp__summary are always rendered.
 */

const PAGE = '/test/imperative-feedback.html';

function summaryOf(p: Locator) { return p.locator('.drp__summary'); }
function messageOf(p: Locator) { return p.locator('.drp__message'); }
function enabledDays(p: Locator) {
    return p.locator('.drp__day:not(.drp__day--disabled):not(.drp__day--other-month)');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(calendarOf(pickerById(page, 'feedback'))).toBeVisible();
});

// =============================================================================
// showSummary / hideSummary / refreshSummary
// =============================================================================

test('showSummary writes custom HTML into the summary block and makes it visible', async ({ page }) => {
    const p = pickerById(page, 'feedback');

    await p.evaluate((el: any) => el.showSummary('<span class="mine">€420</span>'));

    await expect(summaryOf(p)).toHaveClass(/drp__summary--visible/);
    await expect(summaryOf(p).locator('.mine')).toHaveText('€420');
});

test('summary override survives a re-render (refreshSummary) until a selection commits', async ({ page }) => {
    const p = pickerById(page, 'feedback');

    await p.evaluate((el: any) => el.showSummary('<span class="mine">PINNED</span>'));

    // A plain re-derive must NOT clobber the override.
    await p.evaluate((el: any) => el.refreshSummary());
    await expect(summaryOf(p).locator('.mine')).toHaveText('PINNED');

    // Committing a real range clears the override → summary re-derives to days/nights.
    await enabledDays(p).nth(3).click();
    await enabledDays(p).nth(8).click();

    await expect(summaryOf(p).locator('.mine')).toHaveCount(0);
    await expect(summaryOf(p)).toContainText(/day/i);
});

test('hideSummary drops the override and re-derives from the current selection', async ({ page }) => {
    const p = pickerById(page, 'feedback');

    // Commit a range first so there IS something to re-derive to.
    await enabledDays(p).nth(3).click();
    await enabledDays(p).nth(8).click();
    await expect(summaryOf(p)).toContainText(/day/i);

    // Pin custom content, then drop it.
    await p.evaluate((el: any) => el.showSummary('<span class="mine">X</span>'));
    await expect(summaryOf(p).locator('.mine')).toHaveText('X');

    await p.evaluate((el: any) => el.hideSummary());
    await expect(summaryOf(p).locator('.mine')).toHaveCount(0);
    await expect(summaryOf(p)).toContainText(/day/i);
});

// =============================================================================
// showLoader / hideLoader / toggleLoader (scoped)
// =============================================================================

test("showLoader() mounts the full-calendar overlay; hideLoader() removes it", async ({ page }) => {
    const p = pickerById(page, 'feedback');

    await p.evaluate((el: any) => el.showLoader());
    await expect(calendarOf(p).locator('.drp__loader-overlay')).toHaveCount(1);
    await expect(calendarOf(p).locator('.drp__loader-overlay .drp__loader')).toHaveCount(1);

    await p.evaluate((el: any) => el.hideLoader());
    await expect(calendarOf(p).locator('.drp__loader-overlay')).toHaveCount(0);
});

test("showLoader('summary') renders an in-block spinner + --loading; hideLoader clears it", async ({ page }) => {
    const p = pickerById(page, 'feedback');

    await p.evaluate((el: any) => el.showLoader('summary'));
    await expect(summaryOf(p)).toHaveClass(/drp__summary--loading/);
    await expect(summaryOf(p)).toHaveClass(/drp__summary--visible/); // forced visible for the spinner
    await expect(summaryOf(p).locator('.drp__inline-loader')).toHaveCount(1);

    await p.evaluate((el: any) => el.hideLoader('summary'));
    await expect(summaryOf(p)).not.toHaveClass(/drp__summary--loading/);
    await expect(summaryOf(p).locator('.drp__inline-loader')).toHaveCount(0);
});

test("showLoader('message') renders an in-block spinner inside the message block", async ({ page }) => {
    const p = pickerById(page, 'feedback');

    await p.evaluate((el: any) => el.showLoader('message'));
    await expect(messageOf(p)).toHaveClass(/drp__message--loading/);
    await expect(messageOf(p)).toHaveClass(/drp__message--visible/);
    await expect(messageOf(p).locator('.drp__inline-loader')).toHaveCount(1);

    await p.evaluate((el: any) => el.hideLoader('message'));
    await expect(messageOf(p)).not.toHaveClass(/drp__message--loading/);
    await expect(messageOf(p).locator('.drp__inline-loader')).toHaveCount(0);
});

test("summary loader added in a change handler survives the commit re-render", async ({ page }) => {
    const p = pickerById(page, 'feedback');

    // Real-world recipe: change fires BEFORE commitSelection()'s updateSummary()
    // re-render. A naive appendChild would be wiped by that re-render — the loader must
    // persist through derivation exactly like a showSummary() override does.
    await p.evaluate((el: any) => {
        el.addEventListener('change', (e: any) => {
            if (e.detail.dateRange) el.showLoader('summary');
        });
    });

    await enabledDays(p).nth(3).click();
    await enabledDays(p).nth(8).click();

    // After the range commit re-derived the summary, the spinner is still there.
    await expect(summaryOf(p)).toHaveClass(/drp__summary--loading/);
    await expect(summaryOf(p).locator('.drp__inline-loader')).toHaveCount(1);

    // And a further explicit re-derive (refreshSummary) keeps it.
    await p.evaluate((el: any) => el.refreshSummary());
    await expect(summaryOf(p).locator('.drp__inline-loader')).toHaveCount(1);
});

test("toggleLoader('summary') shows then hides the in-block spinner", async ({ page }) => {
    const p = pickerById(page, 'feedback');

    await p.evaluate((el: any) => el.toggleLoader('summary'));
    await expect(summaryOf(p).locator('.drp__inline-loader')).toHaveCount(1);

    await p.evaluate((el: any) => el.toggleLoader('summary'));
    await expect(summaryOf(p).locator('.drp__inline-loader')).toHaveCount(0);
});

test('showLoader() is single-instance per target — a second call does not stack overlays', async ({ page }) => {
    const p = pickerById(page, 'feedback');

    await p.evaluate((el: any) => { el.showLoader(); el.showLoader(); });
    await expect(calendarOf(p).locator('.drp__loader-overlay')).toHaveCount(1);

    // A single hideLoader removes the one overlay.
    await p.evaluate((el: any) => el.hideLoader());
    await expect(calendarOf(p).locator('.drp__loader-overlay')).toHaveCount(0);
});

// =============================================================================
// toggleMessage
// =============================================================================

test('toggleMessage shows the message with content, then hides it on the next call', async ({ page }) => {
    const p = pickerById(page, 'feedback');

    await p.evaluate((el: any) => el.toggleMessage('<span class="msg">hi</span>'));
    await expect(messageOf(p)).toHaveClass(/drp__message--visible/);
    await expect(messageOf(p).locator('.msg')).toHaveText('hi');

    await p.evaluate((el: any) => el.toggleMessage());
    await expect(messageOf(p)).not.toHaveClass(/drp__message--visible/);
});
