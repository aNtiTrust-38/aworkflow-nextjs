import type { NextApiRequest, NextApiResponse } from 'next';
import { createErrorResponse, sanitizeErrorMessage } from '../../lib/error-utils';
import { 
  validateRequired, 
  validateArray, 
  validateNumber,
  ValidationErrorCollector,
  createValidationErrorResponse 
} from '../../lib/validation-utils';

// Types for request and response bodies
interface OutlineSection {
  section: string;
  content: string;
}

interface Reference {
  id: string | number;
  citation: string;
  authors: string[];
  year: number;
  title: string;
  source: string;
}

interface GenerateRequestBody {
  outline?: OutlineSection[];
  references?: Reference[];
}

// interface GenerateResponseBody {
//   content: string;
//   usage: {
//     tokens: number;
//     cost: number;
//   };
//   references: Reference[];
// }

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
  const { outline, references, maxTokens, temperature, prompt } = req.body as GenerateRequestBody & {
    maxTokens?: number;
    temperature?: number;
    prompt?: string;
  };

  // Validate prompt if provided
  if (prompt !== undefined) {
    const promptValidation = validateRequired(prompt, 'prompt');
    if (!promptValidation.valid && promptValidation.error) {
      collector.addError(promptValidation.error);
    }
  }

  // Validate outline
  if (outline === undefined || outline === null) {
    collector.addError({
      field: 'outline',
      message: 'outline is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide an outline array'
    });
  } else {
    const outlineValidation = validateArray(outline, 'outline', { minLength: 1 });
    if (!outlineValidation.valid && outlineValidation.error) {
      collector.addError(outlineValidation.error);
    }
  }

  // Validate references
  if (references === undefined || references === null) {
    collector.addError({
      field: 'references',
      message: 'references is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide a references array'
    });
  } else {
    const referencesValidation = validateArray(references, 'references', { minLength: 1 });
    if (!referencesValidation.valid && referencesValidation.error) {
      collector.addError(referencesValidation.error);
    }
  }

  // Validate optional parameters
  if (maxTokens !== undefined) {
    const maxTokensValidation = validateNumber(maxTokens, 'maxTokens', { min: 1 });
    if (!maxTokensValidation.valid && maxTokensValidation.error) {
      collector.addError({
        ...maxTokensValidation.error,
        code: 'FIELD_INVALID_RANGE'
      });
    }
  }

  if (temperature !== undefined) {
    const temperatureValidation = validateNumber(temperature, 'temperature', { min: 0, max: 2 });
    if (!temperatureValidation.valid && temperatureValidation.error) {
      collector.addError({
        ...temperatureValidation.error,
        code: 'FIELD_OUT_OF_RANGE',
        retryable: false
      });
    }
  }

  // Return validation errors if any
  if (collector.hasErrors()) {
    return createValidationErrorResponse(res, collector.getErrors(), req);
  }

  // Simulate LLM/API errors for testing
  const testError = req.headers['x-test-error'];
  if (testError === 'llm') {
    return createErrorResponse(
      res,
      500,
      'EXTERNAL_API_ERROR',
      'Simulated LLM/API error',
      req,
      { service: 'llm', retryable: true }
    );
  }
  if (testError === 'rate-limit') {
    return createErrorResponse(
      res,
      429,
      'RATE_LIMIT_EXCEEDED',
      'Simulated rate limit or timeout',
      req,
      { 
        retryable: true, 
        retryAfter: 60,
        suggestion: 'Please wait and retry after some time'
      }
    );
  }

  try {
    // For test mode, use stub implementation
    if (req.headers['x-test-stub']) {
      const paragraphs = outline.map((section, idx) => {
        const ref = references[idx % references.length];
        return `${section.section}\n\n${section.content} ${ref.citation}`;
      });
      const content = paragraphs.join('\n\n');

      // Reference linking/validation
      const citationSet = new Set(references.map(r => r.citation));
      const citationRegex = /\(([^)]+, \d{4})\)/g;
      const foundCitations = Array.from(content.matchAll(citationRegex)).map(m => `(${m[1]})`);
      const unmatched = foundCitations.filter(c => !citationSet.has(c));
      if (unmatched.length > 0) {
        return createErrorResponse(
          res,
          500,
          'CITATION_VALIDATION_ERROR',
          `Unmatched in-text citation(s): ${unmatched.join(', ')}`,
          req,
          { 
            unmatchedCitations: unmatched,
            suggestion: 'Please check that all citations match the provided references'
          }
        );
      }

      const usage = {
        tokens: 100 * outline.length,
        cost: 0.01 * outline.length,
      };

      return res.status(200).json({
        content,
        usage,
        references,
      });
    }

    // Use AI router for real implementation
    const { getAIRouter } = await import('../../lib/ai-router-config');
    const { TaskType } = await import('../../lib/ai-providers');
    
    let router;
    try {
      router = getAIRouter();
    } catch (err: unknown) {
      return createErrorResponse(
        res,
        500,
        'AI_PROVIDER_ERROR',
        'No AI provider available or API key misconfigured',
        req,
        { 
          details: sanitizeErrorMessage(err instanceof Error ? err.message : 'Unknown error'),
          suggestion: 'Please check your AI provider configuration'
        }
      );
    }
    // No need to check available providers here; router will throw if none are available

    // Build comprehensive prompt
    const outlineText = outline.map(section => `${section.section}: ${section.content}`).join('\n');
    const referencesText = references.map(ref => `- ${ref.citation}`).join('\n');
    
    const generatePrompt = `
You are an expert academic writer. Generate high-quality academic content based on this outline and references.

OUTLINE:
${outlineText}

AVAILABLE REFERENCES:
${referencesText}

Please write comprehensive academic content that:
1. Follows the provided outline structure
2. Incorporates the references appropriately with in-text citations
3. Maintains academic tone and style
4. Provides substantial content for each section
5. Uses proper APA citation format

Write detailed paragraphs for each section. Include in-text citations in the format (Author, Year).
`;

    const result = await (await router).generateWithFailover(generatePrompt, TaskType.WRITING);
    
    // Validate citations in generated content
    const citationSet = new Set(references.map(r => r.citation));
    const citationRegex = /\(([^)]+, \d{4})\)/g;
    const foundCitations = (Array.from(result.content.matchAll(citationRegex)) as RegExpMatchArray[])
      .map(m => m[1])
      .filter((citation): citation is string => typeof citation === 'string')
      .map(citation => `(${citation})`);
    const unmatched = foundCitations.filter(c => !citationSet.has(c));
    
    if (unmatched.length > 0) {
      console.warn('Unmatched citations found:', unmatched);
      // Don't fail, just log warning for now
    }

    return res.status(200).json({
      content: result.content,
      usage: {
        tokens: result.usage.totalTokens,
        cost: result.cost,
        provider: result.provider
      },
      provider: result.provider, // <-- Ensure top-level provider field
      references,
    });

  } catch (error: unknown) {
    console.error('Content generation error:', error);
    
    // If error is due to missing provider/API key, return clear error
    if (error instanceof Error && error.message && /api key|provider/i.test(error.message)) {
      return createErrorResponse(
        res,
        500,
        'AI_PROVIDER_ERROR',
        'No AI provider available or API key misconfigured',
        req,
        { 
          details: sanitizeErrorMessage(error.message),
          suggestion: 'Please check your AI provider configuration'
        }
      );
    }
    
    return createErrorResponse(
      res,
      500,
      'CONTENT_GENERATION_ERROR',
      'Failed to generate content',
      req,
      { 
        details: sanitizeErrorMessage(error instanceof Error ? error.message : 'Unknown error'),
        retryable: true,
        suggestion: 'Please try again or check your input'
      }
    );
  }
} 