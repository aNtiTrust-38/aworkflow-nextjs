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
  });

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
    // Should include a source field indicating the origin
    const sources = data.references.map((ref: any) => ref.source);
    expect(sources).toContain('Semantic Scholar');
    expect(sources).toContain('CrossRef');
    expect(sources).toContain('ArXiv');
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
  });

  it('returns citations in requested format (APA, MLA, etc.)', async () => {
    const res = await fetch('http://localhost:3000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'artificial intelligence', format: 'MLA' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.references)).toBe(true);
    expect(data.references[0]).toHaveProperty('citation');
    expect(data.references[0].citation).toMatch(/\(\d{4}\)/); // Year in citation
  });

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
  });
}); 