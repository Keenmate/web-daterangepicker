/**
 * Date Picker UI Methods
 *
 * Functions for UI-related logic including open/close, positioning,
 * and tooltips.
 */

// All positioning goes through core `@keenmate/web-components-core/positioning`:
// the FLOATING calendar is a core `createPopover()` (anchoring, the overlay tree — group
// exclusivity, Escape, outside click — and the scroll / resize close); the modal and the
// phone full-screen sheet are a core `startModalSession()` alone (no popover), the day/badge
// tooltip a delegated core `createTooltip()` (date-picker.ts createDayTooltip). Both use
// the first-class `shouldUseFixedContainingBlock`
// (the narrowed containing-block heuristic); the calendar adds `onDrift` (the drift
// diagnostic). This file keeps only the daterangepicker-branded warning copy (see
// warnDrift). daterangepicker does not depend on `@floating-ui/dom` directly.
import { createPopover, type DriftReport, type PopoverCloseReason } from '@keenmate/web-components-core/positioning';
import { adoptStyles, announce, createSheetHeader, findScrollContainer, renderLoader, runBeforeCallbackSync, scrollIntoContainer, SHEET_CHROME_CSS, startModalSession, type ModalDismissReason, type ModalSessionOptions } from '@keenmate/web-components-core';
import { uiLogger } from './logger';
import { handleInitialMonthLoad } from './date-picker-navigation';
import { updateCalendarFromInput } from './date-picker-interaction';
import { updateSummary } from './date-picker-rendering';
import type { BeforeScrollContext, DateRangePickerScrollOptions, DateRangePickerScrollSource, LoaderTarget, MessageVariant } from './types';

/**
 * Surface a daterangepicker-branded, once-per-instance warning when core's drift
 * check (`onDrift`) reports the calendar didn't land where it was
 * positioned — an ancestor establishes a fixed containing block the heuristic
 * doesn't recognize (typically `contain` / `container-type`). Core owns the drift
 * measurement + culprit identification (`detectFixedDrift`, SPEC §12.2); this keeps
 * only the daterangepicker-specific warning copy.
 */
function warnDrift(picker: any, report: DriftReport): void {
    if (picker.positioningDriftWarned) return;
    picker.positioningDriftWarned = true;
    uiLogger.warn(
        `Calendar rendered ${report.driftX.toFixed(0)}px / ${report.driftY.toFixed(0)}px ` +
        `away from where the library positioned it. Most likely culprit: ${report.culpritDescription}` +
        (report.culpritCss ? ` (has ${report.culpritCss})` : '') + `.\n` +
        `An ancestor of <web-daterangepicker> establishes a fixed-positioning containing block that the library's ` +
        `heuristic doesn't recognize. Fix on your side: replace the property with \`transform: translateZ(0)\` ` +
        `on that ancestor, OR move the trigger out of that ancestor's subtree. If neither is acceptable, ` +
        `please file an issue at https://github.com/keenmate/web-daterangepicker/issues with the ancestor's computed CSS.`
    );
}

/**
 * Stop the calendar popover (anchoring, overlay-tree membership, scroll / resize
 * close). Safe to call unconditionally (no-op when none is open). Called by close(),
 * deactivate() and destroy() — the latter matters because a positioning-mode flip
 * rebuilds an OPEN picker, and without this the autoUpdate loop keeps firing on the
 * removed calendar and reports a bogus drift (measuring a detached, zero-rect element).
 * The popover reports this close as `'api'`, which onPopoverClose ignores.
 */
export function cleanupPositioning(picker: any): void {
    const popover = picker.calendarPopover;
    picker.calendarPopover = null;
    popover?.destroy();
}

/**
 * Bring a (keyboard-)focused day into view: core `scrollIntoContainer` scrolls only the
 * one container around it (the calendar's months area, a scrolling page section) —
 * `scrollIntoView` also scrolled every ancestor and the page, which can close a
 * floating calendar. Only with no scroll container at all does the page scroll.
 * `nearest`, behaviour from `--drp-scroll-behavior` (rulebook D-CA-5); goes through
 * `beforeScrollCallback`.
 */
export function revealDay(picker: any, day: Element | null | undefined, source: DateRangePickerScrollSource = 'keyboard'): void {
    if (!(day instanceof HTMLElement)) return;
    // Real focus follows when it is in the grid (roving); the scroll is ours, just below.
    picker.isRevealingDay = true;
    try { picker.focusDayCell?.(day); } finally { picker.isRevealingDay = false; }
    scrollDayIntoView(picker, day, source);
}

/**
 * The scroll half of {@link revealDay} — also the roving grid's `shouldScroll` gate, so core's
 * own arrow moves scroll through `beforeScrollCallback` (+ its replaced options) and
 * `--drp-scroll-behavior` too.
 */
export function scrollDayIntoView(picker: any, day: HTMLElement, source: DateRangePickerScrollSource = 'keyboard'): void {
    const iso = day.dataset.date;
    const [y, m, d] = iso ? iso.split('-').map(Number) : [];
    const behavior = (getComputedStyle(day).getPropertyValue('--drp-scroll-behavior').trim() || 'auto') as ScrollBehavior;
    scrollOnOwn(picker, day, {
        target: 'day', date: iso ? new Date(y, m - 1, d) : null, timeField: null, timeValue: null, source,
    }, { block: 'nearest', inline: 'nearest', behavior });
}

/**
 * Every scroll the picker does on its own goes through here: `beforeScrollCallback`
 * (core `runBeforeCallbackSync` — `false` skips, an options object replaces the
 * defaults), then core `scrollIntoContainer`. `container`: the scroller when the
 * caller knows it (a time roll), else core finds it.
 */
export function scrollOnOwn(
    picker: any,
    item: HTMLElement,
    fields: Pick<BeforeScrollContext, 'target' | 'date' | 'timeField' | 'timeValue' | 'source'>,
    defaults: DateRangePickerScrollOptions,
    container?: HTMLElement,
): void {
    let options = defaults;
    const callback = picker.options.beforeScrollCallback as ((ctx: BeforeScrollContext) => unknown) | undefined;
    if (callback) {
        const ctx = picker.ctx({
            ...fields, item, container: container ?? findScrollContainer(item), options: { ...defaults },
        }) as BeforeScrollContext;
        const result = runBeforeCallbackSync<BeforeScrollContext, Partial<DateRangePickerScrollOptions> | null>(callback, ctx, 'beforeScrollCallback', ctx);
        if (result.isRejected) return;
        const replaced = 'value' in result ? result.value : undefined;
        if (replaced && typeof replaced === 'object') options = { ...defaults, ...replaced };
    }
    scrollIntoContainer(item, container ? { ...options, container } : options);
}

/**
 * The modal presentation's scrim (`.drp__backdrop`, styled by modal.css: `--drp-modal-backdrop-bg`,
 * `--drp-z-index-modal-backdrop`, the `--drp-modal-transition` fade). Handed to the core modal
 * session, which wires its click (`dismissCallback('backdrop')`, decided by `close-on-outside-click`
 * in {@link onSessionDismiss}) and swallows the opening tap's ghost click on it (`isOpenedByPointer`).
 */
function ensureModalBackdrop(picker: any): HTMLElement {
    if (picker.modalBackdrop) return picker.modalBackdrop;
    const backdrop = document.createElement('div');
    backdrop.className = 'drp__backdrop';
    picker.containerElement.appendChild(backdrop);
    picker.modalBackdrop = backdrop;
    return backdrop;
}

export function open(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') {
        return;
    }

    // Open lock: refuse to (re)open. Blocks the input focus/click/pointerdown triggers
    // and typing-triggered opens alike. Closing (hide/Escape) is intentionally NOT gated,
    // so a locked picker can always be dismissed and never traps the user.
    if (picker.isAspectLocked('open')) {
        return;
    }

    // Already visible — skip. Without this guard, repeated open() calls (e.g., focus
    // fires after mousedown on the same click) re-sync from the input and leak
    // the autoUpdate cleanup function.
    if (picker.calendar.classList.contains('drp__picker--visible')) {
        // The tap's later triggers (mousedown/click) re-set openViaPointer after the
        // pointerdown already opened + armed; clear it so it can't linger to a later
        // programmatic open().
        picker.openViaPointer = false;
        // A page control outside the calendar calling open() keeps it open through
        // that click (core decides the outside click when the click ends).
        picker.calendarPopover?.claimCurrentClick();
        return;
    }

    // Disabled input — refuse to open. The browser already blocks a real
    // user click on a disabled input, but programmatic clicks, focus calls,
    // and some a11y tools can still dispatch events. Guard open() so the
    // `disabled` setter on the host element fully suppresses opening.
    if (picker.input?.disabled) {
        return;
    }

    uiLogger.debug('open() - adding visible class');

    // Snapshot wall-clock so renderTimePicker has a stable "now" for uncommitted
    // fields. Without this, real-time-seconds advance between renders pulls the
    // seconds roll along (and minutes/hours once enough time passes).
    // Also flag the upcoming render so each roll force-scrolls to center its
    // committed/focus value (the rolls preserve scrollTop across hide/show).
    if (picker.options.pickerMode !== 'date') {
        picker.timePickerOpenSnapshot = new Date();
        picker.forceTimePickerScroll = true;
        // Clock picker always re-opens on the hours step (Material flow). Resetting
        // here means closing on the minutes face then reopening lands the user
        // back at hours rather than mid-flow.
        picker.clockStep = 'hours';
        // Wheel picker: same idea as the rolls' forceTimePickerScroll — every open
        // re-centers the focus value in each column even if scrollTop is preserved
        // across hide/show.
        picker.forceWheelScroll = true;
    }

    // Sync calendar selection with current input value (handles manually cleared input)
    updateCalendarFromInput(picker);

    // Render calendar on first show to avoid rendering hidden days
    if (picker.isFirstRender) {
        picker.renderCalendar();
        picker.isFirstRender = false;

        // Load getMonthDataCallback data for the initial months
        handleInitialMonthLoad(picker);
    } else if (picker.options.pickerMode !== 'date') {
        // Time/datetime modes: re-render every open so committed values get the
        // --selected highlight applied and the rolls re-center via force-scroll.
        picker.renderCalendar();
    }

    picker.calendar.classList.add('drp__picker--visible');
    picker.setCalendarActive(); // Make calendar active and deactivate other pickers (inline keyboard tracking)
    uiLogger.debug('open() - calendar classes:', picker.calendar.className);

    // Set up the chrome for the current runtime presentation (centered modal, phone
    // full-screen overlay) and open the calendar's core popover: it joins the overlay
    // tree (dismissing every other overlay of the group — pickers, multiselects, …),
    // anchors the floating presentation and watches the scroll / resize close.
    applyPresentationChrome(picker);

    picker.options.onOpen?.(picker.ctx({}));
}

/**
 * Stand up the chrome for the picker's current runtime `presentation`: the anchored calendar
 * popover when `floating`, else a core modal session (the centered modal, the phone full-screen
 * sheet) — one overlay entry per presentation, never both (a page overlay opening can't dismiss
 * the modal, BG6 / W11). Called by open(), by activate() (a moved, open picker) and by
 * setPresentation() when the environment flips while open.
 */
export function applyPresentationChrome(picker: any) {
    if (picker.presentation === 'modal') enterModal(picker);
    else if (picker.presentation === 'fullscreen') enterFullscreen(picker);
    else if (!picker.calendarPopover) {
        picker.calendarPopover = createCalendarPopover(picker);
        picker.calendarPopover.open();
    }
}

/** Reverse the modal / full-screen chrome (the floating popover is cleanupPositioning()'s). */
function exitPresentationChrome(picker: any) {
    if (picker.presentation === 'modal') exitModal(picker);
    else if (picker.presentation === 'fullscreen') exitFullscreen(picker);
}

/**
 * Tear down the popover and whatever chrome the current `presentation` stood up.
 * Called by close(), deactivate() and destroy().
 */
export function teardownPresentationChrome(picker: any) {
    cleanupPositioning(picker);
    exitPresentationChrome(picker);
}

/**
 * The open calendar as a core popover (`createPopover`, kept mounted where it was
 * built — the calendar is built once and only shown / hidden by `drp__picker--visible`).
 * Core owns: the overlay tree (one open overlay per `overlay-group`, nested overlays,
 * Escape — one level per press — and the outside click, decided when the click ends),
 * the scroll close (a scroll that moves the input: the page or a scroller around it,
 * never one inside the calendar) and the resize close. Anchoring: `elementResize` is
 * off so the calendar's *own* size changes (e.g. a custom renderSummaryCallback
 * rendering 2 vs 3 lines on hover) don't re-run the position. With a flipped placement
 * the new top would be inputTop − newHeight − offset, sliding the calendar upward and
 * the hovered day with it — which lands the cursor on a different day, re-fires hover,
 * and loops. Anchor once, let it grow downward. Created per open, so the current
 * `calendar-placement` / `overlay-group` apply.
 */
function createCalendarPopover(picker: any) {
    return createPopover({
        reference: picker.input,
        panel: picker.calendar,
        shouldKeepMounted: true,
        // A marker only: the calendar's own `drp__picker--visible` shows it.
        visibleClass: 'drp__picker--open',
        inheritThemeFrom: false, // the calendar lives in our shadow root (or the page for the engine)
        overlayGroup: picker.options.overlayGroup || undefined,
        // Escape closes the calendar — except while a compact time field is being edited
        // (its own Escape reverts the edit first: one level per press).
        shouldCloseOnEscape: () => !isEditingInCalendar(picker),
        // The input is the reference: focusing it opens the calendar again, so Escape
        // returns focus nowhere.
        returnFocusTo: null,
        shouldCloseOnOutsideClick: () => picker.closesOnOutsideClick(),
        // External trigger buttons and the day / badge tooltip don't count as outside.
        getInsideElements: () => [
            picker.dayTooltipElement,
            // The element's input wrapper (its ✕ clear button): a press there is no outside
            // click — closing would discard the clear it just staged (apply / manual).
            picker.input?.closest('.drp__input-wrapper') ?? null,
            ...(typeof document !== 'undefined' ? Array.from(document.querySelectorAll('[data-calendar-button]')) : []),
        ],
        shouldCloseOnScroll: () => picker.closesOnScroll(),
        // With elementResize off the calendar can't adapt to a smaller / larger window:
        // dismiss it and let the user reopen it in the new viewport.
        shouldCloseOnResize: true,
        // A close by the overlay tree, a scroll or a resize: run the picker's own close
        // (discard a staged pick, `close` event). 'api' is our own close — already running.
        closeCallback: (reason: PopoverCloseReason) => {
            if (reason !== 'api') close(picker);
        },
        placement: (picker.options.calendarPlacement || 'bottom-start'),
        strategy: 'fixed',
        // No `offset`: core's default is the page's field → panel gap `--base-dropdown-offset`.
        flipPadding: 8,
        shift: 8,
        // Cap the calendar to the viewport-available height (it scrolls its
        // months area internally); header/action bar stay pinned.
        maxHeight: { padding: 8 },
        // Symmetric width cap: a wide multi-month calendar near the viewport
        // edge caps its max-width to the available side and wraps internally
        // instead of overflowing horizontally off-screen.
        maxWidth: { padding: 8 },
        // Narrow the containing-block heuristic to what browsers honour for
        // `position: fixed` (ignore contain/container-type — the pure-admin
        // `.pa-layout__main` case), resolved from the FLOATING element (the calendar).
        shouldUseFixedContainingBlock: true,
        // The calendar's OWN size changes must not re-trigger a reposition
        // (resize→reposition→re-hover loop); reposition only on scroll/ancestor moves.
        autoUpdateOptions: { elementResize: false },
        // One-shot drift warning if an unrecognized ancestor CB still shifts the panel.
        driftCallback: (report: DriftReport) => warnDrift(picker, report),
    });
}

/** A compact time field (contentEditable pill) inside the calendar has focus. */
function isEditingInCalendar(picker: any): boolean {
    const root = picker.calendar?.getRootNode?.() as Document | ShadowRoot | undefined;
    const active = root?.activeElement as HTMLElement | null | undefined;
    return !!active && active.isContentEditable && picker.calendar.contains(active);
}

/**
 * The modal and the phone full-screen sheet are one core modal session each (SPEC §12.19): the page
 * behind is inert, Tab stays in the calendar, Escape / the phone Back gesture / the modal's backdrop
 * ask {@link onSessionDismiss}, page scroll is locked, the page's open overlays close at open (Q3).
 * Opened by a tap on the input (`pointerdown`, before the press focuses it): `isOpenedByPointer`
 * swallows the tap's own trailing click on the calendar / backdrop.
 */
function startCalendarSession(picker: any, opts: Pick<ModalSessionOptions, 'backdrop' | 'shouldFitToVisibleViewport' | 'initialFocus'>) {
    const isPointerOpen = !!picker.openViaPointer;
    picker.openViaPointer = false;
    // Compare against the input's own root: inside the web component's shadow root
    // `document.activeElement` is the HOST, never the input (FINDINGS #29).
    const root = picker.input?.getRootNode() as Document | ShadowRoot | undefined;
    // Keyboard / programmatic focus opened it — hand focus back on close. Not after a pointer
    // open: that would bring the soft keyboard back up.
    picker.modalRestoreFocus = !!picker.input && root?.activeElement === picker.input;
    picker.modalSession = startModalSession(picker.calendar, {
        ...opts,
        // Escape closes the calendar — except while a compact time field is being edited
        // (its own Escape reverts the edit first: one level per press).
        shouldCloseOnEscape: () => !isEditingInCalendar(picker),
        dismissCallback: (reason) => onSessionDismiss(picker, reason),
        isOpenedByPointer: isPointerOpen,
        trigger: picker.input ?? null,
    });
}

/** The session asks to close: the backdrop is the modal's "outside" — same switch as the floating outside click. */
function onSessionDismiss(picker: any, reason: ModalDismissReason) {
    if (reason === 'backdrop' && !picker.closesOnOutsideClick()) return;
    uiLogger.debug(`modal session dismiss (${reason}) - closing`);
    close(picker);
}

/** End the session; focus goes back to the input only when it had it at open (see startCalendarSession). */
function endCalendarSession(picker: any) {
    picker.modalSession?.end({ shouldReturnFocus: false });
    picker.modalSession = null;
    if (picker.modalRestoreFocus && picker.input?.isConnected && !picker.input.disabled) {
        picker.input.focus({ preventScroll: true });
    }
    picker.modalRestoreFocus = false;
}

/** Modal mode: centered purely via CSS (modal.css), over our `.drp__backdrop` scrim. */
function enterModal(picker: any) {
    const backdrop = ensureModalBackdrop(picker);
    backdrop.classList.add('drp__backdrop--visible');
    picker.calendar.classList.add('drp__picker--modal');
    startCalendarSession(picker, { backdrop });
}

/** Reverse enterModal(): end the session, hide the backdrop, restore focus. */
function exitModal(picker: any) {
    if (picker.modalBackdrop) {
        picker.modalBackdrop.classList.remove('drp__backdrop--visible');
    }
    picker.calendar.classList.remove('drp__picker--modal');
    endCalendarSession(picker);
}

/**
 * Phone full-screen sheet (SPEC §12.9): core's `.km-sheet` frame (SHEET_CHROME_CSS: fixed, edge to
 * edge, safe-area padding, the modal tier; drp maps `--drp-fullscreen-bg` / `-text-color` /
 * `--drp-z-index-fullscreen` onto it in variables.css) with drp's close header, run as a modal
 * session that also fits the sheet above the soft keyboard. The flex-column layout (header pinned,
 * months scroll, actions pinned) is shared with the other non-inline presentations (base.css /
 * fullscreen.css).
 */
function enterFullscreen(picker: any) {
    picker.calendar.classList.add('drp__picker--fullscreen', 'km-sheet');
    // Rescale every size token to the touch scale by overriding --drp-rem on the
    // element that DECLARES the tokens: a sheet-level override can't reach the
    // already-resolved tokens. In the web component that owner is the shadow host;
    // for the standalone light-DOM class the tokens live on :root (variables.css
    // declares them on `:host, :root`), so fall back to <html>. fullscreen.css
    // matches both with `:host([data-drp-fullscreen]), :root[data-drp-fullscreen]`.
    // Remember the exact element so exit removes the attribute from the same node.
    picker.fullscreenScaleHost = (picker.calendar.getRootNode() as ShadowRoot)?.host ?? document.documentElement;
    picker.fullscreenScaleHost?.setAttribute('data-drp-fullscreen', '');
    buildFullscreenHeader(picker);
    startCalendarSession(picker, {
        // Shrink the fixed sheet above the soft keyboard (inline height / top; the
        // .km-sheet frame pins only top, not bottom, for it).
        shouldFitToVisibleViewport: true,
        // Keyboard-off by default: focus goes into the sheet (its first control), never to a
        // text field. `fullscreen-autofocus` focuses the date input (moved into the header).
        initialFocus: () => (picker.options.shouldFullscreenAutofocus && picker.input && picker.calendar.contains(picker.input))
            ? picker.input
            : undefined,
    });
}

/** Reverse enterFullscreen(): end the session, drop the header + frame. */
function exitFullscreen(picker: any) {
    picker.calendar.classList.remove('drp__picker--fullscreen', 'km-sheet', 'drp__picker--fs-merged-header');
    // Remove from the SAME element enterFullscreen tagged (shadow host or <html>).
    (picker.fullscreenScaleHost ?? (picker.calendar.getRootNode() as ShadowRoot)?.host)?.removeAttribute('data-drp-fullscreen');
    picker.fullscreenScaleHost = null;
    restoreRelocatedInput(picker);
    if (picker.fullscreenHeader) {
        picker.fullscreenHeader.remove();
        picker.fullscreenHeader = null;
    }
    endCalendarSession(picker);
}

/**
 * Build the full-screen header (optional title + ✕ close) as the calendar's first child —
 * core's sheet chrome (createSheetHeader: .km-sheet-header / -title / -close, SPEC §12.9);
 * the drp__fullscreen-* classes stay only as layout hooks (relocated input, merged corner).
 */
function buildFullscreenHeader(picker: any) {
    if (picker.fullscreenHeader) return;
    // The chrome CSS lives in the root the picker renders into (shadow root or document);
    // adoptStyles() caches + dedupes, so re-adopting on every open is free.
    const root = picker.calendar.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) adoptStyles(root, SHEET_CHROME_CSS);

    // `show-fullscreen-input` relocates the real trigger input into the header (it carries
    // the mask + form value, and otherwise sits offscreen behind the fixed sheet). It
    // takes over the flex-growing header slot, so it wins over a title. `fullscreen-autofocus`
    // implies it: the sheet is modal (the page behind is inert), so the input it focuses must
    // be IN the sheet, visible above the keyboard.
    const wantsInput = !!((picker.options.isFullscreenInputShown || picker.options.shouldFullscreenAutofocus) && picker.input);
    const fullscreenTitle = picker.labels.text('headers.fullscreen');
    const merged = !fullscreenTitle && !wantsInput;
    const { header, title, close: closeBtn } = createSheetHeader({
        title: wantsInput || merged ? null : fullscreenTitle,
        closeLabel: picker.labels.text('ariaLabels.close'),
        closeCallback: () => close(picker),
    });
    header.classList.add('drp__fullscreen-header');
    title?.classList.add('drp__fullscreen-title');
    closeBtn.classList.add('drp__fullscreen-close');
    if (wantsInput) {
        relocateInputIntoHeader(picker, header);
    } else if (merged) {
        // No title → the ✕ merges into the month-navigation row instead of taking its
        // own empty row. This class drives the CSS that floats the ✕ and reserves
        // trailing space in the month header for it (see fullscreen.css).
        picker.calendar.classList.add('drp__picker--fs-merged-header');
    }

    // Titled header is a flow row pinned at the top (first child). The merged (no-
    // title) header is position:absolute, so its visual spot is fixed regardless of
    // DOM order — append it LAST so it paints above the sticky month header (which
    // otherwise covers the floated ✕ despite z-index, being later in the subtree).
    if (merged) picker.calendar.appendChild(header);
    else picker.calendar.insertBefore(header, picker.calendar.firstChild);
    picker.fullscreenHeader = header;
}

/**
 * Move the live trigger input into the full-screen header so it's visible and
 * typeable above the sheet. We relocate the SAME node (not a clone) so its mask
 * listeners and form value stay intact; `restoreRelocatedInput` puts it back on
 * exit. `inputmode="numeric"` shows a phone digits keypad — the input mask inserts
 * the separators, so the user never needs a `/` or `.` key.
 */
function relocateInputIntoHeader(picker: any, header: HTMLElement) {
    const input = picker.input as HTMLInputElement;
    // Relocate the whole input wrapper when present (so its inline ✕ clear button
    // travels with the field); fall back to the bare input otherwise.
    const node = (input.closest?.('.drp__input-wrapper') as HTMLElement) ?? input;
    // Remember its home so exit can reinsert it in the exact original spot.
    picker.fullscreenInputHome = { node, parent: node.parentNode, nextSibling: node.nextSibling };
    picker.fullscreenInputPrevInputMode = input.getAttribute('inputmode');
    picker.fullscreenInputPrevEnterKeyHint = input.getAttribute('enterkeyhint');
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('enterkeyhint', 'done');
    input.classList.add('drp__fullscreen-input');
    // The relocated field fills the row BEFORE the ✕.
    header.insertBefore(node, header.querySelector('.km-sheet-close'));
}

/** Reverse relocateInputIntoHeader(): restore the input's attributes and DOM home. */
function restoreRelocatedInput(picker: any) {
    if (!picker.fullscreenInputHome || !picker.input) return;
    const input = picker.input as HTMLInputElement;
    input.classList.remove('drp__fullscreen-input');
    if (picker.fullscreenInputPrevInputMode == null) input.removeAttribute('inputmode');
    else input.setAttribute('inputmode', picker.fullscreenInputPrevInputMode);
    if (picker.fullscreenInputPrevEnterKeyHint == null) input.removeAttribute('enterkeyhint');
    else input.setAttribute('enterkeyhint', picker.fullscreenInputPrevEnterKeyHint);
    const { node, parent, nextSibling } = picker.fullscreenInputHome;
    parent?.insertBefore(node ?? input, nextSibling);
    picker.fullscreenInputHome = null;
}

/**
 * Swap the runtime presentation in place (no rebuild). When the picker is open,
 * tears down the current chrome and stands up the new one, then re-renders so the
 * layout reflects the new sizing; when closed, just records it for the next open().
 * Driven by the web component's environmentChanged hook (SPEC §12.9).
 */
export function setPresentation(picker: any, next: 'floating' | 'modal' | 'fullscreen') {
    if (next === picker.presentation) return;
    // inline never opens a popover — presentation is irrelevant.
    if (picker.options.positioningMode === 'inline') { picker.presentation = next; return; }

    const isOpen = picker.calendar.classList.contains('drp__picker--visible');
    if (!isOpen) { picker.presentation = next; return; }

    // One overlay entry per presentation: the floating popover or the modal session.
    teardownPresentationChrome(picker);
    picker.presentation = next;
    applyPresentationChrome(picker);
    // Re-render so month/day sizing reflects the new presentation (e.g. the
    // full-screen scale-up), then reposition a floating anchor.
    picker.renderCalendar();
    if (next === 'floating') position(picker);
}

/**
 * Discard a change staged for Apply / `commit()` (`commit-mode` apply / manual): the
 * selection goes back to the committed snapshot and the text follows it — no `select` /
 * `change`. Run by close() (closing without commit), by Escape in the input with the
 * calendar closed, and when the focus leaves the field (input + calendar). No-op without
 * a staged change. Returns whether something was discarded.
 */
export function discardStaged(picker: any, { shouldRender = true }: { shouldRender?: boolean } = {}): boolean {
    if (!picker.stagesSelection() || picker.pendingSelection == null || !picker.input) return false;
    uiLogger.debug('discarding the staged selection');
    // Restore committed selection state
    const restoreRanges = () => (picker.committedRanges || []).map((r: any) => ({
        start: new Date(r.start),
        end: new Date(r.end)
    }));
    if (picker.options.selectionMode === 'range') {
        picker._selectedStartDate = picker.committedStartDate;
        picker._selectedEndDate = picker.committedEndDate;
        // Restore the committed multi-range result (empty for a plain range).
        picker._selectedRanges = restoreRanges();
    } else if (picker.options.selectionMode === 'multiple') {
        // The committed dates + ranges (a pick toggles _selectedDates in place).
        picker._selectedDates = (picker.committedDates || []).map((d: Date) => new Date(d));
        picker._selectedRanges = restoreRanges();
    } else if (picker.options.selectionMode === 'single') {
        picker._selectedDate = picker.committedDate;
    }
    // Time/datetime modes also revert the per-field time selection.
    if (picker.options.pickerMode !== 'date') {
        picker._selectedTime = picker.committedTime ? { ...picker.committedTime } : null;
    }
    picker.pendingSelection = null;
    picker.hoverPreviewEnd = null;
    // The text follows the committed selection — what commit() / the value setter
    // wrote. Not the text captured on open: a change staged while the calendar was
    // closed (✕, emptied / typed text) is already in it then.
    picker.syncInputFromSelection();
    picker._previousInputValue = picker.input.value;
    // An open calendar (manual mode keeps it open on an outside click) shows the
    // committed selection again; close() renders on its own.
    if (shouldRender && !picker.isFirstRender) {
        picker.renderCalendar();
        updateSummary(picker);
    }
    picker.options.onDiscard?.();
    return true;
}

export function close(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') return;

    // Only process hide if calendar is actually visible
    if (!picker.calendar.classList.contains('drp__picker--visible')) {
        return;
    }

    // Tear down the calendar popover (anchor, overlay tree, scroll / resize close)
    // and the chrome for the active presentation (modal backdrop / scroll lock, or
    // the full-screen overlay / keyboard / Back trap). teardownPresentationChrome()
    // runs cleanupPositioning(), which is what destroy() relies on so a rebuild while
    // open can't leak the autoUpdate loop onto a detached calendar.
    // Focus inside the closing calendar (a picked day, Escape on a day cell) goes back to the
    // input — before --visible drops, so the input's focus trigger doesn't reopen it.
    const root = picker.calendar.getRootNode() as Document | ShadowRoot;
    const hadFocusInside = !!root.activeElement && picker.calendar.contains(root.activeElement);

    teardownPresentationChrome(picker);

    if (hadFocusInside && picker.input && !picker.input.disabled && picker.presentation === 'floating') {
        picker.input.focus({ preventScroll: true });
    }

    // Dismiss any open day/badge tooltip. On touch these are tap-opened (no hover to
    // close them), so without this an open tooltip outlives the sheet — it lingers on
    // screen after the overlay is torn down until some later interaction clears it.
    hideTooltip(picker);

    picker.calendar.classList.remove('drp__picker--visible');
    picker.isCalendarActive = false; // Deactivate calendar when hidden
    picker.hoverPreviewEnd = null;

    // Closed without Apply / commit(): discard the staged change — selection AND text.
    discardStaged(picker, { shouldRender: false });

    // Clear pending selection when calendar closes
    picker.pendingSelection = null;
    // Drop the wall-clock snapshot so the next open captures a fresh "now".
    picker.timePickerOpenSnapshot = null;
    // Reset all rolling selectors to closed state
    for (let i = 0; i < picker.rollingSelectorOpenByColumn.length; i++) {
        picker.rollingSelectorOpenByColumn[i] = false;
    }
    // Only render if calendar was actually shown (not first render)
    if (!picker.isFirstRender) {
        picker.renderCalendar();
    }

    picker.options.onClose?.(picker.ctx({}));
}

export function toggle(picker: any) {
    if (picker.calendar.classList.contains('drp__picker--visible')) {
        close(picker);
    } else {
        open(picker);
    }
}

/**
 * Recompute the calendar's floating position now. The placement / middleware /
 * platform / drift-check all live on the core popover created in open()
 * (`picker.calendarPopover`); this just asks it to update. No-op in modal
 * mode (CSS-centered, no anchor) or before the calendar is shown.
 */
export function position(picker: any) {
    if (!picker.input) return;
    // Only the floating presentation is anchored; modal + full-screen are CSS-placed.
    if (picker.presentation !== 'floating') return;
    picker.calendarPopover?.update();
}

/** Hide the day / badge tooltip (core createTooltip, owned by the engine). */
export function hideTooltip(picker: any) {
    picker.hideTooltip?.();
}

/**
 * Resolve the DOM element a loader mounts into for a given target.
 */
function resolveLoaderMount(picker: any, target: LoaderTarget): HTMLElement | null {
    switch (target) {
        case 'message':
            return (picker.messageElement?.querySelector('.drp__message-text') as HTMLElement | null)
                || picker.messageElement || null;
        case 'summary':
            return picker.summaryElement
                || (picker.calendar?.querySelector('.drp__summary') as HTMLElement | null)
                || null;
        case 'calendar':
        default:
            return picker.calendar || null;
    }
}

function summaryBlock(picker: any): HTMLElement | null {
    return picker.summaryElement
        || (picker.calendar?.querySelector('.drp__summary') as HTMLElement | null)
        || null;
}

/**
 * Show a loader. Scoped by `target`:
 * - 'calendar' (default): full-calendar overlay (also used automatically around async gates)
 * - 'message' / 'summary': an in-block loader inside that feedback block
 *
 * The container (overlay / `.drp__inline-loader`, `role="status"` + `ariaLabels.loading` label)
 * is filled by core renderLoader(): the instance `renderLoadingCallback`, else the
 * page-wide `window.components.renderLoadingCallback`, else the default `.drp__loader`.
 * `target` is the hook's `context`.
 *
 * Single-instance per target: a second call for the same target is a no-op, so a manual
 * showLoader('calendar') and an in-flight async validation cannot stack two overlays.
 */
export function showLoader(picker: any, target: LoaderTarget = 'calendar'): void {
    if (!picker.loaders) picker.loaders = {};
    if (picker.loaders[target]) return; // already showing for this target

    const mount = resolveLoaderMount(picker, target);
    if (!mount) {
        uiLogger.warn(`showLoader() - mount for target '${target}' not found`);
        return;
    }

    const container = document.createElement(target === 'calendar' ? 'div' : 'span');
    if (target === 'calendar') {
        container.className = 'drp__loader-overlay';
    } else {
        // In-block loader (message / summary)
        container.className = 'drp__inline-loader';
        if (target === 'message' && picker.messageElement) {
            picker.messageElement.classList.add('drp__message--loading', 'drp__message--visible');
        } else if (target === 'summary') {
            // Force the summary visible so an empty (no-range) block is tall enough for the loader
            summaryBlock(picker)?.classList.add('drp__summary--loading', 'drp__summary--visible');
        }
    }
    mount.appendChild(container);
    const host: HTMLElement = picker.options.hostElement ?? mount;
    const remove = renderLoader(host, container, target, {
        prefix: 'drp',
        label: picker.labels?.text('ariaLabels.loading') ?? '',
        renderLoadingCallback: picker.options.renderLoadingCallback ?? null,
    });
    // The container moves with re-renders (reapplySummaryLoader); its remove() runs the hook's cleanup.
    picker.loaders[target] = container;
    if (!picker.loaderRemovers) picker.loaderRemovers = {};
    picker.loaderRemovers[target] = remove;
}

/**
 * Hide the loader for the given target (default 'calendar').
 */
export function hideLoader(picker: any, target: LoaderTarget = 'calendar'): void {
    if (!picker.loaders || !picker.loaders[target]) return;
    picker.loaderRemovers?.[target]?.();
    if (picker.loaderRemovers) picker.loaderRemovers[target] = undefined;
    picker.loaders[target].remove();
    picker.loaders[target] = undefined;

    if (target === 'message' && picker.messageElement) {
        picker.messageElement.classList.remove('drp__message--loading');
    } else if (target === 'summary') {
        summaryBlock(picker)?.classList.remove('drp__summary--loading');
    }
}

/**
 * Show a message in the message area
 * @param picker - The date picker instance
 * @param content - Message content (plain text when a variant is given, or full HTML for custom styling)
 * @param variant - Optional `info` | `success` | `warning` | `danger`: the built-in styled alert. Omitted, content is raw HTML.
 * @param autoHide - Optional auto-hide timeout in milliseconds
 */
export function showMessage(
    picker: any,
    content: string,
    variant?: MessageVariant,
    autoHide?: number
): void {
    if (!picker.messageElement) {
        uiLogger.warn('showMessage() - messageElement is null/undefined');
        return;
    }

    // Clear any existing auto-hide timeout
    if (picker.messageAutoHideTimeout) {
        clearTimeout(picker.messageAutoHideTimeout);
        picker.messageAutoHideTimeout = undefined;
    }

    // Remove all variant classes
    picker.messageElement.classList.remove(
        'drp__message--danger',
        'drp__message--warning',
        'drp__message--info',
        'drp__message--success',
        'drp__message--custom'
    );

    const textElement = picker.messageElement.querySelector('.drp__message-text');
    if (textElement) {
        textElement.innerHTML = content;
    }

    if (variant) {
        // Variant given: use the built-in styled alert box
        picker.messageElement.classList.add(`drp__message--${variant}`);
    } else {
        // No variant: raw HTML with full user control (minimal wrapper styling)
        picker.messageElement.classList.add('drp__message--custom');
    }

    // Show the message
    picker.messageElement.classList.add('drp__message--visible');
    // Screen readers hear it too (focus stays where it is): core's page-wide live region,
    // assertive for an error. The text only — the HTML is for sighted users.
    const spoken = (textElement?.textContent ?? '').trim();
    if (spoken) announce(spoken, { politeness: variant === 'danger' ? 'assertive' : 'polite' });

    // Set up auto-hide if specified
    if (autoHide && autoHide > 0) {
        picker.messageAutoHideTimeout = setTimeout(() => {
            hideMessage(picker);
        }, autoHide);
    }
}

/**
 * Hide the message area
 * @param picker - The date picker instance
 */
export function hideMessage(picker: any): void {
    if (!picker.messageElement) return;

    // Clear any existing auto-hide timeout
    if (picker.messageAutoHideTimeout) {
        clearTimeout(picker.messageAutoHideTimeout);
        picker.messageAutoHideTimeout = undefined;
    }

    // Hide the message
    picker.messageElement.classList.remove('drp__message--visible');
}

/**
 * Write custom HTML into the summary block. The content is pinned as an override that
 * survives re-renders (including hover preview) until the next selection change — mirroring
 * how showMessage "sticks". Use for async-derived summaries (e.g. a fetched price).
 */
export function showSummary(picker: any, content: string): void {
    picker.summaryOverride = content;
    updateSummary(picker);
}

/**
 * Drop any summary override and re-derive the summary from current selection state
 * (the block auto-hides when no range is selected).
 */
export function hideSummary(picker: any): void {
    picker.summaryOverride = null;
    updateSummary(picker);
}
