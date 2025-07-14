import OpenAI from 'openai';
import { BaseProvider } from './base';
import { GenerationResult, TaskType, PRICING } from './types';

export class OpenAIProvider extends BaseProvider {
  public name = 'openai';
  private client: OpenAI;
  private model: string = 'gpt-4o';

  constructor(apiKey: string, model?: string) {
    super(apiKey);
    this.client = new OpenAI({ apiKey });
    if (model) this.model = model;
  }

  protected getProviderName(): string {
    return 'OpenAI';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateContent(prompt: string, taskType: TaskType, options?: Record<string, unknown>): Promise<GenerationResult> {
    try {
      const systemPrompt = this.getSystemPrompt(taskType);
      const maxTokens = (typeof options?.maxTokens === 'number' ? options.maxTokens : 4000);

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.choices[0]?.message?.content || '';
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      
      this.updateUsage(inputTokens, outputTokens);
      
      const cost = this.calculateCost(inputTokens, outputTokens);

      return {
        content,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens
        },
        cost,
        provider: this.name
      };
    } catch (error: unknown) {
      const isRetryable = this.isRetryableError(error);
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      throw this.createProviderError(errorInstance, isRetryable);
    }
  }

  estimateCost(prompt: string): number {
    // Rough estimation: ~4 characters per token
    const estimatedTokens = Math.ceil(prompt.length / 4);
    return this.calculateCost(estimatedTokens, estimatedTokens);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * PRICING.openai.input;
    const outputCost = (outputTokens / 1000) * PRICING.openai.output;
    return inputCost + outputCost;
  }

  private getSystemPrompt(taskType: TaskType): string {
    switch (taskType) {
      case TaskType.WRITING:
        return `You are an expert academic writer and editor. Provide high-quality writing assistance. Focus on:
- Clear, engaging, and precise language
- Proper academic style and tone
- Well-structured paragraphs and flow
- Grammar, syntax, and readability`;

      case TaskType.REVIEW:
        return `You are an expert academic reviewer and editor. Provide comprehensive feedback. Focus on:
- Content quality and accuracy
- Writing clarity and effectiveness
- Structural improvements
- Specific, actionable suggestions`;

      case TaskType.OUTLINE:
        return `You are an expert academic writing coach. Help create effective outlines. Focus on:
- Clear organizational structure
- Logical progression of ideas
- Comprehensive topic coverage
- Academic writing conventions`;

      case TaskType.RESEARCH:
        return `You are an expert research assistant. Provide research support. Focus on:
- Comprehensive topic exploration
- Source identification and evaluation
- Research methodology guidance
- Academic standards and practices`;

      case TaskType.ANALYSIS:
        return `You are an expert academic analyst. Provide thorough analysis. Focus on:
- Critical thinking and evaluation
- Evidence-based conclusions
- Balanced perspectives
- Scholarly analysis methods`;

      default:
        return 'You are a helpful academic assistant. Provide accurate, well-structured assistance with academic tasks.';
    }
  }
}