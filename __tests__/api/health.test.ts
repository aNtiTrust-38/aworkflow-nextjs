import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'

// Mock the PrismaClient and create a reusable mock instance
const mockPrismaInstance = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  user: {
    count: vi.fn()
  }
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaInstance)
}))

// Import handler and testing utilities after mocking
import handler, { setPrismaClientForTesting, resetPrismaClient } from '@/pages/api/health'

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set API keys for healthy status by default
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
    process.env.OPENAI_API_KEY = 'sk-test-key'
    // Reset mock implementations to healthy defaults
    mockPrismaInstance.$connect.mockResolvedValue(undefined)
    mockPrismaInstance.user.count.mockResolvedValue(0)
    // Set the mock prisma instance for the health endpoint
    setPrismaClientForTesting(mockPrismaInstance as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
    resetPrismaClient()
  })

  it('should return 200 OK when all systems are healthy', async () => {
    mockPrismaInstance.$connect.mockResolvedValue(undefined)
    mockPrismaInstance.user.count.mockResolvedValue(5)

    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          version: expect.any(String),
          environment: expect.any(String),
          services: {
            database: {
              status: 'healthy',
              responseTime: expect.any(Number)
            },
            memory: {
              status: 'healthy',
              usage: expect.objectContaining({
                heapUsed: expect.any(Number),
                heapTotal: expect.any(Number),
                rss: expect.any(Number),
                external: expect.any(Number)
              })
            },
            apiProviders: {
              status: 'healthy',
              providers: expect.objectContaining({
                anthropic: expect.any(String),
                openai: expect.any(String)
              })
            }
          },
          metrics: expect.objectContaining({
            requestsPerMinute: expect.any(Number),
            averageResponseTime: expect.any(Number),
            errorRate: expect.any(Number)
          })
        })
      }
    })
  })

  it('should return 503 when database is unhealthy', async () => {
    mockPrismaInstance.$connect.mockRejectedValue(new Error('Database connection failed'))

    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        const data = await response.json()
        
        // First check that database service is correctly marked as unhealthy
        expect(data.services.database.status).toBe('unhealthy')
        expect(data.services.database.error).toBe('Database connection failed')
        
        // Then check overall status - should be unhealthy when database is unhealthy
        expect(data.status).toBe('unhealthy')
        expect(response.status).toBe(503)
      }
    })
  })

  it('should handle memory warning when usage is high', async () => {
    const originalMemoryUsage = process.memoryUsage
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 1.2e9, // 1.2GB (above 1GB warning threshold)
      heapTotal: 2e9,   // 2GB
      rss: 1.6e9,       // 1.6GB (above 1.5GB warning threshold)
      external: 1e8,    // 100MB
      arrayBuffers: 0
    }) as any

    mockPrismaInstance.$connect.mockResolvedValue(undefined)
    mockPrismaInstance.user.count.mockResolvedValue(0)

    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(503) // 503 because memory warning makes overall status degraded
        const data = await response.json()
        
        expect(data.status).toBe('degraded')
        expect(data.services.memory.status).toBe('warning')
        expect(data.services.memory.message).toContain('High memory usage')
      }
    })

    process.memoryUsage = originalMemoryUsage
  })

  it('should check API provider configuration', async () => {
    const originalEnv = process.env
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'sk-ant-test',
      OPENAI_API_KEY: undefined
    }

    mockPrismaInstance.$connect.mockResolvedValue(undefined)
    mockPrismaInstance.user.count.mockResolvedValue(0)

    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200) // Still healthy since at least one API provider is configured
        const data = await response.json()
        
        expect(data.services.apiProviders.providers.anthropic).toBe('configured')
        expect(data.services.apiProviders.providers.openai).toBe('not configured')
      }
    })

    process.env = originalEnv
  })

  it('should only allow GET method', async () => {
    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        })

        expect(response.status).toBe(405)
        const data = await response.json()
        expect(data.error).toBe('Method not allowed')
      }
    })
  })

  it('should include performance metrics', async () => {
    mockPrismaInstance.$connect.mockResolvedValue(undefined)
    mockPrismaInstance.user.count.mockResolvedValue(0)

    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200) // API keys are set in beforeEach, so should be healthy
        const data = await response.json()
        
        expect(data.metrics).toMatchObject({
          requestsPerMinute: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number)
        })
      }
    })
  })

  it('should handle partial service failures gracefully', async () => {
    const startTime = Date.now()
    mockPrismaInstance.$connect.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 50))
    )
    // Simulate a scenario where database check passes but takes time
    mockPrismaInstance.user.count.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(5), 60))
    )

    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200) // API keys are set in beforeEach, so should be healthy
        const data = await response.json()
        
        expect(data.status).toBe('healthy')
        expect(data.services.database.responseTime).toBeGreaterThan(50) // Should be at least the mock delay
      }
    })
  })
})