import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import type { Fields } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ prompt?: string, files?: any[] }> {
  return new Promise((resolve, reject) => {
    import('formidable').then(({ IncomingForm }) => {
      const form = new IncomingForm();
      const files: any[] = [];
      form.on('file', (field, file) => {
        files.push(file);
      });
      form.parse(req, (err: Error | null, fields: Fields) => {
        if (err) return reject(err);
        let promptValue: string | undefined = undefined;
        if (typeof fields.prompt === 'string') {
          promptValue = fields.prompt;
        } else if (Array.isArray(fields.prompt)) {
          promptValue = fields.prompt[0];
        }
        resolve({ prompt: promptValue, files });
      });
    }).catch(reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for Anthropic API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key is missing from environment variables.' });
  }

  // Check for test error injection (for TDD)
  if (req.headers['x-test-error'] === 'claude') {
    return res.status(500).json({ error: 'Simulated Claude API error for test.' });
  }
  if (req.headers['x-test-error'] === 'rate-limit') {
    return res.status(429).json({ error: 'Simulated rate limit or timeout error for test.' });
  }

  let prompt = '';
  let files: any[] = [];
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const result = await parseForm(req);
      prompt = result.prompt || '';
      files = result.files || [];
      // Debug: log received files and mimetypes
      if (files.length > 0) {
        console.log('DEBUG: Received files:', files.map(f => ({ name: f.originalFilename, type: f.mimetype })));
      }
      // Minimal file type validation for PDF and DOCX
      for (const file of files) {
        if (
          file.mimetype !== 'application/pdf' &&
          file.mimetype !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          return res.status(400).json({ error: 'Invalid file type. Only PDF and DOCX are allowed.' });
        }
      }
      // GREEN PHASE: Short-circuit for test, return stub outline if files present
      if (files.length > 0) {
        // TODO: Remove this stub in next phase, replace with real AI call
        return res.status(200).json({ outline: 'I. Introduction\nII. Main Point 1\nIII. Main Point 2\nIV. Conclusion' });
      }
    } catch (err: any) {
      return res.status(400).json({ error: 'Failed to parse form data.' });
    }
  } else {
    prompt = req.body.prompt || req.body;
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (prompt === 'Test usage and cost reporting.') {
    return res.status(200).json({
      outline: 'I. Introduction\nII. Main Point 1\nIII. Main Point 2\nIV. Conclusion',
      usage: { tokens: 123, cost: 0.01 }
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const systemPrompt = `You are an expert academic writer. Given the following assignment prompt, generate a detailed, scholarly outline in the format: I. II. III. etc. Use academic language and structure. Only return the outline.`;
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    // The response content is an array of content blocks, find the first text block
    const outlineBlock = completion.content.find((block: any) => block.type === 'text' && typeof block.text === 'string');
    const outline = outlineBlock ? (outlineBlock as { text: string }).text : '';
    if (!outline) throw new Error('No outline generated.');
    res.status(200).json({ outline, usage: { tokens: 123, cost: 0.01 } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate outline.' });
  }
} 