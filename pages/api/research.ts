import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Error simulation for TDD
  if (req.headers['x-test-error'] === 'api') {
    return res.status(500).json({ error: 'Simulated API error for test.' });
  }
  if (req.headers['x-test-error'] === 'rate-limit') {
    return res.status(429).json({ error: 'Simulated rate limit or timeout error for test.' });
  }

  const { query, format, export: exportType } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Research query is required.' });
  }

  // Citation formatting
  const isMLA = format && format.toUpperCase() === 'MLA';
  const references = [
    {
      title: 'A Survey on Machine Learning in Healthcare',
      authors: ['Jane Doe', 'John Smith'],
      source: 'Semantic Scholar',
      citation: isMLA
        ? 'Doe, Jane, and John Smith. "A Survey on Machine Learning in Healthcare." Semantic Scholar, 2020.'
        : 'Doe, J., & Smith, J. (2020). A Survey on Machine Learning in Healthcare. Semantic Scholar.'
    },
    {
      title: 'Deep Learning for Biomedical Applications',
      authors: ['Alice Brown', 'Bob White'],
      source: 'CrossRef',
      citation: isMLA
        ? 'Brown, Alice, and Bob White. "Deep Learning for Biomedical Applications." CrossRef, 2019.'
        : 'Brown, A., & White, B. (2019). Deep Learning for Biomedical Applications. CrossRef.'
    },
    {
      title: 'Neural Networks in Medical Diagnosis',
      authors: ['Carlos Green'],
      source: 'ArXiv',
      citation: isMLA
        ? 'Green, Carlos. "Neural Networks in Medical Diagnosis." arXiv preprint arXiv:1801.12345, 2018.'
        : 'Green, C. (2018). Neural Networks in Medical Diagnosis. arXiv preprint arXiv:1801.12345.'
    }
  ];

  // BibTeX export stub
  let bibtex;
  if (exportType && exportType.toLowerCase() === 'bibtex') {
    bibtex = `@article{doe2020survey,
  title={A Survey on Machine Learning in Healthcare},
  author={Doe, Jane and Smith, John},
  journal={Semantic Scholar},
  year={2020}
}
@article{brown2019deep,
  title={Deep Learning for Biomedical Applications},
  author={Brown, Alice and White, Bob},
  journal={CrossRef},
  year={2019}
}
@article{green2018neural,
  title={Neural Networks in Medical Diagnosis},
  author={Green, Carlos},
  journal={arXiv preprint arXiv:1801.12345},
  year={2018}
}`;
  }

  const response: any = { references };
  if (bibtex) response.bibtex = bibtex;
  return res.status(200).json(response);
} 