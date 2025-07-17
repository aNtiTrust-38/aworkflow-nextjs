import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Optimized configuration for API and utility tests
 * Uses Node environment for better performance
 */
export default defineConfig({
  test: {
    name: 'node',
    environment: 'node', // Much faster than jsdom
    globals: true,
    setupFiles: ['./vitest.setup.simple.ts'],
    include: [
      '__tests__/api/**/*.test.ts',
      '__tests__/lib/**/*.test.ts',
      '__tests__/utils/**/*.test.ts',
      '__tests__/infrastructure/**/*.test.ts',
      '__tests__/phase2/**/*.test.ts',
      '__tests__/crypto.test.ts',
      '__tests__/user-settings-storage.test.ts',
      '__tests__/minimal-timeout-test.test.ts',
      '__tests__/test-minimal.test.ts'
    ],
    exclude: [
      'node_modules',
      '__tests__/**/*.test.tsx', // Exclude component tests
      '__tests__/components/**/*'
    ],
    pool: 'threads', // Use threads for parallel execution
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    },
    sequence: {
      concurrent: true // Enable concurrent test execution
    },
    testTimeout: 10000, // 10 seconds (reduced from 30)
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        '**/__tests__/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/types': path.resolve(__dirname, './types'),
      '@/utils': path.resolve(__dirname, './utils'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/styles': path.resolve(__dirname, './styles'),
      '@/public': path.resolve(__dirname, './public'),
      '@/prisma': path.resolve(__dirname, './prisma')
    }
  }
})