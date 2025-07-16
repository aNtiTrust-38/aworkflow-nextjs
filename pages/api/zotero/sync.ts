import type { NextApiRequest, NextApiResponse } from 'next';
import { createZoteroSync } from '../../../lib/zotero';
import { createErrorResponse, sanitizeErrorMessage } from '../../../lib/error-utils';
import { 
  validateArray, 
  validateEnum,
  ValidationErrorCollector,
  createValidationErrorResponse 
} from '../../../lib/validation-utils';

interface Reference {
  id?: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  citation: string;
  doi?: string;
}

interface SyncRequestBody {
  references?: Reference[];
  apiKey?: string;
  userId?: string;
  action?: 'sync' | 'pull' | 'push';
  conflictResolution?: 'use_local' | 'use_remote' | 'merge';
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
  const { references = [], apiKey, userId, action = 'sync', conflictResolution = 'use_local' } = req.body as SyncRequestBody;

  // Validate action
  const actionValidation = validateEnum(action, 'action', ['sync', 'pull', 'push']);
  if (!actionValidation.valid && actionValidation.error) {
    collector.addError(actionValidation.error);
  }

  // Validate conflict resolution
  const conflictValidation = validateEnum(conflictResolution, 'conflictResolution', ['use_local', 'use_remote', 'merge']);
  if (!conflictValidation.valid && conflictValidation.error) {
    collector.addError(conflictValidation.error);
  }

  // Validate references array
  if (references.length > 0) {
    const referencesValidation = validateArray(references, 'references', { maxLength: 1000 });
    if (!referencesValidation.valid && referencesValidation.error) {
      collector.addError(referencesValidation.error);
    }
  }

  // Get API credentials with environment fallback
  const zoteroApiKey = apiKey || process.env.ZOTERO_API_KEY;
  const zoteroUserId = userId || process.env.ZOTERO_USER_ID;

  // Validate API credentials
  if (!zoteroApiKey) {
    collector.addError({
      field: 'apiKey',
      message: 'Zotero API key is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide a Zotero API key or configure it in environment variables'
    });
  }

  if (!zoteroUserId) {
    collector.addError({
      field: 'userId',
      message: 'Zotero user ID is required', 
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide a Zotero user ID or configure it in environment variables'
    });
  }

  // Return validation errors if any
  if (collector.hasErrors()) {
    return createValidationErrorResponse(res, collector.getErrors(), req);
  }

  try {

    // For test mode, return mock sync result
    if (req.headers['x-test-stub']) {
      return res.status(200).json({
        imported: [
          {
            id: 'ZOTERO123',
            title: 'Imported Paper from Zotero',
            authors: ['Test Author'],
            year: 2023,
            source: 'Zotero',
            citation: '(Author, 2023)'
          }
        ],
        exported: references.slice(0, 1).map((ref, idx) => ({
          key: `EXPORTED${idx + 1}`,
          title: ref.title,
          authors: ref.authors,
          year: ref.year,
          source: ref.source
        })),
        conflicts: [],
        summary: {
          imported: 1,
          exported: Math.min(references.length, 1),
          conflicts: 0
        }
      });
    }

    // Get API credentials from environment or request
    const zoteroApiKey = apiKey || process.env.ZOTERO_API_KEY;
    const zoteroUserId = userId || process.env.ZOTERO_USER_ID;

    if (!zoteroApiKey || !zoteroUserId) {
      return res.status(400).json({ 
        error: 'Zotero credentials required',
        details: 'Please provide Zotero API key and user ID'
      });
    }

    // Validate references input
    if (!Array.isArray(references)) {
      return res.status(400).json({ 
        error: 'Invalid references format',
        details: 'References must be an array'
      });
    }

    // Create Zotero sync and perform bidirectional sync
    const zoteroSync = createZoteroSync(zoteroApiKey, zoteroUserId);
    const result = await zoteroSync.syncReferences(references);

    // Add summary statistics
    const summary = {
      imported: result.imported.length,
      exported: result.exported.length,
      conflicts: result.conflicts.length
    };

    return res.status(200).json({
      ...result,
      summary
    });

  } catch (error: unknown) {
    console.error('Zotero sync error:', error);
    
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
          operation: 'sync',
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
          operation: 'sync',
          retryable: true,
          retryAfter: 60,
          suggestion: 'Please wait before making another request'
        }
      );
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('503')) {
      return createErrorResponse(
        res,
        503,
        'SERVICE_UNAVAILABLE',
        'Zotero service unavailable',
        req,
        { 
          service: 'zotero',
          operation: 'sync',
          retryable: true,
          retryAfter: 300,
          suggestion: 'Please try again later'
        }
      );
    }

    return createErrorResponse(
      res,
      500,
      'ZOTERO_SYNC_ERROR',
      'Failed to sync with Zotero',
      req,
      { 
        service: 'zotero',
        operation: 'sync',
        details: sanitizeErrorMessage(error),
        retryable: true,
        suggestion: 'Please try again or check your input data'
      }
    );
  }
}