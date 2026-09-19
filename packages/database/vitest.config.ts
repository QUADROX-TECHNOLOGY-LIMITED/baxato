import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'database',
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
