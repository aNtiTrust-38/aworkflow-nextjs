import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EncryptionService } from '../lib/encryption-service';
import { generateMasterKey } from '../lib/crypto';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    // Set a test encryption key
    process.env.SETTINGS_ENCRYPTION_KEY = generateMasterKey();
    encryptionService = new EncryptionService();
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  });

  describe('API Key Encryption', () => {
    it('should encrypt and decrypt API keys', async () => {
      const apiKey = 'sk-test-1234567890abcdef';
      
      const encrypted = await encryptionService.encryptApiKey(apiKey);
      expect(encrypted).toBeDefined();
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.encrypted).not.toBe(apiKey);
      
      const decrypted = await encryptionService.decryptApiKey(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it('should handle empty or invalid API keys', async () => {
      await expect(encryptionService.encryptApiKey('')).rejects.toThrow();
      await expect(encryptionService.encryptApiKey(null as any)).rejects.toThrow();
      await expect(encryptionService.encryptApiKey(undefined as any)).rejects.toThrow();
    });

    it('should handle tampered encrypted data', async () => {
      const apiKey = 'sk-test-api-key';
      const encrypted = await encryptionService.encryptApiKey(apiKey);
      
      const tampered = {
        ...encrypted,
        encrypted: 'invalid-data'
      };
      
      await expect(encryptionService.decryptApiKey(tampered)).rejects.toThrow();
    });
  });

  describe('Settings Encryption', () => {
    it('should encrypt and decrypt settings values', async () => {
      const settingsValue = JSON.stringify({ theme: 'dark', notifications: true });
      
      const encrypted = await encryptionService.encryptSetting(settingsValue);
      expect(encrypted).toBeDefined();
      expect(encrypted.encrypted).not.toBe(settingsValue);
      
      const decrypted = await encryptionService.decryptSetting(encrypted);
      expect(decrypted).toBe(settingsValue);
    });

    it('should handle complex settings objects', async () => {
      const complexSettings = JSON.stringify({
        aiProviders: {
          anthropic: { enabled: true, model: 'claude-3' },
          openai: { enabled: false }
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
          features: ['citations', 'exports']
        }
      });
      
      const encrypted = await encryptionService.encryptSetting(complexSettings);
      const decrypted = await encryptionService.decryptSetting(encrypted);
      expect(decrypted).toBe(complexSettings);
    });
  });

  describe('Encryption Environment', () => {
    it('should validate encryption environment', async () => {
      const validation = await encryptionService.validateEnvironment();
      expect(validation).toBeDefined();
      expect(validation.valid).toBeDefined();
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should detect missing encryption key in production', async () => {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      const originalEnv = process.env.NODE_ENV;
      
      vi.stubEnv('NODE_ENV', 'production');
      
      const service = new EncryptionService();
      const validation = await service.validateEnvironment();
      
      expect(validation.valid).toBe(false);
      expect(validation.warnings.length).toBeGreaterThan(0);
      
      vi.unstubAllEnvs();
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Key Generation', () => {
    it('should generate new master keys', async () => {
      const masterKey = await encryptionService.generateMasterKey();
      expect(masterKey).toBeDefined();
      expect(typeof masterKey).toBe('string');
      expect(masterKey.length).toBeGreaterThan(40);
    });

    it('should generate unique master keys', async () => {
      const key1 = await encryptionService.generateMasterKey();
      const key2 = await encryptionService.generateMasterKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption service initialization errors', () => {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      
      // Should not throw during construction, only during operations
      expect(() => new EncryptionService()).not.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      const invalidRequest = {
        encrypted: 'invalid',
        salt: 'invalid',
        iv: 'invalid'
      };
      
      await expect(encryptionService.decryptApiKey(invalidRequest))
        .rejects.toThrow(/decryption failed/i);
    });
  });

  describe('Security Features', () => {
    it('should use different salts for same input', async () => {
      const apiKey = 'sk-test-same-input';
      
      const encrypted1 = await encryptionService.encryptApiKey(apiKey);
      const encrypted2 = await encryptionService.encryptApiKey(apiKey);
      
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      
      // Both should decrypt to same value
      const decrypted1 = await encryptionService.decryptApiKey(encrypted1);
      const decrypted2 = await encryptionService.decryptApiKey(encrypted2);
      expect(decrypted1).toBe(apiKey);
      expect(decrypted2).toBe(apiKey);
    });

    it('should handle unicode and special characters', async () => {
      const unicodeKey = 'sk-🔐-test-émojì-中文-key';
      
      const encrypted = await encryptionService.encryptApiKey(unicodeKey);
      const decrypted = await encryptionService.decryptApiKey(encrypted);
      
      expect(decrypted).toBe(unicodeKey);
    });
  });
});
