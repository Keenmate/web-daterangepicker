// Unit suite: the pure date logic (format masks, parsing, constraints, form values,
// converters) in test/unit/. Element rendering stays in the Playwright specs in e2e/
// (`npm run test:e2e`), which vitest must not pick up.
import { defineConfig } from 'vitest/config';

// One fixed zone with DST (last Sunday of March / October) so local-clock date math is
// deterministic on every machine and the DST edges are exercised. Set before the
// workers start — they inherit it.
process.env.TZ = 'Europe/Prague';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/unit/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'node',
  },
});
