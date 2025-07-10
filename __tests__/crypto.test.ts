import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  hash,
  verifyHash,
  generateSecureSecret,
  maskSensitiveValue,
  isEncryptedValue,
  generateNextAuthSecret,
  validateEncryptionEnvironment,
  generateMasterKey
} from '../lib/crypto';

describe('Crypto Utilities', () => {
  
  beforeEach(() => {
    // Set a test encryption key
    process.env.SETTINGS_ENCRYPTION_KEY = generateMasterKey();
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data successfully', () => {
      const plaintext = 'sk-test-api-key-12345';
      
      const encrypted = encrypt(plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different encrypted values for same input', () => {
      const plaintext = 'test-data';
      
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // Both should decrypt to same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      expect(() => encrypt('')).toThrow();
      expect(() => encrypt(null as any)).toThrow();
      expect(() => encrypt(undefined as any)).toThrow();
    });

    it('should handle non-string inputs', () => {
      expect(() => encrypt(123 as any)).toThrow();
      expect(() => encrypt({} as any)).toThrow();
    });

    it('should fail decryption with tampered data', () => {
      const plaintext = 'secret-data';
      const encrypted = encrypt(plaintext);
      
      // Tamper with the encrypted data in a way that will cause both GCM and CBC to fail
      const tamperedEncrypted = {
        ...encrypted,
        encrypted: 'invalid-base64-data!!!'
      };
      
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });

    it('should fail decryption with invalid format', () => {
      expect(() => decrypt({
        encrypted: 'invalid',
        salt: 'invalid',
        iv: 'invalid'
      })).toThrow();
    });
  });

  describe('Hashing', () => {
    it('should hash values consistently', () => {
      const value = 'password123';
      const hashed = hash(value);
      
      expect(hashed).toBeDefined();
      expect(hashed.includes(':')).toBe(true);
      expect(verifyHash(value, hashed)).toBe(true);
    });

    it('should produce different hashes for same value', () => {
      const value = 'password123';
      const hash1 = hash(value);
      const hash2 = hash(value);
      
      expect(hash1).not.toBe(hash2);
      expect(verifyHash(value, hash1)).toBe(true);
      expect(verifyHash(value, hash2)).toBe(true);
    });

    it('should fail verification with wrong value', () => {
      const value = 'password123';
      const wrongValue = 'password124';
      const hashed = hash(value);
      
      expect(verifyHash(wrongValue, hashed)).toBe(false);
    });

    it('should handle malformed hash', () => {
      expect(verifyHash('password', 'invalid-hash')).toBe(false);
      expect(verifyHash('password', '')).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should generate secure secrets', () => {
      const secret1 = generateSecureSecret();
      const secret2 = generateSecureSecret();
      
      expect(secret1).toBeDefined();
      expect(secret2).toBeDefined();
      expect(secret1).not.toBe(secret2);
      expect(secret1.length).toBeGreaterThan(40); // Base64url encoding
    });

    it('should generate secrets of specified length', () => {
      const secret = generateSecureSecret(16);
      expect(secret.length).toBeGreaterThan(20); // Base64url is longer than raw bytes
    });

    it('should mask sensitive values correctly', () => {
      const apiKey = 'sk-test-1234567890abcdef';
      const masked = maskSensitiveValue(apiKey);
      
      expect(masked).toContain('sk-t');
      expect(masked).toContain('cdef');
      expect(masked).toContain('•');
      expect(masked.length).toBeGreaterThan(8);
    });

    it('should handle short values in masking', () => {
      const shortValue = '12345';
      const masked = maskSensitiveValue(shortValue);
      
      expect(masked).toBe('••••••••');
    });

    it('should identify encrypted values', () => {
      const plaintext = 'test-value';
      const encrypted = encrypt(plaintext);
      
      expect(isEncryptedValue(encrypted.encrypted)).toBe(true);
      expect(isEncryptedValue('plain-text')).toBe(false);
      expect(isEncryptedValue('')).toBe(false);
    });

    it('should generate NextAuth secrets', () => {
      const secret = generateNextAuthSecret();
      
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(80); // Should be long
      expect(typeof secret).toBe('string');
    });
  });

  describe('Environment Validation', () => {
    it('should validate encryption environment', () => {
      const result = validateEncryptionEnvironment();
      
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should warn about missing production key', () => {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      const originalEnv = process.env.NODE_ENV;
      
      // Use vi.stubEnv to mock NODE_ENV
      vi.stubEnv('NODE_ENV', 'production');
      
      const result = validateEncryptionEnvironment();
      
      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      // Restore original value
      vi.unstubAllEnvs();
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Master Key Generation', () => {
    it('should generate valid master keys', () => {
      const masterKey = generateMasterKey();
      
      expect(masterKey).toBeDefined();
      expect(typeof masterKey).toBe('string');
      expect(masterKey.length).toBeGreaterThan(40); // Base64 encoded 32 bytes
      
      // Should be valid base64
      expect(() => Buffer.from(masterKey, 'base64')).not.toThrow();
    });

    it('should generate unique master keys', () => {
      const key1 = generateMasterKey();
      const key2 = generateMasterKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle unicode characters', () => {
      const unicode = '🔐 Secret émojì 中文';
      const encrypted = encrypt(unicode);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(unicode);
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(10000);
      const encrypted = encrypt(longString);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(longString);
    });

    it('should produce cryptographically strong randomness', () => {
      const secrets = Array.from({ length: 100 }, () => generateSecureSecret(8));
      const uniqueSecrets = new Set(secrets);
      
      // All should be unique (extremely high probability)
      expect(uniqueSecrets.size).toBe(100);
    });
  });
});