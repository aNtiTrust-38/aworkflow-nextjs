/**
 * RED PHASE TEST: Configuration Validation
 * 
 * This test suite validates that all test configurations are properly
 * structured and optimized. NO IMPLEMENTATION EXISTS YET.
 * 
 * Based on instructions.md Phase 2: Configuration cleanup and optimization
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('Test Configuration Validation', () => {
  describe('Configuration File Structure', () => {
    it('should have required configuration files present', async () => {
      // RED: Test expects all required config files exist
      const requiredConfigs = [
        'vitest.config.ts',
        'vitest.node.config.ts',
        'vitest.jsdom.config.ts',
        'vitest.setup.simple.ts',
        'vitest.setup.jsdom.ts',
        'tsconfig.json',
        'next.config.ts',
        'eslint.config.mjs'
      ];

      for (const configFile of requiredConfigs) {
        const configPath = path.join(process.cwd(), configFile);
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should not have experimental or duplicate configuration files', async () => {
      // RED: Test expects cleanup of experimental configs
      const experimentalConfigs = [
        'vitest.jsdom-minimal.config.ts',
        'vitest.jsdom-threads.config.ts',
        'vitest.jsdom-with-setup.config.ts',
        'vitest.minimal.config.ts',
        'vitest.test-minimal-setup.config.ts',
        'vitest.test-rtl-config.config.ts',
        'vitest.test-testing-library.config.ts'
      ];

      for (const experimentalConfig of experimentalConfigs) {
        const configPath = path.join(process.cwd(), experimentalConfig);
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        
        // These experimental configs should be archived or removed
        expect(exists).toBe(false);
      }
    });

    it('should have archived experimental configurations properly', async () => {
      // RED: Test expects experimental configs archived, not deleted
      const archiveDir = path.join(process.cwd(), 'config-archive');
      const archiveExists = await fs.access(archiveDir).then(() => true).catch(() => false);
      
      if (archiveExists) {
        const archivedFiles = await fs.readdir(archiveDir);
        expect(archivedFiles.length).toBeGreaterThan(0);
        
        // Should contain timestamp or explanation
        expect(archivedFiles.some(file => file.includes('experimental'))).toBe(true);
      }
    });
  });

  describe('Node Environment Configuration', () => {
    it('should have properly configured vitest.node.config.ts', async () => {
      // RED: Test expects Node config has optimal settings
      const configContent = await fs.readFile('vitest.node.config.ts', 'utf-8');
      
      // Should specify Node environment
      expect(configContent).toContain("environment: 'node'");
      
      // Should have test name for identification
      expect(configContent).toContain("name: 'node'");
      
      // Should include correct test patterns
      expect(configContent).toContain('__tests__/api/**/*.test.ts');
      expect(configContent).toContain('__tests__/lib/**/*.test.ts');
      expect(configContent).toContain('__tests__/infrastructure/**/*.test.ts');
      
      // Should exclude component tests
      expect(configContent).toContain('exclude:');
      expect(configContent).toContain('**/*.test.tsx');
      
      // Should use threads for performance
      expect(configContent).toContain("pool: 'threads'");
      
      // Should enable concurrent execution
      expect(configContent).toContain('concurrent: true');
      
      // Should have optimized timeouts
      expect(configContent).toContain('testTimeout: 10000');
      expect(configContent).toContain('hookTimeout: 10000');
      
      // Should have proper alias configuration
      expect(configContent).toContain('@/lib');
      expect(configContent).toContain('@/components');
    });

    it('should validate Node config thread settings', async () => {
      // RED: Test expects proper thread configuration
      const configContent = await fs.readFile('vitest.node.config.ts', 'utf-8');
      
      // Should not use single thread
      expect(configContent).toContain('singleThread: false');
      
      // Should have isolation enabled
      expect(configContent).toContain('isolate: true');
      
      // Should have proper pool options
      expect(configContent).toContain('poolOptions:');
      expect(configContent).toContain('threads:');
    });

    it('should have coverage configuration for Node tests', async () => {
      // RED: Test expects coverage settings
      const configContent = await fs.readFile('vitest.node.config.ts', 'utf-8');
      
      // Should have coverage configuration
      expect(configContent).toContain('coverage:');
      expect(configContent).toContain("provider: 'v8'");
      
      // Should exclude appropriate files
      expect(configContent).toContain('exclude:');
      expect(configContent).toContain('node_modules/**');
      expect(configContent).toContain('**/*.d.ts');
      expect(configContent).toContain('**/__tests__/**');
    });
  });

  describe('JSdom Environment Configuration', () => {
    it('should have properly configured vitest.jsdom.config.ts', async () => {
      // RED: Test expects JSdom config has optimal settings
      const configContent = await fs.readFile('vitest.jsdom.config.ts', 'utf-8');
      
      // Should specify jsdom environment
      expect(configContent).toContain("environment: 'jsdom'");
      
      // Should have test name for identification
      expect(configContent).toContain("name: 'jsdom'");
      
      // Should include component test patterns
      expect(configContent).toContain('**/*.test.tsx');
      expect(configContent).toContain('components/**/*.test.ts');
      
      // Should exclude API tests
      expect(configContent).toContain('__tests__/api/**/*');
      expect(configContent).toContain('__tests__/lib/**/*');
      
      // Should use forks for stability
      expect(configContent).toContain("pool: 'forks'");
      
      // Should have appropriate timeouts
      expect(configContent).toContain('testTimeout: 20000');
      
      // Should enable CSS processing
      expect(configContent).toContain('css: true');
      
      // Should have JSX configuration
      expect(configContent).toContain('jsxInject');
      expect(configContent).toContain('React');
    });

    it('should validate JSdom config fork settings', async () => {
      // RED: Test expects proper fork configuration for DOM tests
      const configContent = await fs.readFile('vitest.jsdom.config.ts', 'utf-8');
      
      // Should not use single fork for component tests
      expect(configContent).toContain('singleFork: false');
      
      // Should have isolation enabled
      expect(configContent).toContain('isolate: true');
      
      // Should have proper pool options
      expect(configContent).toContain('poolOptions:');
      expect(configContent).toContain('forks:');
    });

    it('should have proper setup file reference', async () => {
      // RED: Test expects correct setup file configuration
      const configContent = await fs.readFile('vitest.jsdom.config.ts', 'utf-8');
      
      // Should reference jsdom-specific setup
      expect(configContent).toContain('setupFiles:');
      expect(configContent).toContain('vitest.setup.jsdom.ts');
      
      // Should not reference simple setup
      expect(configContent).not.toContain('vitest.setup.simple.ts');
    });
  });

  describe('Setup File Configuration', () => {
    it('should have optimized vitest.setup.simple.ts for Node tests', async () => {
      // RED: Test expects simple setup is lightweight
      const setupContent = await fs.readFile('vitest.setup.simple.ts', 'utf-8');
      
      // Should have minimal environment setup
      expect(setupContent).toContain('NODE_ENV');
      expect(setupContent).toContain('test');
      
      // Should have essential Prisma mocks
      expect(setupContent).toContain('mock.*@/lib/prisma');
      expect(setupContent).toContain('user:');
      expect(setupContent).toContain('folder:');
      expect(setupContent).toContain('file:');
      
      // Should mock AI providers
      expect(setupContent).toContain('mock.*@/lib/ai-providers/router');
      
      // Should not include DOM-specific mocks
      expect(setupContent).not.toContain('matchMedia');
      expect(setupContent).not.toContain('ResizeObserver');
      expect(setupContent).not.toContain('localStorage');
      
      // Should not mock global fetch for API tests
      expect(setupContent).toContain('// Don\'t mock global fetch');
    });

    it('should have comprehensive vitest.setup.jsdom.ts for component tests', async () => {
      // RED: Test expects jsdom setup has all DOM utilities
      const setupContent = await fs.readFile('vitest.setup.jsdom.ts', 'utf-8');
      
      // Should import testing library matchers
      expect(setupContent).toContain('@testing-library/jest-dom');
      
      // Should have DOM API mocks
      expect(setupContent).toContain('matchMedia');
      expect(setupContent).toContain('ResizeObserver');
      expect(setupContent).toContain('IntersectionObserver');
      expect(setupContent).toContain('localStorage');
      expect(setupContent).toContain('sessionStorage');
      
      // Should mock Next.js router
      expect(setupContent).toContain('next/router');
      expect(setupContent).toContain('next/navigation');
      
      // Should configure testing library
      expect(setupContent).toContain('configure');
      expect(setupContent).toContain('testIdAttribute');
    });

    it('should validate setup files do not conflict', async () => {
      // RED: Test expects setup files are environment-specific
      const simpleSetup = await fs.readFile('vitest.setup.simple.ts', 'utf-8');
      const jsdomSetup = await fs.readFile('vitest.setup.jsdom.ts', 'utf-8');
      
      // Simple setup should not have DOM-specific code
      expect(simpleSetup).not.toContain('jsdom');
      expect(simpleSetup).not.toContain('DOM');
      expect(simpleSetup).not.toContain('window');
      
      // JSdom setup should have DOM-specific code
      expect(jsdomSetup).toContain('window');
      expect(jsdomSetup).toContain('global');
      
      // Both should have different focus areas
      expect(simpleSetup.includes('API') || simpleSetup.includes('utility')).toBe(true);
      expect(jsdomSetup.includes('component') || jsdomSetup.includes('DOM')).toBe(true);
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have optimized tsconfig.json for performance', async () => {
      // RED: Test expects TypeScript config is performance-optimized
      const tsconfigContent = await fs.readFile('tsconfig.json', 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);
      
      // Should have incremental compilation
      expect(tsconfig.compilerOptions.incremental).toBe(true);
      expect(tsconfig.compilerOptions).toHaveProperty('tsBuildInfoFile');
      
      // Should skip lib checking for performance
      expect(tsconfig.compilerOptions.skipLibCheck).toBe(true);
      
      // Should have proper excludes
      expect(tsconfig.exclude).toContain('node_modules');
      expect(tsconfig.exclude).toContain('dist');
      expect(tsconfig.exclude).toContain('.next');
      
      // Should have path mapping
      expect(tsconfig.compilerOptions.paths).toHaveProperty('@/*');
    });

    it('should validate TypeScript configuration compatibility', async () => {
      // RED: Test expects TS config works with test environments
      const tsconfigContent = await fs.readFile('tsconfig.json', 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);
      
      // Should support both Node and DOM types
      expect(tsconfig.compilerOptions.lib).toContain('ES2023');
      expect(tsconfig.compilerOptions.lib).toContain('DOM');
      
      // Should have proper module resolution
      expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
      
      // Should support JSX
      expect(tsconfig.compilerOptions.jsx).toBe('preserve');
    });
  });

  describe('Package.json Script Configuration', () => {
    it('should have optimized test scripts', async () => {
      // RED: Test expects package.json has proper test scripts
      const packageContent = await fs.readFile('package.json', 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      // Should have environment-specific scripts
      expect(packageJson.scripts).toHaveProperty('test:fast');
      expect(packageJson.scripts).toHaveProperty('test:components');
      expect(packageJson.scripts).toHaveProperty('test:all');
      
      // Scripts should reference correct configs
      expect(packageJson.scripts['test:fast']).toContain('vitest.node.config.ts');
      expect(packageJson.scripts['test:components']).toContain('vitest.jsdom.config.ts');
      
      // Should have development and CI scripts
      expect(packageJson.scripts).toHaveProperty('test:watch');
      expect(packageJson.scripts).toHaveProperty('test:ui');
    });

    it('should validate script commands are properly formed', async () => {
      // RED: Test expects scripts use correct vitest commands
      const packageContent = await fs.readFile('package.json', 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      // Fast tests should run specific config
      expect(packageJson.scripts['test:fast']).toMatch(/vitest\s+run.*vitest\.node\.config\.ts/);
      
      // Component tests should run specific config
      expect(packageJson.scripts['test:components']).toMatch(/vitest\s+run.*vitest\.jsdom\.config\.ts/);
      
      // All tests should combine both
      expect(packageJson.scripts['test:all']).toContain('test:fast');
      expect(packageJson.scripts['test:all']).toContain('test:components');
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent path aliases across configurations', async () => {
      // RED: Test expects all configs use same path aliases
      const configs = [
        'vitest.node.config.ts',
        'vitest.jsdom.config.ts',
        'tsconfig.json'
      ];
      
      const aliases = new Set();
      
      for (const configFile of configs) {
        const content = await fs.readFile(configFile, 'utf-8');
        
        if (configFile.endsWith('.json')) {
          const json = JSON.parse(content);
          if (json.compilerOptions?.paths) {
            Object.keys(json.compilerOptions.paths).forEach(alias => aliases.add(alias));
          }
        } else {
          // Extract aliases from TypeScript config files
          if (content.includes('@/')) {
            aliases.add('@/*');
          }
          if (content.includes('@/components')) {
            aliases.add('@/components');
          }
          if (content.includes('@/lib')) {
            aliases.add('@/lib');
          }
        }
      }
      
      // Should have consistent alias definitions
      expect(aliases.has('@/*')).toBe(true);
      expect(aliases.has('@/components')).toBe(true);
      expect(aliases.has('@/lib')).toBe(true);
    });

    it('should have consistent timeout configurations', async () => {
      // RED: Test expects reasonable and consistent timeouts
      const nodeConfig = await fs.readFile('vitest.node.config.ts', 'utf-8');
      const jsdomConfig = await fs.readFile('vitest.jsdom.config.ts', 'utf-8');
      
      // Node tests should have shorter timeouts
      expect(nodeConfig).toContain('testTimeout: 10000'); // 10 seconds
      
      // Component tests should have longer timeouts
      expect(jsdomConfig).toContain('testTimeout: 20000'); // 20 seconds
      
      // Both should have hook timeouts
      expect(nodeConfig).toContain('hookTimeout: 10000');
      expect(jsdomConfig).toContain('hookTimeout: 10000');
    });

    it('should validate configuration file syntax', async () => {
      // RED: Test expects all config files are syntactically valid
      const configFiles = [
        'vitest.node.config.ts',
        'vitest.jsdom.config.ts',
        'tsconfig.json'
      ];
      
      for (const configFile of configFiles) {
        const content = await fs.readFile(configFile, 'utf-8');
        
        if (configFile.endsWith('.json')) {
          // Should be valid JSON
          expect(() => JSON.parse(content)).not.toThrow();
        } else {
          // Should be valid TypeScript/JavaScript
          expect(content).toContain('export default');
          expect(content).toContain('defineConfig');
          expect(content).not.toContain('SyntaxError');
        }
      }
    });
  });

  describe('Configuration Documentation', () => {
    it('should have documented configuration choices', async () => {
      // RED: Test expects config files are well-documented
      const configFiles = [
        'vitest.node.config.ts',
        'vitest.jsdom.config.ts'
      ];
      
      for (const configFile of configFiles) {
        const content = await fs.readFile(configFile, 'utf-8');
        
        // Should have header comments explaining purpose
        expect(content).toMatch(/\/\*\*|\/\//);
        expect(content).toMatch(/configuration|config/i);
        
        // Should explain environment choice
        expect(content).toMatch(/node|jsdom/i);
        
        // Should explain performance choices
        expect(content).toMatch(/performance|optimization|speed/i);
      }
    });

    it('should have configuration README or documentation', async () => {
      // RED: Test expects configuration documentation exists
      const docFiles = [
        'CONFIG.md',
        'docs/configuration.md',
        'README.md'
      ];
      
      let hasConfigDocs = false;
      
      for (const docFile of docFiles) {
        const docPath = path.join(process.cwd(), docFile);
        const exists = await fs.access(docPath).then(() => true).catch(() => false);
        
        if (exists) {
          const content = await fs.readFile(docPath, 'utf-8');
          if (content.includes('vitest') || content.includes('test configuration')) {
            hasConfigDocs = true;
            break;
          }
        }
      }
      
      expect(hasConfigDocs).toBe(true);
    });
  });
});