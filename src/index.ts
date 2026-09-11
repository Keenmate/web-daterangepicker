// Import styles (produces the shipped dist/style.css via Vite)
import './css/main.css';

import { registerComponent } from '@keenmate/web-components-core';
import { WebDaterangepickerElement } from './web-component';
import { logging } from './logger';

// Export the web component
export { WebDaterangepickerElement } from './web-component';

// Export the base class if users want direct access
export { DateRangePicker } from './date-picker';

// Device / viewport detection — re-exported from the core so consumers get the
// same "what device am I on" signal the component itself reacts to
// (environmentChanged / the presentation ladder), from ONE import surface and
// ONE dependency. Use it to drive per-device configuration (e.g. a rich
// actionButtons set on desktop, a subset on phones):
//   import { observeViewport, classifyDevice } from '@keenmate/web-daterangepicker';
//   observeViewport(env => { el.actionButtons = classifyDevice(env) === 'mobile' ? mobile : desktop; });
export {
    getEnvironment,
    observeEnvironment,
    observeViewport,
    classifyDevice,
    configureBreakpoints,
    TABLET_MIN_SHORT_SIDE,
} from '@keenmate/web-components-core';
export type {
    EnvironmentSnapshot,
    DeviceClass,
    Orientation,
    PointerType,
    OS,
    BreakpointMap,
} from '@keenmate/web-components-core';

// Export types
export type {
    DatePickerOptions, DateRange, FormatOptions, MonthDisplay, DatePickerEventDetail,
    // Shared callback/event context vocabulary
    PickerContext, PresentationContext, DayContext, MonthHeaderContext, UnifiedHeaderContext,
    SelectionContext, MonthChangeContext, SummaryContext, ActionButtonContext,
    SelectEventDetail, CustomActionEventDetail, LoaderTarget, LockAspect,
    // Supporting types
    DayMetadata, DecoratedDate, ActionButton, BeforeSelectResult,
    BeforeMonthChangeResult, LocaleStrings
} from './types';

// Form-value serialization types (for typing getValueFormatCallback / value-format)
export type { FormValueFormat, FormValueItem, FormValueSelection } from './form-value';

// Export logging utilities for runtime control
export {
    enableLogging,
    disableLogging,
    setLogLevel,
    setCategoryLevel,
    getCategories,
    LOGGING_CATEGORIES,
    drpLogger,
    renderingLogger,
    interactionLogger,
    selectionLogger,
    navigationLogger,
    uiLogger,
    validationLogger,
    dragLogger,
} from './logger';

// Type declarations for build-time constants (Vite define)
declare const __VERSION__: string;
declare const __PACKAGE_NAME__: string;
declare const __AUTHOR__: string;
declare const __LICENSE__: string;
declare const __REPOSITORY__: string;
declare const __HOMEPAGE__: string;

// The whole hand-rolled `window.components['web-daterangepicker'] = { … }` block —
// version/config/logging/register/getInstances — collapses to one core call.
// registerComponent defines the element, publishes build metadata + the flattened
// logging controls, and wires getInstances() to the live-instance registry that
// BlissElement maintains automatically (add on connect / remove on disconnect).
//
//   window.components['web-daterangepicker'].getInstances()
//   window.components['web-daterangepicker'].logging.enableLogging()
registerComponent('web-daterangepicker', WebDaterangepickerElement as unknown as CustomElementConstructor, {
    config: {
        name: typeof __PACKAGE_NAME__ !== 'undefined' ? __PACKAGE_NAME__ : '@keenmate/web-daterangepicker',
        version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0',
        author: typeof __AUTHOR__ !== 'undefined' ? __AUTHOR__ : 'KeenMate',
        license: typeof __LICENSE__ !== 'undefined' ? __LICENSE__ : 'MIT',
        repository: typeof __REPOSITORY__ !== 'undefined' ? __REPOSITORY__ : '',
        homepage: typeof __HOMEPAGE__ !== 'undefined' ? __HOMEPAGE__ : '',
    },
    logging,
});

declare global {
    interface HTMLElementTagNameMap {
        'web-daterangepicker': WebDaterangepickerElement;
    }
}
