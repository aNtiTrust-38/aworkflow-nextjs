import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx', '__tests__/**/*.supertest.ts'],
    setupFiles: ['vitest.setup.ts'],
    environment: 'jsdom'
  }
}); 