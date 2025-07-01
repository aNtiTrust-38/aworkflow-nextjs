import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ prompt?: string, rubric?: any }> {
  return new Promise((resolve, reject) => {
    import('formidable').then(({ IncomingForm }) => {
      const form = new IncomingForm();
      let rubric: any = undefined;
      form.on('file', (field, file) => {
        if (field === 'rubric') rubric = file;
      });
      form.parse(req, (err: Error | null, fields: any) => {
        if (err) return reject(err);
        let promptValue: string | undefined = undefined;
        if (typeof fields.prompt === 'string') {
          promptValue = fields.prompt;
        } else if (Array.isArray(fields.prompt)) {
          promptValue = fields.prompt[0];
        }
        resolve({ prompt: promptValue, rubric });
      });
    }).catch(reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let prompt = '';
  let rubric: any = undefined;
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    try {
      const result = await parseForm(req);
      prompt = result.prompt || '';
      rubric = result.rubric;
    } catch (err: any) {
      return res.status(400).json({ error: 'Failed to parse form data.' });
    }
  } else {
    prompt = req.body.prompt || req.body;
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  // GREEN PHASE: Return stub data for TDD
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