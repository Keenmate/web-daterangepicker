# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web component project extracted from the pure-admin design system. The goal is to create a standalone, reusable date picker web component from the existing source files.

**Current Status**: Fully implemented - TypeScript web component with Vite build tooling, ready for development and publishing.

## Architecture

### Source Layout

The codebase is TypeScript, organized as a core class plus extracted operation modules. CSS is plain CSS custom properties with the `--drp-*` prefix; no SCSS, no preprocessor.

**Core**
- `src/date-picker.ts` — `DateRangePickerEngine` class (the internal engine, ~1800 lines; exported for advanced standalone use only). Constructor, options resolution, calendar/DOM creation, locale init, action-button rendering (core `/actions` `ActionItem`s, run through `runAction`: `beforeActionCallback` → `onClick` → `action` event → built-in), action-button tooltip lifecycle, day metadata lookup. Holds the state. Callback contexts and event details never expose the engine — they carry the `controller` facade (`el.controller`) + the host `element` (interaction model, web-components-core rc15).
- `src/web-component.ts` — `WebDaterangepickerElement` custom element (~870 lines). Wraps the core class in a Shadow DOM. ~35 getter/setter pairs for attributes and complex-data properties; `attributeChangedCallback` routes most attribute changes through `destroy() + initializePicker()`.
- `src/index.ts` — public-API entry; exports the web component, the core class, and types.
- `src/types.ts` — shared types and the `DatePickerOptions` interface.
- `src/logger.ts` — `loglevel`-based namespaced loggers (`drpLogger`, `uiLogger`, `dragLogger`, `selectionLogger`, etc.).

**Operation modules** (functions taking `picker` as first arg, modifying its state):
- `src/date-picker-rendering.ts` — `renderCalendar`, `renderRollingSelector`, day-cell decoration, summary rendering, custom-render callbacks.
- `src/date-picker-navigation.ts` — month navigation (`prevMonth`, `nextMonth`), unified navigation, collision detection between adjacent columns in multi-month mode, rolling-selector navigation.
- `src/date-picker-interaction.ts` — drag-to-adjust handlers (`onDragStart`, `onDragMove`, `onDragEnd`), input-mask parsing (`applyMask`, `applyRangeMask`), keyboard navigation.
- `src/date-picker-selection.ts` — `selectDay`, `selectToday`, `clearSelection`, `apply`, range validation (`validateRangeAsync`).
- `src/date-picker-ui.ts` — `show`/`hide`/`position`/`showMessage`/`hideMessage`. Floating UI integration for the calendar popover.
- `src/date-picker-validation.ts` — pure date helpers (`normalizeDate`, `isDateDisabled`, `formatDateKey`, `detectWeekStartDay`).
- `src/date-picker-locales.ts` — locale strings, weekday/month names, locale resolution.
- `src/modules/click-events/` and `src/modules/scroll-events/` — small managers that own their own event subscriptions and clean up on destroy.

**CSS** (`src/css/`)
- `main.css` — entry point. Declares `@layer variables, component, overrides;` and imports every partial into its layer.
- `variables.css` — all `--drp-*` custom properties (the theming surface).
- `base.css`, `calendar-grid.css`, `header-navigation.css`, `summary-actions.css`, `badges.css`, `loading.css`, `message.css`, `tooltips.css`, `modifiers.css`, `time-picker.css`, `clock-picker.css`, `wheel-picker.css`, `compact-picker.css`, `modal.css` — feature partials (layer: `component`).
- `dark-mode.css` — page signal via `:host([data-context-theme])` (set by web-components-core's theme context) + `:host([data-theme])` per-instance overrides (layer: `overrides`).

### Component Features

- **Selection modes**: single, range, multiple
- **Multi-month display**: 1-N months side-by-side (`visibleMonthsCount` option)
- **Layouts**: horizontal row or grid (`monthLayout: 'horizontal' | 'grid'` with `gridRows`/`gridColumns`)
- **Unified navigation** for grid layouts: anchor-month index drives the whole grid
- **Input masking**: progressive auto-formatting as the user types, configurable date format
- **Trigger modes**: auto-open on focus, on typing, or manual (`calendarOpenTrigger`)
- **Range features**: day/night count summary, drag-to-adjust dates, Apply button
- **Collision prevention**: multi-month columns can't show duplicate months
- **Progressive input parsing**: calendar tracks the input as the user types valid date segments
- **Rolling selector**: scrollable year/month list inside the header
- **Disabled-dates handling**: `allow` / `prevent` / `block` / `split` / `individual` strategies for ranges that span disabled dates
- **Custom rendering** via callbacks: `renderDayCallback`, `renderDayContentCallback`, `getMonthHeaderCallback`, `getUnifiedHeaderCallback`, `renderSummaryCallback` — see security note in `src/types.ts`
- **Tooltips** on day cells, badges, and action buttons (via Floating UI)
- **Locale support**: bundled English plus user-overridable strings; auto-detects from browser

### Important Implementation Details

**Month columns (multi-month mode)**
- `_monthDates: Date[]` (private) — one anchor per visible month column; the single source of truth for what's displayed. Public read views derive from it: `visibleMonths: MonthDisplay[]` (with `firstDate`/`lastDate`/`gridStart`/`gridEnd`), `visibleMonthDates: Date[]`, `visibleDateRange: {start,end}`.
- `activeMonthIndex` — which column has keyboard focus
- `focusedDayIndex` — which day within the active column is focused (`dayOfMonth − 1`; nullable)
- `rollingSelectorOpenByColumn: boolean[]` — rolling-selector open state per column (`isUnifiedRollingSelectorOpen: boolean` for unified-grid mode)
- Tab cycles between columns; collision detection keeps columns strictly ascending (no duplicates, no out-of-order — but gaps are allowed)

**Date format parsing** (`parseFormat` in core class)
- Supports `YYYY`/`YY`, `MM`/`M`, `DD`/`D` with arbitrary separators
- Result is cached on `formatInfo` and used by both rendering and the input mask

**Keyboard navigation**
- Arrows: Up/Down (week), Left/Right (day)
- Ctrl+Left/Right or PageUp/PageDown: previous/next month
- Home / End: first/last day of current month
- Ctrl+Home / Ctrl+End: jump to start/end of year (repeat to step year-by-year)
- `t`: jump to today
- Enter: select focused day; Escape: close; Tab: switch column

**Floating UI integration** (`src/date-picker-ui.ts`)
- Calendar popover and action-button tooltips both use `computePosition` + `autoUpdate`
- Default placement: `bottom-start`; flips and shifts on viewport overflow

## Development Guidelines

### Adding New Features

- Min/max dates, disabled dates, disabled weekdays, and rolling year/month ranges are implemented; the constraint pipeline lives in `Validation.isDateDisabled` plus `getAvailableYearRange` / `getAvailableMonthRange` on the core class
- For new options that should be reactive at runtime, add a row to `ATTRIBUTE_TABLE` in `web-component.ts` — it is the single source of truth that drives both `observedAttributes` and the initial parse (`parseAttributesFromTable` in `initializePicker`), so the two can no longer drift. (The only remaining hand-coordinated pair is `DUAL_PATH_KEYS` for the `disabledDates` + `*Member` data-prop family.)
- Runtime changes: `on:'update'` inputs patch the live engine via `updateOptions(partial)`; an `on:'reinit'` input, or a key in the engine's `STRUCTURAL_KEYS` (which makes `updateOptions` return false), rebuilds via `#rebuildPreservingSelection()` — the committed selection is snapshotted and restored. A new option whose DOM is built once in `createCalendar()` must go into `STRUCTURAL_KEYS`.
- Lifecycle is build-once (web-components-core): `disconnect()` → `engine.deactivate()` (drops document/window listeners, overlay group, floating autoUpdate, open-sheet chrome — keeps all state), `connect()` → `engine.activate()`. A DOM move keeps selection and open state. New document/window-level listeners must be detached in both `destroy()` and `deactivate()` and re-attached in `activate()`.

### Adding New CSS Variables

- Declare in `src/css/variables.css` with the `--drp-` prefix
- Reference from a partial via `var(--drp-x, fallback)` — every theming hook should default to a sensible value so the component works unstyled
- Don't declare a hook you don't wire — declared-but-unread variables are dead theming surface

### State Management

Key state. Public selection accessors are get/set (reactive — assigning re-renders + syncs input) backed by private raw fields; displayed state is read-only and derived:
- `selectedDate` / `selectedDates` / `selectedRanges`: get/set selection accessors (raw storage is private `_selectedDate` etc.). `selectedStartDate` / `selectedEndDate` are read-only; `selectedTime` / `selectedDatetime` get/set (the `selectedDatetime` setter accepts a `Date | string` and splits it).
- `visibleMonths` / `visibleMonthDates` / `visibleDateRange`: read-only views of the displayed columns, derived from private `_monthDates`
- `activeMonthIndex`: Which month column has keyboard focus
- `focusedDayIndex`: Which day within active column is keyboard-focused
- `rollingSelectorOpenByColumn[]`: Boolean array tracking rolling selector visibility per column
- Drag state: `isDragging`, `draggingType`, `dragPreviewStart`, `dragPreviewEnd`

### Known Dependencies

- `@floating-ui/dom` - Required for calendar positioning (bundled in the component)
- All SCSS variables have been converted to CSS custom properties with `--drp-` prefix
- No external CSS frameworks required

### Size System

**Input field — attribute-driven 5-level scale (xs / sm / md / lg / xl):**
- `input-size` is the only sizing attribute on the web component. It toggles `.drp__input--{size}` on the input element (and on the surrounding `.drp__input` wrapper). `md` is the unstyled default. Floating/modal modes only — inline mode has no input.
- Per-size CSS hooks: `--drp-input-size-{size}-font`, `--drp-input-size-{size}-padding-v`, `--drp-input-size-{size}-padding-h`, `--drp-input-size-{size}-height`, `--drp-input-size-{size}-icon-size`.

**Calendar — token-driven, not attribute-driven:**
Internal partials consume `--drp-spacing-{xs,sm,md,lg,xl}` and `--drp-font-size-{2xs,xs,sm,base,lg,xl,2xl}` from `variables.css`. These are CSS custom-property tokens for theming, not BEM classes. There is no `spacing` / `font-size` / `cell-size` HTML attribute, and no `.drp-spacing-*` / `.drp-font-*` / `.drp-cell-*` class. To rescale the whole calendar, set `--drp-rem` (default `10px`) on the host element — every size token is `calc(N * var(--drp-rem))`. To override an individual token, set it on the host: `web-daterangepicker { --drp-spacing-md: 20px; }`.

**Example:**
```html
<web-daterangepicker input-size="lg" style="--drp-rem: 12px"></web-daterangepicker>
```

## Build System

### Build Tools
- **Vite** - Fast build tool and dev server with HMR
- **TypeScript** - Type-safe development
- **Makefile** - Build automation for Unix/Mac/WSL
- **make.bat** - Build automation for Windows

### Available Commands

```bash
# Using Makefile (Unix/Mac/WSL/Git Bash)
make setup        # Install dependencies
make dev          # Start dev server (watches changes)
make build        # Build for production
make package      # Create npm package
make publish-dry  # Dry-run publish
make publish      # Publish to npm
make clean        # Clean all artifacts
make help         # Show all commands

# Using Windows batch file
make.bat setup    # Same commands as above
make.bat dev

# Using npm directly
npm install       # Install dependencies
npm run dev       # Start dev server
npm run build     # Build for production
npm run package   # Create package
```

### Development Workflow
1. `make setup` - Install dependencies
2. `make dev` - Start development server at http://localhost:5173
3. Make changes - HMR will auto-reload
4. `make build` - Build for production (creates dist/ folder)
5. Test locally before publishing

### Output Files
Build creates `dist/` with:
- `web-daterangepicker.js` - ES module format
- `web-daterangepicker.umd.js` - UMD format for CDN/legacy
- `index.d.ts` - TypeScript declarations
