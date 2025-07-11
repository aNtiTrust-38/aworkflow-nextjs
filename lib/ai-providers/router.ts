import { AIProvider, GenerationResult, TaskType, RouterConfig, UsageStats, ProviderError } from './types';

export class AIRouter {
  private providers: AIProvider[];
  private config: RouterConfig;
  private usageStats: UsageStats = {};

  constructor(providers: AIProvider[], config: RouterConfig = {}) {
    this.providers = providers;
    this.config = {
      monthlyBudget: config.monthlyBudget || 100,
      fallbackEnabled: config.fallbackEnabled ?? true,
      costOptimization: config.costOptimization ?? true,
      ...config
    };

    // Initialize usage stats
    this.initializeUsageStats();
  }

  private initializeUsageStats(): void {
    this.providers.forEach(provider => {
      if (!this.usageStats[provider.name]) {
        this.usageStats[provider.name] = {
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          lastReset: new Date()
        };
      }
    });
  }

  selectProvider(taskType: TaskType): AIProvider {
    // Intelligent routing based on task type
    const preferredProvider = this.getPreferredProvider(taskType);
    
    if (preferredProvider && preferredProvider.isAvailable()) {
      return preferredProvider;
    }

    // Fallback to any available provider
    const availableProvider = this.providers.find(p => p.isAvailable());
    if (!availableProvider) {
      throw new Error('No AI providers are available');
    }

    return availableProvider;
  }

  private getPreferredProvider(taskType: TaskType): AIProvider | undefined {
    switch (taskType) {
      case TaskType.RESEARCH:
      case TaskType.ANALYSIS:
        // Claude excels at research and analysis
        return this.providers.find(p => p.name === 'anthropic');
      
      case TaskType.WRITING:
      case TaskType.REVIEW:
        // GPT-4o excels at writing and review
        return this.providers.find(p => p.name === 'openai');
      
      case TaskType.OUTLINE:
        // Both are good for outlines, prefer cost-effective option
        if (this.config.costOptimization) {
          return this.getCostEffectiveProvider();
        }
        return this.providers.find(p => p.name === 'anthropic');
      
      default:
        return this.providers[0];
    }
  }

  private getCostEffectiveProvider(): AIProvider {
    // Simple cost optimization: prefer the provider with lower recent usage
    const sortedProviders = this.providers
      .filter(p => p.isAvailable())
      .sort((a, b) => {
        const aCost = this.usageStats[a.name]?.totalCost || 0;
        const bCost = this.usageStats[b.name]?.totalCost || 0;
        return aCost - bCost;
      });

    return sortedProviders[0];
  }

  async generateWithFailover(prompt: string, taskType: TaskType, options?: any): Promise<GenerationResult> {
    this.checkBudget();

    const primaryProvider = this.selectProvider(taskType);
    
    try {
      const result = await primaryProvider.generateContent(prompt, taskType, options);
      this.updateUsageStats(result);
      return result;
    } catch (error: any) {
      if (!this.config.fallbackEnabled || !this.isRetryableError(error)) {
        throw error;
      }

      // Try fallback providers
      const fallbackProviders = this.providers.filter(p => 
        p.name !== primaryProvider.name && p.isAvailable()
      );

      for (const fallbackProvider of fallbackProviders) {
        try {
          const result = await fallbackProvider.generateContent(prompt, taskType, options);
          this.updateUsageStats(result);
          return result;
        } catch (fallbackError: any) {
          // Continue to next fallback
          continue;
        }
      }

      // If all providers fail, throw the original error
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    if (error.retryable !== undefined) {
      return error.retryable;
    }

    const retryablePatterns = [
      'rate limit',
      'timeout',
      'network',
      'connection',
      'service unavailable',
      'internal server error'
    ];
    
    const message = error.message?.toLowerCase() || '';
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  private checkBudget(): void {
    if (!this.config.monthlyBudget) return;

    const totalCost = Object.values(this.usageStats).reduce((sum, stats) => sum + stats.totalCost, 0);
    
    if (totalCost >= this.config.monthlyBudget) {
      throw new Error(`Monthly budget exceeded. Current usage: $${totalCost.toFixed(4)}, Budget: $${this.config.monthlyBudget}`);
    }
  }

  private updateUsageStats(result: GenerationResult): void {
    const stats = this.usageStats[result.provider];
    if (stats) {
      stats.totalTokens += result.usage.totalTokens;
      stats.totalCost += result.cost;
      stats.requestCount += 1;
    }
  }

  getUsageStats(): UsageStats {
    return JSON.parse(JSON.stringify(this.usageStats));
  }

  resetUsageStats(): void {
    const now = new Date();
    Object.keys(this.usageStats).forEach(provider => {
      this.usageStats[provider] = {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        lastReset: now
      };
    });
  }

  getBudgetStatus(): { used: number; remaining: number; percentage: number } {
    const totalCost = Object.values(this.usageStats).reduce((sum, stats) => sum + stats.totalCost, 0);
    const budget = this.config.monthlyBudget || 100;
    const remaining = Math.max(0, budget - totalCost);
    const percentage = (totalCost / budget) * 100;

    return {
      used: totalCost,
      remaining,
      percentage
    };
  }

  addProvider(provider: AIProvider): void {
    this.providers.push(provider);
    this.initializeUsageStats();
  }

  removeProvider(providerName: string): void {
    this.providers = this.providers.filter(p => p.name !== providerName);
    delete this.usageStats[providerName];
  }

  getAvailableProviders(): string[] {
    return this.providers.filter(p => p.isAvailable()).map(p => p.name);
  }
}

// Singleton AIRouter instance for API usage
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';

let airouterInstance: AIRouter | null = null;

export function getAIRouter(): AIRouter {
  if (!airouterInstance) {
    // TODO: Replace with real API key loading logic
    const openaiKey = process.env.OPENAI_API_KEY || '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    const providers = [];
    if (openaiKey) providers.push(new OpenAIProvider(openaiKey));
    if (anthropicKey) providers.push(new AnthropicProvider(anthropicKey));
    airouterInstance = new AIRouter(providers);
  }
  return airouterInstance;
}