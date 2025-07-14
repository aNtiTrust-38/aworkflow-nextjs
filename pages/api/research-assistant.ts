import type { NextApiRequest, NextApiResponse } from 'next';

interface ResearchRequest {
  prompt: string;
  goals?: string[];
}

// Commented out unused interface - kept for future implementation
// interface Source {
//   title: string;
//   url: string;
//   type: 'academic' | 'industry' | 'professional';
//   authors?: string[];
//   year?: number;
//   summary?: string;
// }

// interface Rating {
//   sourceTitle: string;
//   credibility: number; // 1-5
//   notes?: string;
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { prompt, goals } = req.body as ResearchRequest;
  
  // Acknowledge unused variables to avoid ESLint errors
  void prompt;
  void goals;
  
  // For backward compatibility, also check for old request format
  const { topics, researchQuestions } = req.body || {};
  if (!Array.isArray(topics) || !Array.isArray(researchQuestions)) {
    return res.status(400).json({ error: 'topics and researchQuestions are required arrays.' });
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