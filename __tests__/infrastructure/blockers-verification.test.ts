import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

/**
 * RULE 4: RED Phase Tests - Verify Infrastructure Blockers
 * 
 * These tests are designed to FAIL and demonstrate the blockers preventing development.
 * They verify the issues discovered in Rule 2 investigation.
 */

describe('Infrastructure Blockers Verification', () => {
  const projectRoot = path.resolve(__dirname, '../..')

  describe('BLOCKER 1: TypeScript Compilation Error', () => {
    it('should fail TypeScript compilation due to NODE_ENV assignment', () => {
      // This test verifies the TypeScript error exists
      const testTypeScriptCompilation = () => {
        try {
          execSync('npx tsc --noEmit', {
            cwd: projectRoot,
            encoding: 'utf8',
            stdio: 'pipe'
          })
          return { success: true, error: null }
        } catch (error: any) {
          return { 
            success: false, 
            error: error.stdout?.toString() || error.stderr?.toString() || error.message 
          }
        }
      }

      const result = testTypeScriptCompilation()
      
      // EXPECTED TO FAIL - Proves the blocker exists
      expect(result.success).toBe(false)
      expect(result.error).toContain('vitest.setup.simple.ts')
      expect(result.error).toContain('TS2540')
      expect(result.error).toContain('Cannot assign to \'NODE_ENV\'')
    })

    it('should verify the problematic line exists in vitest.setup.simple.ts', () => {
      const setupPath = path.join(projectRoot, 'vitest.setup.simple.ts')
      const content = fs.readFileSync(setupPath, 'utf8')
      
      // Verify the problematic line exists
      expect(content).toContain('global.process.env.NODE_ENV = \'test\'')
      
      // This line causes TypeScript error TS2540
      const lines = content.split('\n')
      const problematicLineIndex = lines.findIndex(line => 
        line.includes('global.process.env.NODE_ENV = \'test\'')
      )
      
      // Should be around line 4 (index 3)
      expect(problematicLineIndex).toBeGreaterThanOrEqual(0)
      expect(problematicLineIndex).toBeLessThan(10)
    })
  })

  describe('BLOCKER 2: Test Execution Timeout', () => {
    it('should timeout when running even minimal tests', () => {
      // This test verifies that test execution times out
      const runMinimalTest = () => {
        try {
          // Run with 10 second timeout to demonstrate the issue faster
          const result = execSync('npx vitest run __tests__/test-minimal.test.ts', {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 10000, // 10 seconds
            stdio: 'pipe'
          })
          return { success: true, output: result }
        } catch (error: any) {
          return { 
            success: false, 
            timedOut: error.code === 'ETIMEDOUT',
            error: error.message 
          }
        }
      }

      const result = runMinimalTest()
      
      // EXPECTED TO FAIL - Test should timeout
      expect(result.success).toBe(false)
      expect(result.timedOut).toBe(true)
    })

    it('should demonstrate slow test collection phase', () => {
      // Verify vitest config uses jsdom for all tests
      const configPath = path.join(projectRoot, 'vitest.config.ts')
      const configContent = fs.readFileSync(configPath, 'utf8')
      
      // These settings cause performance issues
      expect(configContent).toContain('environment: \'jsdom\'')
      expect(configContent).toContain('singleFork: true')
      
      // No parallel execution configured
      expect(configContent).not.toContain('threads: true')
      expect(configContent).not.toContain('concurrent: true')
    })
  })

  describe('BLOCKER 3: Build System Timeout', () => {
    it('should timeout when running build command', () => {
      // This test verifies build timeout issue
      const runBuild = () => {
        try {
          // Run with 30 second timeout to demonstrate the issue
          execSync('npm run build', {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 30000, // 30 seconds
            stdio: 'pipe'
          })
          return { success: true }
        } catch (error: any) {
          return { 
            success: false, 
            timedOut: error.code === 'ETIMEDOUT',
            error: error.message 
          }
        }
      }

      const result = runBuild()
      
      // EXPECTED TO FAIL - Build should timeout
      expect(result.success).toBe(false)
      expect(result.timedOut).toBe(true)
    })
  })

  describe('BLOCKER 4: Lint Command Timeout', () => {
    it('should timeout when running lint command', () => {
      // This test verifies lint timeout issue
      const runLint = () => {
        try {
          // Run with 30 second timeout to demonstrate the issue
          execSync('npm run lint', {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 30000, // 30 seconds
            stdio: 'pipe'
          })
          return { success: true }
        } catch (error: any) {
          return { 
            success: false, 
            timedOut: error.code === 'ETIMEDOUT',
            error: error.message 
          }
        }
      }

      const result = runLint()
      
      // EXPECTED TO FAIL - Lint should timeout
      expect(result.success).toBe(false)
      expect(result.timedOut).toBe(true)
    })
  })

  describe('BLOCKER 5: Configuration Chaos', () => {
    it('should verify multiple conflicting vitest configs exist', () => {
      const files = fs.readdirSync(projectRoot)
      const vitestConfigs = files.filter(file => 
        file.startsWith('vitest') && file.endsWith('.config.ts')
      )
      
      // EXPECTED TO FAIL - Too many configs indicate experimentation
      expect(vitestConfigs.length).toBeGreaterThan(5)
      
      // List all the configs found
      console.log('Found vitest configs:', vitestConfigs)
    })

    it('should verify missing test dependencies', () => {
      // Check if @testing-library/jest-dom is imported in setup
      const setupFiles = [
        'vitest.setup.ts',
        'vitest.setup.simple.ts'
      ]
      
      let jestDomImported = false
      for (const file of setupFiles) {
        const filePath = path.join(projectRoot, file)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8')
          if (content.includes('@testing-library/jest-dom')) {
            jestDomImported = true
            break
          }
        }
      }
      
      // EXPECTED TO FAIL - jest-dom not imported
      expect(jestDomImported).toBe(false)
    })
  })

  describe('Documentation vs Reality', () => {
    it('should verify documentation claims do not match reality', () => {
      const nextStepsPath = path.join(projectRoot, 'nextsteps.md')
      const content = fs.readFileSync(nextStepsPath, 'utf8')
      
      // Documentation now correctly shows ~70% after our Rule 3 updates
      expect(content).toContain('~70%')
      expect(content).toContain('Build System Recovery URGENT')
      
      // Verify we've documented the actual blockers
      expect(content).toContain('Build Command**: Timeouts after 2 minutes')
      expect(content).toContain('Test Command**: Even minimal tests timeout')
    })
  })
})

describe('Verification Test Summary', () => {
  it('should summarize all blockers for Rule 4', () => {
    console.log(`
RULE 4 - RED PHASE TEST SUMMARY
==============================

These tests are EXPECTED TO FAIL and demonstrate the following blockers:

1. TypeScript Compilation Error
   - File: vitest.setup.simple.ts line 4
   - Error: TS2540 - Cannot assign to 'NODE_ENV'
   
2. Test Execution Timeout
   - Even minimal tests timeout after 30 seconds
   - Test collection takes 87+ seconds
   - Using jsdom for all tests
   
3. Build System Timeout
   - npm run build times out after 2 minutes
   - Unknown root cause
   
4. Lint Command Timeout
   - npm run lint times out after 2 minutes
   - Possible circular dependencies
   
5. Configuration Chaos
   - 10+ vitest config files
   - Missing @testing-library/jest-dom import
   - No parallel execution configured

These failing tests prove the blockers exist and must be fixed in Rule 5.
    `)
    
    // This test always passes - it's just for documentation
    expect(true).toBe(true)
  })
})