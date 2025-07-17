import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx', '__tests__/**/*.supertest.ts'],
    setupFiles: ['vitest.setup.simple.ts'], // Use simplified setup
    environment: 'jsdom',
    testTimeout: 30000,
    pool: 'forks', // Use forks instead of threads for better stability
    poolOptions: {
      forks: {
        singleFork: true // Use single fork to avoid issues
      }
    },
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    sequence: {
      shuffle: false,
      concurrent: false
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
}); 