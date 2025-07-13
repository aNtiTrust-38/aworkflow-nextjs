import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx', '__tests__/**/*.supertest.ts'],
    setupFiles: ['vitest.setup.ts'],
    environment: 'jsdom',
    testTimeout: 15000, // Increase timeout for complex React components
    pool: 'threads', // Enable thread pool for better performance
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    globals: true, // Enable global test APIs
    clearMocks: true, // Auto-clear mocks between tests
    restoreMocks: true, // Restore original implementations after tests
    sequence: {
      shuffle: false, // Disable shuffling for more predictable test execution
      concurrent: false // Disable concurrent execution to avoid timing issues
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
}); 