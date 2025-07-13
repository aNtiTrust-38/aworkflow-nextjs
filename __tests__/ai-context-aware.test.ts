import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextAwareAIRouter } from '../lib/ai-providers/context-aware-router';
import { AIProvider, AIResponse, AIRequest } from '../lib/ai-providers/context-types';

// Mock providers
const mockAnthropicProvider: AIProvider = {
  name: 'anthropic',
  callAPI: vi.fn(),
  checkAvailability: vi.fn().mockResolvedValue(true),
  getCost: vi.fn().mockReturnValue(0.01),
  getModelName: vi.fn().mockReturnValue('claude-3-sonnet'),
  getMaxTokens: vi.fn().mockReturnValue(100000),
  getRateLimits: vi.fn().mockReturnValue({ requestsPerMinute: 100, tokensPerMinute: 100000 })
};

const mockOpenAIProvider: AIProvider = {
  name: 'openai',
  callAPI: vi.fn(),
  checkAvailability: vi.fn().mockResolvedValue(true),
  getCost: vi.fn().mockReturnValue(0.02),
  getModelName: vi.fn().mockReturnValue('gpt-4'),
  getMaxTokens: vi.fn().mockReturnValue(128000),
  getRateLimits: vi.fn().mockReturnValue({ requestsPerMinute: 60, tokensPerMinute: 90000 })
};

describe('ContextAwareAIRouter', () => {
  let router: ContextAwareAIRouter;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default state
    mockAnthropicProvider.checkAvailability = vi.fn().mockResolvedValue(true);
    mockOpenAIProvider.checkAvailability = vi.fn().mockResolvedValue(true);
    
    router = new ContextAwareAIRouter({
      providers: [mockAnthropicProvider, mockOpenAIProvider],
      contextWindow: 5,
      learningEnabled: true
    });
  });

  describe('Context-Aware Routing', () => {
    it('should route based on previous successful responses', async () => {
      const request: AIRequest = {
        prompt: 'Analyze this research paper',
        type: 'research',
        metadata: { workflowStep: 'RESEARCH' }
      };

      // First call - should use default routing
      mockAnthropicProvider.callAPI = vi.fn().mockResolvedValue({
        content: 'Research analysis complete',
        usage: { prompt_tokens: 100, completion_tokens: 200 }
      });

      await router.route(request);
      expect(mockAnthropicProvider.callAPI).toHaveBeenCalled();

      // Simulate success feedback
      router.recordFeedback(request, 'anthropic', { success: true, responseTime: 1000 });

      // Second similar call - should prefer anthropic based on context
      const similarRequest: AIRequest = {
        prompt: 'Analyze another research paper',
        type: 'research',
        metadata: { workflowStep: 'RESEARCH' }
      };

      await router.route(similarRequest);
      expect(mockAnthropicProvider.callAPI).toHaveBeenCalledTimes(2);
    });

    it('should maintain context window of recent interactions', async () => {
      // Fill context window
      for (let i = 0; i < 6; i++) {
        const request: AIRequest = {
          prompt: `Research request ${i}`,
          type: 'research',
          metadata: { workflowStep: 'RESEARCH' }
        };
        
        mockAnthropicProvider.callAPI = vi.fn().mockResolvedValue({
          content: `Response ${i}`,
          usage: { prompt_tokens: 100, completion_tokens: 200 }
        });
        
        await router.route(request);
      }

      const context = router.getContextWindow();
      expect(context).toHaveLength(5); // Should maintain window size
      expect(context[0].request.prompt).toContain('Research request 1'); // Oldest should be request 1
    });

    it('should adapt routing based on workflow step patterns', async () => {
      // Train on RESEARCH step preferring anthropic
      for (let i = 0; i < 3; i++) {
        const request: AIRequest = {
          prompt: 'Research task',
          type: 'research',
          metadata: { workflowStep: 'RESEARCH' }
        };
        
        mockAnthropicProvider.callAPI = vi.fn().mockResolvedValue({
          content: 'Research response',
          usage: { prompt_tokens: 100, completion_tokens: 200 }
        });
        
        await router.route(request);
        router.recordFeedback(request, 'anthropic', { success: true, responseTime: 800 });
      }

      // Train on GENERATE step preferring openai
      for (let i = 0; i < 3; i++) {
        const request: AIRequest = {
          prompt: 'Generate content',
          type: 'generation',
          metadata: { workflowStep: 'GENERATE' }
        };
        
        mockOpenAIProvider.callAPI = vi.fn().mockResolvedValue({
          content: 'Generated content',
          usage: { prompt_tokens: 150, completion_tokens: 300 }
        });
        
        await router.route(request);
        router.recordFeedback(request, 'openai', { success: true, responseTime: 900 });
      }

      // Test learned preferences
      const researchRequest: AIRequest = {
        prompt: 'New research task',
        type: 'research',
        metadata: { workflowStep: 'RESEARCH' }
      };
      
      const generateRequest: AIRequest = {
        prompt: 'New generation task',
        type: 'generation',
        metadata: { workflowStep: 'GENERATE' }
      };

      await router.route(researchRequest);
      expect(mockAnthropicProvider.callAPI).toHaveBeenLastCalledWith(researchRequest);

      await router.route(generateRequest);
      expect(mockOpenAIProvider.callAPI).toHaveBeenLastCalledWith(generateRequest);
    });

    it('should handle context-based prompt enhancement', async () => {
      // Build context with related research
      const contextRequest1: AIRequest = {
        prompt: 'Research on climate change impacts',
        type: 'research',
        metadata: { workflowStep: 'RESEARCH' }
      };
      
      mockAnthropicProvider.callAPI = vi.fn().mockResolvedValue({
        content: 'Climate change affects weather patterns, ecosystems, and human societies.',
        usage: { prompt_tokens: 100, completion_tokens: 200 }
      });
      
      await router.route(contextRequest1);

      // New request that should be enhanced with context and routed to OpenAI
      const enhancedRequest: AIRequest = {
        prompt: 'Write about environmental impacts',
        type: 'generation',
        metadata: { 
          workflowStep: 'GENERATE',
          enhanceWithContext: true 
        }
      };

      let enhancedPrompt = '';
      mockOpenAIProvider.callAPI = vi.fn().mockImplementation((req: AIRequest) => {
        enhancedPrompt = req.prompt;
        return Promise.resolve({
          content: 'Enhanced response based on context',
          usage: { prompt_tokens: 200, completion_tokens: 300 }
        });
      });

      await router.route(enhancedRequest);
      
      // Verify context enhancement happened
      expect(enhancedPrompt).toContain('Context from previous research:');
      expect(enhancedPrompt).toContain('Climate change affects');
      expect(mockOpenAIProvider.callAPI).toHaveBeenCalled();
    });

    it('should learn from error patterns and avoid problematic providers', async () => {
      const request: AIRequest = {
        prompt: 'Complex analysis task',
        type: 'analysis',
        metadata: { workflowStep: 'REFINE' }
      };

      // Simulate repeated failures with OpenAI that get recorded
      for (let i = 0; i < 3; i++) {
        router.recordFeedback(request, 'openai', { success: false, error: 'Rate limit exceeded' });
      }

      // Next similar request should avoid OpenAI and use Anthropic
      mockAnthropicProvider.callAPI = vi.fn().mockResolvedValue({
        content: 'Analysis complete',
        usage: { prompt_tokens: 100, completion_tokens: 200 }
      });
      
      // OpenAI should not be called
      mockOpenAIProvider.callAPI = vi.fn();

      await router.route(request);
      expect(mockAnthropicProvider.callAPI).toHaveBeenCalled();
      expect(mockOpenAIProvider.callAPI).not.toHaveBeenCalled();
    });

    it('should provide context insights and recommendations', () => {
      // Simulate workflow history
      const history = [
        { step: 'RESEARCH', provider: 'anthropic', success: true, responseTime: 800 },
        { step: 'RESEARCH', provider: 'anthropic', success: true, responseTime: 750 },
        { step: 'GENERATE', provider: 'openai', success: true, responseTime: 900 },
        { step: 'GENERATE', provider: 'openai', success: true, responseTime: 950 },
        { step: 'REFINE', provider: 'anthropic', success: true, responseTime: 700 }
      ];

      history.forEach((entry, i) => {
        const request: AIRequest = {
          prompt: `Task ${i}`,
          type: 'general',
          metadata: { workflowStep: entry.step }
        };
        router.recordFeedback(request, entry.provider, { 
          success: entry.success, 
          responseTime: entry.responseTime 
        });
      });

      const insights = router.getContextInsights();
      
      expect(insights.preferredProviders).toEqual({
        RESEARCH: 'anthropic',
        GENERATE: 'openai',
        REFINE: 'anthropic'
      });
      
      expect(insights.averageResponseTimes).toEqual({
        anthropic: expect.any(Number),
        openai: expect.any(Number)
      });
      
      expect(insights.successRates).toEqual({
        anthropic: 1.0,
        openai: 1.0
      });
      
      expect(insights.recommendations).toContain('anthropic for research tasks');
      expect(insights.recommendations).toContain('openai for content generation');
    });
  });

  describe('Performance Optimization', () => {
    it('should cache similar requests within time window', async () => {
      const request: AIRequest = {
        prompt: 'Analyze this specific topic',
        type: 'research',
        metadata: { workflowStep: 'RESEARCH' }
      };

      mockAnthropicProvider.callAPI = vi.fn().mockResolvedValue({
        content: 'Cached response',
        usage: { prompt_tokens: 100, completion_tokens: 200 }
      });

      // First call
      await router.route(request);
      expect(mockAnthropicProvider.callAPI).toHaveBeenCalledTimes(1);

      // Similar request within cache window
      const similarRequest: AIRequest = {
        prompt: 'Analyze this specific topic', // Same prompt
        type: 'research',
        metadata: { workflowStep: 'RESEARCH' }
      };

      const response = await router.route(similarRequest);
      expect(mockAnthropicProvider.callAPI).toHaveBeenCalledTimes(1); // Should use cache
      expect(response.content).toBe('Cached response');
    });

    it('should pre-warm providers based on workflow patterns', async () => {
      // Simulate pattern: RESEARCH always followed by GENERATE
      for (let i = 0; i < 3; i++) {
        await router.route({
          prompt: 'Research',
          type: 'research',
          metadata: { workflowStep: 'RESEARCH' }
        });
        
        await router.route({
          prompt: 'Generate',
          type: 'generation',
          metadata: { workflowStep: 'GENERATE' }
        });
      }

      // When on RESEARCH step, should pre-warm GENERATE provider
      const prewarmStatus = router.getPrewarmStatus('RESEARCH');
      expect(prewarmStatus.nextLikelyStep).toBe('GENERATE');
      expect(prewarmStatus.confidence).toBeGreaterThan(0.8);
    });
  });
});