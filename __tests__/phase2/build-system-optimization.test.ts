/**
 * RED PHASE TESTS: Build System Optimization
 * 
 * These tests define the expected behavior for build system optimization
 * as outlined in instructions.md Phase 2. All tests should FAIL initially
 * as no optimization has been implemented yet.
 * 
 * Target: Reduce build time from 3 minutes to 30-45 seconds
 * Target: Optimize ESLint performance for faster linting
 * Target: Implement build caching and incremental compilation
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

describe('Build System Performance Optimization', () => {
  const projectRoot = process.cwd();
  let buildStartTime: number;
  let buildEndTime: number;

  beforeEach(() => {
    // Clear any cached data between tests
    vi.clearAllMocks();
  });

  describe('Next.js Build Performance', () => {
    it('should complete build in under 45 seconds', async () => {
      // RED PHASE: This will fail as current build takes ~3 minutes
      buildStartTime = Date.now();
      
      try {
        await execAsync('npm run build', { 
          cwd: projectRoot,
          timeout: 50000 // 50 seconds to allow for slight variance
        });
        buildEndTime = Date.now();
        
        const buildTime = (buildEndTime - buildStartTime) / 1000;
        
        // This will fail initially - build takes ~180 seconds currently
        expect(buildTime).toBeLessThan(45);
      } catch (error) {
        if (error.message.includes('timeout')) {
          throw new Error(`Build timed out - expected under 45 seconds, but exceeded 50 seconds`);
        }
        throw error;
      }
    }, 60000); // Allow 60 seconds for test timeout

    it('should have webpack optimization configurations enabled', () => {
      // RED PHASE: Current next.config.ts lacks performance optimizations
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // These optimizations should be present but are currently missing
      expect(nextConfigContent).toContain('optimization: {');
      expect(nextConfigContent).toContain('splitChunks');
      expect(nextConfigContent).toContain('minimize: true');
      expect(nextConfigContent).toContain('moduleIds: "deterministic"');
    });

    it('should have build caching enabled', () => {
      // RED PHASE: Current config lacks caching configuration
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Cache configuration should be present but is currently missing
      expect(nextConfigContent).toContain('cache: {');
      expect(nextConfigContent).toContain('type: "filesystem"');
    });

    it('should exclude development files from production build', () => {
      // RED PHASE: Current config has basic exclusions but not comprehensive
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // More comprehensive exclusions should be present
      expect(nextConfigContent).toContain('__tests__');
      expect(nextConfigContent).toContain('vitest');
      expect(nextConfigContent).toContain('.md');
      expect(nextConfigContent).toContain('docs');
    });

    it('should have incremental compilation enabled', () => {
      // RED PHASE: Incremental compilation not configured
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Incremental configuration should be present
      expect(nextConfigContent).toContain('incremental: true');
    });
  });

  describe('Webpack Configuration Optimization', () => {
    it('should implement production-grade webpack optimizations', () => {
      // RED PHASE: Current webpack config is minimal
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Advanced webpack optimizations should be implemented
      expect(nextConfigContent).toContain('TerserPlugin');
      expect(nextConfigContent).toContain('CompressionPlugin');
      expect(nextConfigContent).toContain('BundleAnalyzerPlugin');
    });

    it('should have optimized module resolution', () => {
      // RED PHASE: Module resolution not optimized
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Module resolution optimizations should be present
      expect(nextConfigContent).toContain('resolve: {');
      expect(nextConfigContent).toContain('extensions: [');
      expect(nextConfigContent).toContain('alias: {');
    });

    it('should exclude heavy dependencies from client bundle', () => {
      // RED PHASE: Client bundle not optimized for size
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Server-only packages should be excluded from client
      expect(nextConfigContent).toContain('externals');
      expect(nextConfigContent).toContain('prisma');
      expect(nextConfigContent).toContain('@anthropic-ai/sdk');
      expect(nextConfigContent).toContain('openai');
    });
  });

  describe('ESLint Performance Optimization', () => {
    it('should complete linting in under 30 seconds', async () => {
      // RED PHASE: This will fail as current lint takes longer
      const lintStartTime = Date.now();
      
      try {
        await execAsync('npm run lint', { 
          cwd: projectRoot,
          timeout: 35000 // 35 seconds to allow for variance
        });
        const lintEndTime = Date.now();
        
        const lintTime = (lintEndTime - lintStartTime) / 1000;
        
        // This will fail initially
        expect(lintTime).toBeLessThan(30);
      } catch (error) {
        if (error.message.includes('timeout')) {
          throw new Error(`Lint timed out - expected under 30 seconds, but exceeded 35 seconds`);
        }
        throw error;
      }
    }, 40000);

    it('should have caching enabled in ESLint configuration', () => {
      // RED PHASE: Current eslint.config.mjs lacks caching
      const eslintConfigPath = path.join(projectRoot, 'eslint.config.mjs');
      const eslintConfigContent = readFileSync(eslintConfigPath, 'utf-8');
      
      // Caching configuration should be present but is missing
      expect(eslintConfigContent).toContain('cache: true');
      expect(eslintConfigContent).toContain('cacheLocation');
    });

    it('should have optimized file processing configuration', () => {
      // RED PHASE: File processing not optimized
      const eslintConfigPath = path.join(projectRoot, 'eslint.config.mjs');
      const eslintConfigContent = readFileSync(eslintConfigPath, 'utf-8');
      
      // Processing optimizations should be present
      expect(eslintConfigContent).toContain('processor:');
      expect(eslintConfigContent).toContain('reportUnusedDisableDirectives');
    });

    it('should exclude unnecessary files more efficiently', () => {
      // RED PHASE: Current ignores could be more efficient
      const eslintConfigPath = path.join(projectRoot, 'eslint.config.mjs');
      const eslintConfigContent = readFileSync(eslintConfigPath, 'utf-8');
      
      // More comprehensive and efficient ignores
      expect(eslintConfigContent).toContain('.next/');
      expect(eslintConfigContent).toContain('dist/');
      expect(eslintConfigContent).toContain('coverage/');
      expect(eslintConfigContent).toContain('*.config.{js,ts,mjs}');
    });
  });

  describe('Build Caching Implementation', () => {
    it('should create build cache directory on first build', async () => {
      // RED PHASE: Build caching not implemented
      const cacheDir = path.join(projectRoot, '.next', 'cache');
      
      // Clear any existing cache
      await execAsync('rm -rf .next/cache', { cwd: projectRoot }).catch(() => {});
      
      // Run build
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 60000 
      });
      
      // Cache directory should be created
      expect(existsSync(cacheDir)).toBe(true);
    }, 70000);

    it('should use cached results for subsequent builds', async () => {
      // RED PHASE: Incremental builds not faster than full builds
      
      // First build (should create cache)
      const firstBuildStart = Date.now();
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 60000 
      });
      const firstBuildTime = Date.now() - firstBuildStart;
      
      // Second build (should use cache)
      const secondBuildStart = Date.now();
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 60000 
      });
      const secondBuildTime = Date.now() - secondBuildStart;
      
      // Second build should be significantly faster (at least 50% faster)
      expect(secondBuildTime).toBeLessThan(firstBuildTime * 0.5);
    }, 140000);

    it('should invalidate cache when source files change', async () => {
      // RED PHASE: Cache invalidation not properly implemented
      const testFile = path.join(projectRoot, 'test-cache-invalidation.tmp');
      
      try {
        // Create a temporary file
        await execAsync(`echo "export const test = 'test';" > ${testFile}`);
        
        // Build should detect the new file
        const buildOutput = await execAsync('npm run build', { 
          cwd: projectRoot,
          timeout: 60000 
        });
        
        // Build should indicate cache was invalidated
        expect(buildOutput.stdout || buildOutput.stderr).toContain('cache');
      } finally {
        // Clean up
        await execAsync(`rm -f ${testFile}`).catch(() => {});
      }
    }, 70000);
  });

  describe('Bundle Analysis and Optimization', () => {
    it('should generate bundle analysis report', async () => {
      // RED PHASE: Bundle analysis not implemented
      const bundleReportPath = path.join(projectRoot, '.next', 'analyze');
      
      // Build should generate analysis
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 60000 
      });
      
      // Analysis files should be generated
      expect(existsSync(bundleReportPath)).toBe(true);
    }, 70000);

    it('should optimize bundle size for key chunks', async () => {
      // RED PHASE: Bundle size not optimized
      const buildOutput = await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 60000 
      });
      
      const output = buildOutput.stdout + buildOutput.stderr;
      
      // Main bundle should be under 500KB
      const mainBundleMatch = output.match(/static\/chunks\/main-[a-f0-9]+\.js\s+(\d+(?:\.\d+)?)\s*kB/);
      if (mainBundleMatch) {
        const mainBundleSize = parseFloat(mainBundleMatch[1]);
        expect(mainBundleSize).toBeLessThan(500);
      }
      
      // Total JS should be under 2MB
      const totalJsMatch = output.match(/First Load JS shared by all\s+(\d+(?:\.\d+)?)\s*kB/);
      if (totalJsMatch) {
        const totalJsSize = parseFloat(totalJsMatch[1]);
        expect(totalJsSize).toBeLessThan(2000);
      }
    }, 70000);
  });

  describe('Development vs Production Build Optimization', () => {
    it('should have different optimization strategies for dev vs prod', () => {
      // RED PHASE: No environment-specific optimizations
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Environment-specific configurations should be present
      expect(nextConfigContent).toContain('isDev');
      expect(nextConfigContent).toContain('process.env.NODE_ENV');
    });

    it('should disable expensive optimizations in development', async () => {
      // RED PHASE: Dev builds not optimized for speed
      const devBuildStart = Date.now();
      
      // Start dev server and stop it quickly
      const devProcess = exec('npm run dev', { cwd: projectRoot });
      
      // Wait for dev server to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Kill the process
      devProcess.kill();
      
      const devBuildTime = Date.now() - devBuildStart;
      
      // Dev server should start faster than build
      expect(devBuildTime).toBeLessThan(15000); // Under 15 seconds
    }, 20000);
  });

  describe('Configuration Validation', () => {
    it('should validate Next.js configuration syntax', async () => {
      // RED PHASE: Configuration validation not implemented
      try {
        await execAsync('npx next info', { cwd: projectRoot });
        // Should not throw - configuration should be valid
      } catch (error) {
        throw new Error(`Next.js configuration is invalid: ${error.message}`);
      }
    });

    it('should validate ESLint configuration syntax', async () => {
      // RED PHASE: ESLint config validation not implemented
      try {
        await execAsync('npx eslint --print-config src/app/page.tsx', { cwd: projectRoot });
        // Should not throw - configuration should be valid
      } catch (error) {
        throw new Error(`ESLint configuration is invalid: ${error.message}`);
      }
    });

    it('should have TypeScript compilation configured for optimal performance', async () => {
      // RED PHASE: TypeScript not optimized for build performance
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
      const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);
      
      // Performance optimizations should be enabled
      expect(tsconfig.compilerOptions.incremental).toBe(true);
      expect(tsconfig.compilerOptions.skipLibCheck).toBe(true);
      expect(tsconfig.compilerOptions.skipDefaultLibCheck).toBe(true);
    });
  });
});