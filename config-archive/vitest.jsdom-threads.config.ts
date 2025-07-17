import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    testTimeout: 5000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});