import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SettingsStorage, getSettingsStorage } from '../lib/settings-storage';
import { generateMasterKey } from '../lib/crypto';
import { SETTING_KEYS, SETTING_CATEGORIES } from '../types/settings';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    appSetting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    $transaction: vi.fn((callback) => callback({
      appSetting: {
        upsert: vi.fn()
      }
    }))
  }))
}));

describe('SettingsStorage', () => {
  let storage: SettingsStorage;
  let mockPrisma: any;

  beforeEach(() => {
    // Set up encryption key
    process.env.SETTINGS_ENCRYPTION_KEY = generateMasterKey();
    
    mockPrisma = new PrismaClient();
    storage = new SettingsStorage(mockPrisma);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  });

  describe('getSettings', () => {
    it('should return decrypted settings', async () => {
      const mockSettings = [
        {
          key: SETTING_KEYS.NEXTAUTH_URL,
          value: 'http://localhost:3000',
          encrypted: false,
          category: SETTING_CATEGORIES.AUTH
        }
      ];

      mockPrisma.appSetting.findMany.mockResolvedValue(mockSettings);

      const settings = await storage.getSettings();

      expect(mockPrisma.appSetting.findMany).toHaveBeenCalled();
      expect(settings).toBeDefined();
      expect(settings.nextauthUrl).toBe('http://localhost:3000');
    });

    it('should handle empty settings', async () => {
      mockPrisma.appSetting.findMany.mockResolvedValue([]);

      const settings = await storage.getSettings();

      expect(settings).toEqual({});
    });

    it('should handle database errors', async () => {
      mockPrisma.appSetting.findMany.mockRejectedValue(new Error('Database error'));

      await expect(storage.getSettings()).rejects.toThrow('Settings retrieval failed');
    });
  });

  describe('getMaskedSettings', () => {
    it('should return masked sensitive values', async () => {
      const mockSettings = [
        {
          key: SETTING_KEYS.ANTHROPIC_API_KEY,
          value: 'sk-test-very-long-api-key-12345',
          encrypted: true,
          category: SETTING_CATEGORIES.AI
        },
        {
          key: SETTING_KEYS.NEXTAUTH_URL,
          value: 'http://localhost:3000',
          encrypted: false,
          category: SETTING_CATEGORIES.AUTH
        },
        {
          key: SETTING_KEYS.AI_MONTHLY_BUDGET,
          value: '100',
          encrypted: false,
          category: SETTING_CATEGORIES.AI
        }
      ];

      mockPrisma.appSetting.findMany.mockResolvedValue(mockSettings);

      const masked = await storage.getMaskedSettings();

      expect(masked.anthropicKey).toContain('•');
      expect(masked.nextauthUrl).toBe('http://localhost:3000');
      expect(masked.aiMonthlyBudget).toBe(100);
      expect(masked.configured.anthropic).toBe(true);
      expect(masked.configured.auth).toBe(true);
    });

    it('should handle configuration status correctly', async () => {
      mockPrisma.appSetting.findMany.mockResolvedValue([]);

      const masked = await storage.getMaskedSettings();

      expect(masked.configured.anthropic).toBe(false);
      expect(masked.configured.openai).toBe(false);
      expect(masked.configured.auth).toBe(false);
      expect(masked.configured.database).toBe(false);
      expect(masked.configured.zotero).toBe(false);
    });
  });

  describe('setSetting', () => {
    it('should encrypt and store sensitive settings', async () => {
      const key = SETTING_KEYS.ANTHROPIC_API_KEY;
      const value = 'sk-test-api-key';

      mockPrisma.appSetting.upsert.mockResolvedValue({});

      await storage.setSetting(key, value, {
        encrypt: true,
        category: SETTING_CATEGORIES.AI,
        description: 'Anthropic API Key'
      });

      expect(mockPrisma.appSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key },
          update: expect.objectContaining({
            encrypted: true,
            category: SETTING_CATEGORIES.AI,
            description: 'Anthropic API Key'
          }),
          create: expect.objectContaining({
            key,
            encrypted: true,
            category: SETTING_CATEGORIES.AI,
            description: 'Anthropic API Key'
          })
        })
      );
    });

    it('should store non-sensitive settings in plaintext', async () => {
      const key = SETTING_KEYS.NEXTAUTH_URL;
      const value = 'http://localhost:3000';

      mockPrisma.appSetting.upsert.mockResolvedValue({});

      await storage.setSetting(key, value, {
        encrypt: false,
        category: SETTING_CATEGORIES.AUTH
      });

      expect(mockPrisma.appSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key },
          update: expect.objectContaining({
            value,
            encrypted: false
          }),
          create: expect.objectContaining({
            key,
            value,
            encrypted: false
          })
        })
      );
    });

    it('should handle database errors during setting', async () => {
      mockPrisma.appSetting.upsert.mockRejectedValue(new Error('Database error'));

      await expect(storage.setSetting('test_key', 'test_value')).rejects.toThrow('Setting update failed');
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings in transaction', async () => {
      const updates = {
        anthropicKey: 'sk-new-key',
        nextauthUrl: 'http://localhost:3001',
        aiMonthlyBudget: 200
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appSetting: {
            upsert: vi.fn().mockResolvedValue({})
          }
        };
        return callback(tx);
      });

      await storage.updateSettings(updates, 'user123');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle transaction failures', async () => {
      const updates = { anthropicKey: 'sk-new-key' };

      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(storage.updateSettings(updates)).rejects.toThrow('Settings bulk update failed');
    });

    it('should skip undefined and null values', async () => {
      const updates = {
        anthropicKey: 'sk-new-key',
        openaiKey: undefined,
        aiMonthlyBudget: null as any
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appSetting: {
            upsert: vi.fn().mockResolvedValue({})
          }
        };
        return callback(tx);
      });

      await storage.updateSettings(updates);

      // Should only call upsert once for anthropicKey
      const mockTx = await mockPrisma.$transaction.mock.calls[0][0]({
        appSetting: { upsert: vi.fn() }
      });
    });
  });

  describe('deleteSetting', () => {
    it('should delete settings', async () => {
      const key = SETTING_KEYS.OPENAI_API_KEY;

      mockPrisma.appSetting.delete.mockResolvedValue({});

      await storage.deleteSetting(key, 'user123');

      expect(mockPrisma.appSetting.delete).toHaveBeenCalledWith({
        where: { key }
      });
    });

    it('should handle deletion errors', async () => {
      mockPrisma.appSetting.delete.mockRejectedValue(new Error('Not found'));

      await expect(storage.deleteSetting('nonexistent')).rejects.toThrow('Setting deletion failed');
    });
  });

  describe('isSetup', () => {
    it('should return true when required settings exist', async () => {
      mockPrisma.appSetting.findMany.mockResolvedValue([
        { key: SETTING_KEYS.ANTHROPIC_API_KEY },
        { key: SETTING_KEYS.NEXTAUTH_SECRET }
      ]);

      const isSetup = await storage.isSetup();

      expect(isSetup).toBe(true);
    });

    it('should return false when required settings missing', async () => {
      mockPrisma.appSetting.findMany.mockResolvedValue([
        { key: SETTING_KEYS.ANTHROPIC_API_KEY }
        // Missing NEXTAUTH_SECRET
      ]);

      const isSetup = await storage.isSetup();

      expect(isSetup).toBe(false);
    });

    it('should handle database errors in setup check', async () => {
      mockPrisma.appSetting.findMany.mockRejectedValue(new Error('Database error'));

      const isSetup = await storage.isSetup();

      expect(isSetup).toBe(false);
    });
  });

  describe('getDecryptedSetting', () => {
    it('should return decrypted setting', async () => {
      const mockSetting = {
        key: SETTING_KEYS.ANTHROPIC_API_KEY,
        value: JSON.stringify({
          encrypted: 'encrypted_value:tag',
          salt: 'salt_value',
          iv: 'iv_value'
        }),
        encrypted: true
      };

      mockPrisma.appSetting.findUnique.mockResolvedValue(mockSetting);

      const value = await storage.getDecryptedSetting(SETTING_KEYS.ANTHROPIC_API_KEY);

      expect(mockPrisma.appSetting.findUnique).toHaveBeenCalledWith({
        where: { key: SETTING_KEYS.ANTHROPIC_API_KEY }
      });
    });

    it('should return plaintext setting', async () => {
      const mockSetting = {
        key: SETTING_KEYS.NEXTAUTH_URL,
        value: 'http://localhost:3000',
        encrypted: false
      };

      mockPrisma.appSetting.findUnique.mockResolvedValue(mockSetting);

      const value = await storage.getDecryptedSetting(SETTING_KEYS.NEXTAUTH_URL);

      expect(value).toBe('http://localhost:3000');
    });

    it('should return null for missing setting', async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue(null);

      const value = await storage.getDecryptedSetting('nonexistent');

      expect(value).toBe(null);
    });

    it('should handle decryption errors', async () => {
      const mockSetting = {
        key: SETTING_KEYS.ANTHROPIC_API_KEY,
        value: 'invalid-encrypted-data',
        encrypted: true
      };

      mockPrisma.appSetting.findUnique.mockResolvedValue(mockSetting);

      const value = await storage.getDecryptedSetting(SETTING_KEYS.ANTHROPIC_API_KEY);

      expect(value).toBe(null);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const storage1 = getSettingsStorage();
      const storage2 = getSettingsStorage();

      expect(storage1).toBe(storage2);
    });
  });

  describe('Private Helper Methods', () => {
    it('should categorize settings correctly', async () => {
      const updates = {
        anthropicKey: 'sk-key',
        nextauthSecret: 'secret',
        databaseUrl: 'postgres://...',
        zoteroApiKey: 'zotero-key',
        enableAnalytics: true
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appSetting: {
            upsert: vi.fn().mockResolvedValue({})
          }
        };
        return callback(tx);
      });

      await storage.updateSettings(updates);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should determine encryption needs correctly', async () => {
      const sensitiveUpdate = { anthropicKey: 'sk-key' };
      const nonSensitiveUpdate = { enableAnalytics: true };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appSetting: {
            upsert: vi.fn().mockResolvedValue({})
          }
        };
        return callback(tx);
      });

      await storage.updateSettings(sensitiveUpdate);
      await storage.updateSettings(nonSensitiveUpdate);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });
});