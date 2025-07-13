export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface EnvironmentConfig {
  nodeEnv: string
  nextAuth: {
    secret: string
    url: string
  }
  database: {
    url: string
    type?: 'postgresql' | 'mysql' | 'sqlite'
  }
  encryption: {
    key: string
  }
  aiProviders: {
    anthropic?: { apiKey: string }
    openai?: { apiKey: string }
    monthlyBudget: number
  }
  zotero?: {
    apiKey: string
    userId: number
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  config?: EnvironmentConfig
}

export function validateEnvironment(): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const nodeEnv = process.env.NODE_ENV || 'development'
  const isProduction = nodeEnv === 'production'

  // Relaxed validation for development
  if (!isProduction) {
    warnings.push({
      field: 'NODE_ENV',
      message: 'Running in development mode. Some validations are relaxed.',
      severity: 'warning'
    })
  }

  // Validate NextAuth configuration
  const nextAuthSecret = process.env.NEXTAUTH_SECRET
  const nextAuthUrl = process.env.NEXTAUTH_URL

  if (isProduction && !nextAuthSecret) {
    errors.push({
      field: 'NEXTAUTH_SECRET',
      message: 'NEXTAUTH_SECRET is required in production',
      severity: 'error'
    })
  } else if (nextAuthSecret && nextAuthSecret.length < 32) {
    errors.push({
      field: 'NEXTAUTH_SECRET',
      message: 'NEXTAUTH_SECRET must be at least 32 characters long',
      severity: 'error'
    })
  }

  if (isProduction && !nextAuthUrl) {
    errors.push({
      field: 'NEXTAUTH_URL',
      message: 'NEXTAUTH_URL is required in production',
      severity: 'error'
    })
  }

  // Validate Database configuration
  const databaseUrl = process.env.DATABASE_URL

  if (isProduction && !databaseUrl) {
    errors.push({
      field: 'DATABASE_URL',
      message: 'DATABASE_URL is required in production',
      severity: 'error'
    })
  } else if (databaseUrl) {
    if (!isValidDatabaseUrl(databaseUrl)) {
      errors.push({
        field: 'DATABASE_URL',
        message: 'DATABASE_URL must be a valid database connection string',
        severity: 'error'
      })
    } else if (databaseUrl.startsWith('file:') && isProduction) {
      warnings.push({
        field: 'DATABASE_URL',
        message: 'SQLite is not recommended for production. Consider using PostgreSQL or MySQL.',
        severity: 'warning'
      })
    }
  }

  // Validate Encryption key
  const encryptionKey = process.env.SETTINGS_ENCRYPTION_KEY
  if (isProduction && !encryptionKey) {
    errors.push({
      field: 'SETTINGS_ENCRYPTION_KEY',
      message: 'SETTINGS_ENCRYPTION_KEY is required for production encryption',
      severity: 'error'
    })
  }

  // Validate AI Providers (required in production, optional in development)
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!anthropicKey && !openaiKey && isProduction) {
    errors.push({
      field: 'AI_PROVIDERS',
      message: 'At least one AI provider (ANTHROPIC_API_KEY or OPENAI_API_KEY) must be configured',
      severity: 'error'
    })
  }

  // Validate API key formats
  if (anthropicKey && !anthropicKey.startsWith('sk-ant-')) {
    warnings.push({
      field: 'ANTHROPIC_API_KEY',
      message: 'ANTHROPIC_API_KEY should start with "sk-ant-"',
      severity: 'warning'
    })
  }

  if (openaiKey && !openaiKey.startsWith('sk-')) {
    warnings.push({
      field: 'OPENAI_API_KEY',
      message: 'OPENAI_API_KEY should start with "sk-"',
      severity: 'warning'
    })
  }

  // Validate AI budget
  const aiBudget = process.env.AI_MONTHLY_BUDGET
  let monthlyBudget = 100 // default
  
  if (aiBudget) {
    const budgetNum = parseFloat(aiBudget)
    if (isNaN(budgetNum)) {
      warnings.push({
        field: 'AI_MONTHLY_BUDGET',
        message: 'AI_MONTHLY_BUDGET must be a valid number. Using default: 100',
        severity: 'warning'
      })
    } else {
      monthlyBudget = budgetNum
    }
  }

  // Validate Zotero configuration (optional)
  const zoteroKey = process.env.ZOTERO_API_KEY
  const zoteroUserId = process.env.ZOTERO_USER_ID
  let zoteroConfig: EnvironmentConfig['zotero'] | undefined

  if (zoteroKey || zoteroUserId) {
    if (zoteroUserId) {
      const userIdNum = parseInt(zoteroUserId, 10)
      if (isNaN(userIdNum)) {
        warnings.push({
          field: 'ZOTERO_USER_ID',
          message: 'ZOTERO_USER_ID must be a valid number',
          severity: 'warning'
        })
      } else if (zoteroKey) {
        zoteroConfig = {
          apiKey: zoteroKey,
          userId: userIdNum
        }
      }
    }
  }

  const isValid = errors.length === 0

  let config: EnvironmentConfig | undefined
  if (isValid || !isProduction) {
    config = {
      nodeEnv,
      nextAuth: {
        secret: nextAuthSecret || 'dev-secret-change-in-production',
        url: nextAuthUrl || 'http://localhost:3000'
      },
      database: {
        url: databaseUrl || 'file:./dev.db',
        type: getDatabaseType(databaseUrl)
      },
      encryption: {
        key: encryptionKey || 'dev-encryption-key-change-in-production'
      },
      aiProviders: {
        ...(anthropicKey && { anthropic: { apiKey: anthropicKey } }),
        ...(openaiKey && { openai: { apiKey: openaiKey } }),
        monthlyBudget
      },
      ...(zoteroConfig && { zotero: zoteroConfig })
    }
  }

  return {
    isValid,
    errors,
    warnings,
    config
  }
}

function isValidDatabaseUrl(url: string): boolean {
  try {
    // Basic URL validation
    if (url.startsWith('file:')) {
      return true // SQLite file URLs
    }
    
    // Check for common database URL patterns
    const patterns = [
      /^postgresql:\/\/.+/,
      /^postgres:\/\/.+/,
      /^mysql:\/\/.+/,
      /^sqlite:.+/
    ]
    
    return patterns.some(pattern => pattern.test(url))
  } catch {
    return false
  }
}

function getDatabaseType(url?: string): 'postgresql' | 'mysql' | 'sqlite' | undefined {
  if (!url) return undefined
  
  if (url.startsWith('postgresql:') || url.startsWith('postgres:')) {
    return 'postgresql'
  }
  if (url.startsWith('mysql:')) {
    return 'mysql'
  }
  if (url.startsWith('file:') || url.startsWith('sqlite:')) {
    return 'sqlite'
  }
  
  return undefined
}