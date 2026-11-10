# Input Size Variables

This document shows the input size CSS variables aligned with `@keenmate/web-multiselect` for consistent styling across Keenmate components.

## Input Font Sizes

| Size | Variable | Value | Pixels |
|------|----------|-------|--------|
| xs | `--drp-input-size-xs-font` | `calc(1.2 * var(--drp-rem))` | 12px |
| sm | `--drp-input-size-sm-font` | `calc(1.3 * var(--drp-rem))` | 13px |
| md | `--drp-input-size-md-font` | `calc(1.4 * var(--drp-rem))` | 14px |
| lg | `--drp-input-size-lg-font` | `calc(1.6 * var(--drp-rem))` | 16px |
| xl | `--drp-input-size-xl-font` | `calc(1.8 * var(--drp-rem))` | 18px |

## Input Vertical Padding

| Size | Variable | Value | Pixels |
|------|----------|-------|--------|
| xs | `--drp-input-size-xs-padding-v` | `calc(0.4 * var(--drp-rem))` | 4px |
| sm | `--drp-input-size-sm-padding-v` | `calc(0.5 * var(--drp-rem))` | 5px |
| md | `--drp-input-size-md-padding-v` | `calc(0.8 * var(--drp-rem))` | 8px |
| lg | `--drp-input-size-lg-padding-v` | `calc(1.0 * var(--drp-rem))` | 10px |
| xl | `--drp-input-size-xl-padding-v` | `calc(1.2 * var(--drp-rem))` | 12px |

## Input Horizontal Padding

| Size | Variable | Value | Pixels |
|------|----------|-------|--------|
| xs | `--drp-input-size-xs-padding-h` | `calc(0.8 * var(--drp-rem))` | 8px |
| sm | `--drp-input-size-sm-padding-h` | `calc(0.8 * var(--drp-rem))` | 8px |
| md | `--drp-input-size-md-padding-h` | `calc(1.2 * var(--drp-rem))` | 12px |
| lg | `--drp-input-size-lg-padding-h` | `calc(1.4 * var(--drp-rem))` | 14px |
| xl | `--drp-input-size-xl-padding-h` | `calc(1.6 * var(--drp-rem))` | 16px |

## Input Heights

| Size | Variable | Value | Pixels |
|------|----------|-------|--------|
| xs | `--drp-input-size-xs-height` | `calc(3.1 * var(--drp-rem))` | 31px |
| sm | `--drp-input-size-sm-height` | `calc(3.3 * var(--drp-rem))` | 33px |
| md | `--drp-input-size-md-height` | `calc(3.5 * var(--drp-rem))` | 35px |
| lg | `--drp-input-size-lg-height` | `calc(3.8 * var(--drp-rem))` | 38px |
| xl | `--drp-input-size-xl-height` | `calc(4.1 * var(--drp-rem))` | 41px |

## Icon Sizes

| Size | Variable | Value |
|------|----------|-------|
| xs | `--drp-input-size-xs-icon-size` | 0.75em |
| sm | `--drp-input-size-sm-icon-size` | 0.875em |
| md | `--drp-input-size-md-icon-size` | 1em |
| lg | `--drp-input-size-lg-icon-size` | 1.125em |
| xl | `--drp-input-size-xl-icon-size` | 1.25em |

---

## Base Typography Scale

These are the base font size variables used throughout the component (not input-specific).

| Name | Variable | Value | Pixels |
|------|----------|-------|--------|
| 2xs | `--drp-font-size-2xs` | `calc(1.0 * var(--drp-rem))` | 10px |
| xs | `--drp-font-size-xs` | `calc(1.2 * var(--drp-rem))` | 12px |
| sm | `--drp-font-size-sm` | `calc(1.4 * var(--drp-rem))` | 14px |
| base | `--drp-font-size-base` | `calc(1.6 * var(--drp-rem))` | 16px |
| lg | `--drp-font-size-lg` | `calc(1.8 * var(--drp-rem))` | 18px |
| xl | `--drp-font-size-xl` | `calc(2.0 * var(--drp-rem))` | 20px |
| 2xl | `--drp-font-size-2xl` | `calc(2.4 * var(--drp-rem))` | 24px |

---

## Spacing Scale

| Name | Variable | Value | Pixels |
|------|----------|-------|--------|
| xs | `--drp-spacing-xs` | `calc(0.4 * var(--drp-rem))` | 4px |
| sm | `--drp-spacing-sm` | `calc(0.8 * var(--drp-rem))` | 8px |
| md | `--drp-spacing-md` | `calc(1.6 * var(--drp-rem))` | 16px |
| lg | `--drp-spacing-lg` | `calc(2.4 * var(--drp-rem))` | 24px |
| xl | `--drp-spacing-xl` | `calc(3.2 * var(--drp-rem))` | 32px |

---

## Notes

- All values are based on `--drp-rem: 10px` (default)
- Input sizes are aligned with `@keenmate/web-multiselect` for consistency
- The base typography scale matches web-multiselect exactly
- Input font sizes use a slightly different scale optimized for form inputs
