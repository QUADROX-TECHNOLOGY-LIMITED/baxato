import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api',
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
