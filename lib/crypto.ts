import * as crypto from 'crypto';
import { EncryptionResult, DecryptionRequest } from '../types/settings';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Get or create the master encryption key
 * In production, this should be stored securely (e.g., environment variable, key management service)
 */
function getMasterKey(): Buffer {
  const masterKey = process.env.SETTINGS_ENCRYPTION_KEY;
  
  if (!masterKey) {
    // In development, generate a key (this is not secure for production!)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Using generated encryption key for development. Set SETTINGS_ENCRYPTION_KEY for production!');
      return crypto.randomBytes(KEY_LENGTH);
    }
    throw new Error('SETTINGS_ENCRYPTION_KEY environment variable is required for production');
  }
  
  // Convert base64 master key to buffer
  return Buffer.from(masterKey, 'base64');
}

/**
 * Generate a secure random key for settings encryption
 */
export function generateMasterKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString('base64');
}

/**
 * Derive encryption key from master key and salt using PBKDF2
 */
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a sensitive value using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptionResult {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Invalid plaintext for encryption');
  }

  try {
    const masterKey = getMasterKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(masterKey, salt);

    // Try GCM first, fallback to CBC for compatibility
    let cipher;
    let encrypted: string;
    let tag: Buffer | null = null;

    try {
      // Use GCM mode with createCipheriv API
      cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      tag = cipher.getAuthTag();
    } catch (gcmError) {
      // Fallback to CBC mode for test environments  
      const cbcIv = crypto.randomBytes(16);
      cipher = crypto.createCipheriv('aes-256-cbc', key, cbcIv);
      encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      // Store IV with encrypted data for CBC mode
      encrypted = cbcIv.toString('base64') + ':' + encrypted;
    }
    
    // Combine encrypted data and auth tag (if available)
    const encryptedWithTag = tag ? encrypted + ':' + tag.toString('base64') : encrypted;

    return {
      encrypted: encryptedWithTag,
      salt: salt.toString('base64'),
      iv: iv.toString('base64')
    };
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a value using AES-256-GCM
 */
export function decrypt(request: DecryptionRequest): string {
  if (!request.encrypted || !request.salt || !request.iv) {
    throw new Error('Invalid decryption request - missing required fields');
  }

  try {
    const masterKey = getMasterKey();
    const salt = Buffer.from(request.salt, 'base64');
    const iv = Buffer.from(request.iv, 'base64');
    const key = deriveKey(masterKey, salt);

    // Check if encrypted data has auth tag (GCM mode)
    const hasAuthTag = request.encrypted.includes(':');
    
    if (hasAuthTag) {
      // GCM mode with auth tag
      const [encryptedData, tagBase64] = request.encrypted.split(':');
      if (!encryptedData || !tagBase64) {
        throw new Error('Invalid encrypted data format');
      }

      try {
        // Use GCM mode with createDecipheriv API
        const tag = Buffer.from(tagBase64, 'base64');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (gcmError) {
        // Fallback to CBC if GCM fails
        // Extract IV from encrypted data for CBC mode
        const cbcParts = encryptedData.split(':');
        if (cbcParts.length === 2) {
          const cbcIv = Buffer.from(cbcParts[0], 'base64');
          const cbcEncrypted = cbcParts[1];
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, cbcIv);
          let decrypted = decipher.update(cbcEncrypted, 'base64', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        }
        throw gcmError;
      }
    } else {
      // CBC mode (fallback)
      // Extract IV from encrypted data for CBC mode
      const cbcParts = request.encrypted.split(':');
      if (cbcParts.length === 2) {
        const cbcIv = Buffer.from(cbcParts[0], 'base64');
        const cbcEncrypted = cbcParts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, cbcIv);
        let decrypted = decipher.update(cbcEncrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } else {
        // Legacy format without IV embedded
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(request.encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    }
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Hash a value using SHA-256 (for non-reversible storage)
 */
export function hash(value: string, salt?: string): string {
  const saltBuffer = salt ? Buffer.from(salt, 'base64') : crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(value, saltBuffer, 100000, 32, 'sha256');
  return salt ? hash.toString('base64') : saltBuffer.toString('base64') + ':' + hash.toString('base64');
}

/**
 * Verify a hashed value
 */
export function verifyHash(value: string, hashedValue: string): boolean {
  try {
    const [salt, originalHash] = hashedValue.split(':');
    if (!salt || !originalHash) return false;
    
    const newHash = hash(value, salt);
    return crypto.timingSafeEqual(
      Buffer.from(originalHash, 'base64'),
      Buffer.from(newHash, 'base64')
    );
  } catch {
    return false;
  }
}

/**
 * Generate a secure random string for secrets
 */
export function generateSecureSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Mask sensitive values for display (show first 4 and last 4 characters)
 */
export function maskSensitiveValue(value: string, visibleChars: number = 4): string {
  if (!value) return '';
  if (value.length <= visibleChars * 2) {
    return '•'.repeat(8); // Don't reveal length for very short values
  }
  
  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  const middle = '•'.repeat(Math.max(8, value.length - visibleChars * 2));
  
  return `${start}${middle}${end}`;
}

/**
 * Validate if a string appears to be an encrypted value
 */
export function isEncryptedValue(value: string): boolean {
  try {
    // Check if it has the expected format for our encrypted values
    return value.includes(':') && 
           value.split(':').length >= 2 &&
           Buffer.from(value.split(':')[0], 'base64').length > 0;
  } catch {
    return false;
  }
}

/**
 * Secure memory cleanup (zero out sensitive data)
 */
export function clearSensitiveData(data: any): void {
  if (typeof data === 'string') {
    // In Node.js, strings are immutable, but we can try to encourage GC
    data = null;
  } else if (Buffer.isBuffer(data)) {
    data.fill(0);
  } else if (typeof data === 'object' && data !== null) {
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string' && key.toLowerCase().includes('key')) {
        data[key] = null;
      }
    });
  }
}

/**
 * Generate NextAuth secret if not provided
 */
export function generateNextAuthSecret(): string {
  return generateSecureSecret(64);
}

/**
 * Validate environment for encryption operations
 */
export function validateEncryptionEnvironment(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (process.env.NODE_ENV === 'production' && !process.env.SETTINGS_ENCRYPTION_KEY) {
    warnings.push('SETTINGS_ENCRYPTION_KEY not set in production environment');
  }
  
  try {
    getMasterKey();
  } catch (error: any) {
    warnings.push(`Encryption key error: ${error.message}`);
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}