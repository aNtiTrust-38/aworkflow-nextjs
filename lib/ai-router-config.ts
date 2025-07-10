import { createAIRouter } from './ai-providers';

let globalRouter: ReturnType<typeof createAIRouter> | null = null;

export function getAIRouter() {
  if (!globalRouter) {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const monthlyBudget = process.env.AI_MONTHLY_BUDGET ? parseFloat(process.env.AI_MONTHLY_BUDGET) : 100;

    if (!anthropicApiKey && !openaiApiKey) {
      throw new Error('At least one AI provider API key must be configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)');
    }

    globalRouter = createAIRouter({
      anthropicApiKey,
      openaiApiKey,
      monthlyBudget,
      fallbackEnabled: true,
      costOptimization: true
    });
  }

  return globalRouter;
}

export function resetAIRouter() {
  globalRouter = null;
}