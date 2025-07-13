export interface AIProvider {
  name: string;
  callAPI(request: AIRequest): Promise<AIResponse>;
  checkAvailability(): Promise<boolean>;
  getCost(tokens: number): number;
  getModelName(): string;
  getMaxTokens(): number;
  getRateLimits(): { requestsPerMinute: number; tokensPerMinute: number };
}

export interface AIRequest {
  prompt: string;
  type: 'research' | 'generation' | 'analysis' | 'general';
  metadata?: {
    workflowStep?: string;
    enhanceWithContext?: boolean;
    [key: string]: any;
  };
}

export interface AIResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}