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

    const result = await router.generateWithFailover(structurePrompt, TaskType.OUTLINE);
    
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

  } catch (error: any) {
    console.error('Structure guidance error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate structure guidance',
      details: error.message 
    });
  }
} 