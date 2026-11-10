/**
 * Categorized loggers for @keenmate/web-daterangepicker — now a thin shim over
 * the core logging module (`@keenmate/web-components-core`, SPEC §12.1). Core owns
 * the `loglevel` dependency and the colour-coded `%c` prefix (built in a
 * `methodFactory`, ordering-safe), so the previously vendored `loglevel` +
 * `loglevel-plugin-prefix` copies are gone.
 *
 * The picker (`date-picker*.ts`) imports the category loggers by name, so this
 * module keeps that surface.
 *
 * Categories (`DRP:*`):
 * - GENERAL     — the historical bare `DRP` logger
 * - RENDERING   — calendar/day/summary rendering
 * - INTERACTION — drag, input mask, keyboard
 * - SELECTION   — day selection, apply, range validation
 * - NAVIGATION  — month/rolling navigation
 * - UI          — show/hide/position/message/loader
 * - VALIDATION  — date-restriction helpers
 * - DRAG        — drag-to-adjust
 *
 * Default level is core's `warn` (warnings/errors show, debug/info don't); the
 * page-wide `window.components.logging` switch drives every Keenmate bundle at
 * once. Per element, core's `el.enableLogging()` / `el.disableLogging()` turn
 * that element's instance loggers (`this.log`) up / back.
 *
 * Enable from the console (or `window.components['web-daterangepicker'].logging`):
 *
 * ```js
 * import { enableLogging, setLogLevel, setCategoryLevel } from '@keenmate/web-daterangepicker';
 * enableLogging();                              // all categories → debug
 * setLogLevel('info');                          // all categories → info
 * setCategoryLevel('DRP:UI', 'debug');          // one category (bare or 'DRP:UI')
 * ```
 */
import { createLoggers, type Logger, type LogLevelDesc } from '@keenmate/web-components-core';

const CATEGORIES = ['GENERAL', 'RENDERING', 'INTERACTION', 'SELECTION', 'NAVIGATION', 'UI', 'VALIDATION', 'DRAG'] as const;
type Category = (typeof CATEGORIES)[number];

/**
 * The single core logger bundle for this component. Exported so the element
 * registration (`index.ts` → `registerComponent`) can expose its controls on
 * `window.components['web-daterangepicker'].logging` and `BlissElement` can build
 * the per-instance `this.log` loggers from it.
 */
export const logging = createLoggers('DRP', CATEGORIES);

// The category loggers, by their historical names. `drpLogger` is the former
// bare `DRP` (now `DRP:GENERAL`). Each is a `loglevel` Logger, so
// `renderingLogger.debug(...)` etc. work exactly as before.
export const drpLogger: Logger = logging.loggers.GENERAL;
export const renderingLogger: Logger = logging.loggers.RENDERING;
export const interactionLogger: Logger = logging.loggers.INTERACTION;
export const selectionLogger: Logger = logging.loggers.SELECTION;
export const navigationLogger: Logger = logging.loggers.NAVIGATION;
export const uiLogger: Logger = logging.loggers.UI;
export const validationLogger: Logger = logging.loggers.VALIDATION;
export const dragLogger: Logger = logging.loggers.DRAG;

/** Full (namespaced) category names, for the `getCategories()` global API. */
export const LOGGING_CATEGORIES = CATEGORIES.map((c) => `DRP:${c}`);

/** Enable all logging (debug level). */
export function enableLogging(): void {
  logging.enableLogging();
}

/** Disable all logging (silent). */
export function disableLogging(): void {
  logging.disableLogging();
}

/** Set the same level on every category. */
export function setLogLevel(level: LogLevelDesc): void {
  logging.setLogLevel(level);
}

/**
 * Set the level of one category. Accepts the full prefixed name (`DRP:UI`) or the
 * bare suffix (`UI`) — both normalize to the category key the core bundle expects.
 */
export function setCategoryLevel(category: string, level: LogLevelDesc = 'debug'): void {
  const bare = (category.includes(':') ? category.split(':').pop()! : category) as Category;
  logging.setCategoryLevel(bare, level);
}

/** List of all logging categories (full namespaced names). */
export function getCategories(): string[] {
  return [...LOGGING_CATEGORIES];
}

// Back-compat default export: the modules that did `import log from './logger'`
// use it as a general `log.warn(...)`/`log.error(...)` sink → the GENERAL logger.
export default drpLogger;
