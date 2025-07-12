export interface SetupStatus {
  isSetup: boolean;
  completedSteps: string[];
  currentStep?: number;
}

export interface UserSettings {
  // AI Provider settings
  aiProvider?: 'auto' | 'anthropic' | 'openai';
  anthropicApiKey?: string;
  openaiApiKey?: string;
  monthlyBudget?: number;
  
  // Academic preferences
  citationStyle?: 'APA' | 'MLA' | 'Chicago' | 'Harvard';
  language?: string;
  
  // UI preferences
  theme?: 'light' | 'dark' | 'system';
  accessibility?: {
    highContrast?: boolean;
    reduceMotion?: boolean;
  };
}

export const SETTING_KEYS = {
  SETUP_STATUS: 'setup_status',
  AI_PROVIDER: 'ai_provider',
  ANTHROPIC_API_KEY: 'anthropic_api_key',
  OPENAI_API_KEY: 'openai_api_key',
  MONTHLY_BUDGET: 'monthly_budget',
  CITATION_STYLE: 'citation_style',
  LANGUAGE: 'language',
  THEME: 'theme',
  ACCESSIBILITY: 'accessibility',
} as const;

export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];