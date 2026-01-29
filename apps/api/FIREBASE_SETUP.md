# Firebase Admin SDK Setup

## Overview

The Firebase Admin SDK is configured in `/apps/api/src/config/firebase.ts` and provides authentication and user management capabilities.

## Environment Variables

You need to configure Firebase Admin credentials using one of the following methods:

### Option 1: Service Account JSON (Recommended)

Set the `FIREBASE_SERVICE_ACCOUNT` environment variable with the entire service account JSON as a string:

```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
```

**How to get your service account JSON:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon) → Service Accounts
4. Click "Generate new private key"
5. Copy the entire JSON content and set it as the environment variable

### Option 2: Individual Environment Variables

Set these three environment variables:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note:** The `FIREBASE_PRIVATE_KEY` should include the newlines (`\n`) - they will be automatically formatted.

### Option 3: Default Credentials (Google Cloud)

If running on Google Cloud Platform, you can use default credentials:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
# OR
GCLOUD_PROJECT=your-project-id
```

## Usage Examples

### Verify ID Token

```typescript
import { verifyIdToken } from './config/firebase';

try {
  const decodedToken = await verifyIdToken(idToken);
  console.log('User UID:', decodedToken.uid);
  console.log('User email:', decodedToken.email);
} catch (error) {
  if (error instanceof FirebaseTokenError) {
    console.error('Token verification failed:', error.message);
  }
}
```

### Get User by Email

```typescript
import { getUserByEmail } from './config/firebase';
import { FirebaseUserNotFoundError } from './errors/firebaseErrors';

try {
  const user = await getUserByEmail('user@example.com');
  console.log('User UID:', user.uid);
} catch (error) {
  if (error instanceof FirebaseUserNotFoundError) {
    console.error('User not found');
  }
}
```

### Create User

```typescript
import { createUser } from './config/firebase';
import { FirebaseUserCreationError } from './errors/firebaseErrors';

try {
  const user = await createUser(
    'user@example.com',
    'securePassword123',
    {
      displayName: 'John Doe',
      emailVerified: false,
    }
  );
  console.log('Created user:', user.uid);
} catch (error) {
  if (error instanceof FirebaseUserCreationError) {
    console.error('User creation failed:', error.message);
  }
}
```

### Delete User

```typescript
import { deleteUser } from './config/firebase';
import { FirebaseUserDeletionError } from './errors/firebaseErrors';

try {
  await deleteUser('user-uid-here');
  console.log('User deleted successfully');
} catch (error) {
  if (error instanceof FirebaseUserDeletionError) {
    console.error('User deletion failed:', error.message);
  }
}
```

## Available Functions

- `verifyIdToken(token)` - Verify Firebase ID token and return decoded token
- `getUserByEmail(email)` - Get Firebase user by email address
- `getUserByUid(uid)` - Get Firebase user by UID
- `createUser(email, password?, additionalData?)` - Create a new Firebase user
- `deleteUser(uid)` - Delete a Firebase user
- `updateUser(uid, updateData)` - Update Firebase user properties
- `setCustomClaims(uid, customClaims)` - Set custom claims for a user
- `listUsers(maxResults?, pageToken?)` - List users with pagination

## Error Handling

All functions throw custom error classes that extend `FirebaseError`:

- `FirebaseTokenError` - Token verification failures
- `FirebaseUserNotFoundError` - User not found
- `FirebaseUserCreationError` - User creation failures
- `FirebaseUserDeletionError` - User deletion failures
- `FirebaseConfigError` - Configuration errors

Example error handling:

```typescript
import {
  FirebaseTokenError,
  FirebaseUserNotFoundError,
  FirebaseUserCreationError,
} from './errors/firebaseErrors';

try {
  const user = await getUserByEmail('user@example.com');
} catch (error) {
  if (error instanceof FirebaseUserNotFoundError) {
    // Handle user not found
  } else if (error instanceof FirebaseError) {
    // Handle other Firebase errors
  } else {
    // Handle unexpected errors
  }
}
```

## Security Notes

1. **Never commit service account keys to version control**
2. **Use environment variables or secure secret management**
3. **Rotate service account keys regularly**
4. **Limit service account permissions to minimum required**
5. **Use Firebase Security Rules in addition to Admin SDK**

## Testing

To test Firebase Admin SDK locally:

1. Set up environment variables in `.env` file
2. Ensure Firebase project is properly configured
3. Test with a valid Firebase ID token from your client app
