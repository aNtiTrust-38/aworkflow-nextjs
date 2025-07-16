import type { NextApiRequest, NextApiResponse } from 'next';
import { createZoteroSync } from '../../../lib/zotero';
import { createErrorResponse, sanitizeErrorMessage } from '../../../lib/error-utils';
import { 
  validateStringFormat, 
  validatePositiveInteger,
  ValidationErrorCollector,
  createValidationErrorResponse 
} from '../../../lib/validation-utils';

interface ImportRequestBody {
  apiKey?: string;
  userId?: string;
  limit?: number;
  collectionId?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return createErrorResponse(
      res,
      405,
      'METHOD_NOT_ALLOWED',
      'Method Not Allowed',
      req,
      { allowedMethods: ['POST'] }
    );
  }

  // Input validation with standardized error handling
  const collector = new ValidationErrorCollector();
  const { apiKey, userId, limit = 100, collectionId } = req.body as ImportRequestBody;

  // Get API credentials with environment fallback
  const zoteroApiKey = apiKey || process.env.ZOTERO_API_KEY;
  const zoteroUserId = userId || process.env.ZOTERO_USER_ID;

  // Validate API key
  if (!zoteroApiKey) {
    collector.addError({
      field: 'apiKey',
      message: 'Zotero API key is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide a Zotero API key or configure it in environment variables'
    });
  }

  // Validate user ID
  if (!zoteroUserId) {
    collector.addError({
      field: 'userId', 
      message: 'Zotero user ID is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide a Zotero user ID or configure it in environment variables'
    });
  }

  // Validate limit
  if (limit !== undefined) {
    const limitValidation = validatePositiveInteger(limit, 'limit');
    if (!limitValidation.valid && limitValidation.error) {
      collector.addError(limitValidation.error);
    } else if (limit > 500) {
      collector.addError({
        field: 'limit',
        message: 'limit must be no more than 500',
        code: 'FIELD_OUT_OF_RANGE',
        maxValue: 500,
        actualValue: limit,
        suggestion: 'Please reduce the limit to 500 or fewer items'
      });
    }
  }

  // Return validation errors if any
  if (collector.hasErrors()) {
    return createValidationErrorResponse(res, collector.getErrors(), req);
  }

  try {

    // For test mode, return mock imported references
    if (req.headers['x-test-stub']) {
      return res.status(200).json({
        references: [
          {
            id: 'ZOTERO001',
            title: 'Sample Academic Paper',
            authors: ['Dr. Jane Smith', 'Prof. John Doe'],
            year: 2023,
            source: 'Zotero',
            citation: '(Smith & Doe, 2023)',
            doi: '10.1000/sample'
          },
          {
            id: 'ZOTERO002', 
            title: 'Another Research Study',
            authors: ['Dr. Alice Johnson'],
            year: 2022,
            source: 'Zotero',
            citation: '(Johnson, 2022)'
          }
        ],
        count: 2,
        hasMore: false
      });
    }

    // API credentials already validated above

    // Import references from Zotero
    const zoteroSync = createZoteroSync(zoteroApiKey, zoteroUserId);
    const references = await zoteroSync.importFromZotero();

    // Apply limit if specified
    const limitedReferences = references.slice(0, limit);
    const hasMore = references.length > limit;

    return res.status(200).json({
      references: limitedReferences,
      count: limitedReferences.length,
      totalCount: references.length,
      hasMore
    });

  } catch (error: unknown) {
    console.error('Zotero import error:', error);
    
    // Handle specific errors with standardized error responses
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return createErrorResponse(
        res,
        401,
        'ZOTERO_UNAUTHORIZED',
        'Invalid Zotero credentials',
        req,
        { 
          service: 'zotero',
          operation: 'import',
          details: sanitizeErrorMessage(error),
          suggestion: 'Please check your Zotero API key and user ID'
        }
      );
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return createErrorResponse(
        res,
        429,
        'RATE_LIMIT_EXCEEDED',
        'Zotero rate limit exceeded',
        req,
        { 
          service: 'zotero',
          operation: 'import',
          retryable: true,
          retryAfter: 60,
          suggestion: 'Please wait before making another request'
        }
      );
    }

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return createErrorResponse(
        res,
        404,
        'ZOTERO_NOT_FOUND',
        'Zotero collection or resource not found',
        req,
        { 
          service: 'zotero',
          operation: 'import',
          details: sanitizeErrorMessage(error),
          suggestion: 'Please verify the collection ID or user ID'
        }
      );
    }
    
    return createErrorResponse(
      res,
      500,
      'ZOTERO_IMPORT_ERROR',
      'Failed to import from Zotero',
      req,
      { 
        service: 'zotero',
        operation: 'import',
        details: sanitizeErrorMessage(error),
        retryable: true,
        suggestion: 'Please try again or check your Zotero configuration'
      }
    );
  }
}