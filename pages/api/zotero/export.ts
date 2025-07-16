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

interface ExportRequestBody {
  references?: Reference[];
  citations?: Reference[];
  apiKey?: string;
  userId?: string;
  format?: 'json' | 'bibtex';
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
  const { references, citations, apiKey, userId, format = 'json' } = req.body as ExportRequestBody;

  // Handle both references and citations (backward compatibility)
  const referencesToExport = references || citations;

  // Validate references/citations array
  if (!referencesToExport) {
    collector.addError({
      field: 'citations',
      message: 'citations or references array is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide an array of citations to export'
    });
  } else {
    const referencesValidation = validateArray(referencesToExport, 'citations', { minLength: 1, maxLength: 100 });
    if (!referencesValidation.valid && referencesValidation.error) {
      collector.addError(referencesValidation.error);
    }
  }

  // Validate format if provided
  if (format) {
    const formatValidation = validateEnum(format, 'format', ['json', 'bibtex']);
    if (!formatValidation.valid && formatValidation.error) {
      collector.addError(formatValidation.error);
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

    // For test mode, return mock export result
    if (req.headers['x-test-stub']) {
      const mockExported = references.slice(0, 2).map((ref, idx) => ({
        key: `ZOTERO_EXPORT_${idx + 1}`,
        title: ref.title,
        authors: ref.authors,
        year: ref.year,
        source: ref.source
      }));

      if (format === 'bibtex') {
        const bibtex = mockExported.map((item, idx) => 
          `@article{author${item.year}_${idx + 1},\n  title={${item.title}},\n  author={${item.authors.join(' and ')}},\n  year={${item.year}}\n}`
        ).join('\n\n');
        
        return res.status(200).json({
          exported: mockExported,
          bibtex,
          count: mockExported.length
        });
      }

      return res.status(200).json({
        exported: mockExported,
        count: mockExported.length
      });
    }

    // Validate references
    if (!Array.isArray(references) || references.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid references',
        details: 'References array is required and cannot be empty'
      });
    }

    // Get API credentials
    const zoteroApiKey = apiKey || process.env.ZOTERO_API_KEY;
    const zoteroUserId = userId || process.env.ZOTERO_USER_ID;

    if (!zoteroApiKey || !zoteroUserId) {
      return res.status(400).json({ 
        error: 'Zotero credentials required',
        details: 'Please configure Zotero API key and user ID'
      });
    }

    // Export references to Zotero
    const zoteroSync = createZoteroSync(zoteroApiKey, zoteroUserId);
    const exported = await zoteroSync.exportToZotero(references);

    const response: {
      exported: Reference[];
      count: number;
      bibtex?: string;
    } = {
      exported: exported as unknown as Reference[],
      count: exported.length
    };

    // Generate BibTeX if requested
    if (format === 'bibtex') {
      const { ZoteroClient } = await import('../../../lib/zotero');
      const client = new ZoteroClient(zoteroApiKey, zoteroUserId);
      response.bibtex = client.exportToBibTeX(exported);
    }

    return res.status(200).json(response);

  } catch (error: unknown) {
    console.error('Zotero export error:', error);
    
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
          operation: 'export',
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
          operation: 'export',
          retryable: true,
          retryAfter: 60,
          suggestion: 'Please wait before making another request'
        }
      );
    }
    
    return createErrorResponse(
      res,
      500,
      'ZOTERO_EXPORT_ERROR',
      'Failed to export to Zotero',
      req,
      { 
        service: 'zotero',
        operation: 'export',
        details: sanitizeErrorMessage(error),
        retryable: true,
        suggestion: 'Please try again or check your citations format'
      }
    );
  }
}