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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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

  // Expanded implementation: handle multiple sections and citations
  const paragraphs = outline.map((section, idx) => {
    const ref = references[idx % references.length];
    return `${section.section}\n\n${section.content} ${ref.citation}`;
  });
  const content = paragraphs.join('\n\n');

  // Reference linking/validation: ensure all in-text citations match provided references
  const citationSet = new Set(references.map(r => r.citation));
  const citationRegex = /\(([^)]+, \d{4})\)/g; // Matches APA-style (Author, Year)
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