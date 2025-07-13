export interface SetupStatus {
  isSetup: boolean;
  completedSteps: string[];
  currentStep?: number;
}

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  salt: string;
  tag: string;
}

export interface DecryptionRequest {
  encrypted: string;
  iv: string;
  salt: string;
  tag: string;
}

export interface UserSettings {
  // AI Provider settings
  aiProvider?: 'auto' | 'anthropic' | 'openai';
  anthropicApiKey?: string;
  openaiApiKey?: string;
  monthlyBudget?: number;
  
  // Zotero integration settings
  zoteroApiKey?: string;
  zoteroUserId?: string;
  
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
  ZOTERO_API_KEY: 'zotero_api_key',
  ZOTERO_USER_ID: 'zotero_user_id',
  CITATION_STYLE: 'citation_style',
  LANGUAGE: 'language',
  THEME: 'theme',
  ACCESSIBILITY: 'accessibility',
} as const;

export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];