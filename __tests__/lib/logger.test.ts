import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger, LogLevel, LogEntry, createLogger } from '@/lib/logger'

describe('Structured Logging System', () => {
  let consoleSpies: {
    log: any
    error: any
    warn: any
    info: any
    debug: any
  }

  beforeEach(() => {
    consoleSpies = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Logger', () => {
    it('should create logger with default configuration', () => {
      const logger = createLogger()
      
      expect(logger).toBeDefined()
      expect(logger.info).toBeDefined()
      expect(logger.error).toBeDefined()
      expect(logger.warn).toBeDefined()
      expect(logger.debug).toBeDefined()
    })

    it('should log info level messages', () => {
      const logger = createLogger({ name: 'test-logger' })
      
      logger.info('Test info message', { userId: '123' })
      
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify({
          timestamp: expect.any(String),
          level: 'info',
          logger: 'test-logger',
          message: 'Test info message',
          userId: '123'
        }))
      )
    })

    it('should log error level messages with stack traces', () => {
      const logger = createLogger({ name: 'test-logger' })
      const error = new Error('Test error')
      
      logger.error('Error occurred', { error, requestId: 'req-123' })
      
      const logCall = consoleSpies.error.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      
      expect(logData).toMatchObject({
        level: 'error',
        logger: 'test-logger',
        message: 'Error occurred',
        requestId: 'req-123',
        error: {
          message: 'Test error',
          name: 'Error',
          stack: expect.any(String)
        }
      })
    })

    it('should respect log level configuration', () => {
      const logger = createLogger({ 
        name: 'test-logger',
        level: LogLevel.WARN 
      })
      
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')
      
      expect(consoleSpies.debug).not.toHaveBeenCalled()
      expect(consoleSpies.info).not.toHaveBeenCalled()
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1)
      expect(consoleSpies.error).toHaveBeenCalledTimes(1)
    })

    it('should include context in all log messages', () => {
      const logger = createLogger({ 
        name: 'test-logger',
        context: { service: 'api', version: '1.0.0' }
      })
      
      logger.info('Test message')
      
      const logCall = consoleSpies.info.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      
      expect(logData).toMatchObject({
        service: 'api',
        version: '1.0.0',
        message: 'Test message'
      })
    })

    it('should create child loggers with inherited context', () => {
      const parentLogger = createLogger({ 
        name: 'parent',
        context: { service: 'api' }
      })
      
      const childLogger = parentLogger.child({ 
        name: 'child',
        context: { module: 'auth' }
      })
      
      childLogger.info('Child log')
      
      const logCall = consoleSpies.info.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      
      expect(logData).toMatchObject({
        logger: 'parent:child',
        service: 'api',
        module: 'auth',
        message: 'Child log'
      })
    })

    it('should handle circular references in log data', () => {
      const logger = createLogger({ name: 'test-logger' })
      
      const circular: any = { name: 'test' }
      circular.self = circular
      
      expect(() => {
        logger.info('Circular reference test', { data: circular })
      }).not.toThrow()
      
      expect(consoleSpies.info).toHaveBeenCalled()
    })

    it('should support custom serializers', () => {
      const logger = createLogger({ 
        name: 'test-logger',
        serializers: {
          user: (user: any) => ({ id: user.id, email: user.email })
        }
      })
      
      logger.info('User action', { 
        user: { 
          id: '123', 
          email: 'test@example.com',
          password: 'secret' 
        }
      })
      
      const logCall = consoleSpies.info.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      
      expect(logData.user).toEqual({
        id: '123',
        email: 'test@example.com'
      })
      expect(logData.user.password).toBeUndefined()
    })

    it('should format log output based on environment', () => {
      const originalEnv = process.env.NODE_ENV
      
      // Test production format (JSON)
      process.env.NODE_ENV = 'production'
      const prodLogger = createLogger({ name: 'prod-logger' })
      prodLogger.info('Production log')
      
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/)
      )
      
      // Test development format (pretty)
      process.env.NODE_ENV = 'development'
      const devLogger = createLogger({ name: 'dev-logger' })
      devLogger.info('Development log')
      
      const lastCall = consoleSpies.info.mock.calls[consoleSpies.info.mock.calls.length - 1][0]
      expect(lastCall).toMatch(/\[.*\] INFO \(dev-logger\): Development log/)
      
      process.env.NODE_ENV = originalEnv
    })

    it('should support request logging middleware', () => {
      const logger = createLogger({ name: 'http' })
      
      const req = {
        method: 'GET',
        url: '/api/health',
        headers: { 'user-agent': 'test' }
      }
      
      const res = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' }
      }
      
      logger.info('Request completed', {
        req,
        res,
        responseTime: 42
      })
      
      const logCall = consoleSpies.info.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      
      expect(logData).toMatchObject({
        message: 'Request completed',
        req: {
          method: 'GET',
          url: '/api/health'
        },
        res: {
          statusCode: 200
        },
        responseTime: 42
      })
    })

    it('should handle async context', async () => {
      const logger = createLogger({ name: 'async-logger' })
      
      await logger.withContext({ requestId: 'req-123' }, async () => {
        logger.info('Inside async context')
        
        await new Promise(resolve => setTimeout(resolve, 10))
        
        logger.info('Still in context')
      })
      
      logger.info('Outside context')
      
      const calls = consoleSpies.info.mock.calls.map(call => JSON.parse(call[0]))
      
      expect(calls[0]).toMatchObject({ requestId: 'req-123' })
      expect(calls[1]).toMatchObject({ requestId: 'req-123' })
      expect(calls[2]).not.toHaveProperty('requestId')
    })

    it('should integrate with performance monitoring', () => {
      const logger = createLogger({ 
        name: 'perf-logger',
        enableMetrics: true 
      })
      
      const timer = logger.startTimer()
      
      // Simulate some work
      const sum = Array(1000).fill(0).reduce((a, b) => a + Math.random(), 0)
      
      timer.done({ message: 'Operation completed', operation: 'calculation' })
      
      const logCall = consoleSpies.info.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      
      expect(logData).toMatchObject({
        message: 'Operation completed',
        operation: 'calculation',
        duration: expect.any(Number)
      })
      expect(logData.duration).toBeGreaterThan(0)
    })

    it('should support log filtering in production', () => {
      const originalEnv = process.env
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        LOG_FILTER: 'auth,database'
      }
      
      const authLogger = createLogger({ name: 'auth' })
      const dbLogger = createLogger({ name: 'database' })
      const apiLogger = createLogger({ name: 'api' })
      
      authLogger.info('Auth log')
      dbLogger.info('DB log')
      apiLogger.info('API log')
      
      expect(consoleSpies.info).toHaveBeenCalledTimes(2)
      
      process.env = originalEnv
    })
  })

  describe('Log Entry Types', () => {
    it('should export proper TypeScript types', () => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        logger: 'test',
        message: 'Test message',
        context: {
          userId: '123',
          requestId: 'req-456'
        }
      }
      
      expect(entry).toBeDefined()
    })
  })
})