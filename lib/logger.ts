export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  logger: string
  message: string
  context?: Record<string, unknown>
  error?: {
    message: string
    name: string
    stack?: string
  }
}

export interface LoggerConfig {
  name: string
  level?: LogLevel
  context?: Record<string, unknown>
  serializers?: Record<string, (obj: unknown) => unknown>
  enableMetrics?: boolean
}

export interface Timer {
  done: (metadata?: Record<string, unknown>) => void
}

// Async context storage for request-scoped logging
let asyncContext: Record<string, unknown> = {}

export class Logger {
  private name: string
  private level: LogLevel
  private context: Record<string, unknown>
  private serializers: Record<string, (obj: unknown) => unknown>
  private enableMetrics: boolean

  constructor(config: LoggerConfig) {
    this.name = config.name
    this.level = config.level ?? LogLevel.INFO
    this.context = config.context ?? {}
    this.serializers = config.serializers ?? {}
    this.enableMetrics = config.enableMetrics ?? false
  }

  child(config: Partial<LoggerConfig>): Logger {
    return new Logger({
      name: config.name ? `${this.name}:${config.name}` : this.name,
      level: config.level ?? this.level,
      context: { ...this.context, ...(config.context ?? {}) },
      serializers: { ...this.serializers, ...(config.serializers ?? {}) },
      enableMetrics: config.enableMetrics ?? this.enableMetrics
    })
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'debug', message, metadata)
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'info', message, metadata)
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'warn', message, metadata)
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'error', message, metadata)
  }

  startTimer(): Timer {
    const startTime = Date.now()
    
    return {
      done: (metadata?: Record<string, unknown>) => {
        const duration = Date.now() - startTime
        this.info((metadata?.message as string) || 'Timer completed', {
          ...metadata,
          duration
        })
      }
    }
  }

  async withContext<T>(context: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
    const previousContext = { ...asyncContext }
    asyncContext = { ...asyncContext, ...context }
    
    try {
      return await fn()
    } finally {
      asyncContext = previousContext
    }
  }

  private log(level: LogLevel, levelName: string, message: string, metadata?: Record<string, unknown>): void {
    if (level < this.level) {
      return
    }

    // Filter logs in production if LOG_FILTER is set
    if (process.env.NODE_ENV === 'production' && process.env.LOG_FILTER) {
      const allowedLoggers = process.env.LOG_FILTER.split(',').map(s => s.trim())
      if (!allowedLoggers.includes(this.name)) {
        return
      }
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName as LogEntry['level'],
      logger: this.name,
      message,
      ...this.context,
      ...asyncContext,
      ...this.processMetadata(metadata)
    }

    // Handle errors specially
    if (metadata?.error && metadata.error instanceof Error) {
      entry.error = {
        message: metadata.error.message,
        name: metadata.error.name,
        stack: metadata.error.stack
      }
      delete (entry as unknown as Record<string, unknown>).error // Remove from metadata to avoid duplication
    }

    this.output(levelName, entry)
  }

  private processMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    if (!metadata) return {}

    const processed: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(metadata)) {
      if (this.serializers[key]) {
        processed[key] = this.serializers[key](value)
      } else {
        // Handle circular references
        try {
          JSON.stringify(value)
          processed[key] = value
        } catch (error) {
          void error; // Satisfy unused variable warning
          processed[key] = '[Circular Reference]'
        }
      }
    }

    return processed
  }

  private output(level: string, entry: LogEntry): void {
    const isProduction = process.env.NODE_ENV === 'production'
    
    if (isProduction) {
      // JSON format for production
      const output = JSON.stringify(entry)
      this.writeToConsole(level, output)
    } else {
      // Pretty format for development
      const timestamp = new Date().toLocaleTimeString()
      const levelUpper = level.toUpperCase().padEnd(5)
      const loggerName = `(${entry.logger})`
      const message = entry.message
      
      let output = `[${timestamp}] ${levelUpper} ${loggerName}: ${message}`
      
      // Add metadata if present
      const metadata: Partial<LogEntry> = { ...entry }
      delete metadata.timestamp
      delete metadata.level
      delete metadata.logger
      delete metadata.message
      
      if (Object.keys(metadata).length > 0) {
        output += `\n  ${JSON.stringify(metadata, null, 2)}`
      }
      
      this.writeToConsole(level, output)
    }
  }

  private writeToConsole(level: string, output: string): void {
    switch (level) {
      case 'debug':
        console.debug(output)
        break
      case 'info':
        console.info(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'error':
        console.error(output)
        break
      default:
        console.log(output)
    }
  }
}

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger({
    name: config?.name || 'app',
    level: config?.level,
    context: config?.context,
    serializers: {
      // Default serializers for common objects
      req: (req: unknown) => {
        const request = req as { method?: string; url?: string; headers?: Record<string, string> };
        return {
          method: request.method,
          url: request.url,
          headers: {
            'user-agent': request.headers?.['user-agent'],
            'content-type': request.headers?.['content-type']
          }
        };
      },
      res: (res: unknown) => {
        const response = res as { statusCode?: number; headers?: Record<string, string> };
        return {
          statusCode: response.statusCode,
          headers: {
            'content-type': response.headers?.['content-type']
          }
        };
      },
      user: (user: unknown) => {
        const userData = user as { id?: string; email?: string };
        return {
          id: userData.id,
          email: userData.email
          // Exclude sensitive fields like password
        };
      },
      error: (error: unknown) => {
        const err = error as Error;
        return {
          name: err.name,
          message: err.message,
          stack: err.stack
        };
      },
      ...config?.serializers
    },
    enableMetrics: config?.enableMetrics
  })
}