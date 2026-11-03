import { defineComponentConfig } from '@keenmate/web-components-devkit/vite';

// Ports, lib output (dist/web-daterangepicker.js + .umd.js + style.css), build-time
// constants and the examples site come from package.json#kmwc. Types are emitted by
// `tsc` (npm run build), not the preset. Floating UI and core are bundled.
export default defineComponentConfig({
  overrides: {
    // Dev dep-scan only the real pages and the e2e fixtures — not test-results/ etc.
    optimizeDeps: { entries: ['index.html', 'examples-*.html', 'test/*.html'] },
  },
});
