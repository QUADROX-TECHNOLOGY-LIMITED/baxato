import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/*/vitest.config.ts',
      'apps/*/vitest.config.ts',
    ],
    hookTimeout: 30000,
    testTimeout: 30000,
    passWithNoTests: true,
  },
});
