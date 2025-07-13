import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { 
  validateDockerfile,
  buildDockerImage,
  testDockerContainer,
  DockerBuildConfig,
  ContainerHealthCheck
} from '@/lib/docker-utils'

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}))

describe('Docker Build Process', () => {
  const mockExecSync = vi.mocked(execSync)
  const mockExistsSync = vi.mocked(existsSync)
  const mockReadFileSync = vi.mocked(readFileSync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('validateDockerfile', () => {
    it('should validate Dockerfile exists', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
        FROM node:18-alpine AS base
        WORKDIR /app
        COPY package*.json ./
        RUN npm ci --only=production
        COPY . .
        RUN npm run build
        EXPOSE 3000
        CMD ["npm", "start"]
      `)

      const result = validateDockerfile()

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing Dockerfile', () => {
      mockExistsSync.mockReturnValue(false)

      const result = validateDockerfile()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Dockerfile not found')
    })

    it('should validate multi-stage build structure', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
        FROM node:18-alpine AS deps
        WORKDIR /app
        COPY package*.json ./
        RUN npm ci --only=production

        FROM node:18-alpine AS builder
        WORKDIR /app
        COPY --from=deps /app/node_modules ./node_modules
        COPY . .
        RUN npm run build

        FROM node:18-alpine AS runner
        WORKDIR /app
        COPY --from=builder /app/.next/standalone ./
        EXPOSE 3000
        CMD ["node", "server.js"]
      `)

      const result = validateDockerfile()

      expect(result.isValid).toBe(true)
      expect(result.stages).toEqual(['deps', 'builder', 'runner'])
      expect(result.optimizations).toContain('Multi-stage build detected')
    })

    it('should detect security issues', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
        FROM node:18
        WORKDIR /app
        COPY . .
        RUN npm install
        RUN npm run build
        EXPOSE 3000
        CMD ["npm", "start"]
      `)

      const result = validateDockerfile()

      expect(result.warnings).toContain('Using non-Alpine base image - consider node:18-alpine for smaller size')
      expect(result.warnings).toContain('Running as root user - consider creating non-root user')
      expect(result.warnings).toContain('Using npm install instead of npm ci')
    })

    it('should validate security best practices', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
        FROM node:18-alpine AS runner
        RUN addgroup --system --gid 1001 nodejs
        RUN adduser --system --uid 1001 nextjs
        WORKDIR /app
        COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
        USER nextjs
        EXPOSE 3000
        CMD ["node", "server.js"]
      `)

      const result = validateDockerfile()

      expect(result.securityChecks).toContain('Non-root user configured')
      expect(result.securityChecks).toContain('Proper file ownership set')
    })

    it('should validate required environment variables', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(`
        FROM node:18-alpine
        ENV NODE_ENV=production
        ENV PORT=3000
        WORKDIR /app
        COPY . .
        EXPOSE $PORT
        CMD ["npm", "start"]
      `)

      const result = validateDockerfile()

      expect(result.environmentVariables).toContain('NODE_ENV')
      expect(result.environmentVariables).toContain('PORT')
    })

    it('should check for .dockerignore file', () => {
      mockExistsSync
        .mockReturnValueOnce(true)  // Dockerfile exists
        .mockReturnValueOnce(true)  // .dockerignore exists
      
      mockReadFileSync
        .mockReturnValueOnce('FROM node:18-alpine\nWORKDIR /app')
        .mockReturnValueOnce('node_modules\n.git\n.env\n*.log')

      const result = validateDockerfile()

      expect(result.dockerignoreExists).toBe(true)
      expect(result.dockerignoreEntries).toEqual(['node_modules', '.git', '.env', '*.log'])
    })
  })

  describe('buildDockerImage', () => {
    it('should build image successfully', async () => {
      mockExecSync.mockReturnValue(Buffer.from('Successfully built abc123\nSuccessfully tagged academic-workflow:latest'))

      const config: DockerBuildConfig = {
        imageName: 'academic-workflow',
        tag: 'latest',
        context: '.',
        dockerfile: 'Dockerfile'
      }

      const result = await buildDockerImage(config)

      expect(result.success).toBe(true)
      expect(result.imageId).toBe('abc123')
      expect(result.imageName).toBe('academic-workflow:latest')
      expect(mockExecSync).toHaveBeenCalledWith(
        'docker build -t academic-workflow:latest -f Dockerfile .',
        { encoding: 'utf8', stdio: 'pipe' }
      )
    })

    it('should handle build failures', async () => {
      const buildError = new Error('Build failed: RUN npm install failed')
      mockExecSync.mockImplementation(() => {
        throw buildError
      })

      const config: DockerBuildConfig = {
        imageName: 'academic-workflow',
        tag: 'test',
        context: '.'
      }

      const result = await buildDockerImage(config)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Build failed: RUN npm install failed')
    })

    it('should build with build arguments', async () => {
      mockExecSync.mockReturnValue(Buffer.from('Successfully built def456'))

      const config: DockerBuildConfig = {
        imageName: 'academic-workflow',
        tag: 'prod',
        context: '.',
        buildArgs: {
          NODE_ENV: 'production',
          API_URL: 'https://api.example.com'
        }
      }

      const result = await buildDockerImage(config)

      expect(mockExecSync).toHaveBeenCalledWith(
        'docker build -t academic-workflow:prod --build-arg NODE_ENV=production --build-arg API_URL=https://api.example.com .',
        expect.any(Object)
      )
    })

    it('should measure build time', async () => {
      mockExecSync.mockImplementation(() => {
        // Simulate 2 second build time
        const start = Date.now()
        while (Date.now() - start < 100) {
          // Busy wait to simulate build time
        }
        return Buffer.from('Successfully built ghi789')
      })

      const config: DockerBuildConfig = {
        imageName: 'academic-workflow',
        tag: 'timed'
      }

      const result = await buildDockerImage(config)

      expect(result.buildTime).toBeGreaterThan(0)
      expect(result.buildTime).toBeLessThan(1000)
    })

    it('should validate image size after build', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('Successfully built jkl012'))
        .mockReturnValueOnce(Buffer.from('academic-workflow:latest   123MB'))

      const config: DockerBuildConfig = {
        imageName: 'academic-workflow',
        tag: 'latest',
        validateSize: true
      }

      const result = await buildDockerImage(config)

      expect(result.imageSize).toBe('123MB')
      expect(mockExecSync).toHaveBeenCalledWith(
        'docker images academic-workflow:latest --format "table {{.Repository}}:{{.Tag}}\\t{{.Size}}"',
        expect.any(Object)
      )
    })

    it('should warn about large image sizes', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('Successfully built mno345'))
        .mockReturnValueOnce(Buffer.from('academic-workflow:latest   1.2GB'))

      const config: DockerBuildConfig = {
        imageName: 'academic-workflow',
        tag: 'latest',
        validateSize: true,
        maxSize: '500MB'
      }

      const result = await buildDockerImage(config)

      expect(result.warnings).toContain('Image size (1.2GB) exceeds recommended maximum (500MB)')
    })
  })

  describe('testDockerContainer', () => {
    it('should test container health successfully', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('abc123def456')) // docker run
        .mockReturnValueOnce(Buffer.from('{"Status":"healthy","Running":true}')) // docker inspect

      const result = await testDockerContainer('academic-workflow:latest')

      expect(result.containerId).toBe('abc123def456')
      expect(result.status).toBe('healthy')
      expect(result.isRunning).toBe(true)
    })

    it('should test HTTP endpoints', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('container123'))
        .mockReturnValueOnce(Buffer.from('{"Status":"healthy","Running":true}'))

      // Mock HTTP request to health endpoint
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' })
      })

      const healthCheck: ContainerHealthCheck = {
        url: 'http://localhost:3000/api/health',
        expectedStatus: 200,
        timeout: 5000
      }

      const result = await testDockerContainer('academic-workflow:latest', { healthCheck })

      expect(result.healthCheck).toEqual({
        url: 'http://localhost:3000/api/health',
        status: 200,
        response: { status: 'healthy' },
        responseTime: expect.any(Number)
      })
    })

    it('should handle container startup failures', async () => {
      const runError = new Error('docker: Error response from daemon: Container failed to start')
      mockExecSync.mockImplementation(() => {
        throw runError
      })

      const result = await testDockerContainer('academic-workflow:latest')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Container failed to start')
    })

    it('should cleanup containers after testing', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('test-container-456'))
        .mockReturnValueOnce(Buffer.from('{"Status":"healthy","Running":true}'))
        .mockReturnValueOnce(Buffer.from('test-container-456')) // docker stop
        .mockReturnValueOnce(Buffer.from('test-container-456')) // docker rm

      const result = await testDockerContainer('academic-workflow:test', { cleanup: true })

      expect(mockExecSync).toHaveBeenCalledWith(
        'docker stop test-container-456',
        expect.any(Object)
      )
      expect(mockExecSync).toHaveBeenCalledWith(
        'docker rm test-container-456',
        expect.any(Object)
      )
    })

    it('should test environment variable injection', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('env-test-789'))
        .mockReturnValueOnce(Buffer.from('{"Status":"healthy","Running":true}'))
        .mockReturnValueOnce(Buffer.from('NODE_ENV=production\nPORT=3000'))

      const result = await testDockerContainer('academic-workflow:latest', {
        environment: {
          NODE_ENV: 'production',
          PORT: '3000'
        },
        validateEnvironment: true
      })

      expect(result.environment).toEqual({
        NODE_ENV: 'production',
        PORT: '3000'
      })
    })

    it('should test container resource usage', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('resource-test-123'))
        .mockReturnValueOnce(Buffer.from('{"Status":"healthy","Running":true}'))
        .mockReturnValueOnce(Buffer.from('CONTAINER ID   CPU %     MEM USAGE / LIMIT\nresource-test-123   2.34%     45.67MiB / 1GiB'))

      const result = await testDockerContainer('academic-workflow:latest', {
        checkResources: true
      })

      expect(result.resources).toEqual({
        cpuUsage: '2.34%',
        memoryUsage: '45.67MiB / 1GiB'
      })
    })

    it('should test port accessibility', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('port-test-456'))
        .mockReturnValueOnce(Buffer.from('{"Status":"healthy","Running":true}'))
        .mockReturnValueOnce(Buffer.from('3000/tcp -> 0.0.0.0:3000'))

      const result = await testDockerContainer('academic-workflow:latest', {
        checkPorts: [3000]
      })

      expect(result.ports).toEqual({
        3000: '0.0.0.0:3000'
      })
    })
  })

  describe('Docker Config Types', () => {
    it('should export proper TypeScript types', () => {
      const buildConfig: DockerBuildConfig = {
        imageName: 'test-image',
        tag: 'v1.0.0',
        context: '.',
        dockerfile: 'Dockerfile',
        buildArgs: {
          NODE_ENV: 'production'
        },
        validateSize: true,
        maxSize: '500MB'
      }

      const healthCheck: ContainerHealthCheck = {
        url: 'http://localhost:3000/health',
        expectedStatus: 200,
        timeout: 5000
      }

      expect(buildConfig).toBeDefined()
      expect(healthCheck).toBeDefined()
    })
  })
})