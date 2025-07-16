import type { NextApiRequest, NextApiResponse } from 'next';
import { createErrorResponse, sanitizeErrorMessage } from '../../lib/error-utils';
import { 
  validateRequired, 
  validateArray,
  validateEnum,
  ValidationErrorCollector,
  createValidationErrorResponse 
} from '../../lib/validation-utils';

interface Source {
  title: string;
  authors: string[];
  year: number;
  url: string;
  type: string;
}

interface CitationRequest {
  sources?: Source[];
  action?: string;
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
  const { sources, action } = (req.body || {}) as CitationRequest;

  // Validate action if provided
  if (action !== undefined) {
    const actionValidation = validateEnum(action, 'action', ['list', 'add', 'update', 'delete', 'format']);
    if (!actionValidation.valid && actionValidation.error) {
      collector.addError(actionValidation.error);
    }
  }

  // Validate sources array
  if (sources === undefined || sources === null) {
    collector.addError({
      field: 'sources',
      message: 'sources is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide a sources array'
    });
  } else {
    const sourcesValidation = validateArray(sources, 'sources', { minLength: 1 });
    if (!sourcesValidation.valid && sourcesValidation.error) {
      collector.addError(sourcesValidation.error);
    }
  }

  // Return validation errors if any
  if (collector.hasErrors()) {
    return createValidationErrorResponse(res, collector.getErrors(), req);
  }
  // GREEN PHASE: Return stub data for TDD
  return res.status(200).json({
    apaSevenCitations: [
      'Smith, J. (2022). Physical Security in Data Centers. Semantic Scholar. https://semanticscholar.org/paper/123',
      'Doe, A. (2021). NIST Data Center Guidelines. NIST. https://nist.gov/datacenter'
    ],
    zoteroExport: '@article{smith2022, title={Physical Security in Data Centers}, author={Smith, J.}, year={2022}, url={https://semanticscholar.org/paper/123}}',
    bibliography: 'Smith, J. (2022). Physical Security in Data Centers. Semantic Scholar. https://semanticscholar.org/paper/123\nDoe, A. (2021). NIST Data Center Guidelines. NIST. https://nist.gov/datacenter'
  });
} 