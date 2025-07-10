export interface AppSettings {
  // AI Providers
  anthropicKey: string;
  openaiKey?: string;
  aiMonthlyBudget?: number;
  
  // Authentication
  nextauthSecret: string;
  nextauthUrl: string;
  
  // Database
  databaseUrl?: string;
  
  // Optional Features
  zoteroApiKey?: string;
  zoteroUserId?: string;
  enableAnalytics?: boolean;
}

export interface SettingItem {
  id: string;
  key: string;
  value: string;
  encrypted: boolean;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaskedSettings {
  anthropicKey: string | null; // Will show ••••••••last4 or null
  openaiKey: string | null;
  aiMonthlyBudget: number | null;
  nextauthSecret: string | null;
  nextauthUrl: string | null;
  databaseUrl: string | null;
  zoteroApiKey: string | null;
  zoteroUserId: string | null;
  enableAnalytics: boolean | null;
  configured: {
    anthropic: boolean;
    openai: boolean;
    auth: boolean;
    database: boolean;
    zotero: boolean;
  };
}

export interface SettingsUpdateRequest {
  anthropicKey?: string;
  openaiKey?: string;
  aiMonthlyBudget?: number;
  nextauthSecret?: string;
  nextauthUrl?: string;
  databaseUrl?: string;
  zoteroApiKey?: string;
  zoteroUserId?: string;
  enableAnalytics?: boolean;
}

export interface ApiKeyTestRequest {
  provider: 'anthropic' | 'openai' | 'zotero';
  apiKey: string;
  userId?: string; // For Zotero
}

export interface ApiKeyTestResult {
  valid: boolean;
  error?: string;
  details?: {
    service: string;
    status: 'connected' | 'error' | 'unauthorized' | 'rate_limited';
    message?: string;
  };
}

export interface SetupWizardStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  fields: SetupField[];
}

export interface SetupField {
  key: keyof AppSettings;
  label: string;
  type: 'text' | 'password' | 'number' | 'url';
  placeholder?: string;
  helpText?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface SetupStatus {
  isSetup: boolean;
  completedSteps: string[];
  nextStep?: string;
  requiredSettings: string[];
  missingSettings: string[];
}

export interface SettingsValidationError {
  field: string;
  message: string;
  code: 'required' | 'invalid_format' | 'invalid_length' | 'test_failed';
}

export interface SettingsFormState {
  values: Partial<AppSettings>;
  errors: SettingsValidationError[];
  isLoading: boolean;
  isTesting: { [key: string]: boolean };
  testResults: { [key: string]: ApiKeyTestResult };
}

// Security types
export interface EncryptionResult {
  encrypted: string;
  salt: string;
  iv: string;
}

export interface DecryptionRequest {
  encrypted: string;
  salt: string;
  iv: string;
}

// Audit logging
export interface SettingsAuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'test';
  settingKey: string;
  userId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

export const SETTING_CATEGORIES = {
  AI: 'ai',
  AUTH: 'auth', 
  DATABASE: 'database',
  INTEGRATIONS: 'integrations',
  FEATURES: 'features'
} as const;

export type SettingCategory = typeof SETTING_CATEGORIES[keyof typeof SETTING_CATEGORIES];

export const SETTING_KEYS = {
  ANTHROPIC_API_KEY: 'anthropic_api_key',
  OPENAI_API_KEY: 'openai_api_key',
  AI_MONTHLY_BUDGET: 'ai_monthly_budget',
  NEXTAUTH_SECRET: 'nextauth_secret',
  NEXTAUTH_URL: 'nextauth_url',
  DATABASE_URL: 'database_url',
  ZOTERO_API_KEY: 'zotero_api_key',
  ZOTERO_USER_ID: 'zotero_user_id',
  ENABLE_ANALYTICS: 'enable_analytics'
} as const;

export type SettingKey = typeof SETTING_KEYS[keyof typeof SETTING_KEYS];