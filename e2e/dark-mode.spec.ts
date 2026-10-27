import { test, expect, Page, Locator, dayByDate } from './fixtures';

/**
 * Basic dark-mode contrast checks.
 *
 * The component doesn't ship a "dark mode" per se — consumers compose dark themes by
 * overriding `--base-*` and `--drp-*` CSS variables. These specs verify that the
 * library's defaults don't produce illegible state transitions (e.g. white-on-light-gray
 * hover) when a consumer applies a dark palette.
 *
 * Strategy:
 *   1. Render three pickers — fully-themed, minimal-override, and zero-override (pure OS
 *      color-scheme inheritance).
 *   2. Open the calendar, hover or focus a day cell, and verify the rendered cell's text
 *      vs background contrast ratio meets WCAG AA for non-text UI (≥ 3:1).
 *
 * Fixture: test/dark-mode.html (all pickers pinned to initial-date="2026-06-15").
 */

const PAGE = '/test/dark-mode.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function input(p: Locator): Locator {
    return p.locator('input');
}

function calendar(p: Locator): Locator {
    return p.locator('.drp__picker');
}

/**
 * Parse a computed-style color string into [r, g, b, a] (0-255 RGB, 0-1 alpha).
 * Handles `rgb(...)` / `rgba(...)` and the modern `color(srgb r g b / a)` form that
 * Chrome returns for `color-mix()` results.
 */
function parseColor(s: string): [number, number, number, number] {
    const rgbMatch = s.match(/rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
        return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]), rgbMatch[4] !== undefined ? Number(rgbMatch[4]) : 1];
    }
    const srgbMatch = s.match(/color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/);
    if (srgbMatch) {
        return [
            Math.round(Number(srgbMatch[1]) * 255),
            Math.round(Number(srgbMatch[2]) * 255),
            Math.round(Number(srgbMatch[3]) * 255),
            srgbMatch[4] !== undefined ? Number(srgbMatch[4]) : 1
        ];
    }
    throw new Error(`Unparseable color: ${s}`);
}

/** Composite `fg` over `bg` (both 0-255 RGB(A)) using normal alpha blending. */
function compositeOver(fg: [number, number, number, number], bg: [number, number, number, number]): [number, number, number] {
    const a = fg[3];
    return [
        Math.round(fg[0] * a + bg[0] * (1 - a)),
        Math.round(fg[1] * a + bg[1] * (1 - a)),
        Math.round(fg[2] * a + bg[2] * (1 - a))
    ];
}

/** WCAG 2.1 relative luminance of an [r, g, b] color (0-255). */
function relativeLuminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map(c => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two [r, g, b] colors. */
function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * APCA lightness contrast (Lc, APCA-W3 0.0.98G) of text on a background, both [r, g, b] 0-255.
 * The contract picks text on fills by APCA (`--base-on-<role>-text-color`) and requires
 * |Lc| >= 45 for every default fill, so fills are measured the same way here.
 */
function apcaLc(text: [number, number, number], bg: [number, number, number]): number {
    const y = ([r, g, b]: [number, number, number]) => {
        const v = 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;
        return v < 0.022 ? v + (0.022 - v) ** 1.414 : v;
    };
    const yt = y(text), yb = y(bg);
    if (yb > yt) {
        const s = (yb ** 0.56 - yt ** 0.57) * 1.14;
        return s < 0.1 ? 0 : (s - 0.027) * 100;
    }
    const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
    return s > -0.1 ? 0 : (s + 0.027) * 100;
}

/**
 * Computed colors as `rgba(…)`. The contract's formulas (`color-mix(in oklch, …)`, relative
 * colors) serialize as `oklch(…)` / `color(srgb …)`; painting one pixel on a canvas converts any
 * CSS color to 8-bit sRGB.
 */
function toRgba(scope: Locator, colors: string[]): Promise<string[]> {
    return scope.evaluate((_el, list) => {
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
        return list.map((c) => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
            return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        });
    }, colors);
}

/** The effective [text, background] a day cell paints (backgrounds composited). */
async function dayColors(day: Locator, container: Locator): Promise<[[number, number, number], [number, number, number]]> {
    const [dayStyles, containerBg] = await Promise.all([
        day.evaluate(el => {
            const cs = getComputedStyle(el);
            return { color: cs.color, bg: cs.backgroundColor };
        }),
        container.evaluate(el => getComputedStyle(el).backgroundColor)
    ]);
    const [c, b, cb] = await toRgba(day, [dayStyles.color, dayStyles.bg, containerBg]);
    const effectiveBg = compositeOver(parseColor(b), parseColor(cb));
    const effectiveText = compositeOver(parseColor(c), [...effectiveBg, 1]);
    return [effectiveText, effectiveBg];
}

/**
 * Read the effective text-over-rendered-background contrast of a day cell.
 * Composites the cell's (possibly semi-transparent) background over the calendar's
 * background so we measure what the eye actually sees, not just the inline color values.
 */
async function measureDayContrast(day: Locator, container: Locator): Promise<number> {
    const [dayStyles, containerBg] = await Promise.all([
        day.evaluate(el => {
            const cs = getComputedStyle(el);
            return { color: cs.color, bg: cs.backgroundColor };
        }),
        container.evaluate(el => getComputedStyle(el).backgroundColor)
    ]);
    const [c, b, cb] = await toRgba(day, [dayStyles.color, dayStyles.bg, containerBg]);
    const text = parseColor(c);
    const dayBg = parseColor(b);
    const baseBg = parseColor(cb);
    // Composite day bg over calendar bg (handles semi-transparent day highlights),
    // then composite text over the result (handles semi-transparent text, rare but possible).
    const effectiveBg = compositeOver(dayBg, baseBg);
    const effectiveText = compositeOver(text, [...effectiveBg, 1]);
    return contrastRatio(effectiveText, effectiveBg);
}

async function open(p: Locator): Promise<void> {
    await input(p).click();
    await expect(calendar(p)).toHaveClass(/drp__picker--visible/);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('day hover state stays readable on a dark page', async ({ page }) => {
    const p = picker(page, 'drp-dark');
    await open(p);

    const day = dayByDate(p, '2026-06-20');
    await day.hover();

    const ratio = await measureDayContrast(day, calendar(p));
    // WCAG AA for non-text UI components is 3:1. Body-text AA is 4.5:1.
    // Hover state should clear the lower bar; if it doesn't, the day is illegible.
    expect(ratio, `hover contrast ratio was ${ratio.toFixed(2)}:1 — needs at least 3:1`).toBeGreaterThanOrEqual(3);
});

test('day hover stays readable when only the page declares color-scheme: dark', async ({ page }) => {
    // Regression test for the `light-dark()` fallbacks. The picker has zero --base-* /
    // --drp-* overrides — every color comes from the library defaults. The fixture's <body>
    // declares `color-scheme: dark`, which inherits into the picker's shadow DOM and makes
    // our `light-dark(<light>, <dark>)` fallbacks resolve to the dark branch.
    //
    // This is the dhl-rdm-organiogram pattern: an app with a dark visual theme that signals
    // its intent via `color-scheme: dark` on body. The library should "just work" on such
    // an app without the consumer enumerating ~15 CSS variable overrides.
    const p = picker(page, 'drp-dark-auto');
    await open(p);

    const day = dayByDate(p, '2026-06-20');
    await day.hover();

    const ratio = await measureDayContrast(day, calendar(p));
    expect(ratio, `hover contrast ratio was ${ratio.toFixed(2)}:1 — needs at least 3:1`).toBeGreaterThanOrEqual(3);
});

test('day hover state stays readable with only minimal dark-theme overrides', async ({ page }) => {
    // Regression test for the variable-fallback fix: --drp-primary-bg used to fall back to
    // a bare `var(--base-main-bg)`, which made the hover color collapse onto the panel
    // background in dark themes. Now it mixes 8% of the current text color into the main
    // background, so the highlight stays visible even when the consumer only overrides
    // the obvious text + background variables.
    const p = picker(page, 'drp-dark-minimal');
    await open(p);

    const day = dayByDate(p, '2026-06-20');
    await day.hover();

    const ratio = await measureDayContrast(day, calendar(p));
    expect(ratio, `hover contrast ratio was ${ratio.toFixed(2)}:1 — needs at least 3:1`).toBeGreaterThanOrEqual(3);
});

test('selected day stays readable on a dark page', async ({ page }) => {
    const p = picker(page, 'drp-dark');
    await open(p);

    await dayByDate(p, '2026-06-20').click();
    // Reopen to inspect class state (single mode with default auto-close closes the picker).
    await open(p);

    const selected = p.locator('.drp__day--selected').first();
    await expect(selected).toHaveCount(1);

    // The selected day is the accent FILL with the contract's text-on-fill (black or white
    // picked by APCA), so it is held to the contract's fill rule: |Lc| >= 45. (WCAG 2 under-
    // rates white on bright mid-tones such as the default sky accent: 2.8:1, Lc ~ 60.)
    const [text, bg] = await dayColors(selected, calendar(p));
    const lc = Math.abs(apcaLc(text, bg));
    expect(lc, `selected day APCA contrast was Lc ${lc.toFixed(1)} — needs at least 45`).toBeGreaterThanOrEqual(45);
});
