import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base';
import { GenerationResult, TaskType, PRICING } from './types';

// Type guard for text content blocks
function isTextBlock(block: unknown): block is { type: 'text'; text: string } {
  return (
    block !== null &&
    typeof block === 'object' &&
    'type' in block &&
    'text' in block &&
    (block as { type: unknown; text: unknown }).type === 'text' &&
    typeof (block as { type: unknown; text: unknown }).text === 'string'
  );
}

export class AnthropicProvider extends BaseProvider {
  public name = 'anthropic';
  private client: Anthropic;
  private model: string = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string, model?: string) {
    super(apiKey);
    this.client = new Anthropic({ apiKey });
    if (model) this.model = model;
  }

  protected getProviderName(): string {
    return 'Anthropic';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateContent(prompt: string, taskType: TaskType, options?: Record<string, unknown>): Promise<GenerationResult> {
    try {
      const systemPrompt = this.getSystemPrompt(taskType);
      const maxTokens = (typeof options?.maxTokens === 'number' ? options.maxTokens : 4000);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      let content = '';
      if (Array.isArray(response.content)) {
        const textBlock = (response.content as unknown[]).find(isTextBlock);
        if (textBlock) {
          content = textBlock.text;
        }
      }
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      
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
    const inputCost = (inputTokens / 1000) * PRICING.anthropic.input;
    const outputCost = (outputTokens / 1000) * PRICING.anthropic.output;
    return inputCost + outputCost;
  }

  private getSystemPrompt(taskType: TaskType): string {
    switch (taskType) {
      case TaskType.RESEARCH:
        return `You are an expert academic researcher. Provide comprehensive, accurate, and well-structured research assistance. Focus on:
- Identifying key concepts and themes
- Suggesting relevant academic sources
- Providing detailed analysis and insights
- Maintaining academic rigor and objectivity`;

      case TaskType.ANALYSIS:
        return `You are an expert academic analyst. Provide deep, thoughtful analysis of academic content. Focus on:
- Critical evaluation of arguments and evidence
- Identifying patterns and connections
- Providing nuanced interpretations
- Maintaining scholarly perspective`;

      case TaskType.OUTLINE:
        return `You are an expert academic writing coach. Help create well-structured outlines. Focus on:
- Logical flow and organization
- Clear hierarchical structure
- Comprehensive coverage of topics
- Academic writing standards`;

      case TaskType.WRITING:
        return `You are an expert academic writer. Assist with high-quality academic writing. Focus on:
- Clear, precise language
- Proper academic tone and style
- Well-structured arguments
- Accurate citations and references`;

      case TaskType.REVIEW:
        return `You are an expert academic reviewer. Provide constructive feedback on academic work. Focus on:
- Content accuracy and completeness
- Structural and logical flow
- Writing quality and clarity
- Suggestions for improvement`;

      default:
        return 'You are a helpful academic assistant. Provide accurate, well-structured assistance with academic tasks.';
    }
  }
}