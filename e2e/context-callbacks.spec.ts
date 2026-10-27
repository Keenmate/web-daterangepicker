import { test, expect, Page, Locator, pickerById, calendarOf } from './fixtures';

/**
 * The core interaction model (web-components-core `/actions`, SPEC §12.5 / §12.12):
 *   - action-item callbacks receive the picker context { controller, element, presentation… }
 *   - one `action` event (+ `onAction`) for every activation, built-in or custom,
 *     in the order beforeActionCallback → onClick → built-in → action
 *   - `on*` twins receive the detail; `controller` / `element` are non-enumerable
 *   - HTML-authored triggers (`data-action="custom" data-id`) in showMessage content
 *
 * Fixture: test/context-callbacks.html.
 */

const PAGE = '/test/context-callbacks.html';

function buttonByText(p: Locator, text: string) {
    return p.locator('.drp__button', { hasText: text });
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(calendarOf(pickerById(page, 'ctx-actions'))).toBeVisible();
});

// =============================================================================
// Action items — render-time callbacks get the picker context
// =============================================================================

test('getTextCallback receives controller + element', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await expect(buttonByText(p, 'HASCTX')).toHaveCount(1);
    await expect(buttonByText(p, 'NOCTX')).toHaveCount(0);
});

test('getClassCallback receives the presentation flags', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await expect(buttonByText(p, 'HASCTX')).toHaveClass(/ctxclass-floating/);
});

test('getIsVisibleCallback / getIsDisabledCallback / getIsToggledCallback', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await expect(buttonByText(p, 'HIDDEN')).toHaveCount(0);
    await expect(buttonByText(p, 'DISABLED')).toBeDisabled();
    await expect(buttonByText(p, 'ACTIVE')).toHaveAttribute('aria-pressed', 'true');
    await expect(buttonByText(p, 'ACTIVE')).toHaveClass(/drp__button--toggled/);
});

test('custom items render data-action="custom" + data-id; string shorthand renders a built-in', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await expect(p.locator('.drp__button[data-action="custom"][data-id="ctx"]')).toHaveCount(1);
    await expect(p.locator('.drp__button[data-action="today"]')).toHaveText('Today');
});

test('onClick receives the action detail (action, id, source)', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await buttonByText(p, 'HASCTX').click();
    const msg = p.locator('.drp__message');
    await expect(msg).toHaveClass(/drp__message--visible/);
    await expect(msg).toContainText('act:custom:ctx:action-buttons');
});

test('each custom button gets its OWN tooltip (not the first custom one)', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    await buttonByText(p, 'SECOND').hover();
    await expect(p.locator('.drp__tooltip--visible')).toContainText('tip-second', { timeout: 2000 });
});

// =============================================================================
// action event — order, detail, built-ins, veto
// =============================================================================

test('order: beforeActionCallback → onClick → built-in → onAction → action event; one detail object', async ({ page }) => {
    const p = pickerById(page, 'ctx-events');
    const result = await p.evaluate(async (el: any) => {
        const log: string[] = [];
        const seen: any[] = [];
        el.beforeActionCallback = (d: any) => { log.push('before'); seen.push(d); };
        el.onAction = (d: any) => { log.push('onAction:' + (el.controller.selectedDate ? 'selected' : 'empty')); seen.push(d); };
        el.addEventListener('action', (e: any) => {
            log.push('event:' + (el.controller.selectedDate ? 'selected' : 'empty'));
            seen.push(e.detail);
        });
        el.actionButtons = [{ action: 'today', onClick: (d: any) => { log.push('onClick'); seen.push(d); } }];
        await el.whenSettled();
        el.shadowRoot.querySelector('.drp__button[data-action="today"]').click();
        await new Promise((r) => setTimeout(r, 50));
        const d = seen[0];
        return {
            log,
            isSameObject: seen.every((x) => x === d),
            action: d.action,
            source: d.source,
            hasController: typeof d.controller?.selectToday === 'function',
            elementIsHost: d.element === el,
            keys: Object.keys(d).sort(),
            isSelectedAfter: !!el.controller.selectedDate,
        };
    });
    // The built-in (selectToday) runs BEFORE the event — onAction / the listener see the selection.
    expect(result.log).toEqual(['before', 'onClick', 'onAction:selected', 'event:selected']);
    expect(result.isSelectedAfter).toBe(true);
    expect(result.isSameObject).toBe(true);
    expect(result.action).toBe('today');
    expect(result.source).toBe('action-buttons');
    expect(result.hasController).toBe(true);
    expect(result.elementIsHost).toBe(true);
    // controller / element are non-enumerable — invisible to Object.keys / JSON.
    expect(result.keys).not.toContain('controller');
    expect(result.keys).not.toContain('element');
    expect(result.keys).toEqual(expect.arrayContaining(['action', 'item', 'source', 'dataset', 'presentation']));
});

test('beforeActionCallback returning false (async) cancels onClick, the event and the built-in', async ({ page }) => {
    const p = pickerById(page, 'ctx-events');
    const result = await p.evaluate(async (el: any) => {
        const log: string[] = [];
        el.beforeActionCallback = async () => false;
        el.addEventListener('action', () => log.push('event'));
        el.actionButtons = [{ action: 'today', onClick: () => log.push('onClick') }];
        await el.whenSettled();
        el.shadowRoot.querySelector('.drp__button[data-action="today"]').click();
        await new Promise((r) => setTimeout(r, 50));
        return { log, isSelected: !!el.controller.selectedDate };
    });
    expect(result.log).toEqual([]);
    expect(result.isSelected).toBe(false);
});

test('HTML in showMessage: data-action="custom" data-id fires action with source "message" and dataset', async ({ page }) => {
    const p = pickerById(page, 'ctx-events');
    const cap = await p.evaluate(async (el: any) => {
        const captured: any[] = [];
        el.addEventListener('action', (e: any) => captured.push(JSON.parse(JSON.stringify(e.detail))));
        el.controller.showMessage(
            '<button data-action="custom" data-id="go" data-start-date="2026-06-01" data-reason="cheap">go</button>'
        );
        el.shadowRoot.querySelector('.drp__message [data-action="custom"]').click();
        await new Promise((r) => setTimeout(r, 50));
        return captured;
    });
    expect(cap.length).toBe(1);
    expect(cap[0].action).toBe('custom');
    expect(cap[0].id).toBe('go');
    expect(cap[0].source).toBe('message');
    // Other data-* arrive camelCased under dataset; data-action / data-id are not repeated there.
    expect(cap[0].dataset).toEqual({ startDate: '2026-06-01', reason: 'cheap' });
});

test('internal controls (nav arrows) do not fire the action event', async ({ page }) => {
    const p = pickerById(page, 'ctx-events');
    const count = await p.evaluate(async (el: any) => {
        let n = 0;
        el.addEventListener('action', () => n++);
        el.shadowRoot.querySelector('.drp__nav--next').click();
        await new Promise((r) => setTimeout(r, 50));
        return n;
    });
    expect(count).toBe(0);
});

// =============================================================================
// change / month-change — twins get the detail
// =============================================================================

test('onChange receives the detail (same object as the change event), not the CustomEvent', async ({ page }) => {
    const p = pickerById(page, 'ctx-events');
    const result = await p.evaluate(async (el: any) => {
        let twin: any;
        let evt: any;
        el.onChange = (d: any) => { twin = d; };
        el.addEventListener('change', (e: any) => { evt = e; });
        el.shadowRoot.querySelector('.drp__day[data-date="2026-06-10"]').click();
        await new Promise((r) => setTimeout(r, 50));
        return {
            isDetail: !(twin instanceof Event) && twin === evt.detail,
            hasDate: twin.date instanceof Date,
            composed: evt.composed,
            bubbles: evt.bubbles,
            hasController: typeof twin.controller?.commit === 'function' && 'selectedDate' in twin.controller,
        };
    });
    expect(result.isDetail).toBe(true);
    expect(result.hasDate).toBe(true);
    expect(result.bubbles).toBe(true);
    expect(result.composed).toBe(false);
    expect(result.hasController).toBe(true);
});

test('month-change fires after navigation with the visible months', async ({ page }) => {
    const p = pickerById(page, 'ctx-events');
    const detail = await p.evaluate(async (el: any) => {
        let d: any;
        el.onMonthChange = (x: any) => { d = JSON.parse(JSON.stringify(x)); };
        el.shadowRoot.querySelector('.drp__nav--next').click();
        await new Promise((r) => setTimeout(r, 100));
        return d;
    });
    expect(detail).toMatchObject({ monthIndex: 0, year: 2026, month: 6, visibleMonths: [{ year: 2026, month: 6 }] });
});

test('beforeSelectCallback returning null clears the selection', async ({ page }) => {
    const p = pickerById(page, 'ctx-clear');
    const result = await p.evaluate(async (el: any) => {
        el.beforeSelectCallback = () => null;
        await el.whenSettled();
        const root = el.shadowRoot;
        root.querySelector('.drp__day[data-date="2026-06-10"]').click();
        root.querySelector('.drp__day[data-date="2026-06-12"]').click();
        await new Promise((r) => setTimeout(r, 100));
        return [el.controller.selectedStartDate, el.controller.selectedEndDate, el.controller.selectedRanges.length];
    });
    expect(result).toEqual([null, null, 0]);
});

test('icon renders as a glyph before the label; isDanger adds the modifier; no internal data-* in dataset', async ({ page }) => {
    const p = pickerById(page, 'ctx-actions');
    const btn = buttonByText(p, 'ICONED');
    await expect(btn.locator('.drp__button-icon')).toHaveText('★');
    await expect(btn).toHaveClass(/drp__button--danger/);
    const dataset = await p.evaluate(async (el: any) => {
        let d: any;
        el.addEventListener('action', (e: any) => { d = e.detail.dataset; });
        el.shadowRoot.querySelector('.drp__button[data-id="iconed"]').click();
        await new Promise((r) => setTimeout(r, 50));
        return d;
    });
    expect(dataset).toEqual({});
});

test('getMonthDataCallback set after upgrade loads the visible months; reloadMonthData re-runs it', async ({ page }) => {
    const p = pickerById(page, 'ctx-events');
    const calls = await p.evaluate(async (el: any) => {
        const seen: string[] = [];
        let label = 'A';
        el.getMonthDataCallback = async ({ year, month }: any) => {
            seen.push(`${year}-${month}`);
            return { monthHeaders: new Map([[`${year}-${String(month + 1).padStart(2, '0')}`, `HDR-${label}`]]) };
        };
        await el.whenSettled();
        await new Promise((r) => setTimeout(r, 50));
        const first = el.shadowRoot.querySelector('.drp__month-year').textContent;
        label = 'B';
        await el.controller.reloadMonthData();
        const second = el.shadowRoot.querySelector('.drp__month-year').textContent;
        return { seen, first, second };
    });
    expect(calls.seen).toEqual(['2026-5', '2026-5']);
    expect(calls.first).toBe('HDR-A');
    expect(calls.second).toBe('HDR-B');
});
