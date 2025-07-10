import { testApiHandler } from 'next-test-api-route-handler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as generateHandler from '../pages/api/generate';
import * as structureHandler from '../pages/api/structure-guidance';

// Helper function to create complete AI router mock
const createMockRouter = (generateWithFailoverFn = vi.fn()) => ({
  generateWithFailover: generateWithFailoverFn,
  selectProvider: vi.fn(),
  getUsageStats: vi.fn().mockReturnValue({}),
  resetUsageStats: vi.fn(),
  getBudgetStatus: vi.fn().mockReturnValue({ used: 0, remaining: 100, percentage: 0 }),
  addProvider: vi.fn(),
  removeProvider: vi.fn(),
  getAvailableProviders: vi.fn().mockReturnValue(['openai']),
  providers: [],
  config: {},
  usageStats: {},
  initializeUsageStats: vi.fn(),
  getPreferredProvider: vi.fn(),
  getCostEffectiveProvider: vi.fn(),
  isRetryableError: vi.fn(),
  checkBudget: vi.fn(),
  updateUsageStats: vi.fn()
} as any);

// Mock the AI router
vi.mock('../lib/ai-router-config', () => ({
  getAIRouter: vi.fn(() => createMockRouter())
}));

// Mock the AI providers module
vi.mock('../lib/ai-providers', () => ({
  TaskType: {
    OUTLINE: 'outline',
    WRITING: 'writing',
    RESEARCH: 'research',
    ANALYSIS: 'analysis',
    REVIEW: 'review'
  }
}));

describe('Multi-LLM API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/generate with multi-LLM', () => {
    it('returns stub data in test mode', async () => {
      await testApiHandler({
        pagesHandler: generateHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-test-stub': 'true'
            },
            body: JSON.stringify({
              outline: [
                { section: 'I. Introduction', content: 'Background and motivation.' }
              ],
              references: [
                { id: 1, citation: '(Smith, 2020)', authors: ['John Smith'], year: 2020, title: 'Sample Paper', source: 'Test' }
              ]
            })
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.content).toBeDefined();
          expect(data.usage).toBeDefined();
          expect(data.references).toBeDefined();
        }
      });
    });

    it('uses AI router for content generation', async () => {
      const mockRouter = createMockRouter(vi.fn().mockResolvedValue({
        content: 'Generated academic content with proper citations (Smith, 2020).',
        usage: { totalTokens: 150, inputTokens: 50, outputTokens: 100 },
        cost: 0.02,
        provider: 'openai'
      }));

      vi.mocked(await import('../lib/ai-router-config')).getAIRouter.mockReturnValue(mockRouter);

      await testApiHandler({
        pagesHandler: generateHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              outline: [
                { section: 'I. Introduction', content: 'Background and motivation.' }
              ],
              references: [
                { id: 1, citation: '(Smith, 2020)', authors: ['John Smith'], year: 2020, title: 'Sample Paper', source: 'Test' }
              ]
            })
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.content).toBe('Generated academic content with proper citations (Smith, 2020).');
          expect(data.usage.tokens).toBe(150);
          expect(data.usage.cost).toBe(0.02);
          expect(data.usage.provider).toBe('openai');
          expect(mockRouter.generateWithFailover).toHaveBeenCalledWith(
            expect.stringContaining('academic writer'),
            'writing'
          );
        }
      });
    });

    it('handles AI router errors gracefully', async () => {
      const mockRouter = createMockRouter(vi.fn().mockRejectedValue(new Error('AI service unavailable')));

      vi.mocked(await import('../lib/ai-router-config')).getAIRouter.mockReturnValue(mockRouter);

      await testApiHandler({
        pagesHandler: generateHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              outline: [
                { section: 'I. Introduction', content: 'Background and motivation.' }
              ],
              references: [
                { id: 1, citation: '(Smith, 2020)', authors: ['John Smith'], year: 2020, title: 'Sample Paper', source: 'Test' }
              ]
            })
          });

          expect(res.status).toBe(500);
          const data = await res.json();
          expect(data.error).toBe('Failed to generate content');
          expect(data.details).toBe('AI service unavailable');
        }
      });
    });
  });

  describe('/api/structure-guidance with multi-LLM', () => {
    it('returns stub data in test mode', async () => {
      await testApiHandler({
        pagesHandler: structureHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('prompt', 'Test assignment prompt');

          const res = await fetch({
            method: 'POST',
            headers: { 'x-test-stub': 'true' },
            body: formData
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.adhdFriendlyGoals).toBeDefined();
          expect(data.structureOutline).toBeDefined();
          expect(data.formatExamples).toBeDefined();
          expect(data.checklist).toBeDefined();
        }
      });
    });

    it('uses AI router for structure guidance', async () => {
      const mockRouter = createMockRouter(vi.fn().mockResolvedValue({
        content: JSON.stringify({
          adhdFriendlyGoals: "Clear, specific goals for assignment completion",
          structureOutline: "I. Introduction\nII. Main Content\nIII. Conclusion",
          formatExamples: "Example: Start with a strong thesis statement...",
          checklist: ["Read prompt", "Research", "Write", "Review"]
        }),
        usage: { totalTokens: 200, inputTokens: 100, outputTokens: 100 },
        cost: 0.03,
        provider: 'anthropic'
      }));

      vi.mocked(await import('../lib/ai-router-config')).getAIRouter.mockReturnValue(mockRouter);

      await testApiHandler({
        pagesHandler: structureHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('prompt', 'Write a paper about artificial intelligence');

          const res = await fetch({
            method: 'POST',
            body: formData
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.adhdFriendlyGoals).toBe("Clear, specific goals for assignment completion");
          expect(data.structureOutline).toBe("I. Introduction\nII. Main Content\nIII. Conclusion");
          expect(data.usage.tokens).toBe(200);
          expect(data.usage.provider).toBe('anthropic');
          expect(mockRouter.generateWithFailover).toHaveBeenCalledWith(
            expect.stringContaining('academic writing coach'),
            'outline'
          );
        }
      });
    });

    it('handles JSON parsing errors gracefully', async () => {
      const mockRouter = createMockRouter(vi.fn().mockResolvedValue({
        content: 'Non-JSON response that should be handled gracefully',
        usage: { totalTokens: 100, inputTokens: 50, outputTokens: 50 },
        cost: 0.015,
        provider: 'anthropic'
      }));

      vi.mocked(await import('../lib/ai-router-config')).getAIRouter.mockReturnValue(mockRouter);

      await testApiHandler({
        pagesHandler: structureHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('prompt', 'Test prompt');

          const res = await fetch({
            method: 'POST',
            body: formData
          });

          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.adhdFriendlyGoals).toBeDefined();
          expect(data.structureOutline).toContain('Non-JSON response');
          expect(data.formatExamples).toBeDefined();
          expect(data.checklist).toBeDefined();
          expect(data.usage.tokens).toBe(100);
        }
      });
    });

    it('handles router configuration errors', async () => {
      vi.mocked(await import('../lib/ai-router-config')).getAIRouter.mockImplementation(() => {
        throw new Error('No API keys configured');
      });

      await testApiHandler({
        pagesHandler: structureHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('prompt', 'Test prompt');

          const res = await fetch({
            method: 'POST',
            body: formData
          });

          expect(res.status).toBe(500);
          const data = await res.json();
          expect(data.error).toBe('Failed to generate structure guidance');
          expect(data.details).toBe('No API keys configured');
        }
      });
    });
  });

  describe('Provider Selection Logic', () => {
    it('routes outline tasks to appropriate provider', async () => {
      const mockRouter = createMockRouter(vi.fn().mockResolvedValue({
        content: 'Mock response',
        usage: { totalTokens: 100, inputTokens: 50, outputTokens: 50 },
        cost: 0.015,
        provider: 'anthropic'
      }));

      vi.mocked(await import('../lib/ai-router-config')).getAIRouter.mockReturnValue(mockRouter);

      await testApiHandler({
        pagesHandler: structureHandler,
        test: async ({ fetch }) => {
          const formData = new FormData();
          formData.append('prompt', 'Test prompt');

          await fetch({
            method: 'POST',
            body: formData
          });

          expect(mockRouter.generateWithFailover).toHaveBeenCalledWith(
            expect.any(String),
            'outline'
          );
        }
      });
    });

    it('routes writing tasks to appropriate provider', async () => {
      const mockRouter = createMockRouter(vi.fn().mockResolvedValue({
        content: 'Mock content',
        usage: { totalTokens: 150, inputTokens: 50, outputTokens: 100 },
        cost: 0.02,
        provider: 'openai'
      }));

      vi.mocked(await import('../lib/ai-router-config')).getAIRouter.mockReturnValue(mockRouter);

      await testApiHandler({
        pagesHandler: generateHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              outline: [{ section: 'I. Introduction', content: 'Test' }],
              references: [{ id: 1, citation: '(Test, 2020)', authors: ['Test'], year: 2020, title: 'Test', source: 'Test' }]
            })
          });

          expect(mockRouter.generateWithFailover).toHaveBeenCalledWith(
            expect.any(String),
            'writing'
          );
        }
      });
    });
  });
});