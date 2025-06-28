import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For now, just return a stub outline
  res.status(200).json({ outline: 'I. Introduction\nII. Main Point 1\nIII. Main Point 2\nIV. Conclusion' });
} 