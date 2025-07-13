import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

// Create a function to get prisma instance for easier testing
function getPrismaClient() {
  return new PrismaClient()
}

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: {
      status: 'healthy' | 'unhealthy' | 'degraded'
      responseTime?: number
      error?: string
    }
    memory: {
      status: 'healthy' | 'warning' | 'critical'
      usage: NodeJS.MemoryUsage
      message?: string
    }
    apiProviders: {
      status: 'healthy' | 'degraded'
      providers: {
        anthropic: 'configured' | 'not configured'
        openai: 'configured' | 'not configured'
      }
    }
  }
  metrics?: {
    requestsPerMinute: number
    averageResponseTime: number
    errorRate: number
  }
}

// Simple in-memory metrics store for demonstration
let metrics = {
  requests: 0,
  totalResponseTime: 0,
  errors: 0,
  lastMinuteRequests: [] as number[]
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  
  try {
    // Update metrics
    const now = Date.now()
    metrics.requests++
    metrics.lastMinuteRequests = metrics.lastMinuteRequests.filter(
      timestamp => now - timestamp < 60000
    )
    metrics.lastMinuteRequests.push(now)

    // Check database health
    const dbHealth = await checkDatabaseHealth()
    
    // Check memory health
    const memoryHealth = checkMemoryHealth()
    
    // Check API providers
    const apiProvidersHealth = checkApiProvidersHealth()
    
    // Calculate overall status
    const overallStatus = calculateOverallStatus(dbHealth, memoryHealth, apiProvidersHealth)
    
    // Calculate metrics
    const responseTime = Date.now() - startTime
    metrics.totalResponseTime += responseTime
    
    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealth,
        memory: memoryHealth,
        apiProviders: apiProvidersHealth
      },
      metrics: {
        requestsPerMinute: metrics.lastMinuteRequests.length,
        averageResponseTime: metrics.requests > 0 ? metrics.totalResponseTime / metrics.requests : 0,
        errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0
      }
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503
    return res.status(statusCode).json(healthResponse)
    
  } catch (error) {
    metrics.errors++
    console.error('Health check error:', error)
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: 'unhealthy', error: 'Health check failed' },
        memory: { status: 'critical', usage: process.memoryUsage() },
        apiProviders: { status: 'degraded', providers: { anthropic: 'not configured', openai: 'not configured' } }
      }
    } as HealthCheckResponse)
  }
}

async function checkDatabaseHealth() {
  const startTime = Date.now()
  const prisma = getPrismaClient()
  
  try {
    await prisma.$connect()
    const count = await prisma.user.count()
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy' as const,
      responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: (error as Error).message,
      responseTime: Date.now() - startTime
    }
  }
}

function checkMemoryHealth() {
  const usage = process.memoryUsage()
  const heapUsedGB = usage.heapUsed / 1024 / 1024 / 1024
  const heapTotalGB = usage.heapTotal / 1024 / 1024 / 1024
  const rssGB = usage.rss / 1024 / 1024 / 1024
  
  let status: 'healthy' | 'warning' | 'critical' = 'healthy'
  let message: string | undefined
  
  // Memory thresholds
  if (heapUsedGB > 1.5 || rssGB > 2.0) {
    status = 'critical'
    message = `Critical memory usage: Heap ${heapUsedGB.toFixed(2)}GB, RSS ${rssGB.toFixed(2)}GB`
  } else if (heapUsedGB > 1.0 || rssGB > 1.5) {
    status = 'warning'
    message = `High memory usage: Heap ${heapUsedGB.toFixed(2)}GB, RSS ${rssGB.toFixed(2)}GB`
  }
  
  return {
    status,
    usage,
    message
  }
}

function checkApiProvidersHealth() {
  const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY
  const openaiConfigured = !!process.env.OPENAI_API_KEY
  
  const hasAtLeastOne = anthropicConfigured || openaiConfigured
  
  return {
    status: hasAtLeastOne ? 'healthy' as const : 'degraded' as const,
    providers: {
      anthropic: anthropicConfigured ? 'configured' as const : 'not configured' as const,
      openai: openaiConfigured ? 'configured' as const : 'not configured' as const
    }
  }
}

function calculateOverallStatus(
  dbHealth: { status: string },
  memoryHealth: { status: string },
  apiHealth: { status: string }
): 'healthy' | 'unhealthy' | 'degraded' {
  if (dbHealth.status === 'unhealthy' || memoryHealth.status === 'critical') {
    return 'unhealthy'
  }
  
  if (dbHealth.status === 'degraded' || memoryHealth.status === 'warning' || apiHealth.status === 'degraded') {
    return 'degraded'
  }
  
  return 'healthy'
}

export default handler