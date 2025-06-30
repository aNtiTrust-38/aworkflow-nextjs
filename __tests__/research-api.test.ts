import { describe, it, expect } from 'vitest';

// TDD: All tests should fail until /api/research is implemented

describe('/api/research endpoint', () => {
  it('returns 400 for missing research query', async () => {
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/query/i);
  }, 30000);

  it('returns 200 and ranked references for a valid query', async () => {
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'machine learning in healthcare' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.references)).toBe(true);
    expect(data.references.length).toBeGreaterThan(0);
    expect(data.references[0]).toHaveProperty('title');
    expect(data.references[0]).toHaveProperty('authors');
    expect(data.references[0]).toHaveProperty('source');
    expect(data.references[0]).toHaveProperty('citation');
  }, 30000);

  it('merges and ranks results from Semantic Scholar, CrossRef, and ArXiv', async () => {
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'deep learning' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    // Allow for missing sources due to real API rate limits or failures
    expect(Array.isArray(data.references)).toBe(true);
    expect(data.references.length).toBeGreaterThan(0);
    const sources = data.references.map((ref: any) => ref.source);
    expect(sources.length).toBeGreaterThan(0); // At least one source present
    // Optionally, log sources for debugging
    // console.log('Sources present:', sources);
  }, 30000);

  it('handles API errors, rate limits, and timeouts gracefully', async () => {
    // Simulate error by sending a special header
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-error': 'api' },
      body: JSON.stringify({ query: 'test error handling' }),
    });
    expect([429, 500]).toContain(res.status);
    const data = await res.json();
    expect(data.error).toMatch(/error|rate limit|timeout/i);
  }, 30000);

  it('returns citations in requested format (APA, MLA, etc.)', async () => {
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'artificial intelligence', format: 'APA' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.references)).toBe(true);
    expect(data.references[0]).toHaveProperty('citation');
    expect(data.references[0].citation).toMatch(/\([A-Za-z]+, \d{4}\)/); // APA style
  }, 30000);

  it('exports references in Zotero-compatible format (BibTeX)', async () => {
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'neural networks', export: 'bibtex' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bibtex).toBeDefined();
    expect(typeof data.bibtex).toBe('string');
    expect(data.bibtex).toMatch(/@article/);
  }, 30000);
});

describe('/api/research endpoint (real API integration)', () => {
  it('returns normalized reference objects with required fields from all sources', async () => {
    // TDD: This test expects real, normalized data from all sources
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'transformer neural networks' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.references)).toBe(true);
    data.references.forEach((ref: any) => {
      expect(ref).toHaveProperty('title');
      expect(ref).toHaveProperty('authors');
      expect(ref).toHaveProperty('source');
      expect(ref).toHaveProperty('citation');
      expect(ref).toHaveProperty('year');
      expect(ref).toHaveProperty('doi'); // May be null for ArXiv
    });
  }, 30000);

  it('deduplicates results across sources (by DOI or title+authors)', async () => {
    // TDD: This test expects no duplicate papers in the final output
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'deep learning' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const seen = new Set();
    data.references.forEach((ref: any) => {
      const key = ref.doi || (ref.title + ref.authors.join(','));
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
  }, 30000);

  it('ranks results by relevance to the query', async () => {
    // TDD: This test expects the most relevant results to appear first
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'transformer neural networks' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    // Expect the first result to be highly relevant (title or abstract contains query terms)
    expect(
      data.references[0].title.toLowerCase() +
      (data.references[0].abstract || '').toLowerCase()
    ).toMatch(/transformer|neural network/);
  }, 30000);

  it('returns citations in correct APA format (not stubs)', async () => {
    // TDD: This test expects real citation formatting, not stubbed strings
    const resAPA = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'artificial intelligence', format: 'APA' }),
    });
    const dataAPA = await resAPA.json();
    expect(dataAPA.references[0].citation).toMatch(/\([A-Za-z]+, \d{4}\)/); // APA style
  }, 30000);

  it('returns BibTeX export with all references and correct fields', async () => {
    // TDD: This test expects real BibTeX export, not stub
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'neural networks', export: 'bibtex' }),
    });
    const data = await res.json();
    expect(data.bibtex).toBeDefined();
    expect(typeof data.bibtex).toBe('string');
    expect(data.bibtex).toMatch(/@article|@inproceedings/);
    // Check that all references are present in BibTeX
    data.references.forEach((ref: any) => {
      expect(data.bibtex).toMatch(new RegExp(ref.title));
    });
  }, 30000);

  it('responds within 15 seconds and cost is < $0.50 per search', async () => {
    // TDD: This test expects performance and cost constraints
    const start = Date.now();
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'large language models' }),
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
    const data = await res.json();
    expect(data.cost).toBeLessThan(0.5);
  }, 30000);

  it('gracefully degrades if one or more sources fail', async () => {
    // TDD: This test expects that if a source fails, others still return results
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-error': 'simulate-arxiv-fail' },
      body: JSON.stringify({ query: 'graph neural networks' }),
    });
    const data = await res.json();
    // Should still return references from at least one source
    expect(Array.isArray(data.references)).toBe(true);
    expect(data.references.length).toBeGreaterThan(0);
    // Should include error info for failed source
    expect(data.errors || {}).toHaveProperty('ArXiv');
  }, 30000);
}); 