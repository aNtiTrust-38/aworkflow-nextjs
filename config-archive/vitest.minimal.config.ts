import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'node', // Use node instead of jsdom
    testTimeout: 10000,
    globals: true,
    pool: 'forks', // Use forks instead of threads
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});