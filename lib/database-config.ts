/**
 * Database Configuration Utility
 * Handles database connection configuration for different environments
 */

import { PrismaClient } from '@prisma/client';

// Database configuration types
export interface DatabaseConfig {
  url: string;
  provider: 'sqlite' | 'postgresql';
  ssl?: boolean;
  poolSize?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
}

// Environment-specific database configurations
export const DATABASE_CONFIGS = {
  development: {
    provider: 'sqlite' as const,
    url: 'file:./prisma/dev.db',
    poolSize: 5,
    connectionTimeout: 5000,
    queryTimeout: 10000,
  },
  test: {
    provider: 'sqlite' as const,
    url: 'file:./prisma/test.db',
    poolSize: 1,
    connectionTimeout: 2000,
    queryTimeout: 5000,
  },
  staging: {
    provider: 'postgresql' as const,
    url: process.env.DATABASE_URL || 'postgresql://workflow_user:password@localhost:5432/academic_workflow_staging',
    ssl: true,
    poolSize: 10,
    connectionTimeout: 10000,
    queryTimeout: 30000,
  },
  production: {
    provider: 'postgresql' as const,
    url: process.env.DATABASE_URL || 'postgresql://workflow_user:password@localhost:5432/academic_workflow',
    ssl: true,
    poolSize: 20,
    connectionTimeout: 15000,
    queryTimeout: 60000,
  },
} as const;

// Get current environment
export function getCurrentEnvironment(): keyof typeof DATABASE_CONFIGS {
  const env = process.env.NODE_ENV as keyof typeof DATABASE_CONFIGS;
  return env && env in DATABASE_CONFIGS ? env : 'development';
}

// Get database configuration for current environment
export function getDatabaseConfig(): DatabaseConfig {
  const env = getCurrentEnvironment();
  const config = DATABASE_CONFIGS[env];
  
  // Override with environment variable if provided
  if (process.env.DATABASE_URL) {
    return {
      ...config,
      url: process.env.DATABASE_URL,
    };
  }
  
  return config;
}

// Create Prisma client with appropriate configuration
export function createPrismaClient(): PrismaClient {
  const config = getDatabaseConfig();
  
  const prismaConfig: any = {
    datasources: {
      db: {
        url: config.url,
      },
    },
  };
  
  // Add connection pooling for PostgreSQL
  if (config.provider === 'postgresql') {
    prismaConfig.datasources.db.url = `${config.url}?connection_limit=${config.poolSize}&pool_timeout=${config.connectionTimeout}`;
  }
  
  // Add logging in development
  if (process.env.NODE_ENV === 'development') {
    prismaConfig.log = ['query', 'info', 'warn', 'error'];
  } else if (process.env.LOG_LEVEL === 'debug') {
    prismaConfig.log = ['query', 'info', 'warn', 'error'];
  } else {
    prismaConfig.log = ['error'];
  }
  
  return new PrismaClient(prismaConfig);
}

// Database health check
export async function checkDatabaseHealth(prisma?: PrismaClient): Promise<{
  status: 'healthy' | 'unhealthy';
  provider: string;
  latency: number;
  details?: string;
}> {
  const client = prisma || createPrismaClient();
  const startTime = Date.now();
  
  try {
    // Test basic connectivity
    await client.$queryRaw`SELECT 1`;
    
    // Get database info
    const config = getDatabaseConfig();
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      provider: config.provider,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const config = getDatabaseConfig();
    
    return {
      status: 'unhealthy',
      provider: config.provider,
      latency,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (!prisma) {
      await client.$disconnect();
    }
  }
}

// Database migration utility
export async function runMigrations(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // This would typically be handled by Prisma CLI
    // but we can provide a programmatic interface
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    
    if (stderr && !stderr.includes('warnings')) {
      throw new Error(stderr);
    }
    
    return {
      success: true,
      message: 'Migrations completed successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Migration failed',
    };
  }
}

// Database backup utility (PostgreSQL only)
export async function createDatabaseBackup(outputPath?: string): Promise<{
  success: boolean;
  path?: string;
  message: string;
}> {
  const config = getDatabaseConfig();
  
  if (config.provider !== 'postgresql') {
    return {
      success: false,
      message: 'Backup is only supported for PostgreSQL databases',
    };
  }
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = outputPath || `backup_${timestamp}.sql`;
    
    // Extract connection details from URL
    const url = new URL(config.url);
    const command = `pg_dump -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} -d ${url.pathname.slice(1)} -f ${backupPath}`;
    
    await execAsync(command, {
      env: {
        ...process.env,
        PGPASSWORD: url.password,
      },
    });
    
    return {
      success: true,
      path: backupPath,
      message: 'Backup created successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Backup failed',
    };
  }
}

// Database statistics
export async function getDatabaseStatistics(prisma?: PrismaClient): Promise<{
  tables: Record<string, number>;
  size?: string;
  connections?: number;
}> {
  const client = prisma || createPrismaClient();
  
  try {
    const [
      userCount,
      paperCount,
      referenceCount,
      fileCount,
      settingCount,
    ] = await Promise.all([
      client.user.count(),
      client.paper.count(),
      client.reference.count(),
      client.file.count(),
      client.appSetting.count(),
    ]);
    
    const tables = {
      users: userCount,
      papers: paperCount,
      references: referenceCount,
      files: fileCount,
      settings: settingCount,
    };
    
    const config = getDatabaseConfig();
    const result: any = { tables };
    
    // Get additional stats for PostgreSQL
    if (config.provider === 'postgresql') {
      try {
        const [sizeResult] = await client.$queryRaw<[{ size: string }]>`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `;
        result.size = sizeResult.size;
        
        const [connectionResult] = await client.$queryRaw<[{ count: number }]>`
          SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
        `;
        result.connections = connectionResult.count;
      } catch {
        // Ignore errors for additional stats
      }
    }
    
    return result;
  } finally {
    if (!prisma) {
      await client.$disconnect();
    }
  }
}

// Connection pool management
export class DatabaseConnectionPool {
  private static instance: PrismaClient | null = null;
  
  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = createPrismaClient();
    }
    return this.instance;
  }
  
  static async closeInstance(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
    }
  }
  
  static async resetInstance(): Promise<void> {
    await this.closeInstance();
    this.instance = createPrismaClient();
  }
}

// Global Prisma client for application use
export const prisma = DatabaseConnectionPool.getInstance();

// Graceful shutdown handler
export function setupGracefulShutdown(): void {
  const cleanup = async () => {
    console.log('Closing database connections...');
    await DatabaseConnectionPool.closeInstance();
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('beforeExit', cleanup);
}

// Database environment validator
export function validateDatabaseEnvironment(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check for required environment variables
  if (!process.env.DATABASE_URL && getCurrentEnvironment() !== 'development') {
    errors.push('DATABASE_URL environment variable is required');
  }
  
  // Validate URL format
  if (process.env.DATABASE_URL) {
    try {
      new URL(process.env.DATABASE_URL);
    } catch {
      errors.push('DATABASE_URL is not a valid URL');
    }
  }
  
  // Check for SSL requirements in production
  if (getCurrentEnvironment() === 'production' && process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.includes('sslmode=require') && 
        !process.env.DATABASE_URL.includes('ssl=true')) {
      errors.push('SSL should be enabled for production database connections');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  getDatabaseConfig,
  createPrismaClient,
  checkDatabaseHealth,
  runMigrations,
  createDatabaseBackup,
  getDatabaseStatistics,
  DatabaseConnectionPool,
  prisma,
  setupGracefulShutdown,
  validateDatabaseEnvironment,
};