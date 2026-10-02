/**
 * Date Picker Lock Methods
 *
 * Scoped read-only locking. A picker can be frozen wholesale or per-aspect:
 *   - 'selection'  — day clicks, drag-to-adjust, typed input, Today/Now/Clear, time picks
 *   - 'navigation' — month nav (< >), PageUp/Down, Ctrl+arrows, the rolling year/month selector
 *   - 'actions'    — the Apply button and custom / preset action buttons
 *   - 'open'       — (re)opening the popover (floating & modal); closing is always allowed
 *
 * `lock()` with no argument locks every aspect; `lock(aspect | aspect[])` locks a subset.
 * Guards live at each user-interaction choke point (the calendar click / keydown
 * handlers, drag start, the `<input>`'s readonly flag, `open()`, and the navigation
 * module) and consult `picker.isAspectLocked(aspect)`. The programmatic API
 * (selection setters, `clearSelection()`, etc.) is intentionally NOT gated — a lock
 * freezes the end user, not the developer driving the component.
 */
import type { LockAspect } from './types';

export const ALL_LOCK_ASPECTS: LockAspect[] = ['selection', 'navigation', 'actions', 'open'];

/** Coerce the optional argument into a concrete aspect list (undefined = all). */
function normalize(aspects?: LockAspect | LockAspect[]): LockAspect[] {
    if (aspects === undefined) return ALL_LOCK_ASPECTS.slice();
    return Array.isArray(aspects) ? aspects : [aspects];
}

/** Freeze the given aspect(s), or every aspect when called with no argument. */
export function lock(picker: any, aspects?: LockAspect | LockAspect[]): void {
    for (const a of normalize(aspects)) picker._lockedAspects.add(a);
    syncLockUI(picker);
}

/** Release the given aspect(s), or every aspect when called with no argument. */
export function unlock(picker: any, aspects?: LockAspect | LockAspect[]): void {
    for (const a of normalize(aspects)) picker._lockedAspects.delete(a);
    syncLockUI(picker);
}

/** True when `aspect` is currently locked. */
export function isAspectLocked(picker: any, aspect: LockAspect): boolean {
    return picker._lockedAspects.has(aspect);
}

/**
 * Reflect the current lock set onto the DOM: a `--locked-{aspect}` modifier per locked
 * aspect on the calendar root (drives the pointer-events / cursor affordance), a
 * `--locked` marker whenever anything is locked, and `input.readOnly` when the selection
 * is frozen (so typing / paste can't mutate the value). Idempotent — safe to re-run
 * after a re-render.
 */
export function syncLockUI(picker: any): void {
    const root = picker.calendar as HTMLElement | undefined;
    if (root && root.classList) {
        for (const a of ALL_LOCK_ASPECTS) {
            root.classList.toggle(`drp__picker--locked-${a}`, picker._lockedAspects.has(a));
        }
        root.classList.toggle('drp__picker--locked', picker._lockedAspects.size > 0);
    }
    // Typing edits the selection — make the input read-only when selection is locked.
    // (readOnly, not disabled: the value stays readable and the field isn't greyed.)
    if (picker.input) {
        picker.input.readOnly = picker._lockedAspects.has('selection');
    }
}
