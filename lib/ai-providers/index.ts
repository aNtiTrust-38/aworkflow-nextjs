export { AnthropicProvider } from './anthropic';
export { OpenAIProvider } from './openai';
export { AIRouter } from './router';
export { BaseProvider } from './base';
export * from './types';

// Import the classes explicitly for use in factory function
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { AIRouter } from './router';

// Factory function to create a configured router
export function createAIRouter(config: {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  monthlyBudget?: number;
  fallbackEnabled?: boolean;
  costOptimization?: boolean;
}) {
  const providers = [];

  if (config.anthropicApiKey) {
    providers.push(new AnthropicProvider(config.anthropicApiKey));
  }

  if (config.openaiApiKey) {
    providers.push(new OpenAIProvider(config.openaiApiKey));
  }

  if (providers.length === 0) {
    throw new Error('At least one AI provider API key is required');
  }

  return new AIRouter(providers, {
    monthlyBudget: config.monthlyBudget,
    fallbackEnabled: config.fallbackEnabled,
    costOptimization: config.costOptimization
  });
}