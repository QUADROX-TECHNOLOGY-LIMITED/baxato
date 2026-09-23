import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'config',
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
  },
});
