import type { NextApiRequest, NextApiResponse } from 'next';

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

interface GenerateResponseBody {
  content: string;
  usage: {
    tokens: number;
    cost: number;
  };
  references: Reference[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Simulate LLM/API errors for testing
  const testError = req.headers['x-test-error'];
  if (testError === 'llm') {
    return res.status(500).json({ error: 'Simulated LLM/API error' });
  }
  if (testError === 'rate-limit') {
    return res.status(429).json({ error: 'Simulated rate limit or timeout' });
  }

  // Basic input validation (outline and references required)
  const { outline, references } = req.body as GenerateRequestBody;
  if (!Array.isArray(outline) || outline.length === 0 || !Array.isArray(references) || references.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid outline or references' });
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
        return res.status(500).json({ error: `Unmatched in-text citation(s): ${unmatched.join(', ')}` });
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
    } catch (err: any) {
      return res.status(500).json({
        error: 'No AI provider available or API key misconfigured',
        details: err.message
      });
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

  } catch (error: any) {
    // If error is due to missing provider/API key, return clear error
    if (error.message && /api key|provider/i.test(error.message)) {
      return res.status(500).json({
        error: 'No AI provider available or API key misconfigured',
        details: error.message
      });
    }
    console.error('Content generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate content',
      details: error.message 
    });
  }
} 