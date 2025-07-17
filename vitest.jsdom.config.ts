import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Configuration for component tests that require DOM
 * Uses jsdom environment for React component testing
 */
export default defineConfig({
  test: {
    name: 'jsdom',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.jsdom.ts'], // Dedicated setup for component tests
    include: [
      '__tests__/**/*.test.tsx',
      '__tests__/components/**/*.test.ts',
      'components/**/*.test.tsx',
      'src/**/*.test.tsx'
    ],
    exclude: [
      'node_modules',
      '__tests__/api/**/*',
      '__tests__/lib/**/*',
      '__tests__/infrastructure/**/*'
    ],
    pool: 'forks', // Use forks for jsdom tests
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true
      }
    },
    sequence: {
      concurrent: false // Component tests often have side effects
    },
    testTimeout: 20000, // 20 seconds for component tests
    hookTimeout: 10000,
    teardownTimeout: 5000,
    css: true,
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
      '@/app': path.resolve(__dirname, './src/app')
    }
  },
  esbuild: {
    jsxInject: `import React from 'react'`
  }
})