export enum ProviderType {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai'
}

export enum TaskType {
  RESEARCH = 'research',
  WRITING = 'writing',
  ANALYSIS = 'analysis',
  OUTLINE = 'outline',
  REVIEW = 'review'
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GenerationResult {
  content: string;
  usage: Usage;
  cost: number;
  provider: string;
}

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface RouterConfig {
  monthlyBudget?: number;
  fallbackEnabled?: boolean;
  costOptimization?: boolean;
}

export interface UsageStats {
  [provider: string]: {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    lastReset: Date;
  };
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generateContent(prompt: string, taskType: TaskType, options?: any): Promise<GenerationResult>;
  estimateCost(prompt: string): number;
  getUsage(): Usage;
}

export interface ProviderError extends Error {
  provider: string;
  retryable: boolean;
  code?: string;
}

// Pricing per 1K tokens (approximate as of 2024)
export const PRICING = {
  anthropic: {
    input: 0.003,   // Claude 3.5 Sonnet
    output: 0.015
  },
  openai: {
    input: 0.005,   // GPT-4o
    output: 0.015
  }
} as const;