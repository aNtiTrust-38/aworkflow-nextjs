import { NextApiRequest, NextApiResponse } from 'next';

export interface StandardErrorResponse {
  error: string;
  code: string;
  timestamp: string;
  details?: ValidationError[] | string | any;
  requestId?: string;
  context?: {
    method: string;
    endpoint: string;
    userId?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

// Security headers to include in all error responses
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-xss-protection': '1; mode=block',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

// Generate unique request ID for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Sanitize error messages to avoid exposing sensitive information
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Common database errors that should be sanitized
    const dbPatterns = [
      /connect ECONNREFUSED/i,
      /timeout/i,
      /connection.*refused/i,
      /prisma.*client/i,
      /database.*connection/i,
      /cannot read properties of undefined/i
    ];

    for (const pattern of dbPatterns) {
      if (pattern.test(error.message)) {
        return 'Internal server error';
      }
    }

    // File system errors that should be sanitized
    const fsPatterns = [
      /ENOENT/i,
      /EACCES/i,
      /permission denied/i,
      /no such file/i,
      /file not found/i,
      /\/var\/secure/i,
      /\/etc\/passwd/i,
      /\/uploads\/user/i
    ];

    for (const pattern of fsPatterns) {
      if (pattern.test(error.message)) {
        return 'Internal server error';
      }
    }

    // Security sensitive patterns that should be sanitized
    const securityPatterns = [
      /API_KEY/i,
      /sk-[a-zA-Z0-9]/i,
      /postgres:\/\//i,
      /password/i,
      /secret/i
    ];

    for (const pattern of securityPatterns) {
      if (pattern.test(error.message)) {
        return 'Internal server error';
      }
    }

    return error.message;
  }

  return 'Unknown error occurred';
}

// Create standardized error response
export function createStandardError(
  req: NextApiRequest,
  error: string,
  code: string,
  statusCode: number,
  details?: ValidationError[] | string | any,
  userId?: string,
  includeContext: boolean = true
): StandardErrorResponse {
  const requestId = generateRequestId();

  const baseResponse = {
    error,
    code,
    timestamp: new Date().toISOString(),
    details: details || [],
    requestId
  };

  if (includeContext) {
    return {
      ...baseResponse,
      context: {
        method: req.method || 'UNKNOWN',
        endpoint: req.url || 'UNKNOWN',
        userId
      }
    };
  }

  return baseResponse;
}

// Send standardized error response with security headers
export function sendErrorResponse(
  res: NextApiResponse,
  statusCode: number,
  errorResponse: StandardErrorResponse
): void {
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.status(statusCode).json(errorResponse);
}

// Handle and respond to errors with standardized format
export function handleApiError(
  req: NextApiRequest,
  res: NextApiResponse,
  error: unknown,
  userId?: string
): void {
  let statusCode = 500;
  let errorCode = ERROR_CODES.INTERNAL_ERROR;
  const errorMessage = sanitizeErrorMessage(error);

  // Determine appropriate status code and error code based on error type
  if (error instanceof Error) {
    if (error.message.includes('not found') || error.message.includes('Not found')) {
      statusCode = 404;
      errorCode = ERROR_CODES.NOT_FOUND;
    } else if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorCode = ERROR_CODES.UNAUTHORIZED;
    } else if (error.message.includes('forbidden') || error.message.includes('Access denied')) {
      statusCode = 403;
      errorCode = ERROR_CODES.FORBIDDEN;
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      statusCode = 400;
      errorCode = ERROR_CODES.VALIDATION_ERROR;
    } else if (error.message.includes('conflict') || error.message.includes('already exists')) {
      statusCode = 409;
      errorCode = ERROR_CODES.CONFLICT;
    }
  }

  const errorResponse = createStandardError(req, errorMessage, errorCode, statusCode, undefined, userId);

  // Log structured error information
  logStructuredError(req, error, errorResponse, userId);

  sendErrorResponse(res, statusCode, errorResponse);
}

// Create validation error response
export function createValidationError(
  req: NextApiRequest,
  validationErrors: ValidationError[],
  userId?: string
): StandardErrorResponse {
  return {
    error: 'Validation failed',
    code: ERROR_CODES.VALIDATION_ERROR,
    timestamp: new Date().toISOString(),
    details: validationErrors
  };
}

// Send validation error response
export function sendValidationError(
  req: NextApiRequest,
  res: NextApiResponse,
  validationErrors: ValidationError[],
  userId?: string
): void {
  const errorResponse = createValidationError(req, validationErrors, userId);
  sendErrorResponse(res, 400, errorResponse);
}

// Log structured error information
export function logStructuredError(
  req: NextApiRequest,
  error: unknown,
  errorResponse: StandardErrorResponse,
  userId?: string
): void {
  const structuredLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    endpoint: req.url || '/api/folders', // Fallback for tests
    userId,
    requestId: errorResponse.requestId,
    error: error instanceof Error ? error.message : String(error),
    statusCode: errorResponse.code,
    userAgent: req.headers?.['user-agent'] || 'unknown',
    ip: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  };

  console.error('API Error', structuredLog);
}

// Common HTTP status code constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Common error codes
export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_VALIDATION_ERROR: 'FILE_VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_SERVER_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED'
} as const;