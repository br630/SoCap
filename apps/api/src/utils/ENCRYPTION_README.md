# Encryption Utilities

## Overview
This module provides AES-256-GCM encryption for sensitive contact data. Sensitive fields (phone, email, notes) are automatically encrypted before saving to the database and decrypted when reading.

## Setup

### 1. Generate Encryption Key

```bash
cd apps/api
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to .env

```env
ENCRYPTION_KEY=your-64-character-hex-key-here
```

## Functions

### `encrypt(plaintext: string): string`
Encrypts a plaintext string using AES-256-GCM.
- Returns base64 encoded string
- Each encryption uses unique salt and IV
- Format: `salt:iv:tag:ciphertext` (all base64 encoded)

### `decrypt(ciphertext: string): string`
Decrypts a base64 encoded ciphertext string.
- Returns plaintext or empty string if decryption fails
- Handles errors gracefully

### `encryptObject(obj: object, fields: string[]): object`
Encrypts specified fields in an object.
- Only encrypts fields listed in the `fields` array
- Returns new object with encrypted fields
- Non-string values are JSON stringified first

### `decryptObject(obj: object, fields: string[]): object`
Decrypts specified fields in an object.
- Only decrypts fields listed in the `fields` array
- Returns new object with decrypted fields
- Sets field to `null` if decryption fails

## Security Features

- **AES-256-GCM**: Authenticated encryption with associated data
- **Unique Salt**: Each encryption uses a random 64-byte salt
- **Unique IV**: Each encryption uses a random 16-byte IV
- **Key Derivation**: Uses scrypt to derive keys from master key + salt
- **Error Handling**: Graceful degradation if decryption fails

## Limitations

### Search Functionality
Encrypted fields cannot be searched directly in the database. Current implementation:
- **Name**: Can be searched (not encrypted)
- **Email/Phone**: Cannot be searched (encrypted)
- **Notes**: Cannot be searched (encrypted)

To search by email/phone, you would need to:
1. Fetch all contacts
2. Decrypt them
3. Filter in memory (not recommended for large datasets)

### Duplicate Detection
Duplicate detection works by:
1. Encrypting the search value
2. Comparing against encrypted values in database
3. This works because same plaintext + same key = same ciphertext (with same salt/IV)

**Note**: Actually, this won't work perfectly because each encryption uses a unique salt/IV. For proper duplicate detection, we'd need deterministic encryption or a separate hash index.

## Usage in Services

```typescript
import { encryptContactFields, decryptContactFields } from '../middleware/encryption';

// Before saving
const encrypted = encryptContactFields(contactData);

// After reading
const decrypted = decryptContactFields(contact);
```

## Error Handling

- If encryption fails: Error is thrown (prevents saving invalid data)
- If decryption fails: Field is set to `null` (allows app to continue)
- All errors are logged to console

## Testing

To verify encryption is working:

1. Create a contact with phone/email/notes
2. Check database - fields should be long base64 strings
3. Retrieve via API - fields should be decrypted

## Migration

If you have existing unencrypted data:
1. Set up encryption key
2. Run migration script to encrypt existing data
3. All new data will be automatically encrypted
