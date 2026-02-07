import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

if (!ENCRYPTION_KEY) {
  console.warn(
    '⚠️  ENCRYPTION_KEY not set in environment variables. Encryption functions will throw errors.'
  );
}

/**
 * Validate encryption key format
 */
function validateKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Key should be 64 hex characters (32 bytes)
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  try {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be a valid hex string');
  }
}

/**
 * Encrypt sensitive text data
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  if (!text) {
    return text;
  }

  try {
    const key = validateKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive text data
 * @param encryptedText - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return encryptedText;
  }

  try {
    const key = validateKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Check if a string is encrypted (has the expected format)
 * Format: iv(32 hex chars):authTag(32 hex chars):encryptedData(hex)
 */
export function isEncrypted(text: string): boolean {
  if (!text) {
    return false;
  }
  const parts = text.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
}

/**
 * Check if a string looks like corrupted/old encrypted data
 * (long string with base64-like characters, no readable text)
 */
export function looksLikeCorruptedEncryption(text: string): boolean {
  if (!text || text.length < 50) {
    return false;
  }
  // If it's very long and contains base64/encoded chars but no spaces or normal punctuation
  const hasBase64Chars = /[A-Za-z0-9+/=]{50,}/.test(text);
  const hasNoSpaces = !text.includes(' ');
  const isTooLongForNormalData = text.length > 100;
  
  return hasBase64Chars && hasNoSpaces && isTooLongForNormalData;
}

/**
 * Encrypt specific fields in an object
 * @param obj - Object containing fields to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with specified fields encrypted
 */
export function encryptObject<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: string[]
): T {
  if (!obj || !fieldsToEncrypt || fieldsToEncrypt.length === 0) {
    return obj;
  }

  const result: Record<string, any> = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === 'string' && result[field].trim() !== '') {
      // Only encrypt if not already encrypted
      if (!isEncrypted(result[field])) {
        try {
          result[field] = encrypt(result[field]);
        } catch (error) {
          console.error(`Failed to encrypt field ${field}:`, error);
          // Continue without encrypting this field
        }
      }
    }
  }

  return result as T;
}

/**
 * Decrypt specific fields in an object
 * @param obj - Object containing encrypted fields
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with specified fields decrypted
 */
export function decryptObject<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: string[]
): T {
  if (!obj || !fieldsToDecrypt || fieldsToDecrypt.length === 0) {
    return obj;
  }

  // If encryption key is not set, return object as-is (data is likely not encrypted)
  if (!ENCRYPTION_KEY) {
    return obj;
  }

  const result: Record<string, any> = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (result[field] && typeof result[field] === 'string' && result[field].trim() !== '') {
      // Check if it's our expected encrypted format
      if (isEncrypted(result[field])) {
        try {
          result[field] = decrypt(result[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // If decryption fails, clear the field (data is corrupted)
          result[field] = null;
        }
      } 
      // Check if it looks like corrupted/old encrypted data
      else if (looksLikeCorruptedEncryption(result[field])) {
        console.warn(`Field ${field} contains corrupted encryption data, clearing it`);
        // Clear corrupted encrypted data - user will need to re-enter
        result[field] = null;
      }
      // Otherwise, leave as-is (normal unencrypted data)
    }
  }

  return result as T;
}
