import { definePlaywrightConfig, devices } from '@keenmate/web-components-devkit/playwright';

/**
 * Playwright config for end-to-end tests.
 *
 * Specs live in e2e/ and target dedicated fixture pages under test/*.html. The
 * fixture pages are intentionally separate from the examples-*.html development
 * pages so they stay minimal and focused on the feature under test. baseURL and
 * the `npm run dev` web server come from package.json#kmwc.ports.dev (the devkit
 * preset), so the port can't drift from vite.config / the Makefile.
 *
 * Commands:
 *   npm run test:e2e:install   # one-time: download the browser binaries
 *   npm run test:e2e           # headless run (chromium)
 *   npm run test:e2e:all       # chromium + firefox + webkit
 *   npm run test:e2e:ui        # Playwright Test UI (debugging)
 */
const viewport = { width: 1440, height: 1024 };

export default definePlaywrightConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport } },
  ],
});
