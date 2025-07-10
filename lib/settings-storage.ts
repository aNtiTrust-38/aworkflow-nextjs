import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, maskSensitiveValue } from './crypto';
import { 
  AppSettings, 
  SettingItem, 
  MaskedSettings, 
  SETTING_KEYS, 
  SETTING_CATEGORIES,
  SettingsAuditLog 
} from '../types/settings';

const defaultPrisma = new PrismaClient();

/**
 * Settings storage abstraction with encryption and security
 */
export class SettingsStorage {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }
  
  /**
   * Get all settings in decrypted form
   */
  async getSettings(): Promise<Partial<AppSettings>> {
    try {
      const settings = await this.prisma.appSetting.findMany();
      const decrypted: Partial<AppSettings> = {};
      
      if (!settings || !Array.isArray(settings)) {
        return decrypted;
      }
      
      for (const setting of settings) {
        let value = setting.value;
        
        if (setting.encrypted) {
          try {
            const encryptionData = JSON.parse(setting.value);
            value = decrypt(encryptionData);
          } catch (error) {
            console.error(`Failed to decrypt setting ${setting.key}:`, error);
            continue; // Skip this setting if decryption fails
          }
        }
          
        this.mapSettingToAppConfig(setting.key, value, decrypted);
      }
      
      return decrypted;
    } catch (error: any) {
      console.error('Failed to get settings:', error);
      throw new Error(`Settings retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get settings in masked form for UI display
   */
  async getMaskedSettings(): Promise<MaskedSettings> {
    try {
      const settings = await this.prisma.appSetting.findMany();
      const configured = {
        anthropic: false,
        openai: false,
        auth: false,
        database: false,
        zotero: false
      };

      const masked: MaskedSettings = {
        anthropicKey: null,
        openaiKey: null,
        aiMonthlyBudget: null,
        nextauthSecret: null,
        nextauthUrl: null,
        databaseUrl: null,
        zoteroApiKey: null,
        zoteroUserId: null,
        enableAnalytics: null,
        configured
      };

      if (!settings || !Array.isArray(settings)) {
        return masked;
      }

      for (const setting of settings) {
        let maskedValue = setting.value;
        
        if (setting.encrypted) {
          try {
            const encryptionData = JSON.parse(setting.value);
            const decrypted = decrypt(encryptionData);
            maskedValue = maskSensitiveValue(decrypted, 4);
          } catch (error) {
            maskedValue = '••••••••'; // Fallback mask if decryption fails
          }
        }

        switch (setting.key) {
          case SETTING_KEYS.ANTHROPIC_API_KEY:
            masked.anthropicKey = maskedValue;
            configured.anthropic = true;
            break;
          case SETTING_KEYS.OPENAI_API_KEY:
            masked.openaiKey = maskedValue;
            configured.openai = true;
            break;
          case SETTING_KEYS.AI_MONTHLY_BUDGET:
            masked.aiMonthlyBudget = parseFloat(setting.value) || null;
            break;
          case SETTING_KEYS.NEXTAUTH_SECRET:
            masked.nextauthSecret = maskedValue;
            configured.auth = true;
            break;
          case SETTING_KEYS.NEXTAUTH_URL:
            masked.nextauthUrl = setting.value; // URLs are not sensitive
            configured.auth = configured.auth || !!setting.value;
            break;
          case SETTING_KEYS.DATABASE_URL:
            masked.databaseUrl = maskedValue;
            configured.database = true;
            break;
          case SETTING_KEYS.ZOTERO_API_KEY:
            masked.zoteroApiKey = maskedValue;
            configured.zotero = true;
            break;
          case SETTING_KEYS.ZOTERO_USER_ID:
            masked.zoteroUserId = setting.value; // User ID is not sensitive
            configured.zotero = configured.zotero || !!setting.value;
            break;
          case SETTING_KEYS.ENABLE_ANALYTICS:
            masked.enableAnalytics = setting.value === 'true';
            break;
        }
      }

      return { ...masked, configured };
    } catch (error: any) {
      console.error('Failed to get masked settings:', error);
      throw new Error(`Masked settings retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update or create a setting
   */
  async setSetting(
    key: string, 
    value: string, 
    options: {
      encrypt?: boolean;
      category?: string;
      description?: string;
      userId?: string;
    } = {}
  ): Promise<void> {
    try {
      const { encrypt: shouldEncrypt = true, category, description } = options;
      
      let storedValue = value;
      if (shouldEncrypt && value) {
        const encrypted = encrypt(value);
        // Store encrypted data as JSON for easier handling
        storedValue = JSON.stringify(encrypted);
      }

      await this.prisma.appSetting.upsert({
        where: { key },
        update: {
          value: storedValue,
          encrypted: shouldEncrypt,
          category,
          description,
          updatedAt: new Date()
        },
        create: {
          key,
          value: storedValue,
          encrypted: shouldEncrypt,
          category,
          description
        }
      });

      // Log the change for audit purposes
      await this.logSettingChange('update', key, options.userId, true);
      
    } catch (error: any) {
      await this.logSettingChange('update', key, options.userId, false, error.message);
      console.error(`Failed to set setting ${key}:`, error);
      throw new Error(`Setting update failed: ${error.message}`);
    }
  }

  /**
   * Update multiple settings in a transaction
   */
  async updateSettings(
    updates: Partial<AppSettings>,
    userId?: string
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const [settingKey, value] of Object.entries(updates)) {
          if (value !== undefined && value !== null) {
            const dbKey = this.mapAppConfigToSettingKey(settingKey);
            const shouldEncrypt = this.shouldEncryptSetting(settingKey);
            const category = this.getSettingCategory(settingKey);
            
            let storedValue = String(value);
            if (shouldEncrypt && value) {
              const encrypted = encrypt(String(value));
              storedValue = JSON.stringify(encrypted);
            }

            await tx.appSetting.upsert({
              where: { key: dbKey },
              update: {
                value: storedValue,
                encrypted: shouldEncrypt,
                category,
                updatedAt: new Date()
              },
              create: {
                key: dbKey,
                value: storedValue,
                encrypted: shouldEncrypt,
                category
              }
            });
          }
        }
      });

      // Log bulk update
      await this.logSettingChange(
        'update', 
        `bulk_update_${Object.keys(updates).length}_settings`, 
        userId, 
        true
      );
      
    } catch (error: any) {
      await this.logSettingChange(
        'update', 
        `bulk_update_failed`, 
        userId, 
        false, 
        error.message
      );
      console.error('Failed to update settings:', error);
      throw new Error(`Settings bulk update failed: ${error.message}`);
    }
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key: string, userId?: string): Promise<void> {
    try {
      await this.prisma.appSetting.delete({
        where: { key }
      });
      
      await this.logSettingChange('delete', key, userId, true);
    } catch (error: any) {
      await this.logSettingChange('delete', key, userId, false, error.message);
      throw new Error(`Setting deletion failed: ${error.message}`);
    }
  }

  /**
   * Check if the application has been set up
   */
  async isSetup(): Promise<boolean> {
    try {
      const requiredSettings = [
        SETTING_KEYS.ANTHROPIC_API_KEY,
        SETTING_KEYS.NEXTAUTH_SECRET
      ];

      const settings = await this.prisma.appSetting.findMany({
        where: {
          key: { in: requiredSettings }
        }
      });

      return settings.length >= requiredSettings.length;
    } catch (error: any) {
      console.error('Failed to check setup status:', error);
      return false;
    }
  }

  /**
   * Get a decrypted setting by key
   */
  async getDecryptedSetting(key: string): Promise<string | null> {
    try {
      const setting = await this.prisma.appSetting.findUnique({
        where: { key }
      });

      if (!setting) return null;

      if (setting.encrypted) {
        const encryptionData = JSON.parse(setting.value);
        return decrypt(encryptionData);
      }

      return setting.value;
    } catch (error: any) {
      console.error(`Failed to get setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private mapSettingToAppConfig(key: string, value: string, config: Partial<AppSettings>): void {
    switch (key) {
      case SETTING_KEYS.ANTHROPIC_API_KEY:
        config.anthropicKey = value;
        break;
      case SETTING_KEYS.OPENAI_API_KEY:
        config.openaiKey = value;
        break;
      case SETTING_KEYS.AI_MONTHLY_BUDGET:
        config.aiMonthlyBudget = parseFloat(value) || undefined;
        break;
      case SETTING_KEYS.NEXTAUTH_SECRET:
        config.nextauthSecret = value;
        break;
      case SETTING_KEYS.NEXTAUTH_URL:
        config.nextauthUrl = value;
        break;
      case SETTING_KEYS.DATABASE_URL:
        config.databaseUrl = value;
        break;
      case SETTING_KEYS.ZOTERO_API_KEY:
        config.zoteroApiKey = value;
        break;
      case SETTING_KEYS.ZOTERO_USER_ID:
        config.zoteroUserId = value;
        break;
      case SETTING_KEYS.ENABLE_ANALYTICS:
        config.enableAnalytics = value === 'true';
        break;
    }
  }

  private mapAppConfigToSettingKey(configKey: string): string {
    const mapping: Record<string, string> = {
      anthropicKey: SETTING_KEYS.ANTHROPIC_API_KEY,
      openaiKey: SETTING_KEYS.OPENAI_API_KEY,
      aiMonthlyBudget: SETTING_KEYS.AI_MONTHLY_BUDGET,
      nextauthSecret: SETTING_KEYS.NEXTAUTH_SECRET,
      nextauthUrl: SETTING_KEYS.NEXTAUTH_URL,
      databaseUrl: SETTING_KEYS.DATABASE_URL,
      zoteroApiKey: SETTING_KEYS.ZOTERO_API_KEY,
      zoteroUserId: SETTING_KEYS.ZOTERO_USER_ID,
      enableAnalytics: SETTING_KEYS.ENABLE_ANALYTICS
    };
    
    return mapping[configKey] || configKey;
  }

  private shouldEncryptSetting(configKey: string): boolean {
    const encryptedKeys = [
      'anthropicKey',
      'openaiKey', 
      'nextauthSecret',
      'databaseUrl',
      'zoteroApiKey'
    ];
    
    return encryptedKeys.includes(configKey);
  }

  private getSettingCategory(configKey: string): string {
    if (['anthropicKey', 'openaiKey', 'aiMonthlyBudget'].includes(configKey)) {
      return SETTING_CATEGORIES.AI;
    }
    if (['nextauthSecret', 'nextauthUrl'].includes(configKey)) {
      return SETTING_CATEGORIES.AUTH;
    }
    if (['databaseUrl'].includes(configKey)) {
      return SETTING_CATEGORIES.DATABASE;
    }
    if (['zoteroApiKey', 'zoteroUserId'].includes(configKey)) {
      return SETTING_CATEGORIES.INTEGRATIONS;
    }
    if (['enableAnalytics'].includes(configKey)) {
      return SETTING_CATEGORIES.FEATURES;
    }
    
    return 'general';
  }

  private async logSettingChange(
    action: string,
    settingKey: string,
    userId?: string,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    try {
      // In a real implementation, you might want a separate audit log table
      console.log(`Settings audit: ${action} ${settingKey} by ${userId || 'system'} - ${success ? 'success' : 'failed'}${error ? ': ' + error : ''}`);
    } catch (auditError) {
      // Don't fail the main operation if audit logging fails
      console.error('Audit logging failed:', auditError);
    }
  }
}

// Singleton instance
let settingsStorage: SettingsStorage | null = null;

export function getSettingsStorage(): SettingsStorage {
  if (!settingsStorage) {
    settingsStorage = new SettingsStorage();
  }
  return settingsStorage;
}