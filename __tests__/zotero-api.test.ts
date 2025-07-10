import { testApiHandler } from 'next-test-api-route-handler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as syncHandler from '../pages/api/zotero/sync';
import * as importHandler from '../pages/api/zotero/import';
import * as exportHandler from '../pages/api/zotero/export';

// Mock the zotero module
vi.mock('../lib/zotero/index', () => ({
  createZoteroSync: vi.fn()
}));

describe('Zotero API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/zotero/sync', () => {
    it('returns stub data in test mode', async () => {
      await testApiHandler({
        pagesHandler: syncHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-test-stub': 'true'
            },
            body: JSON.stringify({
              references: [
                {
                  title: 'Test Paper',
                  authors: ['Test Author'],
                  year: 2024,
                  source: 'Test Journal',
                  citation: '(Author, 2024)'
                }
              ]
            })
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.imported).toHaveLength(1);
          expect(data.exported).toHaveLength(1);
          expect(data.conflicts).toHaveLength(0);
          expect(data.summary).toEqual({
            imported: 1,
            exported: 1,
            conflicts: 0
          });
        }
      });
    });

    it('requires Zotero credentials when not in test mode', async () => {
      await testApiHandler({
        pagesHandler: syncHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              references: []
            })
          });

          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Zotero credentials required');
        }
      });
    });

    it('validates references format', async () => {
      await testApiHandler({
        pagesHandler: syncHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              references: 'invalid',
              apiKey: 'test-key',
              userId: 'test-user'
            })
          });

          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Invalid references format');
        }
      });
    });

    it('only allows POST method', async () => {
      await testApiHandler({
        pagesHandler: syncHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET'
          });

          expect(res.status).toBe(405);
          const data = await res.json();
          expect(data.error).toBe('Method not allowed');
        }
      });
    });
  });

  describe('/api/zotero/import', () => {
    it('returns stub data in test mode', async () => {
      await testApiHandler({
        pagesHandler: importHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-test-stub': 'true'
            },
            body: JSON.stringify({})
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.references).toHaveLength(2);
          expect(data.count).toBe(2);
          expect(data.hasMore).toBe(false);
          expect(data.references[0]).toMatchObject({
            id: 'ZOTERO001',
            title: 'Sample Academic Paper',
            authors: ['Dr. Jane Smith', 'Prof. John Doe'],
            year: 2023,
            source: 'Zotero'
          });
        }
      });
    });

    it('requires Zotero credentials when not in test mode', async () => {
      await testApiHandler({
        pagesHandler: importHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });

          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Zotero credentials required');
        }
      });
    });

    it('validates limit parameter', async () => {
      await testApiHandler({
        pagesHandler: importHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: 'test-key',
              userId: 'test-user',
              limit: 1000 // Too high
            })
          });

          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Invalid limit');
        }
      });
    });

    it('only allows POST method', async () => {
      await testApiHandler({
        pagesHandler: importHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET'
          });

          expect(res.status).toBe(405);
          const data = await res.json();
          expect(data.error).toBe('Method not allowed');
        }
      });
    });
  });

  describe('/api/zotero/export', () => {
    it('returns stub data in test mode', async () => {
      await testApiHandler({
        pagesHandler: exportHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-test-stub': 'true'
            },
            body: JSON.stringify({
              references: [
                {
                  title: 'Export Test Paper',
                  authors: ['Export Author'],
                  year: 2024,
                  source: 'Export Journal'
                },
                {
                  title: 'Another Export Paper',
                  authors: ['Another Author'],
                  year: 2023,
                  source: 'Another Journal'
                }
              ]
            })
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.exported).toHaveLength(2);
          expect(data.count).toBe(2);
          expect(data.exported[0]).toMatchObject({
            key: 'ZOTERO_EXPORT_1',
            title: 'Export Test Paper'
          });
        }
      });
    });

    it('generates BibTeX when requested', async () => {
      await testApiHandler({
        pagesHandler: exportHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-test-stub': 'true'
            },
            body: JSON.stringify({
              references: [
                {
                  title: 'BibTeX Test Paper',
                  authors: ['BibTeX Author'],
                  year: 2024,
                  source: 'BibTeX Journal'
                }
              ],
              format: 'bibtex'
            })
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.bibtex).toBeDefined();
          expect(data.bibtex).toContain('@article{');
          expect(data.bibtex).toContain('title={BibTeX Test Paper}');
          expect(data.bibtex).toContain('author={BibTeX Author}');
          expect(data.bibtex).toContain('year={2024}');
        }
      });
    });

    it('validates references input', async () => {
      await testApiHandler({
        pagesHandler: exportHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              references: [], // Empty array
              apiKey: 'test-key',
              userId: 'test-user'
            })
          });

          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Invalid references');
        }
      });
    });

    it('requires Zotero credentials when not in test mode', async () => {
      await testApiHandler({
        pagesHandler: exportHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              references: [{ title: 'Test' }]
            })
          });

          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Zotero credentials required');
        }
      });
    });

    it('only allows POST method', async () => {
      await testApiHandler({
        pagesHandler: exportHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET'
          });

          expect(res.status).toBe(405);
          const data = await res.json();
          expect(data.error).toBe('Method not allowed');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid API key errors', async () => {
      // Mock the createZoteroSync to return an object that throws an API key error
      const { createZoteroSync } = await import('../lib/zotero/index');
      (createZoteroSync as any).mockReturnValue({
        syncReferences: vi.fn().mockRejectedValue(new Error('Invalid API key'))
      });

      await testApiHandler({
        pagesHandler: syncHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              references: [],
              apiKey: 'invalid-key',
              userId: 'test-user'
            })
          });

          expect(res.status).toBe(401);
          const data = await res.json();
          expect(data.error).toBe('Invalid Zotero credentials');
        }
      });
    });

    it('handles rate limiting errors', async () => {
      const { createZoteroSync } = await import('../lib/zotero/index');
      (createZoteroSync as any).mockReturnValue({
        syncReferences: vi.fn().mockRejectedValue(new Error('rate limit exceeded'))
      });

      await testApiHandler({
        pagesHandler: syncHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              references: [],
              apiKey: 'test-key',
              userId: 'test-user'
            })
          });

          expect(res.status).toBe(429);
          const data = await res.json();
          expect(data.error).toBe('Rate limit exceeded');
        }
      });
    });

    it('handles network errors', async () => {
      const { createZoteroSync } = await import('../lib/zotero/index');
      (createZoteroSync as any).mockReturnValue({
        syncReferences: vi.fn().mockRejectedValue(new Error('Network timeout'))
      });

      await testApiHandler({
        pagesHandler: syncHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              references: [],
              apiKey: 'test-key',
              userId: 'test-user'
            })
          });

          expect(res.status).toBe(503);
          const data = await res.json();
          expect(data.error).toBe('Zotero service unavailable');
        }
      });
    });
  });
});