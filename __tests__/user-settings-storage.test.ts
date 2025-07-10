import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UserSettingsStorage } from '../lib/user-settings-storage';
import { generateMasterKey } from '../lib/crypto';

const prisma = new PrismaClient();

describe('UserSettingsStorage', () => {
  let settingsStorage: UserSettingsStorage;
  let testUser: any;

  beforeEach(async () => {
    // Set encryption key for tests
    process.env.SETTINGS_ENCRYPTION_KEY = generateMasterKey();
    
    // Clean up test data
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
    
    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Settings Test User',
        email: 'settings-storage@example.com',
        password: 'hashed_password'
      }
    });
    
    settingsStorage = new UserSettingsStorage();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  });

  describe('API Key Storage', () => {
    it('should store and retrieve encrypted API keys', async () => {
      const anthropicKey = 'sk-ant-test-1234567890abcdef';
      const openaiKey = 'sk-test-openai-9876543210fedcba';
      
      await settingsStorage.storeApiKeys(testUser.id, {
        anthropicApiKey: anthropicKey,
        openaiApiKey: openaiKey
      });
      
      const retrievedKeys = await settingsStorage.getApiKeys(testUser.id);
      expect(retrievedKeys.anthropicApiKey).toBe(anthropicKey);
      expect(retrievedKeys.openaiApiKey).toBe(openaiKey);
    });

    it('should handle partial API key updates', async () => {
      // Store initial keys
      await settingsStorage.storeApiKeys(testUser.id, {
        anthropicApiKey: 'sk-ant-initial',
        openaiApiKey: 'sk-openai-initial'
      });
      
      // Update only anthropic key
      await settingsStorage.storeApiKeys(testUser.id, {
        anthropicApiKey: 'sk-ant-updated'
      });
      
      const keys = await settingsStorage.getApiKeys(testUser.id);
      expect(keys.anthropicApiKey).toBe('sk-ant-updated');
      expect(keys.openaiApiKey).toBe('sk-openai-initial');
    });

    it('should return null for non-existent user API keys', async () => {
      const keys = await settingsStorage.getApiKeys('non-existent-user');
      expect(keys.anthropicApiKey).toBeNull();
      expect(keys.openaiApiKey).toBeNull();
    });

    it('should handle null API keys', async () => {
      await settingsStorage.storeApiKeys(testUser.id, {
        anthropicApiKey: null,
        openaiApiKey: 'sk-test-only-openai'
      });
      
      const keys = await settingsStorage.getApiKeys(testUser.id);
      expect(keys.anthropicApiKey).toBeNull();
      expect(keys.openaiApiKey).toBe('sk-test-only-openai');
    });
  });

  describe('User Preferences Storage', () => {
    it('should store and retrieve user preferences', async () => {
      const preferences = {
        citationStyle: 'mla',
        defaultLanguage: 'es',
        adhdFriendlyMode: true,
        theme: 'dark',
        reducedMotion: true,
        highContrast: false
      };
      
      await settingsStorage.storePreferences(testUser.id, preferences);
      
      const retrieved = await settingsStorage.getPreferences(testUser.id);
      expect(retrieved.citationStyle).toBe('mla');
      expect(retrieved.defaultLanguage).toBe('es');
      expect(retrieved.adhdFriendlyMode).toBe(true);
      expect(retrieved.theme).toBe('dark');
      expect(retrieved.reducedMotion).toBe(true);
      expect(retrieved.highContrast).toBe(false);
    });

    it('should use default values for new users', async () => {
      const preferences = await settingsStorage.getPreferences(testUser.id);
      expect(preferences.citationStyle).toBe('apa');
      expect(preferences.defaultLanguage).toBe('en');
      expect(preferences.adhdFriendlyMode).toBe(false);
      expect(preferences.theme).toBe('system');
      expect(preferences.reducedMotion).toBe(false);
      expect(preferences.highContrast).toBe(false);
    });

    it('should handle partial preference updates', async () => {
      // Store initial preferences
      await settingsStorage.storePreferences(testUser.id, {
        citationStyle: 'apa',
        theme: 'light'
      });
      
      // Update only citation style
      await settingsStorage.storePreferences(testUser.id, {
        citationStyle: 'chicago'
      });
      
      const prefs = await settingsStorage.getPreferences(testUser.id);
      expect(prefs.citationStyle).toBe('chicago');
      expect(prefs.theme).toBe('light');
    });
  });

  describe('AI Provider Settings', () => {
    it('should store and retrieve AI provider settings', async () => {
      const aiSettings = {
        monthlyBudget: 250.0,
        preferredProvider: 'anthropic' as const
      };
      
      await settingsStorage.storeAiSettings(testUser.id, aiSettings);
      
      const retrieved = await settingsStorage.getAiSettings(testUser.id);
      expect(retrieved.monthlyBudget).toBe(250.0);
      expect(retrieved.preferredProvider).toBe('anthropic');
    });

    it('should use default AI settings for new users', async () => {
      const aiSettings = await settingsStorage.getAiSettings(testUser.id);
      expect(aiSettings.monthlyBudget).toBe(100);
      expect(aiSettings.preferredProvider).toBe('auto');
    });
  });

  describe('Complete Settings Operations', () => {
    it('should store and retrieve complete user settings', async () => {
      const completeSettings = {
        anthropicApiKey: 'sk-ant-complete-test',
        openaiApiKey: 'sk-openai-complete-test',
        monthlyBudget: 300.0,
        preferredProvider: 'openai' as const,
        citationStyle: 'chicago',
        defaultLanguage: 'fr',
        adhdFriendlyMode: true,
        theme: 'dark',
        reducedMotion: false,
        highContrast: true
      };
      
      await settingsStorage.storeCompleteSettings(testUser.id, completeSettings);
      
      const retrieved = await settingsStorage.getCompleteSettings(testUser.id);
      expect(retrieved.anthropicApiKey).toBe('sk-ant-complete-test');
      expect(retrieved.openaiApiKey).toBe('sk-openai-complete-test');
      expect(retrieved.monthlyBudget).toBe(300.0);
      expect(retrieved.preferredProvider).toBe('openai');
      expect(retrieved.citationStyle).toBe('chicago');
      expect(retrieved.defaultLanguage).toBe('fr');
      expect(retrieved.adhdFriendlyMode).toBe(true);
      expect(retrieved.theme).toBe('dark');
      expect(retrieved.reducedMotion).toBe(false);
      expect(retrieved.highContrast).toBe(true);
    });

    it('should handle settings for non-existent users', async () => {
      const settings = await settingsStorage.getCompleteSettings('non-existent');
      expect(settings.anthropicApiKey).toBeNull();
      expect(settings.openaiApiKey).toBeNull();
      expect(settings.monthlyBudget).toBe(100); // default
      expect(settings.preferredProvider).toBe('auto'); // default
    });
  });

  describe('Settings Deletion', () => {
    it('should delete user settings', async () => {
      // Store some settings first
      await settingsStorage.storeCompleteSettings(testUser.id, {
        anthropicApiKey: 'sk-to-be-deleted',
        citationStyle: 'mla'
      });
      
      // Verify settings exist
      let settings = await settingsStorage.getCompleteSettings(testUser.id);
      expect(settings.anthropicApiKey).toBe('sk-to-be-deleted');
      
      // Delete settings
      await settingsStorage.deleteUserSettings(testUser.id);
      
      // Verify settings are gone (should return defaults)
      settings = await settingsStorage.getCompleteSettings(testUser.id);
      expect(settings.anthropicApiKey).toBeNull();
      expect(settings.citationStyle).toBe('apa'); // default
    });

    it('should handle deletion of non-existent settings', async () => {
      // Should not throw error
      await expect(settingsStorage.deleteUserSettings('non-existent'))
        .resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      // Remove encryption key to force error
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      
      await expect(settingsStorage.storeApiKeys(testUser.id, {
        anthropicApiKey: 'sk-test-key'
      })).rejects.toThrow(/encryption/i);
    });

    it('should validate user IDs', async () => {
      await expect(settingsStorage.getCompleteSettings(''))
        .rejects.toThrow(/user id/i);
      
      await expect(settingsStorage.storeCompleteSettings('', {}))
        .rejects.toThrow(/user id/i);
    });
  });

  describe('Security and Data Integrity', () => {
    it('should ensure API keys are encrypted in database', async () => {
      const apiKey = 'sk-test-encryption-check';
      
      await settingsStorage.storeApiKeys(testUser.id, {
        anthropicApiKey: apiKey
      });
      
      // Query database directly to check encryption
      const rawSettings = await prisma.userSettings.findUnique({
        where: { userId: testUser.id }
      });
      
      expect(rawSettings?.anthropicApiKey).toBeDefined();
      expect(rawSettings?.anthropicApiKey).not.toBe(apiKey);
      expect(rawSettings?.anthropicApiKey).toContain(':'); // Encrypted format
    });

    it('should handle concurrent access safely', async () => {
      // Simulate concurrent updates
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          settingsStorage.storePreferences(testUser.id, {
            citationStyle: `style-${i}`
          })
        );
      }
      
      await Promise.all(promises);
      
      // Should complete without errors
      const final = await settingsStorage.getPreferences(testUser.id);
      expect(final.citationStyle).toMatch(/^style-\d+$/);
    });
  });
});
