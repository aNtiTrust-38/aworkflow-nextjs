/**
 * RED PHASE TESTS: Webpack Performance Optimization
 * 
 * These tests define expected behavior for webpack optimization
 * as outlined in instructions.md Phase 2.
 * 
 * All tests should FAIL initially as webpack optimization is not implemented.
 * 
 * Target: Implement production-grade webpack optimizations
 * Target: Bundle size optimization and code splitting
 * Target: Build performance improvements
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

describe('Webpack Performance Optimization', () => {
  const projectRoot = process.cwd();
  const nextConfigPath = path.join(projectRoot, 'next.config.ts');
  const buildDir = path.join(projectRoot, '.next');

  beforeAll(async () => {
    // Ensure we have a clean build for testing
    await execAsync('rm -rf .next', { cwd: projectRoot }).catch(() => {});
  });

  afterAll(async () => {
    // Clean up after tests
    await execAsync('rm -rf .next/analyze', { cwd: projectRoot }).catch(() => {});
  });

  describe('Webpack Configuration Optimization', () => {
    it('should implement production-grade webpack optimizations', () => {
      // RED PHASE: Advanced webpack optimizations not implemented
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Production optimizations should be present but are missing
      expect(nextConfigContent).toContain('optimization: {');
      expect(nextConfigContent).toContain('minimize: true');
      expect(nextConfigContent).toContain('TerserPlugin');
      expect(nextConfigContent).toContain('CompressionPlugin');
    });

    it('should configure advanced code splitting strategies', () => {
      // RED PHASE: Code splitting not optimized
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Code splitting configuration should be present
      expect(nextConfigContent).toContain('splitChunks: {');
      expect(nextConfigContent).toContain('chunks: "all"');
      expect(nextConfigContent).toContain('cacheGroups:');
      expect(nextConfigContent).toContain('vendor:');
    });

    it('should implement module resolution optimization', () => {
      // RED PHASE: Module resolution not optimized
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Module resolution optimizations should be present
      expect(nextConfigContent).toContain('resolve: {');
      expect(nextConfigContent).toContain('extensions: [');
      expect(nextConfigContent).toContain('alias: {');
      expect(nextConfigContent).toContain('modules: [');
    });

    it('should configure tree shaking optimization', () => {
      // RED PHASE: Tree shaking not optimized
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Tree shaking configuration should be present
      expect(nextConfigContent).toContain('usedExports: true');
      expect(nextConfigContent).toContain('sideEffects: false');
    });
  });

  describe('Bundle Analysis and Optimization', () => {
    it('should generate bundle analysis report', async () => {
      // RED PHASE: Bundle analysis not implemented
      
      // Build with analysis
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 180000 
      });
      
      const analyzeDir = path.join(buildDir, 'analyze');
      
      // Analysis directory should be created
      expect(existsSync(analyzeDir)).toBe(true);
      
      // Analysis files should be present
      const files = await execAsync('ls .next/analyze', { cwd: projectRoot });
      expect(files.stdout).toContain('client.html') || expect(files.stdout).toContain('server.html');
    }, 190000);

    it('should optimize main bundle size', async () => {
      // RED PHASE: Bundle size not optimized
      
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 180000 
      });
      
      // Parse build output for bundle sizes
      const buildOutput = await execAsync('npm run build 2>&1 | grep -E "(kB|MB)"', { cwd: projectRoot });
      const output = buildOutput.stdout;
      
      // Main bundle should be under 500KB
      const mainBundleMatch = output.match(/main-[a-f0-9]+\.js\s+(\d+(?:\.\d+)?)\s*kB/);
      if (mainBundleMatch) {
        const mainBundleSize = parseFloat(mainBundleMatch[1]);
        expect(mainBundleSize).toBeLessThan(500);
        console.log(`Main bundle size: ${mainBundleSize}kB`);
      }
      
      // Total First Load JS should be under 2MB
      const totalJsMatch = output.match(/First Load JS shared by all\s+(\d+(?:\.\d+)?)\s*kB/);
      if (totalJsMatch) {
        const totalJsSize = parseFloat(totalJsMatch[1]);
        expect(totalJsSize).toBeLessThan(2000);
        console.log(`Total First Load JS: ${totalJsSize}kB`);
      }
    }, 190000);

    it('should implement efficient chunk splitting', async () => {
      // RED PHASE: Chunk splitting not optimized
      
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 180000 
      });
      
      // Check for proper chunk creation
      const chunks = await execAsync('find .next/static/chunks -name "*.js" | wc -l', { cwd: projectRoot });
      const chunkCount = parseInt(chunks.stdout.trim());
      
      // Should have multiple chunks for code splitting
      expect(chunkCount).toBeGreaterThan(5);
      
      // Check for vendor chunk
      const vendorChunk = await execAsync('find .next/static/chunks -name "*vendor*.js"', { cwd: projectRoot });
      expect(vendorChunk.stdout.trim()).not.toBe('');
    }, 190000);

    it('should optimize CSS bundle size', async () => {
      // RED PHASE: CSS optimization not implemented
      
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 180000 
      });
      
      // Check CSS files
      const cssFiles = await execAsync('find .next/static/css -name "*.css" -exec du -b {} +', { cwd: projectRoot });
      
      if (cssFiles.stdout.trim()) {
        const cssSizes = cssFiles.stdout.split('\n').map(line => {
          const size = parseInt(line.split('\t')[0]);
          return size;
        }).filter(size => !isNaN(size));
        
        const totalCssSize = cssSizes.reduce((sum, size) => sum + size, 0);
        
        // Total CSS should be under 200KB
        expect(totalCssSize).toBeLessThan(200 * 1024);
        console.log(`Total CSS size: ${(totalCssSize / 1024).toFixed(2)}kB`);
      }
    }, 190000);
  });

  describe('Performance Plugin Configuration', () => {
    it('should implement compression plugins', () => {
      // RED PHASE: Compression plugins not configured
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Compression configuration should be present
      expect(nextConfigContent).toContain('CompressionPlugin');
      expect(nextConfigContent).toContain('algorithm: "gzip"');
      expect(nextConfigContent).toContain('threshold:');
    });

    it('should configure minification optimization', () => {
      // RED PHASE: Minification not optimized
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Minification settings should be optimized
      expect(nextConfigContent).toContain('TerserPlugin');
      expect(nextConfigContent).toContain('parallel: true');
      expect(nextConfigContent).toContain('terserOptions:');
    });

    it('should implement module concatenation', () => {
      // RED PHASE: Module concatenation not configured
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Module concatenation should be enabled
      expect(nextConfigContent).toContain('concatenateModules: true');
    });
  });

  describe('Development vs Production Optimization', () => {
    it('should have different webpack configurations for dev vs prod', () => {
      // RED PHASE: Environment-specific optimizations not implemented
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Environment-specific configurations should be present
      expect(nextConfigContent).toContain('isDev') || expect(nextConfigContent).toContain('isServer');
      expect(nextConfigContent).toContain('process.env.NODE_ENV');
    });

    it('should disable expensive optimizations in development', () => {
      // RED PHASE: Development optimizations not configured
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Development-specific settings should be present
      expect(nextConfigContent).toContain('development') || expect(nextConfigContent).toContain('isDev');
      expect(nextConfigContent).toContain('minimize:') || expect(nextConfigContent).toContain('optimization');
    });

    it('should implement fast refresh optimization', () => {
      // RED PHASE: Fast refresh not optimized
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Fast refresh configuration should be optimized
      expect(nextConfigContent).toContain('reactRefresh') || expect(nextConfigContent).toContain('fastRefresh');
    });
  });

  describe('External Dependencies Optimization', () => {
    it('should exclude server-only packages from client bundle', () => {
      // RED PHASE: External dependencies not optimized
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Server-only packages should be externalized
      expect(nextConfigContent).toContain('externals:') || expect(nextConfigContent).toContain('serverExternalPackages');
      expect(nextConfigContent).toContain('prisma');
      expect(nextConfigContent).toContain('@anthropic-ai/sdk') || expect(nextConfigContent).toContain('anthropic');
      expect(nextConfigContent).toContain('openai');
    });

    it('should optimize heavy dependencies for client', async () => {
      // RED PHASE: Client dependencies not optimized
      
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 180000 
      });
      
      // Check that heavy server dependencies are not in client bundles
      const clientChunks = await execAsync('find .next/static/chunks -name "*.js" -exec grep -l "prisma\\|@anthropic-ai\\|openai" {} \\;', { cwd: projectRoot });
      
      // These server packages should not appear in client chunks
      expect(clientChunks.stdout.trim()).toBe('');
    }, 190000);

    it('should implement dynamic imports for heavy components', () => {
      // RED PHASE: Dynamic imports not implemented
      
      // Check source files for dynamic imports
      const srcFiles = [
        'src/app/WorkflowUI.tsx',
        'src/app/page.tsx'
      ];
      
      let foundDynamicImports = false;
      
      for (const file of srcFiles) {
        const filePath = path.join(projectRoot, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');
          if (content.includes('dynamic(') || content.includes('import(')) {
            foundDynamicImports = true;
            break;
          }
        }
      }
      
      // Dynamic imports should be implemented for heavy components
      expect(foundDynamicImports).toBe(true);
    });
  });

  describe('Build Performance Optimization', () => {
    it('should implement parallel processing', () => {
      // RED PHASE: Parallel processing not configured
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Parallel processing should be configured
      expect(nextConfigContent).toContain('parallel:') || expect(nextConfigContent).toContain('workers:');
    });

    it('should optimize asset processing', () => {
      // RED PHASE: Asset processing not optimized
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Asset optimization should be configured
      expect(nextConfigContent).toContain('images:');
      expect(nextConfigContent).toContain('unoptimized:');
    });

    it('should implement incremental builds', () => {
      // RED PHASE: Incremental builds not configured
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Incremental build configuration should be present
      expect(nextConfigContent).toContain('incremental:') || expect(nextConfigContent).toContain('cache:');
    });
  });

  describe('Memory and Resource Optimization', () => {
    it('should implement memory-efficient configuration', () => {
      // RED PHASE: Memory optimization not implemented
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // Memory optimization settings should be present
      expect(nextConfigContent).toContain('maxMemory') || expect(nextConfigContent).toContain('memoryLimit');
    });

    it('should optimize for CI/CD environments', () => {
      // RED PHASE: CI/CD optimization not implemented
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      // CI-specific optimizations should be present
      expect(nextConfigContent).toContain('process.env.CI') || expect(nextConfigContent).toContain('isCI');
    });

    it('should implement resource cleanup', async () => {
      // RED PHASE: Resource cleanup not implemented
      
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 180000 
      });
      
      // Build should clean up temporary files
      const tempFiles = await execAsync('find .next -name "*.tmp" -o -name "*.temp" | wc -l', { cwd: projectRoot });
      const tempFileCount = parseInt(tempFiles.stdout.trim());
      
      // Should not have leftover temporary files
      expect(tempFileCount).toBe(0);
    }, 190000);
  });

  describe('Webpack Bundle Validation', () => {
    it('should validate webpack configuration syntax', async () => {
      // RED PHASE: Configuration validation not implemented
      
      try {
        // Test webpack config validation
        await execAsync('npx next info', { 
          cwd: projectRoot,
          timeout: 30000 
        });
        
        // Should not throw - configuration should be valid
      } catch (error) {
        throw new Error(`Webpack configuration is invalid: ${error.message}`);
      }
    }, 35000);

    it('should generate source maps for debugging', async () => {
      // RED PHASE: Source map optimization not implemented
      
      await execAsync('npm run build', { 
        cwd: projectRoot,
        timeout: 180000 
      });
      
      // Source maps should be generated
      const sourceMaps = await execAsync('find .next -name "*.map" | wc -l', { cwd: projectRoot });
      const sourceMapCount = parseInt(sourceMaps.stdout.trim());
      
      // Should have source maps for debugging
      expect(sourceMapCount).toBeGreaterThan(0);
    }, 190000);

    it('should implement proper module resolution', async () => {
      // RED PHASE: Module resolution not validated
      
      const buildOutput = await execAsync('npm run build 2>&1', { 
        cwd: projectRoot,
        timeout: 180000 
      });
      
      const output = buildOutput.stdout + buildOutput.stderr;
      
      // Should not have module resolution errors
      expect(output).not.toContain('Module not found');
      expect(output).not.toContain('Cannot resolve');
    }, 190000);
  });
});