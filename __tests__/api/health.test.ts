import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as appHandler from '@/pages/api/health'
import { PrismaClient } from '@prisma/client'

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      count: vi.fn()
    }
  }))
}))

describe('/api/health', () => {
  let prismaClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    prismaClient = new PrismaClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 OK when all systems are healthy', async () => {
    prismaClient.$connect.mockResolvedValue(undefined)
    prismaClient.user.count.mockResolvedValue(5)

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data).toEqual({
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
          }
        })
      }
    })
  })

  it('should return 503 when database is unhealthy', async () => {
    prismaClient.$connect.mockRejectedValue(new Error('Database connection failed'))

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(503)
        const data = await response.json()
        
        expect(data.status).toBe('unhealthy')
        expect(data.services.database.status).toBe('unhealthy')
        expect(data.services.database.error).toBe('Database connection failed')
      }
    })
  })

  it('should handle memory warning when usage is high', async () => {
    const originalMemoryUsage = process.memoryUsage
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 1.8e9, // 1.8GB
      heapTotal: 2e9,   // 2GB
      rss: 2.5e9,       // 2.5GB
      external: 1e8,    // 100MB
      arrayBuffers: 0
    })

    prismaClient.$connect.mockResolvedValue(undefined)

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        
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

    prismaClient.$connect.mockResolvedValue(undefined)

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data.services.apiProviders.providers.anthropic).toBe('configured')
        expect(data.services.apiProviders.providers.openai).toBe('not configured')
      }
    })

    process.env = originalEnv
  })

  it('should only allow GET method', async () => {
    await testApiHandler({
      appHandler,
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
    prismaClient.$connect.mockResolvedValue(undefined)

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data.metrics).toEqual({
          requestsPerMinute: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number)
        })
      }
    })
  })

  it('should handle partial service failures gracefully', async () => {
    prismaClient.$connect.mockResolvedValue(undefined)
    // Simulate a scenario where database check passes but takes long
    prismaClient.user.count.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(5), 100))
    )

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET'
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data.status).toBe('healthy')
        expect(data.services.database.responseTime).toBeGreaterThan(100)
      }
    })
  })
})