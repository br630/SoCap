# Encryption Setup Guide

## Overview
The API uses AES-256-GCM encryption to protect sensitive contact data (phone, email, notes) in the database.

## Setup

### 1. Generate Encryption Key

Run this command to generate a secure encryption key:

```bash
cd apps/api
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use the utility function:
```typescript
import { generateEncryptionKey } from './src/utils/encryption';
console.log(generateEncryptionKey());
```

### 2. Add to Environment Variables

Add the generated key to `apps/api/.env`:

```env
ENCRYPTION_KEY=your-64-character-hex-key-here
```

**Important:**
- The key must be 64 hexadecimal characters (32 bytes)
- Keep this key secure and never commit it to version control
- Use different keys for development and production
- If you lose the key, encrypted data cannot be decrypted

### 3. Restart Server

After adding the encryption key, restart your API server:

```bash
npm run dev
```

## How It Works

### Automatic Encryption/Decryption

Sensitive fields are automatically:
- **Encrypted** before saving to the database
- **Decrypted** when reading from the database

### Encrypted Fields

Currently encrypted in the Contact model:
- `phone`
- `email`
- `notes`

### Error Handling

- If decryption fails for a field, it returns `null` for that field
- The application continues to function even if some fields can't be decrypted
- Errors are logged but don't crash the application

## Testing

To verify encryption is working:

1. Create a contact with phone/email/notes
2. Check the database - these fields should be base64 encoded strings
3. Retrieve the contact via API - fields should be decrypted

## Migration

If you have existing unencrypted data:

1. Set up encryption key
2. Run a migration script to encrypt existing data
3. All new data will be automatically encrypted

## Security Notes

- Uses AES-256-GCM (authenticated encryption)
- Each encryption uses a unique salt and IV
- Keys are derived using scrypt
- Never log encryption keys or plaintext sensitive data
