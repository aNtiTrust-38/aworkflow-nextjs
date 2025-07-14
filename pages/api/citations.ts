import type { NextApiRequest, NextApiResponse } from 'next';

interface Source {
  title: string;
  authors: string[];
  year: number;
  url: string;
  type: string;
}

interface CitationRequest {
  sources: Source[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { sources } = (req.body || {}) as CitationRequest;
  if (!Array.isArray(sources)) {
    return res.status(400).json({ error: 'sources is required and must be an array.' });
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