import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { 
  createDatabaseConfig, 
  validateDatabaseConnection,
  migrateDatabaseSchema,
  DatabaseConfig,
  ConnectionStatus 
} from '@/lib/database-config'

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    user: {
      count: vi.fn()
    }
  }))
}))

describe('Production Database Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv
  let mockPrisma: any

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
    mockPrisma = new PrismaClient()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('createDatabaseConfig', () => {
    it('should create PostgreSQL configuration', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'
      
      const config = createDatabaseConfig()
      
      expect(config).toEqual({
        url: 'postgresql://user:pass@localhost:5432/testdb',
        provider: 'postgresql',
        connectionPooling: {
          maxConnections: 20,
          connectionTimeout: 30000,
          idleTimeout: 300000
        },
        ssl: {
          rejectUnauthorized: true
        },
        logging: ['error', 'warn'],
        errorFormat: 'pretty'
      })
    })

    it('should create MySQL configuration', () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/testdb'
      
      const config = createDatabaseConfig()
      
      expect(config.provider).toBe('mysql')
      expect(config.url).toBe('mysql://user:pass@localhost:3306/testdb')
    })

    it('should create SQLite configuration with warnings', () => {
      process.env.DATABASE_URL = 'file:./test.db'
      
      const config = createDatabaseConfig()
      
      expect(config).toEqual({
        url: 'file:./test.db',
        provider: 'sqlite',
        connectionPooling: {
          maxConnections: 1,
          connectionTimeout: 5000,
          idleTimeout: 60000
        },
        ssl: false,
        logging: ['error', 'warn'],
        errorFormat: 'pretty',
        warnings: [
          'SQLite is not recommended for production environments',
          'Consider migrating to PostgreSQL or MySQL for better performance and scalability'
        ]
      })
    })

    it('should configure connection pooling for production', () => {
      process.env.NODE_ENV = 'production'
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/proddb'
      process.env.DATABASE_MAX_CONNECTIONS = '50'
      process.env.DATABASE_CONNECTION_TIMEOUT = '60000'
      
      const config = createDatabaseConfig()
      
      expect(config.connectionPooling).toEqual({
        maxConnections: 50,
        connectionTimeout: 60000,
        idleTimeout: 300000
      })
    })

    it('should enable SSL for production databases', () => {
      process.env.NODE_ENV = 'production'
      process.env.DATABASE_URL = 'postgresql://user:pass@prod-host:5432/proddb'
      
      const config = createDatabaseConfig()
      
      expect(config.ssl).toEqual({
        rejectUnauthorized: true,
        ca: undefined
      })
    })

    it('should configure custom SSL certificates', () => {
      process.env.NODE_ENV = 'production'
      process.env.DATABASE_URL = 'postgresql://user:pass@prod-host:5432/proddb'
      process.env.DATABASE_SSL_CA = '/path/to/ca-cert.pem'
      
      const config = createDatabaseConfig()
      
      expect(config.ssl).toEqual({
        rejectUnauthorized: true,
        ca: '/path/to/ca-cert.pem'
      })
    })

    it('should disable logging in production by default', () => {
      process.env.NODE_ENV = 'production'
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/proddb'
      
      const config = createDatabaseConfig()
      
      expect(config.logging).toEqual(['error'])
    })

    it('should enable query logging when explicitly configured', () => {
      process.env.NODE_ENV = 'production'
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/proddb'
      process.env.DATABASE_LOG_QUERIES = 'true'
      
      const config = createDatabaseConfig()
      
      expect(config.logging).toEqual(['error', 'warn', 'info', 'query'])
    })
  })

  describe('validateDatabaseConnection', () => {
    it('should validate successful connection', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.user.count.mockResolvedValue(42)
      
      const result = await validateDatabaseConnection(mockPrisma)
      
      expect(result.status).toBe('healthy')
      expect(result.responseTime).toBeGreaterThan(0)
      expect(result.details).toEqual({
        connected: true,
        queryTest: true,
        recordCount: 42
      })
    })

    it('should handle connection failures', async () => {
      const connectionError = new Error('Connection refused')
      mockPrisma.$connect.mockRejectedValue(connectionError)
      
      const result = await validateDatabaseConnection(mockPrisma)
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toBe('Connection refused')
      expect(result.details.connected).toBe(false)
    })

    it('should handle query failures after successful connection', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.user.count.mockRejectedValue(new Error('Query failed'))
      
      const result = await validateDatabaseConnection(mockPrisma)
      
      expect(result.status).toBe('degraded')
      expect(result.details).toEqual({
        connected: true,
        queryTest: false,
        recordCount: null
      })
    })

    it('should measure response time accurately', async () => {
      mockPrisma.$connect.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      mockPrisma.user.count.mockResolvedValue(0)
      
      const result = await validateDatabaseConnection(mockPrisma)
      
      expect(result.responseTime).toBeGreaterThanOrEqual(100)
      expect(result.responseTime).toBeLessThan(200)
    })

    it('should timeout long-running connections', async () => {
      mockPrisma.$connect.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 35000))
      )
      
      const result = await validateDatabaseConnection(mockPrisma, { timeout: 5000 })
      
      expect(result.status).toBe('unhealthy')
      expect(result.error).toContain('timeout')
    })

    it('should validate database schema version', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.$queryRaw.mockResolvedValue([{ version: '20231201_001' }])
      mockPrisma.user.count.mockResolvedValue(0)
      
      const result = await validateDatabaseConnection(mockPrisma)
      
      expect(result.details.schemaVersion).toBe('20231201_001')
    })

    it('should detect when migrations are needed', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.$queryRaw.mockRejectedValue(new Error('relation "User" does not exist'))
      mockPrisma.user.count.mockResolvedValue(0)
      
      const result = await validateDatabaseConnection(mockPrisma)
      
      expect(result.status).toBe('degraded')
      expect(result.details.migrationNeeded).toBe(true)
    })
  })

  describe('migrateDatabaseSchema', () => {
    it('should run migrations successfully', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: 'Migration complete', stderr: '' })
      vi.doMock('child_process', () => ({
        exec: mockExec
      }))
      
      const result = await migrateDatabaseSchema()
      
      expect(result.success).toBe(true)
      expect(result.output).toContain('Migration complete')
      expect(mockExec).toHaveBeenCalledWith(
        'npx prisma migrate deploy',
        expect.any(Object)
      )
    })

    it('should handle migration failures', async () => {
      const mockExec = vi.fn().mockRejectedValue(new Error('Migration failed'))
      vi.doMock('child_process', () => ({
        exec: mockExec
      }))
      
      const result = await migrateDatabaseSchema()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Migration failed')
    })

    it('should generate Prisma client after migration', async () => {
      const mockExec = vi.fn()
        .mockResolvedValueOnce({ stdout: 'Migration complete', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'Client generated', stderr: '' })
      
      vi.doMock('child_process', () => ({
        exec: mockExec
      }))
      
      const result = await migrateDatabaseSchema({ generateClient: true })
      
      expect(mockExec).toHaveBeenCalledWith(
        'npx prisma migrate deploy',
        expect.any(Object)
      )
      expect(mockExec).toHaveBeenCalledWith(
        'npx prisma generate',
        expect.any(Object)
      )
      expect(result.clientGenerated).toBe(true)
    })

    it('should validate environment before migration', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.DATABASE_URL
      
      const result = await migrateDatabaseSchema()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('DATABASE_URL is required')
    })

    it('should backup database before migration in production', async () => {
      process.env.NODE_ENV = 'production'
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/proddb'
      
      const mockExec = vi.fn()
        .mockResolvedValueOnce({ stdout: 'Backup complete', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'Migration complete', stderr: '' })
      
      vi.doMock('child_process', () => ({
        exec: mockExec
      }))
      
      const result = await migrateDatabaseSchema({ createBackup: true })
      
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('pg_dump'),
        expect.any(Object)
      )
      expect(result.backupCreated).toBe(true)
    })

    it('should rollback on migration failure', async () => {
      const mockExec = vi.fn()
        .mockResolvedValueOnce({ stdout: 'Backup complete', stderr: '' })
        .mockRejectedValueOnce(new Error('Migration failed'))
        .mockResolvedValueOnce({ stdout: 'Rollback complete', stderr: '' })
      
      vi.doMock('child_process', () => ({
        exec: mockExec
      }))
      
      const result = await migrateDatabaseSchema({ 
        createBackup: true,
        rollbackOnFailure: true 
      })
      
      expect(result.success).toBe(false)
      expect(result.rolledBack).toBe(true)
    })
  })

  describe('Database Config Types', () => {
    it('should export proper TypeScript types', () => {
      const config: DatabaseConfig = {
        url: 'postgresql://localhost',
        provider: 'postgresql',
        connectionPooling: {
          maxConnections: 10,
          connectionTimeout: 5000,
          idleTimeout: 60000
        },
        ssl: false,
        logging: ['error'],
        errorFormat: 'pretty'
      }
      
      const status: ConnectionStatus = {
        status: 'healthy',
        responseTime: 42,
        details: {
          connected: true,
          queryTest: true,
          recordCount: 100
        }
      }
      
      expect(config).toBeDefined()
      expect(status).toBeDefined()
    })
  })
})