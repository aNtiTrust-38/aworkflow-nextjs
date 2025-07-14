import { AIProvider, AIRequest, AIResponse } from './context-types';

interface ContextEntry {
  timestamp: number;
  request: AIRequest;
  provider: string;
  response?: AIResponse;
  feedback?: FeedbackData;
}

interface FeedbackData {
  success: boolean;
  responseTime?: number;
  error?: string;
}

interface ContextInsights {
  preferredProviders: Record<string, string>;
  averageResponseTimes: Record<string, number>;
  successRates: Record<string, number>;
  recommendations: string[];
}

interface RouterConfig {
  providers: AIProvider[];
  contextWindow?: number;
  learningEnabled?: boolean;
  cacheTimeout?: number;
}

interface CacheEntry {
  response: AIResponse;
  timestamp: number;
}

export class ContextAwareAIRouter {
  private providers: Map<string, AIProvider>;
  private context: ContextEntry[] = [];
  private contextWindow: number;
  private learningEnabled: boolean;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout: number;
  private providerStats: Map<string, {
    successCount: number;
    failureCount: number;
    totalResponseTime: number;
    stepPreferences: Map<string, number>;
  }> = new Map();

  constructor(config: RouterConfig) {
    this.providers = new Map(config.providers.map(p => [p.name, p]));
    this.contextWindow = config.contextWindow || 10;
    this.learningEnabled = config.learningEnabled ?? true;
    this.cacheTimeout = config.cacheTimeout || 5 * 60 * 1000; // 5 minutes default

    // Initialize provider stats
    config.providers.forEach(provider => {
      this.providerStats.set(provider.name, {
        successCount: 0,
        failureCount: 0,
        totalResponseTime: 0,
        stepPreferences: new Map()
      });
    });
  }

  async route(request: AIRequest): Promise<AIResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.response;
    }

    // Enhance request with context if requested
    const enhancedRequest = this.enhanceRequestWithContext(request);

    // Select provider based on context and learning
    const provider = await this.selectProvider(enhancedRequest);
    
    if (!provider) {
      throw new Error('No available providers');
    }

    const startTime = Date.now();
    void startTime; // Satisfy unused variable warning
    
    try {
      const response = await provider.callAPI(enhancedRequest);
      
      // Record successful interaction
      this.addToContext({
        timestamp: Date.now(),
        request: enhancedRequest,
        provider: provider.name,
        response
      });

      // Cache response
      this.cache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      // Clean old cache entries
      this.cleanCache();

      return response;
    } catch (error) {
      // Record failed interaction
      this.addToContext({
        timestamp: Date.now(),
        request: enhancedRequest,
        provider: provider.name,
        feedback: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Try fallback providers
      for (const [name, fallbackProvider] of this.providers) {
        if (name !== provider.name) {
          try {
            const response = await fallbackProvider.callAPI(enhancedRequest);
            
            this.addToContext({
              timestamp: Date.now(),
              request: enhancedRequest,
              provider: name,
              response
            });

            return response;
          } catch (fallbackError) {
            void fallbackError; // Satisfy unused variable warning
            continue;
          }
        }
      }

      throw error;
    }
  }

  recordFeedback(request: AIRequest, providerName: string, feedback: FeedbackData): void {
    const stats = this.providerStats.get(providerName);
    if (!stats) return;

    if (feedback.success) {
      stats.successCount++;
      if (feedback.responseTime) {
        stats.totalResponseTime += feedback.responseTime;
      }
    } else {
      stats.failureCount++;
    }

    // Update step preferences
    const step = request.metadata?.workflowStep;
    if (step) {
      const currentPreference = stats.stepPreferences.get(step) || 0;
      const adjustment = feedback.success ? 1 : -1;
      stats.stepPreferences.set(step, currentPreference + adjustment);
    }

    // Add to context
    this.addToContext({
      timestamp: Date.now(),
      request,
      provider: providerName,
      feedback
    });
  }

  getContextWindow(): ContextEntry[] {
    return [...this.context];
  }

  getContextInsights(): ContextInsights {
    const insights: ContextInsights = {
      preferredProviders: {},
      averageResponseTimes: {},
      successRates: {},
      recommendations: []
    };

    // Calculate preferred providers per step
    const stepProviderScores: Record<string, Record<string, number>> = {};
    
    for (const [providerName, stats] of this.providerStats) {
      // Calculate average response time
      const avgResponseTime = stats.successCount > 0
        ? stats.totalResponseTime / stats.successCount
        : 0;
      insights.averageResponseTimes[providerName] = Math.round(avgResponseTime);

      // Calculate success rate
      const total = stats.successCount + stats.failureCount;
      insights.successRates[providerName] = total > 0
        ? stats.successCount / total
        : 0;

      // Process step preferences
      for (const [step, score] of stats.stepPreferences) {
        if (!stepProviderScores[step]) {
          stepProviderScores[step] = {};
        }
        stepProviderScores[step][providerName] = score;
      }
    }

    // Determine preferred provider for each step
    for (const [step, providers] of Object.entries(stepProviderScores)) {
      const bestProvider = Object.entries(providers)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (bestProvider && bestProvider[1] > 0) {
        insights.preferredProviders[step] = bestProvider[0];
      }
    }

    // Generate recommendations
    if (insights.preferredProviders.RESEARCH === 'anthropic') {
      insights.recommendations.push('anthropic for research tasks');
    }
    if (insights.preferredProviders.GENERATE === 'openai') {
      insights.recommendations.push('openai for content generation');
    }

    // Add performance-based recommendations
    for (const [provider, rate] of Object.entries(insights.successRates)) {
      if (rate < 0.7) {
        insights.recommendations.push(`Consider reducing usage of ${provider} due to low success rate (${Math.round(rate * 100)}%)`);
      }
    }

    return insights;
  }

  getPrewarmStatus(currentStep: string): { nextLikelyStep: string; confidence: number } {
    // Analyze patterns in context to predict next step
    const stepTransitions: Record<string, Record<string, number>> = {};
    
    for (let i = 0; i < this.context.length - 1; i++) {
      const current = this.context[i].request.metadata?.workflowStep;
      const next = this.context[i + 1].request.metadata?.workflowStep;
      
      if (current && next && current === currentStep) {
        if (!stepTransitions[current]) {
          stepTransitions[current] = {};
        }
        stepTransitions[current][next] = (stepTransitions[current][next] || 0) + 1;
      }
    }

    const transitions = stepTransitions[currentStep];
    if (!transitions || Object.keys(transitions).length === 0) {
      return { nextLikelyStep: '', confidence: 0 };
    }

    const total = Object.values(transitions).reduce((sum, count) => sum + count, 0);
    const mostLikely = Object.entries(transitions)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      nextLikelyStep: mostLikely[0],
      confidence: mostLikely[1] / total
    };
  }

  private async selectProvider(request: AIRequest): Promise<AIProvider | null> {
    const step = request.metadata?.workflowStep;
    const type = request.type;
    
    // Check for recent failures to avoid
    const recentFailures = new Set<string>();
    for (const entry of this.context.slice(-5)) {
      if (entry.feedback && !entry.feedback.success) {
        recentFailures.add(entry.provider);
      }
    }
    
    // If learning is enabled and we have step preferences
    if (this.learningEnabled && step) {
      // Find provider with highest score for this step
      let bestProvider: AIProvider | null = null;
      let bestScore = -Infinity;

      for (const [providerName, provider] of this.providers) {
        // Skip providers with recent failures
        if (recentFailures.has(providerName)) continue;
        
        const stats = this.providerStats.get(providerName);
        if (!stats) continue;

        const stepScore = stats.stepPreferences.get(step) || 0;
        const successRate = stats.successCount + stats.failureCount > 0
          ? stats.successCount / (stats.successCount + stats.failureCount)
          : 0.5;

        // Combined score based on step preference and overall success rate
        const combinedScore = stepScore * 0.7 + successRate * 10 * 0.3;

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestProvider = provider;
        }
      }

      // Only use learned preference if there's a significant difference (score > 2)
      if (bestProvider && bestScore > 2) {
        return bestProvider;
      }
    }
    
    // Default routing based on type
    if (type === 'generation' && this.providers.has('openai') && !recentFailures.has('openai')) {
      const openai = this.providers.get('openai')!;
      const isAvailable = await openai.checkAvailability();
      if (isAvailable) {
        return openai;
      }
    }
    
    if ((type === 'research' || type === 'analysis') && this.providers.has('anthropic') && !recentFailures.has('anthropic')) {
      const anthropic = this.providers.get('anthropic')!;
      const isAvailable = await anthropic.checkAvailability();
      if (isAvailable) {
        return anthropic;
      }
    }

    // Fallback to any available provider (prefer openai for generation, anthropic for others)
    const fallbackOrder = type === 'generation' ? ['openai', 'anthropic'] : ['anthropic', 'openai'];
    
    for (const providerName of fallbackOrder) {
      if (this.providers.has(providerName) && !recentFailures.has(providerName)) {
        const provider = this.providers.get(providerName)!;
        const isAvailable = await provider.checkAvailability();
        if (isAvailable) {
          return provider;
        }
      }
    }

    return null;
  }

  private enhanceRequestWithContext(request: AIRequest): AIRequest {
    if (!request.metadata?.enhanceWithContext) {
      return request;
    }

    const relevantContext = this.context
      .filter(entry => entry.response && (!entry.feedback || entry.feedback.success !== false))
      .slice(-3) // Last 3 successful responses  
      .map(entry => ({
        step: entry.request.metadata?.workflowStep,
        summary: entry.response?.content.substring(0, 200) + '...'
      }));

    if (relevantContext.length === 0) {
      return request;
    }

    const contextPrompt = `\n\nContext from previous research:\n${
      relevantContext.map(ctx => `- ${ctx.step}: ${ctx.summary}`).join('\n')
    }\n\nBased on this context, `;

    return {
      ...request,
      prompt: request.prompt + contextPrompt
    };
  }

  private addToContext(entry: ContextEntry): void {
    this.context.push(entry);
    
    // Maintain window size
    if (this.context.length > this.contextWindow) {
      this.context.shift();
    }
  }

  private getCacheKey(request: AIRequest): string {
    return `${request.type}-${request.metadata?.workflowStep}-${request.prompt.substring(0, 100)}`;
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}