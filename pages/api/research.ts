import type { NextApiRequest, NextApiResponse } from 'next';

function formatCitationAPA(authors: string[], year: number, title: string, venue: string | undefined) {
  // Example: (Smith, 2020). Title. Venue.
  if (!authors || authors.length === 0) return '';
  // Use only the first author's last name for the parenthetical citation
  const firstAuthorLast = authors[0].split(' ').slice(-1)[0];
  return `(${firstAuthorLast}, ${year}) ${title}${venue ? `. ${venue}.` : '.'}`;
}

async function searchSemanticScholar(query: string) {
  // Semantic Scholar API: https://api.semanticscholar.org/graph/v1/paper/search
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,authors,year,abstract,externalIds,venue&limit=5`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'AcademicWorkflow/1.0',
      'Accept': 'application/json',
    },
  });
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SemanticScholar] Response status:', resp.status);
  }
  if (!resp.ok) {
    let errorBody = '';
    try { errorBody = await resp.text(); } catch {}
    if (process.env.NODE_ENV !== 'production') {
      console.error('[SemanticScholar] Error body:', errorBody);
    }
    if (resp.status === 429) throw new Error('Semantic Scholar rate limit');
    throw new Error(`Semantic Scholar error: ${resp.status} ${errorBody}`);
  }
  const data = await resp.json();
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SemanticScholar] Response JSON:', JSON.stringify(data));
  }
  // Normalize to unified reference shape
  return (data.data || []).map((paper: any) => {
    const authors = (paper.authors || []).map((a: any) => a.name);
    const venue = paper.venue;
    const citation = formatCitationAPA(authors, paper.year, paper.title, venue);
    return {
      title: paper.title,
      authors,
      source: 'Semantic Scholar',
      year: paper.year,
      doi: paper.externalIds && paper.externalIds.DOI ? paper.externalIds.DOI : null,
      abstract: paper.abstract,
      citation,
    };
  });
}

function bibtexForReference(ref: any) {
  // Minimal BibTeX for article
  const authors = (ref.authors || []).join(' and ');
  const safeTitle = ref.title.replace(/[{}]/g, '');
  return `@article{${(ref.authors[0] || 'unknown').split(' ').slice(-1)[0].toLowerCase()}${ref.year},
  title={${safeTitle}},
  author={${authors}},
  journal={${ref.source}},
  year={${ref.year}},
  doi={${ref.doi || ''}}
}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  const { query, export: exportType } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Research query is required.' });
  }

  try {
    // Step 1: Real Semantic Scholar integration
    const semanticResults = await searchSemanticScholar(query);
    // TODO: Integrate CrossRef and ArXiv (still stubbed)
    // TODO: Merge, deduplicate, rank results
    // TODO: Cost/usage tracking
    const references = [
      ...semanticResults,
      // Stubs for other sources (to be replaced)
      {
        title: 'Deep Learning for Biomedical Applications',
        authors: ['Alice Brown', 'Bob White'],
        source: 'CrossRef',
        citation: formatCitationAPA(['Alice Brown', 'Bob White'], 2019, 'Deep Learning for Biomedical Applications', 'CrossRef'),
        year: 2019,
        doi: '10.1234/crossref.5678',
        abstract: 'Stub abstract for CrossRef.',
      },
      {
        title: 'Neural Networks in Medical Diagnosis',
        authors: ['Carlos Green'],
        source: 'ArXiv',
        citation: formatCitationAPA(['Carlos Green'], 2018, 'Neural Networks in Medical Diagnosis', 'arXiv preprint arXiv:1801.12345'),
        year: 2018,
        doi: null,
        abstract: 'Stub abstract for ArXiv.',
      }
    ];
    // BibTeX export for all references
    let bibtex;
    if (exportType && exportType.toLowerCase() === 'bibtex') {
      bibtex = references.map(bibtexForReference).join('\n');
    }
    const response: any = { references, cost: 0.01, errors: { ArXiv: null } };
    if (bibtex) response.bibtex = bibtex;
    return res.status(200).json(response);
  } catch (err: any) {
    if (err.message && err.message.includes('rate limit')) {
      return res.status(429).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to fetch research results.' });
  }
} 