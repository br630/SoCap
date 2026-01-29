import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64; // 64 bytes for salt
const TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * If not set, generates a key (for development only - should be set in production)
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    console.warn('⚠️  ENCRYPTION_KEY not set in environment. Using default key (NOT SECURE FOR PRODUCTION)');
    // Generate a deterministic key for development (NOT SECURE)
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH);
  }

  // If key is provided as hex string, convert it
  if (keyString.length === 64) {
    return Buffer.from(keyString, 'hex');
  }

  // Otherwise, derive key from the string using scrypt
  return crypto.scryptSync(keyString, 'encryption-salt', KEY_LENGTH);
}

/**
 * Generate a random encryption key (for initial setup)
 * Run this once and add the output to your .env file
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString('hex');
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns base64 encoded string: salt:iv:tag:ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.trim() === '') {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key and salt
    const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();

    // Combine salt:iv:tag:encrypted
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Expects base64 encoded string: salt:iv:tag:ciphertext
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext || ciphertext.trim() === '') {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key from master key and salt
    const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    // Return null string to indicate decryption failure
    // This allows the application to continue even if some fields can't be decrypted
    return '';
  }
}

/**
 * Encrypt specified fields in an object
 * Returns new object with encrypted fields
 */
export function encryptObject<T extends Record<string, any>>(
  obj: T,
  fields: string[]
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const encrypted = { ...obj };

  for (const field of fields) {
    if (field in encrypted && encrypted[field] != null && encrypted[field] !== '') {
      try {
        const value = encrypted[field];
        if (typeof value === 'string') {
          encrypted[field] = encrypt(value);
        } else {
          // For non-string values, convert to JSON string first
          encrypted[field] = encrypt(JSON.stringify(value));
        }
      } catch (error) {
        console.error(`Failed to encrypt field ${field}:`, error);
        // Keep original value if encryption fails
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt specified fields in an object
 * Returns new object with decrypted fields
 * If decryption fails for a field, sets it to null
 * Only attempts to decrypt if the field appears to be encrypted
 */
export function decryptObject<T extends Record<string, any>>(
  obj: T,
  fields: string[]
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const decrypted = { ...obj };

  for (const field of fields) {
    if (field in decrypted && decrypted[field] != null && decrypted[field] !== '') {
      try {
        const value = decrypted[field];
        if (typeof value === 'string') {
          // Only attempt decryption if the value appears to be encrypted
          // This prevents trying to decrypt plaintext fields like 'name'
          if (isEncrypted(value)) {
            const decryptedValue = decrypt(value);
            // If decryption returns empty string, it likely failed
            if (decryptedValue === '' && value !== '') {
              decrypted[field] = null;
            } else {
              decrypted[field] = decryptedValue;
            }
          }
          // If not encrypted, leave the value as-is
        }
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // Set to null if decryption fails
        decrypted[field] = null;
      }
    }
  }

  return decrypted;
}

/**
 * Check if a string is encrypted (base64 format check)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  try {
    // Encrypted values are base64 encoded and have a minimum length
    const buffer = Buffer.from(value, 'base64');
    // Minimum size: salt (64) + iv (16) + tag (16) + at least 1 byte of data = 97 bytes
    return buffer.length >= 97;
  } catch {
    return false;
  }
}
