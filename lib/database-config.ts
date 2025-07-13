import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface DatabaseConfig {
  url: string
  provider: 'postgresql' | 'mysql' | 'sqlite'
  connectionPooling: {
    maxConnections: number
    connectionTimeout: number
    idleTimeout: number
  }
  ssl: boolean | {
    rejectUnauthorized: boolean
    ca?: string
  }
  logging: string[]
  errorFormat: string
  warnings?: string[]
}

export interface ConnectionStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  details: {
    connected: boolean
    queryTest: boolean
    recordCount: number | null
    schemaVersion?: string
    migrationNeeded?: boolean
  }
  error?: string
}

export interface MigrationResult {
  success: boolean
  output?: string
  error?: string
  backupCreated?: boolean
  clientGenerated?: boolean
  rolledBack?: boolean
}

export function createDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Determine database provider
  let provider: DatabaseConfig['provider'] = 'sqlite'
  if (databaseUrl.startsWith('postgresql:') || databaseUrl.startsWith('postgres:')) {
    provider = 'postgresql'
  } else if (databaseUrl.startsWith('mysql:')) {
    provider = 'mysql'
  }

  // Connection pooling configuration
  const maxConnections = parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10)
  const connectionTimeout = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000', 10)
  const idleTimeout = parseInt(process.env.DATABASE_IDLE_TIMEOUT || '300000', 10)

  // Adjust pooling for SQLite
  const connectionPooling = provider === 'sqlite' ? {
    maxConnections: 1,
    connectionTimeout: 5000,
    idleTimeout: 60000
  } : {
    maxConnections,
    connectionTimeout,
    idleTimeout
  }

  // SSL configuration
  let ssl: DatabaseConfig['ssl'] = false
  if (provider !== 'sqlite' && isProduction) {
    ssl = {
      rejectUnauthorized: true,
      ...(process.env.DATABASE_SSL_CA && { ca: process.env.DATABASE_SSL_CA })
    }
  }

  // Logging configuration
  let logging: string[] = ['error', 'warn']
  if (isProduction && process.env.DATABASE_LOG_QUERIES === 'true') {
    logging = ['error', 'warn', 'info', 'query']
  } else if (isProduction) {
    logging = ['error']
  }

  // Warnings for suboptimal configurations
  const warnings: string[] = []
  if (provider === 'sqlite' && isProduction) {
    warnings.push(
      'SQLite is not recommended for production environments',
      'Consider migrating to PostgreSQL or MySQL for better performance and scalability'
    )
  }

  return {
    url: databaseUrl,
    provider,
    connectionPooling,
    ssl,
    logging,
    errorFormat: 'pretty',
    ...(warnings.length > 0 && { warnings })
  }
}

export async function validateDatabaseConnection(
  prisma: PrismaClient,
  options: { timeout?: number } = {}
): Promise<ConnectionStatus> {
  const startTime = Date.now()
  const timeout = options.timeout || 30000
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Database connection timeout')), timeout)
  })

  try {
    await Promise.race([prisma.$connect(), timeoutPromise])
    
    const details: ConnectionStatus['details'] = {
      connected: true,
      queryTest: false,
      recordCount: null
    }

    // Test basic query
    try {
      const count = await Promise.race([
        prisma.user.count(),
        timeoutPromise
      ])
      details.queryTest = true
      details.recordCount = count
    } catch (queryError) {
      const errorMsg = (queryError as Error).message
      
      // Check if this is a schema/migration issue
      if (errorMsg.includes('does not exist') || errorMsg.includes('no such table')) {
        details.migrationNeeded = true
        return {
          status: 'degraded',
          responseTime: Date.now() - startTime,
          details
        }
      }
      
      // Query failed but connection succeeded
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        details
      }
    }

    // Try to get schema version
    try {
      const migrations = await Promise.race([
        prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1`,
        timeoutPromise
      ]) as any[]
      
      if (migrations.length > 0) {
        details.schemaVersion = migrations[0].migration_name
      }
    } catch {
      // Migration table might not exist, that's okay
    }

    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details
    }

  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: {
        connected: false,
        queryTest: false,
        recordCount: null
      },
      error: (error as Error).message
    }
  }
}

export async function migrateDatabaseSchema(options: {
  generateClient?: boolean
  createBackup?: boolean
  rollbackOnFailure?: boolean
} = {}): Promise<MigrationResult> {
  const isProduction = process.env.NODE_ENV === 'production'
  const databaseUrl = process.env.DATABASE_URL

  // Validate environment
  if (isProduction && !databaseUrl) {
    return {
      success: false,
      error: 'DATABASE_URL is required for production migrations'
    }
  }

  const result: MigrationResult = {
    success: false
  }

  try {
    // Create backup in production
    if (options.createBackup && isProduction && databaseUrl?.startsWith('postgresql')) {
      try {
        const backupName = `backup_${Date.now()}.sql`
        await execAsync(`pg_dump ${databaseUrl} > ${backupName}`)
        result.backupCreated = true
      } catch (backupError) {
        return {
          success: false,
          error: `Backup failed: ${(backupError as Error).message}`
        }
      }
    }

    // Run migrations
    const { stdout: migrationOutput } = await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl }
    })
    
    result.output = migrationOutput

    // Generate Prisma client if requested
    if (options.generateClient) {
      try {
        const { stdout: generateOutput } = await execAsync('npx prisma generate')
        result.output += '\n' + generateOutput
        result.clientGenerated = true
      } catch (generateError) {
        // Migration succeeded but client generation failed
        result.success = true
        result.error = `Client generation failed: ${(generateError as Error).message}`
        return result
      }
    }

    result.success = true
    return result

  } catch (migrationError) {
    const errorMessage = (migrationError as Error).message
    
    // Attempt rollback if requested and backup was created
    if (options.rollbackOnFailure && result.backupCreated && isProduction) {
      try {
        const backupName = `backup_${Date.now()}.sql`
        await execAsync(`psql ${databaseUrl} < ${backupName}`)
        result.rolledBack = true
      } catch (rollbackError) {
        result.error = `Migration failed: ${errorMessage}. Rollback also failed: ${(rollbackError as Error).message}`
        return result
      }
    }

    return {
      success: false,
      error: errorMessage,
      backupCreated: result.backupCreated,
      rolledBack: result.rolledBack
    }
  }
}