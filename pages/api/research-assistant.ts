import type { NextApiRequest, NextApiResponse } from 'next';
import { createErrorResponse, sanitizeErrorMessage } from '../../lib/error-utils';
import { 
  validateRequired, 
  validateStringLength,
  validateArray,
  ValidationErrorCollector,
  createValidationErrorResponse 
} from '../../lib/validation-utils';

interface ResearchRequest {
  prompt?: string;
  goals?: string[];
  query?: string;
  topics?: string[];
  researchQuestions?: string[];
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
  const { prompt, goals, query, topics, researchQuestions } = req.body as ResearchRequest || {};

  // Validate query/prompt (main research parameter)
  if (query !== undefined) {
    const queryValidation = validateRequired(query, 'query');
    if (!queryValidation.valid && queryValidation.error) {
      collector.addError(queryValidation.error);
    } else {
      const lengthValidation = validateStringLength(query, 'query', { min: 10, max: 2000 });
      if (!lengthValidation.valid && lengthValidation.error) {
        collector.addError(lengthValidation.error);
      }
    }
  } else if (prompt !== undefined) {
    const promptValidation = validateRequired(prompt, 'prompt');
    if (!promptValidation.valid && promptValidation.error) {
      collector.addError(promptValidation.error);
    } else {
      const lengthValidation = validateStringLength(prompt, 'prompt', { min: 10, max: 2000 });
      if (!lengthValidation.valid && lengthValidation.error) {
        collector.addError(lengthValidation.error);
      }
    }
  } else {
    collector.addError({
      field: 'query',
      message: 'query or prompt is required',
      code: 'MISSING_REQUIRED_FIELD',
      suggestion: 'Please provide a research query or prompt'
    });
  }

  // Validate topics array if provided (backward compatibility)
  if (topics !== undefined) {
    const topicsValidation = validateArray(topics, 'topics', { minLength: 1 });
    if (!topicsValidation.valid && topicsValidation.error) {
      collector.addError(topicsValidation.error);
    }
  }

  // Validate research questions array if provided (backward compatibility)
  if (researchQuestions !== undefined) {
    const questionsValidation = validateArray(researchQuestions, 'researchQuestions', { minLength: 1 });
    if (!questionsValidation.valid && questionsValidation.error) {
      collector.addError(questionsValidation.error);
    }
  }

  // Validate goals array if provided
  if (goals !== undefined) {
    const goalsValidation = validateArray(goals, 'goals', { minLength: 1, maxLength: 10 });
    if (!goalsValidation.valid && goalsValidation.error) {
      collector.addError(goalsValidation.error);
    }
  }

  // Return validation errors if any
  if (collector.hasErrors()) {
    return createValidationErrorResponse(res, collector.getErrors(), req);
  }
  // GREEN PHASE: Return stub data for TDD
  return res.status(200).json({
    academicSources: [
      { title: 'Physical Security in Data Centers', url: 'https://semanticscholar.org/paper/123', type: 'academic', authors: ['Smith, J.'], year: 2022, summary: 'Discusses best practices for physical security.' }
    ],
    industrySources: [
      { title: 'Modern Data Center Security', url: 'https://company.com/blog/datacenter-security', type: 'industry', year: 2023, summary: 'Industry blog on security.' }
    ],
    professionalSources: [
      { title: 'NIST Data Center Guidelines', url: 'https://nist.gov/datacenter', type: 'professional', year: 2021, summary: 'Government guidelines for data centers.' }
    ],
    qualityIndicators: [
      { sourceTitle: 'Physical Security in Data Centers', credibility: 5, notes: 'Peer-reviewed academic source.' },
      { sourceTitle: 'Modern Data Center Security', credibility: 4, notes: 'Reputable industry blog.' },
      { sourceTitle: 'NIST Data Center Guidelines', credibility: 5, notes: 'Official government publication.' }
    ]
  });
} 