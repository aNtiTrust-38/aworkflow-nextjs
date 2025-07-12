import { AIProvider } from './ai-providers/types';
import { AnthropicProvider } from './ai-providers/anthropic';
import { OpenAIProvider } from './ai-providers/openai';
import { AIRouter } from './ai-providers/router';

export interface AIRouterConfig {
  providers: Record<string, AIProvider>;
  defaultProvider: string;
  budget?: {
    monthly: number;
    current: number;
  };
}

export async function getAIRouter(config?: Partial<AIRouterConfig>): Promise<AIRouter> {
  const providers: Record<string, AIProvider> = {};
  
  // Initialize providers based on available API keys
  if (config?.providers?.anthropic || process.env.ANTHROPIC_API_KEY) {
    providers.anthropic = new AnthropicProvider({
      apiKey: config?.providers?.anthropic?.getApiKey?.() || process.env.ANTHROPIC_API_KEY || '',
    });
  }
  
  if (config?.providers?.openai || process.env.OPENAI_API_KEY) {
    providers.openai = new OpenAIProvider({
      apiKey: config?.providers?.openai?.getApiKey?.() || process.env.OPENAI_API_KEY || '',
    });
  }
  
  const router = new AIRouter({
    providers,
    defaultProvider: config?.defaultProvider || 'anthropic',
    budget: config?.budget,
  });
  
  return router;
}

export async function createAIRouterFromSettings(userSettings: any): Promise<AIRouter> {
  const config: Partial<AIRouterConfig> = {
    defaultProvider: userSettings.aiProvider || 'anthropic',
    budget: userSettings.monthlyBudget ? {
      monthly: userSettings.monthlyBudget,
      current: 0, // TODO: Track current usage
    } : undefined,
  };
  
  const providers: Record<string, AIProvider> = {};
  
  if (userSettings.anthropicApiKey) {
    providers.anthropic = new AnthropicProvider({
      apiKey: userSettings.anthropicApiKey,
    });
  }
  
  if (userSettings.openaiApiKey) {
    providers.openai = new OpenAIProvider({
      apiKey: userSettings.openaiApiKey,
    });
  }
  
  config.providers = providers;
  
  return getAIRouter(config);
}