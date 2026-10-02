#!/usr/bin/env node
/**
 * Validates `component-variables.manifest.json` against the actual CSS.
 *
 * The manifest is the single source of truth for the IDE-autocomplete outputs
 * (`vscode.css-custom-data.json`, `web-types.json`) and for theme-designer. Those
 * outputs are regenerated from it on every build, but the manifest itself is
 * hand-maintained — so it silently drifts from the CSS. This guard makes that
 * drift a build failure instead of a silent gap (mirrors web-multiselect's
 * `check:vars` guard introduced in its v2.0.1).
 *
 * Contract:
 *   - Every `--base-*` CONSUMED via `var()` in src/css must appear in
 *     `baseVariables`, and every `baseVariables` entry must be consumed (no dead).
 *   - Every `--drp-*` DECLARED in src/css must appear in `componentVariables`, and
 *     every `componentVariables` entry must be declared (no dead) — except names in
 *     INTERNAL_DRP (runtime-computed, intentionally not a public theming knob).
 *
 * Exit non-zero on any ERROR. `--strict` also treats missing `--drp-*` coverage as
 * an error (default: warning, so a known component-var backlog doesn't block the
 * build while it's being reconciled).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssDir = join(root, 'src', 'css');
const strict = process.argv.includes('--strict');

// `--drp-*` variables set at runtime / computed internally — intentionally NOT part
// of the public theming manifest. Keep this list tight and justified.
const INTERNAL_DRP = new Set([
  'drp-grid-rows',                    // written by JS (grid layout), not author-set
  'drp-grid-columns',                 // written by JS (grid layout), not author-set
  'drp-rolling-item-justify-content', // written by JS (rolling selector), not author-set
]);

let css = '';
for (const f of readdirSync(cssDir)) {
  if (f.endsWith('.css')) css += '\n' + readFileSync(join(cssDir, f), 'utf8');
}
// Strip comments so example snippets in prose don't count as declarations/uses.
css = css.replace(/\/\*[\s\S]*?\*\//g, '');

// Declared `--drp-*` = the name is the LHS of a declaration (followed by a colon).
// `var(--drp-x)` / `var(--drp-x, …)` reads are followed by `)`/`,`, so the colon
// reliably distinguishes declarations from consumption.
const declaredDrp = new Set([...css.matchAll(/--(drp-[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
// Consumed `--base-*` = read via `var(--base-…)`.
const usedBase = new Set([...css.matchAll(/var\(\s*--(base-[a-z0-9-]+)/gi)].map((m) => m[1]));

const manifest = JSON.parse(readFileSync(join(root, 'component-variables.manifest.json'), 'utf8'));
const manifestDrp = new Set(manifest.componentVariables.map((v) => v.name));
const manifestBase = new Set(manifest.baseVariables.map((v) => v.name));

const minus = (a, b) => [...a].filter((x) => !b.has(x)).sort();
const baseMissing = minus(usedBase, manifestBase);
const baseDead = minus(manifestBase, usedBase);
const drpDead = minus(manifestDrp, declaredDrp);
const drpMissing = minus(declaredDrp, manifestDrp).filter((n) => !INTERNAL_DRP.has(n));

const section = (title, list) => `${title} (${list.length}):\n` + list.map((n) => `  --${n}`).join('\n');
const errors = [];
const warns = [];

if (baseMissing.length) errors.push(section('--base-* consumed in CSS but MISSING from manifest.baseVariables', baseMissing));
if (baseDead.length) errors.push(section('--base-* in manifest.baseVariables but NOT consumed in CSS (dead)', baseDead));
if (drpDead.length) errors.push(section('--drp-* in manifest.componentVariables but NOT declared in CSS (dead)', drpDead));
if (drpMissing.length) {
  const s = section('--drp-* declared in CSS but MISSING from manifest.componentVariables', drpMissing);
  (strict ? errors : warns).push(strict ? s : s + '\n  (warning — run with --strict to enforce; move true internals into INTERNAL_DRP)');
}

if (warns.length) console.warn('\n⚠ variable-manifest warnings:\n\n' + warns.join('\n\n') + '\n');
if (errors.length) {
  console.error('\n✗ variable manifest out of sync with CSS:\n\n' + errors.join('\n\n'));
  console.error('\nEdit component-variables.manifest.json (source of truth for IDE autocomplete + theme-designer), then rebuild.\n');
  process.exit(1);
}
console.log(
  `✓ variable manifest in sync — ${manifestBase.size} base, ${manifestDrp.size} component vars` +
  (warns.length ? ` (${drpMissing.length} undocumented --drp-* — see warning)` : '') + '.'
);
