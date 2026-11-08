import { blissAnalyzerConfig, cssVariablesFromManifestPlugin } from '@keenmate/web-components-core/cem';
import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import { customElementJetBrainsPlugin } from 'custom-element-jet-brains-integration';

/**
 * The element's ~60 attributes/members/events are declared in the `static inputs`
 * / `static events` tables on `WebDaterangepickerElement` (invisible to the stock
 * analyzer, which can't statically read them). The core `blissInputsPlugin()` —
 * wired in by `blissAnalyzerConfig()` and run FIRST — reads those tables straight
 * from the AST and injects them, so the manifest stays a single source of truth
 * with the runtime table. The editor-integration generators run after it and see
 * the injected attributes.
 *
 * (Replaces the former homegrown `cem/attribute-table-plugin.mjs`, which read the
 * old hand-coded `ATTRIBUTE_TABLE`.)
 *
 * Core's `cssVariablesFromManifestPlugin()` runs before the editor-integration
 * generators and injects the `--drp-*` surface (from
 * `component-variables.manifest.json`) as `cssProperties`, so both the VS Code
 * CSS custom-data file and `web-types.json` carry the theming variables.
 */
export default blissAnalyzerConfig({
    globs: ['src/**/*.ts'],
    // exclude: core's default (tests + declarations); src/index.ts is analyzed — registerComponent() defines the tag there.
    outdir: '.',
    plugins: [
        cssVariablesFromManifestPlugin(),
        customElementVsCodePlugin({ outdir: '.' }),
        customElementJetBrainsPlugin({ outdir: '.', packageJson: false }),
    ],
});
