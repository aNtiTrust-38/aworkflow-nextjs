import { 
  encrypt, 
  decrypt, 
  generateMasterKey as generateCryptoMasterKey,
  validateEncryptionEnvironment 
} from './crypto';
import { EncryptionResult, DecryptionRequest } from '../types/settings';

/**
 * EncryptionService class wrapper for settings encryption
 * Provides async interface around crypto utilities for API keys and settings
 */
export class EncryptionService {
  constructor() {
    // Service is ready to use - validation happens per operation
  }

  /**
   * Encrypt an API key using AES-256-GCM
   */
  async encryptApiKey(apiKey: string): Promise<EncryptionResult> {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key for encryption');
    }

    try {
      return encrypt(apiKey);
    } catch (error: unknown) {
      throw new Error(`API key encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt an API key using AES-256-GCM
   */
  async decryptApiKey(request: DecryptionRequest): Promise<string> {
    if (!request || !request.encrypted || !request.salt || !request.iv) {
      throw new Error('Invalid decryption request for API key');
    }

    try {
      return decrypt(request);
    } catch (error: unknown) {
      throw new Error(`API key decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Encrypt a settings value using AES-256-GCM
   */
  async encryptSetting(value: string): Promise<EncryptionResult> {
    if (!value || typeof value !== 'string') {
      throw new Error('Invalid setting value for encryption');
    }

    try {
      return encrypt(value);
    } catch (error: unknown) {
      throw new Error(`Setting encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt a settings value using AES-256-GCM
   */
  async decryptSetting(request: DecryptionRequest): Promise<string> {
    if (!request || !request.encrypted || !request.salt || !request.iv) {
      throw new Error('Invalid decryption request for setting');
    }

    try {
      return decrypt(request);
    } catch (error: unknown) {
      throw new Error(`Setting decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a new master encryption key
   */
  async generateMasterKey(): Promise<string> {
    try {
      return generateCryptoMasterKey();
    } catch (error: unknown) {
      throw new Error(`Master key generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate the encryption environment
   */
  async validateEnvironment(): Promise<{ valid: boolean; warnings: string[] }> {
    try {
      return validateEncryptionEnvironment();
    } catch (error: unknown) {
      return {
        valid: false,
        warnings: [`Environment validation failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }
}

// Export default instance for convenience
export const encryptionService = new EncryptionService();
