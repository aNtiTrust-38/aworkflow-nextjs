import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateEnvironment, EnvironmentConfig, ValidationError } from '@/lib/env-validator'

describe('Environment Variable Validator', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('validateEnvironment', () => {
    it('should validate all required environment variables', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-long',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        SETTINGS_ENCRYPTION_KEY: 'test-encryption-key-32-chars-long!!',
        ANTHROPIC_API_KEY: 'sk-ant-test-key',
        OPENAI_API_KEY: 'sk-test-key'
      }

      const result = validateEnvironment()
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.config).toMatchObject({
        nodeEnv: 'production',
        nextAuth: {
          secret: 'test-secret-at-least-32-characters-long',
          url: 'https://example.com'
        },
        database: {
          url: 'postgresql://user:pass@localhost:5432/db'
        },
        encryption: {
          key: 'test-encryption-key-32-chars-long!!'
        },
        aiProviders: {
          anthropic: { apiKey: 'sk-ant-test-key' },
          openai: { apiKey: 'sk-test-key' }
        }
      })
    })

    it('should return errors for missing required variables', () => {
      process.env = {
        NODE_ENV: 'production'
      }

      const result = validateEnvironment()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'NEXTAUTH_SECRET',
          message: 'NEXTAUTH_SECRET is required in production'
        })
      )
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'DATABASE_URL',
          message: 'DATABASE_URL is required in production'
        })
      )
    })

    it('should validate NEXTAUTH_SECRET length', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'too-short',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
      }

      const result = validateEnvironment()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'NEXTAUTH_SECRET',
          message: 'NEXTAUTH_SECRET must be at least 32 characters long'
        })
      )
    })

    it('should validate DATABASE_URL format', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-long',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'invalid-url'
      }

      const result = validateEnvironment()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'DATABASE_URL',
          message: 'DATABASE_URL must be a valid database connection string'
        })
      )
    })

    it('should warn about SQLite in production', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-long',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'file:./dev.db',
        SETTINGS_ENCRYPTION_KEY: 'test-encryption-key-32-chars-long!!',
        ANTHROPIC_API_KEY: 'sk-ant-test-key'
      }

      const result = validateEnvironment()
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'DATABASE_URL',
          message: 'SQLite is not recommended for production. Consider using PostgreSQL or MySQL.'
        })
      )
    })

    it('should require at least one AI provider', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-long',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
      }

      const result = validateEnvironment()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'AI_PROVIDERS',
          message: 'At least one AI provider (ANTHROPIC_API_KEY or OPENAI_API_KEY) must be configured'
        })
      )
    })

    it('should validate API key formats', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-long',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        ANTHROPIC_API_KEY: 'invalid-format',
        OPENAI_API_KEY: 'invalid-format'
      }

      const result = validateEnvironment()
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'ANTHROPIC_API_KEY',
          message: 'ANTHROPIC_API_KEY should start with "sk-ant-"'
        })
      )
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'OPENAI_API_KEY',
          message: 'OPENAI_API_KEY should start with "sk-"'
        })
      )
    })

    it('should validate optional Zotero configuration', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-long',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        ZOTERO_API_KEY: 'test-key',
        ZOTERO_USER_ID: 'not-a-number'
      }

      const result = validateEnvironment()
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'ZOTERO_USER_ID',
          message: 'ZOTERO_USER_ID must be a valid number'
        })
      )
    })

    it('should handle development environment with relaxed rules', () => {
      process.env = {
        NODE_ENV: 'development'
      }

      const result = validateEnvironment()
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'NODE_ENV',
          message: 'Running in development mode. Some validations are relaxed.'
        })
      )
    })

    it('should validate AI_MONTHLY_BUDGET format', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-long',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        AI_MONTHLY_BUDGET: 'not-a-number'
      }

      const result = validateEnvironment()
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'AI_MONTHLY_BUDGET',
          message: 'AI_MONTHLY_BUDGET must be a valid number. Using default: 100'
        })
      )
    })

    it('should provide detailed configuration object when valid', () => {
      process.env = {
        NODE_ENV: 'production',
        NEXTAUTH_SECRET: 'test-secret-at-least-32-characters-long',
        NEXTAUTH_URL: 'https://example.com',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        SETTINGS_ENCRYPTION_KEY: 'test-encryption-key-32-chars-long!!',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        OPENAI_API_KEY: 'sk-test',
        AI_MONTHLY_BUDGET: '200',
        ZOTERO_API_KEY: 'zotero-key',
        ZOTERO_USER_ID: '12345'
      }

      const result = validateEnvironment()
      
      expect(result.isValid).toBe(true)
      expect(result.config).toEqual({
        nodeEnv: 'production',
        nextAuth: {
          secret: 'test-secret-at-least-32-characters-long',
          url: 'https://example.com'
        },
        database: {
          url: 'postgresql://user:pass@localhost:5432/db',
          type: 'postgresql'
        },
        encryption: {
          key: 'test-encryption-key-32-chars-long!!'
        },
        aiProviders: {
          anthropic: { apiKey: 'sk-ant-test' },
          openai: { apiKey: 'sk-test' },
          monthlyBudget: 200
        },
        zotero: {
          apiKey: 'zotero-key',
          userId: 12345
        }
      })
    })
  })

  describe('Environment Config Type', () => {
    it('should export proper TypeScript types', () => {
      const config: EnvironmentConfig = {
        nodeEnv: 'production',
        nextAuth: {
          secret: 'secret',
          url: 'https://example.com'
        },
        database: {
          url: 'postgresql://localhost',
          type: 'postgresql'
        },
        encryption: {
          key: 'key'
        },
        aiProviders: {
          anthropic: { apiKey: 'key' },
          monthlyBudget: 100
        }
      }

      expect(config).toBeDefined()
    })
  })
})