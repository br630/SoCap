import { encrypt, decrypt, encryptObject, decryptObject, isEncrypted, generateEncryptionKey } from '../../../utils/encryption';

describe('Encryption Utils', () => {
  // Set a test encryption key
  const originalKey = process.env.ENCRYPTION_KEY;
  
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-purposes-only';
  });

  afterAll(() => {
    if (originalKey) {
      process.env.ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string successfully', () => {
      const plaintext = 'This is a test string';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toBeTruthy();
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const empty = '';
      const encrypted = encrypt(empty);
      const decrypted = decrypt(encrypted);

      expect(encrypted).toBe('');
      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(specialChars);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    it('should handle unicode characters', () => {
      const unicode = 'Hello 世界 🌍';
      const encrypted = encrypt(unicode);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(unicode);
    });

    it('should produce different encrypted values for same input (due to random salt)', () => {
      const plaintext = 'Same input';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Should be different due to random salt/IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(10000);
      const encrypted = encrypt(longString);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longString);
    });

    it('should throw error on invalid encrypted data', () => {
      const invalidEncrypted = 'not-valid-base64-encrypted-data';
      
      // decrypt should return empty string for invalid data
      const result = decrypt(invalidEncrypted);
      expect(result).toBe('');
    });
  });

  describe('encryptObject and decryptObject', () => {
    it('should encrypt and decrypt specified fields in an object', () => {
      const obj = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        publicField: 'This should not be encrypted',
      };

      const encrypted = encryptObject(obj, ['phone', 'email']);
      expect(encrypted.name).toBe(obj.name);
      expect(encrypted.publicField).toBe(obj.publicField);
      expect(encrypted.phone).not.toBe(obj.phone);
      expect(encrypted.email).not.toBe(obj.email);
      expect(isEncrypted(encrypted.phone)).toBe(true);
      expect(isEncrypted(encrypted.email)).toBe(true);

      const decrypted = decryptObject(encrypted, ['phone', 'email']);
      expect(decrypted.name).toBe(obj.name);
      expect(decrypted.phone).toBe(obj.phone);
      expect(decrypted.email).toBe(obj.email);
      expect(decrypted.publicField).toBe(obj.publicField);
    });

    it('should handle null and undefined values', () => {
      const obj = {
        name: 'John',
        phone: null as any,
        email: undefined as any,
      };

      const encrypted = encryptObject(obj, ['phone', 'email']);
      expect(encrypted.name).toBe('John');
      expect(encrypted.phone).toBeNull();
      expect(encrypted.email).toBeUndefined();

      const decrypted = decryptObject(encrypted, ['phone', 'email']);
      expect(decrypted.name).toBe('John');
    });

    it('should handle empty object', () => {
      const obj = {};
      const encrypted = encryptObject(obj, ['phone']);
      const decrypted = decryptObject(encrypted, ['phone']);

      expect(decrypted).toEqual({});
    });

    it('should not decrypt fields that are not encrypted', () => {
      const obj = {
        name: 'John Doe',
        phone: '+1234567890', // Not encrypted
      };

      const decrypted = decryptObject(obj, ['phone']);
      expect(decrypted.phone).toBe('+1234567890'); // Should remain unchanged
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted strings', () => {
      const encrypted = encrypt('test string');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext strings', () => {
      expect(isEncrypted('plain text')).toBe(false);
      expect(isEncrypted('+1234567890')).toBe(false);
      expect(isEncrypted('email@example.com')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isEncrypted(null as any)).toBe(false);
      expect(isEncrypted(undefined as any)).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid hex key', () => {
      const key = generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes = 64 hex characters
      
      // Should be valid hex
      expect(/^[0-9a-f]{64}$/i.test(key)).toBe(true);
    });

    it('should generate different keys on each call', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });
  });
});
