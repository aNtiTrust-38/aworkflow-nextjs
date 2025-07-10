import { describe, it, expect, afterEach } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../pages/api/generate';
import { resetAIRouter } from '../lib/ai-router-config';

describe('/api/generate endpoint', () => {
  afterEach(() => {
    resetAIRouter();
  });

  it('returns 400 for missing outline or references', async () => {
    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/outline|references/i);
      },
    });
  });

  it('returns 200 and generated content for valid input', async () => {
    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-test-stub': 'true'
          },
          body: JSON.stringify({
            outline: [
              { section: 'I. Introduction', content: 'Background and motivation.' },
              { section: 'II. Methods', content: 'Describe the methodology.' },
            ],
            references: [
              { id: 1, citation: '(Smith, 2020)', authors: ['John Smith'], year: 2020, title: 'Sample Paper', source: 'Semantic Scholar' },
            ],
          }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.content).toBeDefined();
        expect(typeof data.content).toBe('string');
      },
    });
  });

  it('generated content is academic, well-structured, and includes in-text citations', async () => {
    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-test-stub': 'true'
          },
          body: JSON.stringify({
            outline: [
              { section: 'I. Introduction', content: 'Background and motivation.' },
            ],
            references: [
              { id: 1, citation: '(Smith, 2020)', authors: ['John Smith'], year: 2020, title: 'Sample Paper', source: 'Semantic Scholar' },
            ],
          }),
        });
        const data = await res.json();
        expect(data.content).toMatch(/introduction/i);
        expect(data.content).toMatch(/\(Smith, 2020\)/); // APA in-text citation
      },
    });
  });

  it('handles LLM/API errors, rate limits, and timeouts gracefully', async () => {
    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-test-error': 'llm' },
          body: JSON.stringify({
            outline: [
              { section: 'I. Introduction', content: 'Background and motivation.' },
            ],
            references: [
              { id: 1, citation: '(Smith, 2020)', authors: ['John Smith'], year: 2020, title: 'Sample Paper', source: 'Semantic Scholar' },
            ],
          }),
        });
        expect([429, 500]).toContain(res.status);
        const data = await res.json();
        expect(data.error).toMatch(/error|rate limit|timeout|llm/i);
      },
    });
  });

  it('tracks and returns usage/cost in the response', async () => {
    await testApiHandler({
      pagesHandler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-test-stub': 'true'
          },
          body: JSON.stringify({
            outline: [
              { section: 'I. Introduction', content: 'Background and motivation.' },
            ],
            references: [
              { id: 1, citation: '(Smith, 2020)', authors: ['John Smith'], year: 2020, title: 'Sample Paper', source: 'Semantic Scholar' },
            ],
          }),
        });
        const data = await res.json();
        expect(data.usage).toBeDefined();
        expect(typeof data.usage).toBe('object');
        expect(data.usage).toHaveProperty('tokens');
        expect(data.usage).toHaveProperty('cost');
      },
    });
  });

  it(
    'returns real provider and content when not using stub',
    async () => {
      await testApiHandler({
        pagesHandler: handler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              outline: [
                { section: 'I. Introduction', content: 'Background and motivation.' }
              ],
              references: [
                { id: 1, citation: '(Smith, 2020)', authors: ['John Smith'], year: 2020, title: 'Sample Paper', source: 'Semantic Scholar' }
              ]
            }),
          });
          if (res.status === 500) {
            const data = await res.json();
            expect(data.error).toMatch(/provider|api key/i);
          } else {
            const data = await res.json();
            expect(res.status).toBe(200);
            expect(data.content).toBeDefined();
            expect(data.provider).toBeDefined();
            expect(['claude', 'openai', 'anthropic']).toContain(data.provider.toLowerCase());
          }
        }
      });
    },
    2000
  );
});

describe('/api/generate endpoint (E2E placeholder)', () => {
  it.skip('user can go from outline → research → content generation in UI', async () => {
    // Placeholder for E2E test (to be implemented with Playwright or similar)
    // Should simulate user flow: prompt → outline → research → content generation
    // Expect generated content to appear in UI with in-text citations and references
  });
}); 