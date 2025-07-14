import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { 
  validateWorkflowFile,
  validatePipelineSteps,
  testPipelineJobs,
  PipelineConfig,
  WorkflowValidation,
  JobResult
} from '@/lib/ci-cd-utils'

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn()
}))

describe('CI/CD Pipeline Configuration', () => {
  const mockReadFileSync = vi.mocked(readFileSync)
  const mockExistsSync = vi.mocked(existsSync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('validateWorkflowFile', () => {
    it('should validate GitHub Actions workflow file', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Build Docker image
        run: docker build -t academic-workflow:latest .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: echo "Deploying to production"
      `)

      const result = validateWorkflowFile('.github/workflows/ci-cd.yml')

      expect(result.isValid).toBe(true)
      expect(result.jobs).toEqual(['test', 'build', 'deploy'])
      expect(result.triggers).toEqual(['push', 'pull_request'])
      expect(result.branches).toEqual(['main', 'develop'])
    })

    it('should detect missing workflow file', () => {
      mockExistsSync.mockReturnValue(false)

      const result = validateWorkflowFile('.github/workflows/ci-cd.yml')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Workflow file not found')
    })

    it('should validate required jobs are present', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
name: Minimal Pipeline
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "test"
      `)

      const result = validateWorkflowFile('.github/workflows/minimal.yml')

      expect(result.warnings).toContain('Missing recommended job: build')
      expect(result.warnings).toContain('Missing recommended job: security-scan')
    })

    it('should validate job dependencies', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
name: Pipeline with Dependencies
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
  
  deploy:
    needs: [test, build]
    runs-on: ubuntu-latest
    steps:
      - run: echo "deploy"
      `)

      const result = validateWorkflowFile('.github/workflows/deps.yml')

      expect(result.jobDependencies).toEqual({
        test: [],
        build: ['test'],
        deploy: ['test', 'build']
      })
    })

    it('should validate security best practices', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
name: Secure Pipeline
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - run: npm audit
      - name: Security scan
        uses: securecodewarrior/github-action-add-sarif@v1
      `)

      const result = validateWorkflowFile('.github/workflows/secure.yml')

      expect(result.securityFeatures).toContain('Explicit permissions defined')
      expect(result.securityFeatures).toContain('Security scanning included')
      expect(result.securityFeatures).toContain('Dependency audit included')
    })

    it('should detect insecure practices', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
name: Insecure Pipeline
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo "\${{ secrets.API_KEY }}" > api-key.txt
      - run: curl -X POST https://api.example.com/deploy
      `)

      const result = validateWorkflowFile('.github/workflows/insecure.yml')

      expect(result.securityWarnings).toContain('Secret potentially exposed in logs')
      expect(result.securityWarnings).toContain('No explicit permissions defined')
    })

    it('should validate environment-specific deployments', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
name: Multi-Environment Pipeline
on:
  push:
    branches: [main, develop]
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to staging"
  
  deploy-production:
    if: github.ref == 'refs/heads/main'
    environment: production
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to production"
      `)

      const result = validateWorkflowFile('.github/workflows/multi-env.yml')

      expect(result.environments).toEqual(['staging', 'production'])
      expect(result.conditionalDeployments).toBe(true)
    })
  })

  describe('validatePipelineSteps', () => {
    it('should validate essential pipeline steps', () => {
      const steps = [
        { name: 'checkout', action: 'actions/checkout@v4' },
        { name: 'setup-node', action: 'actions/setup-node@v4' },
        { name: 'install-deps', run: 'npm ci' },
        { name: 'lint', run: 'npm run lint' },
        { name: 'test', run: 'npm run test' },
        { name: 'build', run: 'npm run build' },
        { name: 'security-scan', run: 'npm audit' }
      ]

      const result = validatePipelineSteps(steps)

      expect(result.isValid).toBe(true)
      expect(result.essentialSteps).toEqual({
        checkout: true,
        setupNode: true,
        installDependencies: true,
        lint: true,
        test: true,
        build: true,
        securityScan: true
      })
    })

    it('should detect missing essential steps', () => {
      const steps = [
        { name: 'checkout', action: 'actions/checkout@v4' },
        { name: 'build', run: 'npm run build' }
      ]

      const result = validatePipelineSteps(steps)

      expect(result.isValid).toBe(false)
      expect(result.missingSteps).toContain('install-dependencies')
      expect(result.missingSteps).toContain('test')
      expect(result.missingSteps).toContain('lint')
    })

    it('should validate action versions', () => {
      const steps = [
        { name: 'checkout', action: 'actions/checkout@v3' },
        { name: 'setup-node', action: 'actions/setup-node@v2' }
      ]

      const result = validatePipelineSteps(steps)

      expect(result.warnings).toContain('actions/checkout@v3 - consider upgrading to v4')
      expect(result.warnings).toContain('actions/setup-node@v2 - consider upgrading to v4')
    })

    it('should validate caching configuration', () => {
      const steps = [
        { name: 'setup-node', action: 'actions/setup-node@v4', with: { cache: 'npm' } },
        { name: 'cache-deps', action: 'actions/cache@v3', with: { path: 'node_modules', key: 'deps-\${{ hashFiles("package-lock.json") }}' } }
      ]

      const result = validatePipelineSteps(steps)

      expect(result.optimizations).toContain('NPM cache configured')
      expect(result.optimizations).toContain('Custom dependency cache configured')
    })

    it('should validate parallel job structure', () => {
      const jobs = {
        lint: { steps: [{ run: 'npm run lint' }] },
        test: { steps: [{ run: 'npm run test' }] },
        'type-check': { steps: [{ run: 'npm run type-check' }] },
        build: { 
          needs: ['lint', 'test', 'type-check'],
          steps: [{ run: 'npm run build' }] 
        }
      }

      const result = validatePipelineSteps([], { jobs })

      expect(result.parallelJobs).toEqual(['lint', 'test', 'type-check'])
      expect(result.jobDependencies?.build).toEqual(['lint', 'test', 'type-check'])
    })
  })

  describe('testPipelineJobs', () => {
    it('should test job execution successfully', async () => {
      const mockJobRunner = vi.fn()
        .mockResolvedValueOnce({ success: true, duration: 45 })
        .mockResolvedValueOnce({ success: true, duration: 120 })
        .mockResolvedValueOnce({ success: true, duration: 30 })

      const jobs: PipelineConfig = {
        test: {
          steps: ['npm ci', 'npm run test'],
          timeout: 300
        },
        build: {
          steps: ['npm ci', 'npm run build'],
          timeout: 600,
          needs: ['test']
        },
        lint: {
          steps: ['npm ci', 'npm run lint'],
          timeout: 120
        }
      }

      const result = await testPipelineJobs(jobs, { runner: mockJobRunner })

      expect(result.success).toBe(true)
      expect(result.jobs).toEqual({
        test: { success: true, duration: 45 },
        build: { success: true, duration: 120 },
        lint: { success: true, duration: 30 }
      })
      expect(result.totalDuration).toBe(195) // test + build run sequentially, lint in parallel
    })

    it('should handle job failures', async () => {
      const mockJobRunner = vi.fn()
        .mockResolvedValueOnce({ success: true, duration: 45 })
        .mockRejectedValueOnce(new Error('Build failed: TypeScript errors'))
        .mockResolvedValueOnce({ success: true, duration: 30 })

      const jobs: PipelineConfig = {
        test: { steps: ['npm run test'] },
        build: { steps: ['npm run build'], needs: ['test'] },
        lint: { steps: ['npm run lint'] }
      }

      const result = await testPipelineJobs(jobs, { runner: mockJobRunner })

      expect(result.success).toBe(false)
      expect(result.jobs.test.success).toBe(true)
      expect(result.jobs.build.success).toBe(false)
      expect(result.jobs.build.error).toBe('Build failed: TypeScript errors')
      expect(result.jobs.lint.success).toBe(true)
    })

    it('should respect job dependencies', async () => {
      const executionOrder: string[] = []
      const mockJobRunner = vi.fn().mockImplementation((jobName: string) => {
        executionOrder.push(jobName)
        return Promise.resolve({ success: true, duration: 10 })
      })

      const jobs: PipelineConfig = {
        test: { steps: ['npm run test'] },
        'type-check': { steps: ['npm run type-check'] },
        build: { 
          steps: ['npm run build'], 
          needs: ['test', 'type-check'] 
        },
        deploy: { 
          steps: ['deploy.sh'], 
          needs: ['build'] 
        }
      }

      await testPipelineJobs(jobs, { runner: mockJobRunner })

      expect(executionOrder).toEqual(['test', 'type-check', 'build', 'deploy'])
    })

    it('should handle job timeouts', async () => {
      const mockJobRunner = vi.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve({ success: true, duration: 200 }), 150)
        ))

      const jobs: PipelineConfig = {
        'slow-job': {
          steps: ['sleep 10'],
          timeout: 100
        }
      }

      const result = await testPipelineJobs(jobs, { runner: mockJobRunner })

      expect(result.jobs['slow-job'].success).toBe(false)
      expect(result.jobs['slow-job'].error).toContain('timeout')
    })

    it('should validate environment variables in jobs', async () => {
      const mockJobRunner = vi.fn().mockResolvedValue({ success: true, duration: 10 })

      const jobs: PipelineConfig = {
        deploy: {
          steps: ['deploy.sh'],
          environment: {
            NODE_ENV: 'production',
            API_URL: '\${{ secrets.PROD_API_URL }}'
          },
          requiredSecrets: ['PROD_API_URL', 'DEPLOY_KEY']
        }
      }

      const result = await testPipelineJobs(jobs, { 
        runner: mockJobRunner,
        validateSecrets: true 
      })

      expect(result.validationResults?.deploy.requiredSecrets).toEqual(['PROD_API_URL', 'DEPLOY_KEY'])
      expect(result.validationResults?.deploy.environmentVariables).toEqual({
        NODE_ENV: 'production',
        API_URL: '\${{ secrets.PROD_API_URL }}'
      })
    })

    it('should test matrix builds', async () => {
      const mockJobRunner = vi.fn().mockResolvedValue({ success: true, duration: 30 })

      const jobs: PipelineConfig = {
        test: {
          steps: ['npm run test'],
          matrix: {
            'node-version': ['16', '18', '20'],
            os: ['ubuntu-latest', 'windows-latest']
          }
        }
      }

      const result = await testPipelineJobs(jobs, { runner: mockJobRunner })

      expect(result.matrixResults?.test).toHaveLength(6) // 3 node versions × 2 OS
      expect(mockJobRunner).toHaveBeenCalledTimes(6)
    })

    it('should measure pipeline performance metrics', async () => {
      const mockJobRunner = vi.fn()
        .mockResolvedValueOnce({ success: true, duration: 30 })
        .mockResolvedValueOnce({ success: true, duration: 120 })

      const jobs: PipelineConfig = {
        lint: { steps: ['npm run lint'] },
        build: { steps: ['npm run build'], needs: ['lint'] }
      }

      const result = await testPipelineJobs(jobs, { 
        runner: mockJobRunner,
        collectMetrics: true 
      })

      expect(result.metrics).toEqual({
        totalJobs: 2,
        successfulJobs: 2,
        failedJobs: 0,
        totalDuration: 150,
        averageJobDuration: 75,
        parallelEfficiency: expect.any(Number)
      })
    })
  })

  describe('Pipeline Config Types', () => {
    it('should export proper TypeScript types', () => {
      const config: PipelineConfig = {
        test: {
          steps: ['npm run test'],
          timeout: 300,
          environment: {
            NODE_ENV: 'test'
          }
        }
      }

      const validation: WorkflowValidation = {
        isValid: true,
        jobs: ['test'],
        triggers: ['push'],
        branches: ['main'],
        errors: [],
        warnings: []
      }

      const jobResult: JobResult = {
        success: true,
        duration: 42,
        output: 'All tests passed'
      }

      expect(config).toBeDefined()
      expect(validation).toBeDefined()
      expect(jobResult).toBeDefined()
    })
  })
})