import { AIProvider, GenerationResult, TaskType, Usage, ProviderError } from './types';

export abstract class BaseProvider implements AIProvider {
  public abstract name: string;
  protected apiKey: string;
  protected usage: Usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(`${this.getProviderName()} API key is required`);
    }
    this.apiKey = apiKey;
  }

  protected getProviderName(): string {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }

  abstract isAvailable(): boolean;
  abstract generateContent(prompt: string, taskType: TaskType, options?: Record<string, unknown>): Promise<GenerationResult>;
  abstract estimateCost(prompt: string): number;

  getUsage(): Usage {
    return { ...this.usage };
  }

  protected updateUsage(inputTokens: number, outputTokens: number): void {
    this.usage.inputTokens += inputTokens;
    this.usage.outputTokens += outputTokens;
    this.usage.totalTokens += inputTokens + outputTokens;
  }

  protected createProviderError(error: Error, retryable: boolean = false): ProviderError {
    const providerError = new Error(`${this.getProviderName()} API Error: ${error.message}`) as ProviderError;
    providerError.provider = this.name;
    providerError.retryable = retryable;
    providerError.code = (error as { code?: string }).code;
    return providerError;
  }

  protected isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as { code?: string; status?: number };
    void err; // Mark as used for ESLint
    // Common retryable error patterns
    const retryablePatterns = [
      'rate limit',
      'timeout',
      'network',
      'connection',
      'service unavailable',
      'internal server error'
    ];
    
    const message = (error instanceof Error ? error.message : '').toLowerCase();
    return retryablePatterns.some(pattern => message.includes(pattern));
  }
}