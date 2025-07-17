import type { NextApiRequest, NextApiResponse } from 'next';
import { createErrorResponse, sanitizeErrorMessage } from '../../lib/error-utils';
import { 
  validateRequired, 
  validateStringLength,
  validateOutlineType,
  ValidationErrorCollector,
  createValidationErrorResponse 
} from '../../lib/validation-utils';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface RubricFile {
  name?: string;
  path?: string;
  [key: string]: unknown;
}

interface FormFields {
  prompt?: string | string[];
  outlineType?: string | string[];
  [key: string]: unknown;
}

function parseForm(req: NextApiRequest): Promise<{ prompt?: string, outlineType?: string, rubric?: RubricFile }> {
  return new Promise((resolve, reject) => {
    import('formidable').then(({ IncomingForm }) => {
      const form = new IncomingForm();
      let rubric: RubricFile | undefined = undefined;
      form.on('file', (field, file) => {
        if (field === 'rubric') rubric = file as unknown as RubricFile;
      });
      form.parse(req, (err: Error | null, fields: FormFields) => {
        if (err) return reject(err);
        let promptValue: string | undefined = undefined;
        let outlineTypeValue: string | undefined = undefined;
        
        if (typeof fields.prompt === 'string') {
          promptValue = fields.prompt;
        } else if (Array.isArray(fields.prompt)) {
          promptValue = fields.prompt[0];
        }
        
        if (typeof fields.outlineType === 'string') {
          outlineTypeValue = fields.outlineType;
        } else if (Array.isArray(fields.outlineType)) {
          outlineTypeValue = fields.outlineType[0];
        }
        
        resolve({ prompt: promptValue, outlineType: outlineTypeValue, rubric });
      });
    }).catch(reject);
  });
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
  let prompt = '';
  let outlineType = '';
  let rubric: RubricFile | undefined = undefined;

  if (req.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const result = await parseForm(req);
      prompt = result.prompt || '';
      outlineType = result.outlineType || '';
      rubric = result.rubric;
      void rubric; // Acknowledge unused variable for future implementation
    } catch (err: unknown) {
      return createErrorResponse(
        res,
        400,
        'FORM_PARSING_ERROR',
        'Failed to parse form data',
        req,
        { 
          details: sanitizeErrorMessage(err),
          suggestion: 'Please ensure form data is properly formatted'
        }
      );
    }
  } else {
    prompt = req.body.prompt || req.body;
    outlineType = req.body.outlineType || '';
  }

  // Validate prompt
  const promptValidation = validateRequired(prompt, 'prompt');
  if (!promptValidation.valid && promptValidation.error) {
    collector.addError(promptValidation.error);
  } else if (prompt) {
    const lengthValidation = validateStringLength(prompt, 'prompt', { min: 10, max: 2000 });
    if (!lengthValidation.valid && lengthValidation.error) {
      collector.addError(lengthValidation.error);
    }
  }

  // Validate outline type if provided
  if (outlineType && outlineType.trim() !== '') {
    const outlineTypeValidation = validateOutlineType(outlineType);
    if (!outlineTypeValidation.valid && outlineTypeValidation.error) {
      collector.addError(outlineTypeValidation.error);
    }
  }

  // Return validation errors if any
  if (collector.hasErrors()) {
    return createValidationErrorResponse(res, collector.getErrors(), req);
  }

  try {
    // For test mode, return stub data
    if (req.headers['x-test-stub']) {
      return res.status(200).json({
        adhdFriendlyGoals: "To get an 'A', you need to: 1) Understand secure data center design, 2) Address all rubric points, 3) Use credible sources, 4) Follow academic structure.",
        structureOutline: "I. Introduction\nII. Key Principles\nIII. Design Considerations\nIV. Conclusion",
        formatExamples: "Example: 'A secure data center must address both physical and digital threats...'.",
        checklist: [
          "Read the assignment prompt and rubric",
          "List key requirements",
          "Find at least 3 academic sources",
          "Draft an outline",
          "Check formatting and citations"
        ]
      });
    }

    // Use AI router for real implementation
    const { getAIRouter } = await import('../../lib/ai-router-config');
    const { TaskType } = await import('../../lib/ai-providers');
    
    const router = getAIRouter();
    
    const structurePrompt = `
You are an expert academic writing coach. Help create an academic paper structure based on this assignment prompt: "${prompt}"

Please provide:
1. ADHD-friendly goals (clear, specific objectives)
2. A detailed structure outline with main sections
3. Format examples showing how to write each section
4. A step-by-step checklist for completing the assignment

Format your response as JSON with these keys:
- adhdFriendlyGoals: string
- structureOutline: string  
- formatExamples: string
- checklist: array of strings
`;

    const result = await (await router).generateWithFailover(structurePrompt, TaskType.OUTLINE);
    
    // Try to parse as JSON first, fallback to structured text
    let response;
    try {
      response = JSON.parse(result.content);
    } catch {
      // Fallback to manual parsing or default structure
      response = {
        adhdFriendlyGoals: "Break down the assignment into manageable steps and focus on meeting all requirements systematically.",
        structureOutline: result.content.split('\n').slice(0, 10).join('\n'),
        formatExamples: "Follow academic writing conventions with clear topic sentences and supporting evidence.",
        checklist: [
          "Read and understand the prompt",
          "Research relevant sources", 
          "Create an outline",
          "Write first draft",
          "Review and revise"
        ]
      };
    }

    // Add usage metadata
    response.usage = {
      tokens: result.usage.totalTokens,
      cost: result.cost,
      provider: result.provider
    };

    return res.status(200).json(response);

  } catch (error: unknown) {
    console.error('Structure guidance error:', error);
    return createErrorResponse(
      res,
      500,
      'CONTENT_GENERATION_ERROR',
      'Failed to generate structure guidance',
      req,
      { 
        details: sanitizeErrorMessage(error),
        retryable: true,
        suggestion: 'Please try again or simplify your prompt'
      }
    );
  }
} 