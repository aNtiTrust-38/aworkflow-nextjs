import { PrismaClient } from '@prisma/client';
import { EncryptionService } from './encryption-service';

interface ApiKeysData {
  anthropicApiKey?: string | null;
  openaiApiKey?: string | null;
}

interface PreferencesData {
  citationStyle?: string;
  defaultLanguage?: string;
  adhdFriendlyMode?: boolean;
  theme?: string;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

interface AiSettingsData {
  monthlyBudget?: number;
  preferredProvider?: 'auto' | 'anthropic' | 'openai';
}

interface CompleteSettingsData extends ApiKeysData, PreferencesData, AiSettingsData {}

interface SettingsResponse {
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  monthlyBudget: number;
  preferredProvider: 'auto' | 'anthropic' | 'openai';
  citationStyle: string;
  defaultLanguage: string;
  adhdFriendlyMode: boolean;
  theme: string;
  reducedMotion: boolean;
  highContrast: boolean;
}

/**
 * UserSettingsStorage - Encrypted storage service for user settings
 * Handles API keys, preferences, and AI provider settings with encryption
 */
export class UserSettingsStorage {
  private prisma: PrismaClient;
  private encryptionService: EncryptionService;

  constructor(prismaInstance?: PrismaClient) {
    this.prisma = prismaInstance || new PrismaClient();
    this.encryptionService = new EncryptionService();
  }

  /**
   * Store encrypted API keys for a user
   */
  async storeApiKeys(userId: string, apiKeys: ApiKeysData): Promise<void> {
    if (!userId) {
      throw new Error('Valid user ID is required for storing API keys');
    }

    try {
      // Prepare encrypted data
      const updateData: any = {};
      
      if (apiKeys.anthropicApiKey !== undefined) {
        if (apiKeys.anthropicApiKey === null) {
          updateData.anthropicApiKey = null;
        } else {
          const encrypted = await this.encryptionService.encryptApiKey(apiKeys.anthropicApiKey);
          updateData.anthropicApiKey = JSON.stringify(encrypted);
        }
      }
      
      if (apiKeys.openaiApiKey !== undefined) {
        if (apiKeys.openaiApiKey === null) {
          updateData.openaiApiKey = null;
        } else {
          const encrypted = await this.encryptionService.encryptApiKey(apiKeys.openaiApiKey);
          updateData.openaiApiKey = JSON.stringify(encrypted);
        }
      }

      // Upsert user settings
      await this.prisma.userSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          ...updateData
        }
      });
    } catch (error: any) {
      throw new Error(`Failed to store API keys: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt API keys for a user
   */
  async getApiKeys(userId: string): Promise<{ anthropicApiKey: string | null; openaiApiKey: string | null }> {
    if (!userId) {
      return { anthropicApiKey: null, openaiApiKey: null };
    }

    try {
      const settings = await this.prisma.userSettings.findUnique({
        where: { userId }
      });

      if (!settings) {
        return { anthropicApiKey: null, openaiApiKey: null };
      }

      const result = {
        anthropicApiKey: null as string | null,
        openaiApiKey: null as string | null
      };

      // Decrypt anthropic key
      if (settings.anthropicApiKey) {
        try {
          const encryptedData = JSON.parse(settings.anthropicApiKey) as any; // Removed EncryptionResult import
          result.anthropicApiKey = await this.encryptionService.decryptApiKey(encryptedData);
        } catch (error) {
          console.warn('Failed to decrypt anthropic API key:', error);
          result.anthropicApiKey = null;
        }
      }

      // Decrypt OpenAI key
      if (settings.openaiApiKey) {
        try {
          const encryptedData = JSON.parse(settings.openaiApiKey) as any; // Removed EncryptionResult import
          result.openaiApiKey = await this.encryptionService.decryptApiKey(encryptedData);
        } catch (error) {
          console.warn('Failed to decrypt OpenAI API key:', error);
          result.openaiApiKey = null;
        }
      }

      return result;
    } catch (error: any) {
      throw new Error(`Failed to retrieve API keys: ${error.message}`);
    }
  }

  /**
   * Store user preferences
   */
  async storePreferences(userId: string, preferences: PreferencesData): Promise<void> {
    if (!userId) {
      throw new Error('Valid user ID is required for storing preferences');
    }

    try {
      const updateData: any = {};
      
      if (preferences.citationStyle !== undefined) updateData.citationStyle = preferences.citationStyle;
      if (preferences.defaultLanguage !== undefined) updateData.defaultLanguage = preferences.defaultLanguage;
      if (preferences.adhdFriendlyMode !== undefined) updateData.adhdFriendlyMode = preferences.adhdFriendlyMode;
      if (preferences.theme !== undefined) updateData.theme = preferences.theme;
      if (preferences.reducedMotion !== undefined) updateData.reducedMotion = preferences.reducedMotion;
      if (preferences.highContrast !== undefined) updateData.highContrast = preferences.highContrast;

      await this.prisma.userSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          ...updateData
        }
      });
    } catch (error: any) {
      throw new Error(`Failed to store preferences: ${error.message}`);
    }
  }

  /**
   * Get user preferences with defaults
   */
  async getPreferences(userId: string): Promise<Omit<SettingsResponse, 'anthropicApiKey' | 'openaiApiKey' | 'monthlyBudget' | 'preferredProvider'>> {
    try {
      const settings = await this.prisma.userSettings.findUnique({
        where: { userId }
      });

      // Sanitize and return defaults for corrupted values
      return {
        citationStyle: settings?.citationStyle && typeof settings.citationStyle === 'string' && settings.citationStyle.length > 0 ? settings.citationStyle : 'apa',
        defaultLanguage: settings?.defaultLanguage && typeof settings.defaultLanguage === 'string' && settings.defaultLanguage.length > 0 ? settings.defaultLanguage : 'en',
        adhdFriendlyMode: typeof settings?.adhdFriendlyMode === 'boolean' ? settings.adhdFriendlyMode : false,
        theme: settings?.theme && typeof settings.theme === 'string' && settings.theme.length > 0 ? settings.theme : 'system',
        reducedMotion: typeof settings?.reducedMotion === 'boolean' ? settings.reducedMotion : false,
        highContrast: typeof settings?.highContrast === 'boolean' ? settings.highContrast : false
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve preferences: ${error.message}`);
    }
  }

  /**
   * Store AI provider settings
   */
  async storeAiSettings(userId: string, aiSettings: AiSettingsData): Promise<void> {
    if (!userId) {
      throw new Error('Valid user ID is required for storing AI settings');
    }

    try {
      const updateData: any = {};
      
      if (aiSettings.monthlyBudget !== undefined) updateData.monthlyBudget = aiSettings.monthlyBudget;
      if (aiSettings.preferredProvider !== undefined) updateData.preferredProvider = aiSettings.preferredProvider;

      await this.prisma.userSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          ...updateData
        }
      });
    } catch (error: any) {
      throw new Error(`Failed to store AI settings: ${error.message}`);
    }
  }

  /**
   * Get AI provider settings with defaults
   */
  async getAiSettings(userId: string): Promise<{ monthlyBudget: number; preferredProvider: 'auto' | 'anthropic' | 'openai' }> {
    try {
      const settings = await this.prisma.userSettings.findUnique({
        where: { userId }
      });

      // Sanitize and return defaults for corrupted values
      let monthlyBudget = typeof settings?.monthlyBudget === 'number' && settings.monthlyBudget > 0 ? settings.monthlyBudget : 100;
      let preferredProvider: 'auto' | 'anthropic' | 'openai' =
        typeof settings?.preferredProvider === 'string' && ['auto', 'anthropic', 'openai'].includes(settings.preferredProvider)
          ? settings.preferredProvider as any
          : 'auto';

      return {
        monthlyBudget,
        preferredProvider
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve AI settings: ${error.message}`);
    }
  }

  /**
   * Store complete user settings
   */
  async storeCompleteSettings(userId: string, settings: CompleteSettingsData): Promise<void> {
    if (!userId) {
      throw new Error('Valid user ID is required for storing complete settings');
    }

    try {
      // Use individual methods to ensure proper encryption and validation
      const promises = [];
      
      // Store API keys if provided
      if (settings.anthropicApiKey !== undefined || settings.openaiApiKey !== undefined) {
        promises.push(this.storeApiKeys(userId, {
          anthropicApiKey: settings.anthropicApiKey,
          openaiApiKey: settings.openaiApiKey
        }));
      }
      
      // Store preferences if provided
      const preferenceKeys = ['citationStyle', 'defaultLanguage', 'adhdFriendlyMode', 'theme', 'reducedMotion', 'highContrast'];
      const hasPreferences = preferenceKeys.some(key => settings[key as keyof CompleteSettingsData] !== undefined);
      if (hasPreferences) {
        promises.push(this.storePreferences(userId, settings));
      }
      
      // Store AI settings if provided
      if (settings.monthlyBudget !== undefined || settings.preferredProvider !== undefined) {
        promises.push(this.storeAiSettings(userId, {
          monthlyBudget: settings.monthlyBudget,
          preferredProvider: settings.preferredProvider
        }));
      }
      
      await Promise.all(promises);
    } catch (error: any) {
      throw new Error(`Failed to store complete settings: ${error.message}`);
    }
  }

  /**
   * Get complete user settings with defaults
   */
  async getCompleteSettings(userId: string): Promise<SettingsResponse> {
    if (!userId) {
      throw new Error('Valid user ID is required for retrieving settings');
    }

    try {
      const [apiKeys, preferences, aiSettings] = await Promise.all([
        this.getApiKeys(userId),
        this.getPreferences(userId),
        this.getAiSettings(userId)
      ]);

      return {
        ...apiKeys,
        ...preferences,
        ...aiSettings
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve complete settings: ${error.message}`);
    }
  }

  /**
   * Delete all user settings
   */
  async deleteUserSettings(userId: string): Promise<void> {
    if (!userId) {
      return; // Silently ignore empty user IDs for deletion
    }

    try {
      await this.prisma.userSettings.deleteMany({
        where: { userId }
      });
    } catch (error: any) {
      // Don't throw error if settings don't exist
      if (!error.message.includes('Record to delete does not exist')) {
        throw new Error(`Failed to delete user settings: ${error.message}`);
      }
    }
  }
}

// Export singleton instance
let userSettingsStorageInstance: UserSettingsStorage | null = null;

export function getUserSettingsStorage(): UserSettingsStorage {
  if (!userSettingsStorageInstance) {
    userSettingsStorageInstance = new UserSettingsStorage();
  }
  return userSettingsStorageInstance;
}
