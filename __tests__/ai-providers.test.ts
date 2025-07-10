import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../lib/ai-providers/anthropic';
import { OpenAIProvider } from '../lib/ai-providers/openai';
import { AIRouter } from '../lib/ai-providers/router';
import { ProviderType, TaskType } from '../lib/ai-providers/types';

// Mock the actual SDK modules
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}));

describe('AI Provider Abstraction Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AnthropicProvider', () => {
    it('should create instance with valid API key', () => {
      const provider = new AnthropicProvider('test-key');
      expect(provider).toBeDefined();
      expect(provider.name).toBe('anthropic');
      expect(provider.isAvailable()).toBe(true);
    });

    it('should throw error with invalid API key', () => {
      expect(() => new AnthropicProvider('')).toThrow('Anthropic API key is required');
    });

    it('should generate content successfully', async () => {
      const provider = new AnthropicProvider('test-key');
      const mockResponse = {
        content: [{ type: 'text', text: 'Generated content' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      };

      // Mock the Anthropic client
      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue(mockResponse)
        }
      };
      (provider as any).client = mockClient;

      const result = await provider.generateContent('Test prompt', TaskType.RESEARCH);
      
      expect(result).toEqual({
        content: 'Generated content',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30
        },
        cost: expect.any(Number),
        provider: 'anthropic'
      });
    });

    it('should handle API errors gracefully', async () => {
      const provider = new AnthropicProvider('test-key');
      const mockClient = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('API Error'))
        }
      };
      (provider as any).client = mockClient;

      await expect(provider.generateContent('Test prompt', TaskType.RESEARCH))
        .rejects.toThrow('Anthropic API Error: API Error');
    });
  });

  describe('OpenAIProvider', () => {
    it('should create instance with valid API key', () => {
      const provider = new OpenAIProvider('test-key');
      expect(provider).toBeDefined();
      expect(provider.name).toBe('openai');
      expect(provider.isAvailable()).toBe(true);
    });

    it('should throw error with invalid API key', () => {
      expect(() => new OpenAIProvider('')).toThrow('OpenAI API key is required');
    });

    it('should generate content successfully', async () => {
      const provider = new OpenAIProvider('test-key');
      const mockResponse = {
        choices: [{ message: { content: 'Generated content' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      };

      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockResponse)
          }
        }
      };
      (provider as any).client = mockClient;

      const result = await provider.generateContent('Test prompt', TaskType.WRITING);
      
      expect(result).toEqual({
        content: 'Generated content',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30
        },
        cost: expect.any(Number),
        provider: 'openai'
      });
    });

    it('should handle API errors gracefully', async () => {
      const provider = new OpenAIProvider('test-key');
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      };
      (provider as any).client = mockClient;

      await expect(provider.generateContent('Test prompt', TaskType.WRITING))
        .rejects.toThrow('OpenAI API Error: API Error');
    });
  });

  describe('AIRouter', () => {
    it('should route research tasks to Claude', () => {
      const anthropicProvider = new AnthropicProvider('test-key');
      const openaiProvider = new OpenAIProvider('test-key');
      const router = new AIRouter([anthropicProvider, openaiProvider]);

      const selectedProvider = router.selectProvider(TaskType.RESEARCH);
      expect(selectedProvider.name).toBe('anthropic');
    });

    it('should route writing tasks to GPT-4o', () => {
      const anthropicProvider = new AnthropicProvider('test-key');
      const openaiProvider = new OpenAIProvider('test-key');
      const router = new AIRouter([anthropicProvider, openaiProvider]);

      const selectedProvider = router.selectProvider(TaskType.WRITING);
      expect(selectedProvider.name).toBe('openai');
    });

    it('should implement failover mechanism', async () => {
      const anthropicProvider = new AnthropicProvider('test-key');
      const openaiProvider = new OpenAIProvider('test-key');
      const router = new AIRouter([anthropicProvider, openaiProvider]);

      // Mock first provider to fail
      const mockAnthropicClient = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Service unavailable'))
        }
      };
      (anthropicProvider as any).client = mockAnthropicClient;

      // Mock second provider to succeed
      const mockOpenAIClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'Failover content' } }],
              usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
            })
          }
        }
      };
      (openaiProvider as any).client = mockOpenAIClient;

      const result = await router.generateWithFailover('Test prompt', TaskType.RESEARCH);
      
      expect(result.content).toBe('Failover content');
      expect(result.provider).toBe('openai');
    });

    it('should track usage and costs', async () => {
      const anthropicProvider = new AnthropicProvider('test-key');
      const openaiProvider = new OpenAIProvider('test-key');
      const router = new AIRouter([anthropicProvider, openaiProvider]);

      // Mock successful response
      const mockAnthropicClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ text: 'Test content' }],
            usage: { input_tokens: 10, output_tokens: 20 }
          })
        }
      };
      (anthropicProvider as any).client = mockAnthropicClient;

      await router.generateWithFailover('Test prompt', TaskType.RESEARCH);
      
      const usage = router.getUsageStats();
      expect(usage.anthropic.totalTokens).toBe(30);
      expect(usage.anthropic.totalCost).toBeGreaterThan(0);
    });

    it('should enforce monthly budget limits', async () => {
      const anthropicProvider = new AnthropicProvider('test-key');
      const openaiProvider = new OpenAIProvider('test-key');
      const router = new AIRouter([anthropicProvider, openaiProvider], { monthlyBudget: 0.01 });

      // Set usage to exceed budget
      (router as any).usageStats = {
        anthropic: { totalTokens: 0, totalCost: 0.02 },
        openai: { totalTokens: 0, totalCost: 0 }
      };

      await expect(router.generateWithFailover('Test prompt', TaskType.RESEARCH))
        .rejects.toThrow('Monthly budget exceeded');
    });
  });
});