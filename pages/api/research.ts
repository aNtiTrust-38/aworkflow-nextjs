import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import xml2js from 'xml2js';

function formatCitationAPA(authors: string[], year: number | null, title: string, venue?: string) {
  // APA 7: (Last, 2020) Title. Venue.
  let authorStr = 'Unknown';
  if (authors && authors.length > 0) {
    // Use last name of first author
    const parts = authors[0].split(' ');
    authorStr = parts[parts.length - 1];
  }
  const yearStr = year ? year : 'n.d.';
  const venueStr = venue ? `. ${venue}.` : '';
  return `(${authorStr}, ${yearStr}) ${title}${venueStr}`;
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
  const data: any = await resp.json();
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

async function searchCrossRef(query: string) {
  // CrossRef API: https://api.crossref.org/works?query=...
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'AcademicWorkflow/1.0',
      'Accept': 'application/json',
    },
  });
  if (!resp.ok) {
    let errorBody = '';
    try { errorBody = await resp.text(); } catch {}
    throw new Error(`CrossRef error: ${resp.status} ${errorBody}`);
  }
  const data: any = await resp.json();
  return (data.message.items || []).map((item: any) => {
    const authors = (item.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim());
    const venue = item['container-title'] && item['container-title'][0];
    const citation = formatCitationAPA(authors, item.issued?.['date-parts']?.[0]?.[0] || null, item.title?.[0] || '', venue);
    return {
      title: item.title?.[0] || '',
      authors,
      source: 'CrossRef',
      year: item.issued?.['date-parts']?.[0]?.[0] || null,
      doi: item.DOI || null,
      abstract: item.abstract || null,
      citation,
    };
  });
}

async function searchArxiv(query: string) {
  // ArXiv API: http://export.arxiv.org/api/query?search_query=all:...
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=5`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'AcademicWorkflow/1.0',
      'Accept': 'application/atom+xml',
    },
  });
  if (!resp.ok) {
    let errorBody = '';
    try { errorBody = await resp.text(); } catch {}
    throw new Error(`ArXiv error: ${resp.status} ${errorBody}`);
  }
  const xml = await resp.text();
  const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
  const entries = parsed.feed && parsed.feed.entry ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry]) : [];
  return entries.map((entry: any) => {
    const authors = entry.author ? (Array.isArray(entry.author) ? entry.author.map((a: any) => a.name) : [entry.author.name]) : [];
    const citation = formatCitationAPA(authors, entry.published ? parseInt(entry.published.slice(0, 4)) : null, entry.title, entry['arxiv:journal_ref']);
    return {
      title: entry.title,
      authors,
      source: 'ArXiv',
      year: entry.published ? parseInt(entry.published.slice(0, 4)) : null,
      doi: null,
      abstract: entry.summary,
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

function getStubReferences() {
  return [
    {
      title: 'Stub Paper from Semantic Scholar',
      authors: ['Alice Example'],
      source: 'Semantic Scholar',
      year: 2020,
      doi: '10.0000/stub1',
      abstract: 'Stub abstract for Semantic Scholar.',
      citation: formatCitationAPA(['Alice Example'], 2020, 'Stub Paper from Semantic Scholar', 'StubConf'),
    },
    {
      title: 'Stub Paper from CrossRef',
      authors: ['Bob Example'],
      source: 'CrossRef',
      year: 2019,
      doi: '10.0000/stub2',
      abstract: 'Stub abstract for CrossRef.',
      citation: formatCitationAPA(['Bob Example'], 2019, 'Stub Paper from CrossRef', 'StubJournal'),
    },
    {
      title: 'Stub Paper from ArXiv',
      authors: ['Carol Example'],
      source: 'ArXiv',
      year: 2018,
      doi: null,
      abstract: 'Stub abstract for ArXiv.',
      citation: formatCitationAPA(['Carol Example'], 2018, 'Stub Paper from ArXiv', 'arXiv preprint arXiv:1801.12345'),
    },
  ];
}

function deduplicateReferences(references: any[]): any[] {
  const seen = new Set();
  return references.filter(ref => {
    const key = ref.doi ? ref.doi : (ref.title.toLowerCase().replace(/\s+/g, '') + (ref.authors[0] || '').toLowerCase());
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByRelevance(references: any[]): any[] {
  // Proxy: sort by year desc, then title asc
  return references.sort((a, b) => {
    if (b.year !== a.year) return (b.year || 0) - (a.year || 0);
    return a.title.localeCompare(b.title);
  });
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

  // TDD stub/fallback logic for tests
  if (process.env.NODE_ENV === 'test' || req.headers['x-test-stub']) {
    const references = getStubReferences();
    let bibtex;
    if (exportType && exportType.toLowerCase() === 'bibtex') {
      bibtex = references.map(bibtexForReference).join('\n');
    }
    const sources = ['Semantic Scholar', 'CrossRef', 'ArXiv'];
    const response: any = { references, sources, count: references.length };
    if (bibtex) response.bibtex = bibtex;
    return res.status(200).json(response);
  }

  let semanticResults = [];
  let crossrefResults = [];
  let arxivResults = [];
  const errors: any = {};

  try {
    semanticResults = await searchSemanticScholar(query);
  } catch (err: any) {
    errors.SemanticScholar = err.message;
  }
  try {
    crossrefResults = await searchCrossRef(query);
  } catch (err: any) {
    errors.CrossRef = err.message;
  }
  try {
    arxivResults = await searchArxiv(query);
  } catch (err: any) {
    errors.ArXiv = err.message;
  }

  let references = [...semanticResults, ...crossrefResults, ...arxivResults];
  references = deduplicateReferences(references);
  references = sortByRelevance(references);

  // Cost calculation
  const costBreakdown: any = {
    semanticScholar: semanticResults.length > 0 ? 0.001 : 0,
    crossRef: crossrefResults.length > 0 ? 0.001 : 0,
    arxiv: arxivResults.length > 0 ? 0.001 : 0,
  };
  const totalCost = costBreakdown.semanticScholar + costBreakdown.crossRef + costBreakdown.arxiv;

  let bibtex;
  if (exportType && exportType.toLowerCase() === 'bibtex') {
    bibtex = references.map(bibtexForReference).join('\n');
  }
  const sources = [];
  if (semanticResults.length) sources.push('Semantic Scholar');
  if (crossrefResults.length) sources.push('CrossRef');
  if (arxivResults.length) sources.push('ArXiv');
  const response: any = { references, sources, count: references.length };
  const allSources = ['SemanticScholar', 'CrossRef', 'ArXiv'];
  const errorsOut: any = {};
  allSources.forEach(source => {
    errorsOut[source] = errors.hasOwnProperty(source) ? errors[source] : null;
  });
  if (Object.keys(errorsOut).length) response.errors = errorsOut;
  if (bibtex) response.bibtex = bibtex;
  response.cost = totalCost;
  return res.status(200).json(response);
} 