// Unit-test scope for a bare `npx vitest run`. The package has no unit suite (yet) —
// its tests are the Playwright specs in e2e/ (`npm run test:e2e`), which vitest must
// not pick up. vitest is not a dependency, so no `vitest/config` import: a plain
// object is a valid config.
export default {
  test: {
    include: ['src/**/*.test.ts', 'test/unit/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    passWithNoTests: true,
  },
};
