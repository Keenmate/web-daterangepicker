# Theming — `@keenmate/web-daterangepicker`

Everything you need to recolor, rescale, or fully reskin the picker. The
component exposes four orthogonal theming contracts; understanding which
one to reach for keeps your overrides minimal and your dark-mode story
honest.

## The four contracts

| Contract | What it controls | Where to override |
|---|---|---|
| [Container contract](#container-contract) | `:host`-level layout primitives (`display`, font-family, the `--drp-rem` scale unit) | On the `<web-daterangepicker>` element or via the theme-designer `--base-*` taxonomy |
| [Variable contract](#variable-contract) | Every color / spacing / size token the component reads | `:root { --base-* }` for cross-component, `web-daterangepicker { --drp-* }` for single-component |
| [Color-scheme strategy](#color-scheme-strategy) | Five separate dark-mode signals the picker reacts to (OS preference, page scheme, framework class, per-instance attribute, explicit light override) | Set `color-scheme`, a framework class, or `data-theme` on the host or any ancestor |
| [Cascade-layer contract](#cascade-layer-contract) | Layer ordering: `variables` → `component` → `overrides` | Any unlayered consumer rule beats every layered internal rule without `!important` |

The rest of this file walks each contract, then collects the practical
"how do I recolor X" recipes (Theme Designer, manifest export, input
size scale, calendar scaling) at the end.

## Container contract

The picker is a custom element with shadow DOM. `:host` declares the
host-level baseline:

- `display: block` — without this the picker would default to inline
  layout and break input width and popover-offset math.
- `font-family: var(--drp-font-family, var(--base-font-family, inherit))`
  — typography inherits all the way through the shadow tree.
- `--drp-rem: 10px` — the scale unit every spacing / size token resolves
  against. Override on the host to rescale the whole calendar:

```html
<web-daterangepicker style="--drp-rem: 12px"></web-daterangepicker>
```

`color-scheme` is deliberately NOT declared on `:host` — that would
block the page's setting from inheriting into the shadow DOM. See the
comment block at the top of `src/css/variables.css` for the rationale.

See also: [VALIDATION-NOTES.md → C-BV-9 (Strategy A)](../VALIDATION-NOTES.md)
for the accepted-deviation note on `--base-*` reads inside dark-mode
override selectors.

## Variable contract

Two layers — pick the one matching the scope of your override.

### Standalone mode (single component)

Override only what you need. Each `--drp-*` token has a sensible
default, so unset tokens just inherit:

```css
web-daterangepicker {
  --drp-accent-color: #your-brand-color;
  --drp-primary-bg: #your-background;
  --drp-text-primary: #your-text-color;
}
```

### Cascading mode (multi-component)

When using multiple KeenMate components on the same page, declare a
shared `--base-*` layer at `:root`. Each component reads its
`--<prefix>-*` tokens through the `--base-*` chain, so one base
declaration drives all of them:

```css
:root {
  /* Base layer — single source of truth */
  --base-primary-color: #3b82f6;
  --base-main-bg: #ffffff;
  --base-hover-bg: #f3f4f6;
  --base-text-color-1: #111827;
}
```

Tier-1 variables follow a consistent naming pattern across KeenMate
components:

| Purpose | `web-multiselect` | `web-daterangepicker` |
|---|---|---|
| Brand color | `--ms-accent-color` | `--drp-accent-color` |
| Background | `--ms-primary-bg` | `--drp-primary-bg` |
| Text color | `--ms-text-primary` | `--drp-text-primary` |
| Text on accent | `--ms-text-on-accent` | `--drp-text-on-accent` |
| Border color | `--ms-border-color` | `--drp-border-color` |

Learn the pattern once, apply it across the suite.

### Component manifest

The package exports `component-variables.manifest.json` listing every
variable the component reads and emits, for IDE autocomplete and Theme
Designer integration:

```js
import manifest from '@keenmate/web-daterangepicker/component-variables.manifest.json';
// manifest.baseVariables       — list of --base-* variables the component responds to
// manifest.componentVariables  — list of --drp-* component-specific variables
```

### Reference: the full `--drp-*` surface

```css
:root {
  /* Base unit — scale the entire component by changing this */
  --drp-rem: 10px;

  /* Colors */
  --drp-dropdown-bg: #ffffff;
  --drp-border-color: #e5e7eb;
  --drp-primary-bg: #f3f4f6;
  --drp-primary-bg-hover: #e5e7eb;
  --drp-accent-color: #3b82f6;
  --drp-accent-color-hover: #2563eb;
  --drp-text-primary: #111827;
  --drp-text-secondary: #6b7280;
  --drp-text-on-accent: #ffffff;

  /* Input field */
  --drp-input-bg: var(--drp-dropdown-bg);
  --drp-input-color: var(--drp-text-primary);
  --drp-input-border: var(--base-input-border, var(--drp-border));
  --drp-input-border-hover: var(--base-input-border-hover, var(--drp-border-width-base) solid var(--drp-accent-color));
  --drp-input-border-focus: var(--base-input-border-focus, var(--drp-border-width-base) solid var(--drp-accent-color));
  --drp-input-placeholder-color: var(--drp-text-secondary);

  /* Typography (scale with --drp-rem) */
  --drp-font-size-xs: calc(1.2 * var(--drp-rem));    /* 12px */
  --drp-font-size-sm: calc(1.4 * var(--drp-rem));    /* 14px */
  --drp-font-size-base: calc(1.6 * var(--drp-rem));  /* 16px */
  --drp-font-weight-medium: 500;
  --drp-font-weight-semibold: 600;

  /* Spacing (scale with --drp-rem) */
  --drp-spacing-xs: calc(0.4 * var(--drp-rem));   /* 4px */
  --drp-spacing-sm: calc(0.8 * var(--drp-rem));   /* 8px */
  --drp-spacing-md: calc(1.6 * var(--drp-rem));   /* 16px */

  /* Borders */
  --drp-border-width-base: 1px;
  --drp-border-radius-sm: calc(var(--base-border-radius-sm, 0.4) * var(--drp-rem));  /* 4px — day cells, tooltips */
  --drp-border-radius-md: calc(var(--base-border-radius-md, 0.6) * var(--drp-rem));  /* 6px — inputs, buttons */
  --drp-border-radius-lg: calc(var(--base-border-radius-lg, 0.8) * var(--drp-rem));  /* 8px — calendar, dropdowns */
  --drp-border-radius: var(--drp-border-radius-md);

  /* Shadows */
  --drp-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Motion (contract speeds; 0s = off) */
  --drp-transition-fast: var(--base-duration-fast, 0.1s);
  --drp-transition-normal: var(--base-duration-normal, 0.15s);
  --drp-easing-snappy: var(--base-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
  --drp-easing-out: var(--base-ease-out, cubic-bezier(0, 0, 0.2, 1));
}
```

For the full list including time-picker, clock, wheel, and compact
picker tokens, see `examples-theming.html` "Available CSS Custom
Properties".

## Color-scheme strategy

The picker reacts to five separate dark-mode signals. Set any one and
the dropdown, text, borders, tooltip, and input flip to their dark
palette — no JavaScript involved.

| Signal | How to trigger |
|---|---|
| **OS preference** | `<html style="color-scheme: light dark">` — `light-dark()` then picks the OS branch |
| **Page-level scheme** | `<body style="color-scheme: dark">` |
| **Page signal** | `<html data-theme="dark">`, `<html data-bs-theme="dark">` (Bootstrap 5.3+), or `<html class="dark">` (Tailwind); also on `<body>`. For a themed section, put the signal on a wrapper and add `theme-source="closest"` (or a selector) to the picker |
| **Per-instance attribute** | `<web-daterangepicker data-theme="dark">` on a single component |
| **Explicit light override** | `data-theme="light"`, `data-bs-theme="light"`, or `.light` to force one widget back to light on an otherwise-dark page |

The first signal (OS preference / page scheme) is handled by `light-dark()`
in every color fallback. The latter three signals (page signal /
per-instance attribute / explicit light) are handled by override blocks
in `src/css/dark-mode.css` that set `color-scheme` and re-declare the
affected `--drp-*` variables inside `:host(...)` selectors. The page signal
is detected once per page by `@keenmate/web-components-core` and mirrored
onto the host as `data-context-theme` (no `:host-context()`, so it works in
Firefox and Safari); `setThemeMode('light' | 'dark' | 'auto')` from the core
forces every Keenmate component at once. The
auto-script for C-BV-9 flags this pattern; see
[VALIDATION-NOTES.md → C-BV-9](../VALIDATION-NOTES.md) for the
accepted-deviation rationale.

For the cross-component playbook on dark-mode signals, see the
BlissFramework `color-scheme.md` guideline.

## Cascade-layer contract

The component's stylesheet declares three cascade layers:

```css
@layer variables, component, overrides;
```

| Layer | Holds | Priority |
|---|---|---|
| `variables` | `:host { --drp-* }` declarations | lowest |
| `component` | Base rules + every feature partial | middle |
| `overrides` | Framework-class + per-instance `data-theme` blocks | highest |

**Consumer override contract:**

- Any **unlayered** consumer rule beats every rule in the component — no `!important` needed.
- Any `:root { --base-X: … }` declaration beats the `variables` layer trivially.
- To override the dark-mode blocks (the `overrides` layer), use your own `@layer overrides { … }` or any unlayered rule.

## Theme Designer

The fastest way to customize appearance is the **KeenMate Theme Designer**
at [theme-designer.keenmate.dev](https://theme-designer.keenmate.dev).
It writes the `--base-*` taxonomy directly, so the same theme cascades
into every KeenMate component on the page.

1. Choose 3 base colors — background, text, accent.
2. Preview changes live.
3. Fine-tune individual variables; lock specific values while adjusting others.
4. Export your theme — CSS, JSON, or SCSS to your project.

## Input size scale

The component ships a 5-level input-size scale matching the cross-component
taxonomy:

| Size | Attribute | Height | Base variable |
|---|---|---|---|
| XS | `input-size="xs"` | 31px | `--base-input-size-xs-height` |
| SM | `input-size="sm"` | 33px | `--base-input-size-sm-height` |
| MD | `input-size="md"` | 35px (default) | `--base-input-size-md-height` |
| LG | `input-size="lg"` | 38px | `--base-input-size-lg-height` |
| XL | `input-size="xl"` | 41px | `--base-input-size-xl-height` |

Theme Designer writes the `--base-input-size-*-height` row directly,
keeping input heights consistent across `web-multiselect` and
`web-daterangepicker`. For the full size-token reference (font, padding,
spacing), see [`SIZES.md`](../SIZES.md).

### Recipes — customizing input height

```css
/* Option 1 — via Theme Designer base variables (recommended for multi-component) */
:root {
  --base-input-size-md-height: 4.2;  /* All components: 42px at 10px rem */
}

/* Option 2 — direct px override on this component */
web-daterangepicker {
  --drp-input-size-md-height: 42px;
}

/* Option 3 — rescale via --drp-rem (affects everything that scales) */
web-daterangepicker {
  --drp-rem: 12px;  /* MD = 3.5 × 12 = 42px */
}

/* Option 4 — explicit calc against --drp-rem */
web-daterangepicker {
  --drp-input-size-md-height: calc(4.2 * var(--drp-rem));
}
```

## Calendar scaling

Scale the whole calendar by setting `--drp-rem` directly on the
`<web-daterangepicker>` element:

```css
/* Compact (80%) */
web-daterangepicker.compact {
  --drp-rem: 8px;
}

/* Large (150%) */
web-daterangepicker.large {
  --drp-rem: 15px;
}
```

```html
<!-- Or inline -->
<web-daterangepicker style="--drp-rem: 12px"></web-daterangepicker>
```

**Shadow DOM caveat:** the `--drp-rem` (and every other `--drp-*` /
`--base-*`) variable must be set on the `<web-daterangepicker>` element
itself — via class, inline style, or a `web-daterangepicker { … }` rule
in your stylesheet. Setting them on a wrapper `<div>` won't reach
through the shadow boundary.

For fine-grained control, override individual variables:

```css
web-daterangepicker.custom {
  --drp-rem: 12px;
  --drp-spacing-xs: 2px;       /* tighter gaps */
  --drp-font-size-base: 18px;  /* larger text */
}
```

See [`examples-theming.html`](../examples-theming.html) for interactive
demos including the classifier-retheming panel and the four
time-display UIs (Test 8).

## Motion

Transitions are always on and use the contract's speeds: `--drp-transition-fast`
(`--base-duration-fast`, 0.1s — clock / compact / wheel item colors) and
`--drp-transition-normal` (`--base-duration-normal`, 0.15s — inputs, buttons, nav,
popover and modal fade), eased by `--drp-easing-snappy` / `--drp-easing-out`.
There is no attribute for it — motion is CSS only:

```css
web-daterangepicker {                 /* this component */
  --drp-transition-fast: 0s;
  --drp-transition-normal: 0s;
  --drp-scroll-behavior: auto;        /* rolling selector / wheel scroll instantly */
}
:root {                               /* every component on the page */
  --base-duration-fast: 0s;
  --base-duration-normal: 0s;
  --base-duration-medium: 0s;
  --base-duration-slow: 0s;
  --base-scroll-behavior: auto;       /* programmatic scrolling, every component */
}
```

`prefers-reduced-motion: reduce` does this automatically: transitions go to `0s`,
scrolling is instant, and the loader keeps turning, slower (the contract's
`--base-loader-duration` 0.8s → 1.5s, which `--drp-loader-duration` follows).

## Loader

The loaders (`showLoader()`, async callbacks) follow the shared loader contract: a
single-colour mask shape in `--drp-loader-color` (the accent).

| Token | Default |
|---|---|
| `--drp-loader-icon` | `var(--base-loader-icon, <arc SVG>)` |
| `--drp-loader-rotate` | `var(--base-loader-rotate, 1turn)` (`0` = the SVG animates itself) |
| `--drp-loader-duration` | `var(--base-loader-duration, 0.8s)` |
| `--drp-loader-size` | `var(--base-loader-size, 1.25em)` — in-block (summary / message) |
| `--drp-loader-overlay-size` | `calc(var(--drp-loader-size) * 2)` — full-calendar overlay |
| `--drp-loader-color` | `var(--drp-accent-color)` |
| `--drp-loader-overlay-bg` | translucent scrim |

Set `--base-loader-*` on `:root` to change every KeenMate component at once; anything
richer than one colour → `window.components.renderLoadingCallback` / `renderLoadingCallback`.
The default loader element is `<span class="drp__loader">`.

## Custom CSS (shadow root)

Rules that reach inside the shadow root (a `dayClass`, a badge, a footer button) go in as
raw CSS, in two layers (core `createCustomStyles()`):

1. the **page layer**, for every picker on the page —
   `window.components['web-daterangepicker'].customStyles` (a CSS string; an
   `@import url('/css/drp-days.css')` works: one file for all pickers) or
   `window.components['web-daterangepicker'].getCustomStylesCallback(ctx)` (per picker,
   from its context; wins over `customStyles`);
2. the picker's **own** layer — the `custom-styles` attribute / `customStyles` property or
   `getCustomStylesCallback(ctx)` (wins over the attribute). It comes after the page layer,
   so it overrides it.

Assigning either layer updates the live pickers. An `@import` is also linked once in the
document `<head>` (Chromium ignores `@font-face` inside a shadow root, so an icon font would
not load otherwise); `window.components.shouldHoistImports = false` turns that off for a page
that loads its fonts itself. The component's own CSS sits in `@layer component`, so any custom
rule wins without `!important`. The CSS is inserted verbatim — never pass untrusted input.
Demo: theming page, TH27.

## See also

- [`VALIDATION-NOTES.md`](../VALIDATION-NOTES.md) — accepted-deviation
  rationale for `--base-*` reads inside dark-mode override selectors
  (C-BV-9, Strategy A), the dual `:host, :root` declaration (per D-TC-7),
  and the tooltip portal kind (C-CS-10).
- BlissFramework `color-scheme.md` guideline — the cross-component dark-mode signal playbook.
- BlissFramework `base-variables.md` guideline — the canonical `--base-*` taxonomy.
- [`examples-theming.html`](../examples-theming.html) — runnable demos of every theming primitive in this file.
