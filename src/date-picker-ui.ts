/**
 * Date Picker UI Methods
 *
 * Functions for UI-related logic including open/close, positioning,
 * and tooltips.
 */

// All positioning goes through core `@keenmate/web-components-core/positioning`:
// `anchor()` (the calendar popover + day/badge tooltips) with its first-class
// `fixedContainingBlock` (the narrowed containing-block heuristic) + `onDrift` (the
// drift diagnostic) options — core owns both. This file keeps only the
// daterangepicker-branded warning copy (see warnDrift). daterangepicker no longer
// depends on `@floating-ui/dom` directly.
import { anchor, type DriftReport } from '@keenmate/web-components-core/positioning';
import { observeKeyboardInset } from '@keenmate/web-components-core';
import { uiLogger } from './logger';
import { handleInitialMonthLoad } from './date-picker-navigation';
import { updateCalendarFromInput } from './date-picker-interaction';
import { updateSummary } from './date-picker-rendering';
import type { LoaderTarget } from './types';

/**
 * Surface a daterangepicker-branded, once-per-instance warning when core's drift
 * check (`anchor`'s `onDrift`) reports the calendar didn't land where it was
 * positioned — an ancestor establishes a fixed containing block the heuristic
 * doesn't recognize (typically `contain` / `container-type`). Core owns the drift
 * measurement + culprit identification (`detectFixedDrift`, SPEC §12.2); this keeps
 * only the daterangepicker-specific warning copy.
 */
function warnDrift(picker: any, report: DriftReport): void {
    if (picker.positioningDriftWarned) return;
    picker.positioningDriftWarned = true;
    console.warn(
        `[@keenmate/web-daterangepicker] Calendar rendered ${report.driftX.toFixed(0)}px / ${report.driftY.toFixed(0)}px ` +
        `away from where the library positioned it. Most likely culprit: ${report.culpritDescription}` +
        (report.culpritCss ? ` (has ${report.culpritCss})` : '') + `.\n` +
        `An ancestor of <web-daterangepicker> establishes a fixed-positioning containing block that the library's ` +
        `heuristic doesn't recognize. Fix on your side: replace the property with \`transform: translateZ(0)\` ` +
        `on that ancestor, OR move the trigger out of that ancestor's subtree. If neither is acceptable, ` +
        `please file an issue at https://github.com/keenmate/web-daterangepicker/issues with the ancestor's computed CSS.`
    );
}

// The calendar's core anchor() handle is stored per-instance on the picker
// (`picker.calendarAnchor`) — see open()/close()/position(). (The former
// module-level autoUpdate cleanup was shared across instances, a latent bug.)

// Window resize handler — registered in floating mode so we can close on
// viewport changes (since elementResize is disabled on autoUpdate, the picker
// wouldn't otherwise adapt to a smaller/larger viewport).
let viewportResizeHandler: (() => void) | null = null;

/**
 * Tear down floating-mode positioning: destroy the calendar's autoUpdate anchor
 * and drop the viewport resize handler. Safe to call unconditionally (no-op in
 * modal/inline, which register neither). Called by both close() and destroy() —
 * the latter matters because a positioning-mode flip rebuilds an OPEN picker, and
 * without this the autoUpdate loop keeps firing on the removed calendar and
 * reports a bogus drift (measuring a detached, zero-rect element).
 */
export function cleanupPositioning(picker: any): void {
    if (picker.calendarAnchor) {
        picker.calendarAnchor.destroy();
        picker.calendarAnchor = null;
    }
    if (viewportResizeHandler) {
        window.removeEventListener('resize', viewportResizeHandler);
        viewportResizeHandler = null;
    }
}

// Tracks the prior body overflow value so multiple modal pickers don't fight
// over restoring it. We only set the body to hidden when the count goes 0→1
// and only restore when it goes back to 0.
let modalLockCount = 0;
let modalPriorBodyOverflow: string | null = null;

function lockBodyScroll() {
    if (modalLockCount === 0) {
        modalPriorBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }
    modalLockCount++;
}

function unlockBodyScroll() {
    modalLockCount = Math.max(0, modalLockCount - 1);
    if (modalLockCount === 0) {
        document.body.style.overflow = modalPriorBodyOverflow ?? '';
        modalPriorBodyOverflow = null;
    }
}

function ensureModalBackdrop(picker: any): HTMLElement {
    if (picker.modalBackdrop) return picker.modalBackdrop;
    const backdrop = document.createElement('div');
    backdrop.className = 'drp__backdrop';
    // Dismiss only when a pointer press BOTH starts and ends on the scrim. Gating
    // on the press start (not a bare `click`) is what prevents the open-then-close
    // bug on touch: the opening tap presses on the input, then the synthesized
    // `click` retargets onto the backdrop we just appended over the viewport — a
    // bare click handler would treat that as a dismiss. Because the press started
    // on the input, `pressedOnBackdrop` stays false and we ignore it. A real scrim
    // tap (press + release on the backdrop) still dismisses; a drag out of the
    // calendar onto the scrim does not.
    let pressedOnBackdrop = false;
    backdrop.addEventListener('pointerdown', (e) => { pressedOnBackdrop = e.target === backdrop; });
    backdrop.addEventListener('click', (e) => {
        if (e.target !== backdrop || !pressedOnBackdrop) return;
        pressedOnBackdrop = false;
        uiLogger.debug('Backdrop pressed - closing modal');
        close(picker);
    });
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
    // fires after mousedown on the same click) overwrite originalInputValue with the
    // already-pending value and leak the autoUpdate cleanup function.
    if (picker.calendar.classList.contains('drp__picker--visible')) {
        // The tap's later triggers (mousedown/click) re-set openViaPointer after the
        // pointerdown already opened + armed; clear it so it can't linger to a later
        // programmatic open().
        picker.openViaPointer = false;
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

    // Store original input value if Apply button is required (for restore on close without Apply)
    if (picker.requiresApplyButton() && picker.input) {
        picker.originalInputValue = picker.input.value;
        uiLogger.debug('open() - stored original input value:', picker.originalInputValue);
    }

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

        // Call beforeMonthChangedCallback for initial month load
        handleInitialMonthLoad(picker);
    } else if (picker.options.pickerMode !== 'date') {
        // Time/datetime modes: re-render every open so committed values get the
        // --selected highlight applied and the rolls re-center via force-scroll.
        picker.renderCalendar();
    }

    picker.calendar.classList.add('drp__picker--visible');
    picker.setCalendarActive(); // Make calendar active and deactivate other pickers (inline keyboard tracking)
    picker.overlayCoord?.activate(); // Dismiss every other participating overlay (pickers, multiselects, …)
    uiLogger.debug('open() - calendar classes:', picker.calendar.className);

    // Set up the chrome for the current runtime presentation (floating anchor,
    // centered modal, or phone full-screen overlay).
    applyPresentationChrome(picker);

    // Note: Outside click handling is now managed by the clickEvents manager
}

/**
 * Stand up the chrome for the picker's current runtime `presentation`. Called by
 * open() and by setPresentation() when the environment flips while open.
 */
function applyPresentationChrome(picker: any) {
    switch (picker.presentation) {
        case 'modal':      enterModal(picker); break;
        case 'fullscreen': enterFullscreen(picker); break;
        default:           setupFloatingAnchor(picker); break;
    }
}

/**
 * Tear down whatever chrome the current `presentation` stood up. Called by close()
 * and by setPresentation() before switching. cleanupPositioning() is safe in every
 * presentation (no-op when there is no floating anchor / resize handler).
 */
export function teardownPresentationChrome(picker: any) {
    cleanupPositioning(picker);
    if (picker.presentation === 'modal') exitModal(picker);
    else if (picker.presentation === 'fullscreen') exitFullscreen(picker);
}

/**
 * Floating mode: anchor positioning + auto-reposition on scroll/resize.
 * elementResize disabled so the calendar's *own* size changes (e.g. a custom
 * formatSummaryCallback rendering 2 vs 3 lines on hover) don't re-run position().
 * With a flipped placement the new top would be inputTop − newHeight − offset,
 * sliding the calendar upward and the hovered day with it — which lands the cursor
 * on a different day, re-fires hover, and loops. Anchor once, let it grow downward.
 */
function setupFloatingAnchor(picker: any) {
    picker.calendarAnchor = anchor(picker.calendar, picker.input, {
        placement: (picker.options.calendarPlacement || 'bottom-start'),
        strategy: 'fixed',
        offset: 8,
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
        fixedContainingBlock: true,
        // The calendar's OWN size changes must not re-trigger a reposition
        // (resize→reposition→re-hover loop); reposition only on scroll/ancestor moves.
        autoUpdateOptions: { elementResize: false },
        // One-shot drift warning if an unrecognized ancestor CB still shifts the panel.
        onDrift: (report: DriftReport) => warnDrift(picker, report),
    });

    // Close on viewport resize (in either direction). With elementResize off, we
    // can't gracefully adapt to a smaller/larger window, so just dismiss the picker
    // and let the user reopen it in the new viewport.
    viewportResizeHandler = () => close(picker);
    window.addEventListener('resize', viewportResizeHandler);
}

/**
 * Swallow the ONE "ghost" click the opening tap leaves behind. On touch, tapping
 * the input opens a modal/full-screen sheet on `pointerdown`; the tap's synthesized
 * `click` then lands inside the freshly-shown overlay (a day cell → select →
 * single-mode auto-close, or the backdrop → dismiss). Armed only when the open was
 * pointer-triggered (`openViaPointer`), a one-shot capture-phase listener eats that
 * next click if it targets the overlay, then removes itself — so a genuine later tap
 * is untouched, and a programmatic `open()` (no ghost click) never arms it.
 */
function armGhostClickGuard(picker: any) {
    if (!picker.openViaPointer) return;
    picker.openViaPointer = false;
    const onClick = (e: Event) => {
        cleanup();
        const path = (e as MouseEvent).composedPath?.() ?? [];
        const onOverlay = path.includes(picker.calendar) ||
            (picker.modalBackdrop && path.includes(picker.modalBackdrop));
        if (onOverlay) { e.stopPropagation(); e.preventDefault(); }
    };
    const cleanup = () => {
        document.removeEventListener('click', onClick, true);
        clearTimeout(picker.ghostClickTimer);
        picker.ghostClickTimer = null;
    };
    // Self-removes on the first click; the timeout is a safety net if none arrives.
    picker.ghostClickTimer = setTimeout(cleanup, 700);
    document.addEventListener('click', onClick, true);
}

/** Modal mode: backdrop, body scroll lock, blur input to suppress mobile keyboard. */
function enterModal(picker: any) {
    clearFloatingGeometry(picker);
    armGhostClickGuard(picker);
    ensureModalBackdrop(picker).classList.add('drp__backdrop--visible');
    lockBodyScroll();
    // Trap the phone Back gesture / browser Back button so it dismisses the modal
    // instead of navigating away (same as full-screen).
    pushOverlayHistory(picker);
    // Remember if input was focused so we can restore on close.
    if (picker.input && document.activeElement === picker.input) {
        picker.modalRestoreFocus = true;
        picker.input.blur();
    } else {
        picker.modalRestoreFocus = false;
    }
    picker.calendar.classList.add('drp__picker--modal');
    // Modal is centered purely via CSS — no Floating UI involvement.
}

/** Reverse enterModal(): hide backdrop, unlock scroll, restore focus. */
function exitModal(picker: any) {
    popOverlayHistory(picker);
    if (picker.modalBackdrop) {
        picker.modalBackdrop.classList.remove('drp__backdrop--visible');
    }
    unlockBodyScroll();
    picker.calendar.classList.remove('drp__picker--modal');
    // Restore focus to the input if it was focused before opening — the user is
    // back in the input flow and may want to type or Tab away.
    if (picker.modalRestoreFocus && picker.input) {
        picker.input.focus();
    }
    picker.modalRestoreFocus = false;
}

/**
 * Phone full-screen overlay (SPEC §12.9): an edge-to-edge sheet with a close
 * header, page-scroll lock, soft-keyboard tracking, and a Back-gesture trap. The
 * flex-column layout (header pinned, months scroll, actions pinned) is shared with
 * the other non-inline presentations and lives in base.css / fullscreen.css.
 */
function enterFullscreen(picker: any) {
    clearFloatingGeometry(picker);
    armGhostClickGuard(picker);
    picker.calendar.classList.add('drp__picker--fullscreen');
    // Rescale every size token to the touch scale by overriding --drp-rem on the
    // HOST (see fullscreen.css) — a sheet-level override can't reach the :host-
    // resolved tokens. No-op when not in a shadow root (standalone light-DOM use).
    (picker.calendar.getRootNode() as ShadowRoot)?.host?.setAttribute('data-drp-fullscreen', '');
    buildFullscreenHeader(picker);
    lockBodyScroll();
    // Shrink the fixed sheet above the soft keyboard (writes inline height/top —
    // see fullscreen.css for why the sheet pins only top, not bottom).
    picker.keyboardInsetCleanup = observeKeyboardInset(picker.calendar);
    // Trap the phone Back gesture/button so it closes the sheet instead of navigating.
    pushOverlayHistory(picker);
    // Keyboard-off by default: drop any focus the opening tap gave the input so the
    // soft keyboard doesn't linger over the calendar. Opt in via fullscreenAutofocus.
    if (picker.options.fullscreenAutofocus && picker.input) {
        picker.input.focus();
    } else if (picker.input) {
        picker.input.blur();
    }
}

/** Reverse enterFullscreen(): detach keyboard tracking, drop the header + Back trap, unlock scroll. */
function exitFullscreen(picker: any) {
    if (picker.keyboardInsetCleanup) {
        picker.keyboardInsetCleanup();
        picker.keyboardInsetCleanup = null;
    }
    popOverlayHistory(picker);
    picker.calendar.classList.remove('drp__picker--fullscreen', 'drp__picker--fs-merged-header');
    (picker.calendar.getRootNode() as ShadowRoot)?.host?.removeAttribute('data-drp-fullscreen');
    restoreRelocatedInput(picker);
    if (picker.fullscreenHeader) {
        picker.fullscreenHeader.remove();
        picker.fullscreenHeader = null;
    }
    unlockBodyScroll();
}

/** Build the full-screen header (optional title + ✕ close) as the calendar's first child. */
function buildFullscreenHeader(picker: any) {
    if (picker.fullscreenHeader) return;
    const header = document.createElement('div');
    header.className = 'drp__fullscreen-header';

    // `fullscreen-input` relocates the real trigger input into the header (it carries
    // the mask + form value, and otherwise sits offscreen behind the fixed sheet). It
    // takes over the flex-growing header slot, so it wins over a title.
    const wantsInput = !!(picker.options.fullscreenInput && picker.input);
    const merged = !picker.options.fullscreenTitle && !wantsInput;
    if (wantsInput) {
        relocateInputIntoHeader(picker, header);
    } else if (!merged) {
        const title = document.createElement('span');
        title.className = 'drp__fullscreen-title';
        title.textContent = picker.options.fullscreenTitle;
        header.appendChild(title);
    } else {
        // No title → the ✕ merges into the month-navigation row instead of taking its
        // own empty row. This class drives the CSS that floats the ✕ and reserves
        // trailing space in the month header for it (see fullscreen.css).
        picker.calendar.classList.add('drp__picker--fs-merged-header');
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'drp__fullscreen-close';
    closeBtn.setAttribute('aria-label', picker.localeStrings?.close || 'Close');
    closeBtn.addEventListener('click', () => close(picker));
    header.appendChild(closeBtn);

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
    header.appendChild(node);
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
 * Clear the inline geometry floating-ui writes on the calendar (position/top/left/
 * transform/size). Modal and full-screen position via CSS, so leftover inline
 * styles from a prior floating presentation would override the stylesheet and
 * mis-place the sheet. Safe to call unconditionally.
 */
function clearFloatingGeometry(picker: any) {
    const s = picker.calendar.style;
    s.position = '';
    s.top = '';
    s.left = '';
    s.right = '';
    s.bottom = '';
    s.transform = '';
    s.maxHeight = '';
    s.maxWidth = '';
    s.width = '';
    s.overflowY = '';
}

/**
 * Back-gesture handling for the full-screen sheet. On open we push a history entry
 * (same URL) and listen for `popstate`; the phone Back gesture/button then pops that
 * entry — which we treat as "close the sheet" — instead of navigating away from the
 * page. A programmatic close (✕, selection, Escape) consumes the entry via
 * `history.back()` so the stack is left as it was found.
 *
 * Kept structurally parallel with web-multiselect (pushOverlayHistory /
 * handleOverlayPopstate / popOverlayHistory) so this trap can later be extracted
 * into web-components-core as one shared primitive.
 */
function pushOverlayHistory(picker: any) {
    if (picker.overlayHistoryActive) return;
    if (typeof history === 'undefined' || typeof window === 'undefined') return;
    picker.overlayHistoryActive = true;
    // Bind once so add/removeEventListener share a stable reference (mirrors
    // web-multiselect's onOverlayPopstate field).
    if (!picker.onOverlayPopstate) picker.onOverlayPopstate = () => handleOverlayPopstate(picker);
    history.pushState({ drpOverlay: true }, '');
    window.addEventListener('popstate', picker.onOverlayPopstate);
}

/** Back gesture/button fired: our pushed entry is already gone, so just close the
 *  sheet — WITHOUT popping history again (popOverlayHistory becomes a no-op). */
function handleOverlayPopstate(picker: any) {
    if (!picker.overlayHistoryActive) return;
    picker.overlayHistoryActive = false;
    window.removeEventListener('popstate', picker.onOverlayPopstate);
    if (picker.calendar.classList.contains('drp__picker--visible')) close(picker);
}

/** Programmatic close: remove the listener and pop the entry we pushed (so the
 *  history stack returns to its pre-open state). No-op if a Back gesture already
 *  consumed it (overlayHistoryActive is false by then). */
function popOverlayHistory(picker: any) {
    if (!picker.overlayHistoryActive) return;
    picker.overlayHistoryActive = false;
    window.removeEventListener('popstate', picker.onOverlayPopstate);
    // The listener is already detached, so the popstate this triggers is ignored.
    if (typeof history !== 'undefined') history.back();
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

    teardownPresentationChrome(picker);
    picker.presentation = next;
    applyPresentationChrome(picker);
    // Re-render so month/day sizing reflects the new presentation (e.g. the
    // full-screen scale-up), then reposition a floating anchor.
    picker.renderCalendar();
    if (next === 'floating') position(picker);
}

export function close(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') return;

    // Only process hide if calendar is actually visible
    if (!picker.calendar.classList.contains('drp__picker--visible')) {
        return;
    }

    // Tear down the chrome for the active presentation (floating anchor + resize
    // handler, modal backdrop/scroll-lock, or full-screen overlay/keyboard/Back
    // trap). teardownPresentationChrome() also runs cleanupPositioning(), which is
    // what destroy() relies on so a rebuild while open can't leak the autoUpdate
    // loop onto a detached calendar.
    teardownPresentationChrome(picker);

    // Dismiss any open day/badge tooltip. On touch these are tap-opened (no hover to
    // close them), so without this an open tooltip outlives the sheet — it lingers on
    // screen after the overlay is torn down until some later interaction clears it.
    hideTooltip(picker);

    // Note: Outside click handling is now managed by the clickEvents manager

    picker.calendar.classList.remove('drp__picker--visible');
    picker.isCalendarActive = false; // Deactivate calendar when hidden
    picker.overlayCoord?.deactivate(); // Release the active-overlay marker (no broadcast on close)
    picker.hoverPreviewEnd = null;

    // Restore original input value and selection state if closed without Apply
    if (picker.requiresApplyButton() && picker.pendingSelection && picker.input) {
        uiLogger.debug('close() - restoring original input value:', picker.originalInputValue);
        // Restore input value
        if (picker.originalInputValue !== null) {
            picker.input.value = picker.originalInputValue;
        }
        // Restore committed selection state
        if (picker.options.selectionMode === 'range') {
            picker._selectedStartDate = picker.committedStartDate;
            picker._selectedEndDate = picker.committedEndDate;
            // Restore the committed multi-range result (empty for a plain range).
            picker._selectedRanges = (picker.committedRanges || []).map((r: any) => ({
                start: new Date(r.start),
                end: new Date(r.end)
            }));
        } else if (picker.options.selectionMode === 'single') {
            picker._selectedDate = picker.committedDate;
        }
        // Time/datetime modes also revert the per-field time selection.
        if (picker.options.pickerMode !== 'date') {
            picker._selectedTime = picker.committedTime ? { ...picker.committedTime } : null;
        }
        uiLogger.debug('close() - reverted selection state');
    }

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

    // Clear the size-middleware constraints so the next open starts fresh.
    picker.calendar.style.maxHeight = '';
    picker.calendar.style.overflowY = '';
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
 * platform / drift-check all live on the core `anchor()` handle created in
 * open() (`picker.calendarAnchor`); this just asks it to update. No-op in modal
 * mode (CSS-centered, no anchor) or before the calendar is shown.
 */
export function position(picker: any) {
    if (!picker.input) return;
    // Only the floating presentation is anchored; modal + full-screen are CSS-placed.
    if (picker.presentation !== 'floating') return;
    picker.calendarAnchor?.update();
}

/**
 * Show tooltip using Floating UI
 */
export function showTooltip(picker: any, element: HTMLElement, content: string) {
    if (!picker.tooltip || !picker.tooltipArrow) return;

    picker.currentTooltipTarget = element;
    picker.tooltip.innerHTML = content; // Support HTML content
    picker.tooltip.appendChild(picker.tooltipArrow); // Re-append arrow after setting innerHTML
    picker.tooltip.classList.add('drp__tooltip--visible');

    // Position via core anchor() — offset/flip/shift + arrow, plus the narrowed
    // fixed-CB heuristic (`fixedContainingBlock`), resolved from the FLOATING element
    // (the tooltip), NOT the reference `element`: a badge cell is itself a
    // fixed-positioning containing block (`transform` on hover), so measuring the
    // reference would return badge-relative coordinates that render off-screen.
    // The day/badge tooltip reuses ONE shared element across cells (event
    // delegation), so replace any prior anchor. autoUpdate:false = single compute,
    // matching the previous one-shot behaviour (the tooltip lives only while hovered).
    picker.tooltipAnchor?.destroy();
    picker.tooltipAnchor = anchor(picker.tooltip, element, {
        placement: 'top',
        strategy: 'fixed',
        offset: 6,
        shift: 5,
        arrow: { element: picker.tooltipArrow },
        fixedContainingBlock: true,
        autoUpdate: false,
    });
}

/**
 * Hide tooltip
 */
export function hideTooltip(picker: any) {
    if (!picker.tooltip) return;
    picker.tooltipAnchor?.destroy();
    picker.tooltipAnchor = undefined;
    picker.tooltip.classList.remove('drp__tooltip--visible');
    picker.currentTooltipTarget = undefined;
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
 * Show a loader (spinner). Scoped by `target`:
 * - 'calendar' (default): full-calendar overlay (also used automatically around async gates)
 * - 'message' / 'summary': an in-block spinner inside that feedback block
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

    if (target === 'calendar') {
        const overlay = document.createElement('div');
        overlay.className = 'drp__loader-overlay';
        overlay.innerHTML = `<div class="drp__loader"></div>`;
        mount.appendChild(overlay);
        picker.loaders[target] = overlay;
        return;
    }

    // In-block spinner (message / summary)
    const spinner = document.createElement('span');
    spinner.className = 'drp__inline-loader';
    if (target === 'message' && picker.messageElement) {
        picker.messageElement.classList.add('drp__message--loading', 'drp__message--visible');
    } else if (target === 'summary') {
        // Force the summary visible so an empty (no-range) block is tall enough for the spinner
        summaryBlock(picker)?.classList.add('drp__summary--loading', 'drp__summary--visible');
    }
    mount.appendChild(spinner);
    picker.loaders[target] = spinner;
}

/**
 * Hide the loader for the given target (default 'calendar').
 */
export function hideLoader(picker: any, target: LoaderTarget = 'calendar'): void {
    if (!picker.loaders || !picker.loaders[target]) return;
    picker.loaders[target].remove();
    picker.loaders[target] = undefined;

    if (target === 'message' && picker.messageElement) {
        picker.messageElement.classList.remove('drp__message--loading');
    } else if (target === 'summary') {
        summaryBlock(picker)?.classList.remove('drp__summary--loading');
    }
}

/**
 * Toggle the loader for the given target (default 'calendar').
 */
export function toggleLoader(picker: any, target: LoaderTarget = 'calendar'): void {
    if (picker.loaders?.[target]) {
        hideLoader(picker, target);
    } else {
        showLoader(picker, target);
    }
}

/**
 * Show a message in the message area
 * @param picker - The date picker instance
 * @param content - Message content (plain text when type is provided, or full HTML for custom styling)
 * @param type - Optional message type. If provided, uses built-in styled alert. If omitted, content is treated as raw HTML.
 * @param autoHide - Optional auto-hide timeout in milliseconds
 */
export function showMessage(
    picker: any,
    content: string,
    type?: 'error' | 'warning' | 'info' | 'success',
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

    // Remove all type classes
    picker.messageElement.classList.remove(
        'drp__message--error',
        'drp__message--warning',
        'drp__message--info',
        'drp__message--success',
        'drp__message--custom'
    );

    const textElement = picker.messageElement.querySelector('.drp__message-text');
    if (textElement) {
        textElement.innerHTML = content;
    }

    if (type) {
        // Type provided: use built-in styled alert box
        picker.messageElement.classList.add(`drp__message--${type}`);
    } else {
        // No type: raw HTML with full user control (minimal wrapper styling)
        picker.messageElement.classList.add('drp__message--custom');
    }

    // Show the message
    picker.messageElement.classList.add('drp__message--visible');

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
 * Toggle the message area. If currently visible, hide it; otherwise show `content`.
 */
export function toggleMessage(
    picker: any,
    content: string = '',
    type?: 'error' | 'warning' | 'info' | 'success',
    autoHide?: number
): void {
    if (picker.messageElement?.classList.contains('drp__message--visible')) {
        hideMessage(picker);
    } else {
        showMessage(picker, content, type, autoHide);
    }
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
