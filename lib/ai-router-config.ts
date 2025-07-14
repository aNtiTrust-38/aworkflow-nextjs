import { AIProvider } from './ai-providers/types';
import { AnthropicProvider } from './ai-providers/anthropic';
import { OpenAIProvider } from './ai-providers/openai';
import { AIRouter } from './ai-providers/router';

export interface AIRouterConfig {
  providers?: Record<string, AIProvider>;
  defaultProvider?: string;
  budget?: {
    monthly: number;
    current: number;
  };
}

export async function getAIRouter(config?: Partial<AIRouterConfig>): Promise<AIRouter> {
  const providers: AIProvider[] = [];
  
  // Use provided providers or initialize from environment variables
  if (config?.providers) {
    providers.push(...Object.values(config.providers));
  } else {
    // Initialize from environment variables
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push(new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
    }
    
    if (process.env.OPENAI_API_KEY) {
      providers.push(new OpenAIProvider(process.env.OPENAI_API_KEY));
    }
  }
  
  const router = new AIRouter(providers, {
    monthlyBudget: config?.budget?.monthly || 100,
  });
  
  return router;
}

export async function createAIRouterFromSettings(userSettings: unknown): Promise<AIRouter> {
  const settings = userSettings as {
    aiProvider?: string;
    monthlyBudget?: number;
    anthropicApiKey?: string;
    openaiApiKey?: string;
  };
  
  const config: Partial<AIRouterConfig> = {
    defaultProvider: settings.aiProvider || 'anthropic',
    budget: settings.monthlyBudget ? {
      monthly: settings.monthlyBudget,
      current: 0, // TODO: Track current usage
    } : undefined,
  };
  
  const providers: Record<string, AIProvider> = {};
  
  if (settings.anthropicApiKey) {
    providers.anthropic = new AnthropicProvider(settings.anthropicApiKey);
  }
  
  if (settings.openaiApiKey) {
    providers.openai = new OpenAIProvider(settings.openaiApiKey);
  }
  
  config.providers = providers;
  
  return getAIRouter(config);
}