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
    } catch (error: any) {
      throw new Error(`API key encryption failed: ${error.message}`);
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
    } catch (error: any) {
      throw new Error(`API key decryption failed: ${error.message}`);
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
    } catch (error: any) {
      throw new Error(`Setting encryption failed: ${error.message}`);
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
    } catch (error: any) {
      throw new Error(`Setting decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a new master encryption key
   */
  async generateMasterKey(): Promise<string> {
    try {
      return generateCryptoMasterKey();
    } catch (error: any) {
      throw new Error(`Master key generation failed: ${error.message}`);
    }
  }

  /**
   * Validate the encryption environment
   */
  async validateEnvironment(): Promise<{ valid: boolean; warnings: string[] }> {
    try {
      return validateEncryptionEnvironment();
    } catch (error: any) {
      return {
        valid: false,
        warnings: [`Environment validation failed: ${error.message}`]
      };
    }
  }
}

// Export default instance for convenience
export const encryptionService = new EncryptionService();
